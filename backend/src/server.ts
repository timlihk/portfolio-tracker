import express, { type Express, type Request, type Response, type NextFunction, type ErrorRequestHandler } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import logger from './services/logger.js';
import { prisma } from './lib/prisma.js';

dotenv.config();
// Normalize database URL for environments that expose DATABASE_PUBLIC_URL (e.g., Railway)
if (!process.env.DATABASE_URL && process.env.DATABASE_PUBLIC_URL) {
  process.env.DATABASE_URL = process.env.DATABASE_PUBLIC_URL;
}
// Server initializing...

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  logger.error('Unhandled Rejection', { reason: String(reason), stack: reason instanceof Error ? reason.stack : undefined });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  console.error('Uncaught Exception:', error);
  logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
  // Don't call process.exit in test environment (Vitest intercepts it)
  if (process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
    process.exit(1);
  }
});

// Validate required environment variables
const databaseUrl = process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL;
const requiredEnvVars = databaseUrl ? [] as const : ['DATABASE_URL'] as const;
const missingEnvVars: string[] = requiredEnvVars.filter(varName => !process.env[varName]);

const jwtRequired = !(process.env.SHARED_SECRET || process.env.SECRET_PHRASE);
if (jwtRequired && !process.env.JWT_SECRET) {
  missingEnvVars.push('JWT_SECRET');
}

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

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app: Express = express();
const PORT = process.env.PORT || 3001;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX || '100', 10);

// Trust proxy for Railway/Heroku/etc
app.set('trust proxy', 1);

// Allowed origins (API only; static assets are same-origin)
const allowedOrigins = new Set([
  ...(process.env.FRONTEND_URL || 'http://localhost:5173')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean),
  'https://portfolio-tracker-production.up.railway.app',
  'https://mangrove-portfolio.up.railway.app',
  'https://wealth.mangrove-hk.org'
]);

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.has(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
};

// Security middleware - disable helmet for static assets in production
app.use((req, res, next) => {
  // Skip helmet for static assets to avoid CSP issues
  if (req.path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
    return next();
  }
  helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "https://static.cloudflareinsights.com", "https://*.cloudflare.com"],
        scriptSrcElem: ["'self'", "https://static.cloudflareinsights.com", "https://*.cloudflare.com"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https:", ...Array.from(allowedOrigins)],
        fontSrc: ["'self'", "data:"],
        objectSrc: ["'none'"],
        frameAncestors: ["'self'"]
      }
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: false
  })(req, res, next);
});
app.use(compression());
app.use(cookieParser());

// Rate limiting (tightened for abuse protection)
const limiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false
});
app.use(limiter);

// Apply CORS to API routes only
app.use('/api', cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging (basic structured)
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const durationMs = Date.now() - start;
    logger.info('HTTP request completed', {
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs,
      userAgent: req.get('user-agent')
    });
  });
  next();
});

// Cache control for API endpoints
app.use('/api', (req: Request, res: Response, next: NextFunction) => {
  res.set('Cache-Control', 'no-store, max-age=0');
  next();
});

// Track database initialization status
let dbInitialized = false;
let dbError: string | null = null;

// Health check endpoint - responds immediately even before DB is ready
app.get('/api/health', (req: Request, res: Response) => {
  logger.info('Health endpoint hit', { path: req.path, method: req.method, dbReady: dbInitialized });
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: dbInitialized ? 'connected' : 'initializing'
  });
});

// Additional health check endpoint (common pattern for health checks)
app.get('/api/healthz', (req: Request, res: Response) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: dbInitialized ? 'connected' : 'initializing'
  });
});

// Readiness probe that checks DB connectivity
app.get('/api/ready', async (_req: Request, res: Response) => {
  if (!dbInitialized) {
    return res.status(503).json({ status: 'initializing', error: dbError });
  }
  try {
    await prisma.$queryRaw`SELECT 1`;
    return res.json({ status: 'ready', database: 'connected' });
  } catch (error) {
    logger.error('Readiness probe failed', { error: (error as Error).message });
    return res.status(503).json({ status: 'not ready', error: 'db unavailable' });
  }
});

