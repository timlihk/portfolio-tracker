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

// Health check endpoint
app.get('/api/health', (req, res) => {
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
      app.use(express.static(distPath));

      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    } else {
      logger.warn('Dist directory not found', { distPath });
      app.use('*', (req, res) => {
        res.status(404).json({
          error: 'Frontend not built',
          message: 'The frontend static files were not found. Please check the build process.',
          api: 'Available at /api endpoints'
        });
      });
    }
  } else {
    app.use('*', (req, res) => {
      res.status(404).json({ error: 'Route not found' });
    });
  }

  try {
    await initDatabase();

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