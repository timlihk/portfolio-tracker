import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from './services/logger.js';

dotenv.config();
console.log('Server initializing...');

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  logger.error('Unhandled Rejection', { reason: String(reason), stack: reason instanceof Error ? reason.stack : undefined });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

// Validate required environment variables
const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  logger.error('Missing required environment variables:', { missing: missingEnvVars });
  process.exit(1);
}

logger.info('Starting server...', {
  cwd: process.cwd(),
  nodeEnv: process.env.NODE_ENV,
  port: process.env.PORT,
  hasDbUrl: !!process.env.DATABASE_URL,
  hasJwtSecret: !!process.env.JWT_SECRET
});

// Import routes
import portfolioRoutes from './routes/portfolio/index.js';
import authRoutes from './routes/auth.js';
import pricingRoutes from './routes/pricing.js';
import { initDatabase } from './config/database.js';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy for Railway/Heroku/etc
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Cache control for API endpoints
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store, max-age=0');
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  logger.info('Health endpoint hit', { path: req.path, method: req.method });
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Additional health check endpoint (common pattern for health checks)
app.get('/api/healthz', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API v1 routes (versioned - recommended)
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/portfolio', portfolioRoutes);
app.use('/api/v1/pricing', pricingRoutes);

// Legacy API routes (backward compatibility - will be deprecated)
app.use('/api/auth', authRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/pricing', pricingRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Request error', {
    error: err.message,
    stack: err.stack,
    method: req.method,
    path: req.path,
    ip: req.ip
  });
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message
  });
});

// Helper function to initialize database with retry logic
async function initDatabaseWithRetry(maxRetries = 2, delayMs = 1000) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.info(`Attempting database connection (attempt ${attempt}/${maxRetries})...`);
      await initDatabase();
      logger.info('Database connection successful');
      return true;
    } catch (error) {
      lastError = error;
      logger.warn(`Database connection failed (attempt ${attempt}/${maxRetries}):`, { error: error.message });

      if (attempt < maxRetries) {
        logger.info(`Retrying in ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        // Exponential backoff
        delayMs *= 1.5;
      }
    }
  }

  logger.error('All database connection attempts failed', { error: lastError.message });
  throw lastError;
}

// Initialize database and start server
async function startServer() {
  const fs = await import('fs');

  // Log directory contents for debugging
  logger.debug('Working directory', { cwd: process.cwd() });
  try {
    const files = fs.readdirSync(process.cwd());
    logger.debug('Directory contents', { files });
  } catch (e) {
    logger.warn('Error reading directory', { error: e.message });
  }

  // Serve static files in production
  if (process.env.NODE_ENV === 'production') {
    const distPath = path.join(process.cwd(), 'dist');
    logger.info('Looking for static files', { distPath });

    if (fs.existsSync(distPath)) {
      const distFiles = fs.readdirSync(distPath);
      logger.info('Found dist directory', { fileCount: distFiles.length });
      // Serve static files for non-API paths only
      app.use(/^(?!\/api)/, express.static(distPath));

      app.get('*', (req, res, next) => {
        // Skip API routes - let them be handled by API route handlers
        logger.info('Static file catch-all route', { path: req.path, method: req.method });
        if (req.path.startsWith('/api')) {
          logger.info('Skipping API route', { path: req.path });
          return next();
        }
        logger.info('Serving index.html for', { path: req.path });
        res.sendFile(path.join(distPath, 'index.html'));
      });
    } else {
      logger.warn('Dist directory not found', { distPath });
      app.use('*', (req, res, next) => {
        // Skip API routes - let them be handled by API route handlers
        logger.info('Dist not found catch-all route', { path: req.path, method: req.method });
        if (req.path.startsWith('/api')) {
          logger.info('Skipping API route (dist not found)', { path: req.path });
          return next();
        }
        logger.info('Returning frontend not built error for', { path: req.path });
        res.status(404).json({
          error: 'Frontend not built',
          message: 'The frontend static files were not found. Please check the build process.',
          api: 'Available at /api endpoints'
        });
      });
    }
  } else {
    app.use('*', (req, res, next) => {
      // Skip API routes - let them be handled by API route handlers
      logger.info('Development catch-all route', { path: req.path, method: req.method });
      if (req.path.startsWith('/api')) {
        logger.info('Skipping API route (development)', { path: req.path });
        return next();
      }
      logger.info('Returning route not found for', { path: req.path });
      res.status(404).json({ error: 'Route not found' });
    });
  }

  try {
    await initDatabaseWithRetry();

    app.listen(PORT, () => {
      logger.info('Server started', {
        port: PORT,
        environment: process.env.NODE_ENV || 'development'
      });
    });
  } catch (error) {
    logger.error('Failed to start server', { error: error.message, stack: error.stack });
    process.exit(1);
  }
}

startServer();