// API v1 routes (versioned - recommended)
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/portfolio', portfolioRoutes);
app.use('/api/v1/pricing', pricingRoutes);

// Error handling middleware
const errorHandler: ErrorRequestHandler = (err: Error, req: Request, res: Response, _next: NextFunction): void => {
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
};

app.use(errorHandler);

// Helper function to connect to database with retry logic
async function connectDatabaseWithRetry(maxRetries = 2, delayMs = 1000): Promise<boolean> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.info(`Attempting database connection (attempt ${attempt}/${maxRetries})...`);
      await prisma.$connect();
      logger.info('Database connection successful');
      return true;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      logger.warn(`Database connection failed (attempt ${attempt}/${maxRetries}):`, { error: lastError.message });

      if (attempt < maxRetries) {
        logger.info(`Retrying in ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        // Exponential backoff
        delayMs *= 1.5;
      }
    }
  }

  logger.error('All database connection attempts failed', { error: lastError?.message });
  throw lastError;
}

// Initialize database and start server
export async function startServer(): Promise<void> {
  const fs = await import('fs');

  // Log directory contents for debugging
  logger.debug('Working directory', { cwd: process.cwd() });
  try {
    const files = fs.readdirSync(process.cwd());
    logger.debug('Directory contents', { files });
  } catch (e) {
    logger.warn('Error reading directory', { error: e instanceof Error ? e.message : String(e) });
  }

  // Resolve project root (two levels up from backend/src)
  const projectRoot = path.resolve(__dirname, '..', '..');
  const frontendDistPath = path.join(projectRoot, 'dist');

  // Serve static files in production
  if (process.env.NODE_ENV === 'production') {
    logger.info('Looking for static files', { distPath: frontendDistPath });

    if (fs.existsSync(frontendDistPath)) {
      const distFiles = fs.readdirSync(frontendDistPath);
      logger.info('Found dist directory', { fileCount: distFiles.length, files: distFiles });

      // Serve static files with proper MIME types
      app.use(express.static(frontendDistPath, {
        maxAge: '0',
        etag: true,
        setHeaders: (res, filePath) => {
          // Set correct MIME types explicitly
          if (filePath.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
            res.setHeader('Cache-Control', 'no-store, max-age=0');
          } else if (filePath.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css; charset=utf-8');
            res.setHeader('Cache-Control', 'no-store, max-age=0');
          } else if (filePath.endsWith('.svg')) {
            res.setHeader('Content-Type', 'image/svg+xml');
          }
        }
      }));

      // SPA fallback - serve index.html for non-API, non-asset routes
      app.get('*', (req: Request, res: Response, next: NextFunction) => {
        // Skip API routes
        if (req.path.startsWith('/api')) {
          return next();
        }
        // Skip if it looks like a static asset request
        if (req.path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|map)$/)) {
          return res.status(404).send('Not found');
        }
        res.setHeader('Cache-Control', 'no-store, max-age=0');
        res.sendFile(path.join(frontendDistPath, 'index.html'));
      });
    } else {
      logger.warn('Dist directory not found', { distPath: frontendDistPath });
      app.use('*', (req: Request, res: Response, next: NextFunction) => {
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
    app.use('*', (req: Request, res: Response, next: NextFunction) => {
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

  // Start HTTP server FIRST so health checks pass immediately
  app.listen(PORT, () => {
    logger.info('Server started', {
      port: PORT,
      environment: process.env.NODE_ENV || 'development'
    });
  });

  // Initialize database AFTER server is listening (so health checks pass)
  try {
    await connectDatabaseWithRetry();
    dbInitialized = true;
    logger.info('Database initialization complete');
  } catch (error) {
    dbError = error instanceof Error ? error.message : String(error);
    logger.error('Failed to initialize database', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    // Don't exit - server can still respond to health checks
    // API routes will fail but at least Railway won't kill the process
  }
}

// Export app for testing
export { app };
