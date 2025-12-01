import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

console.log('🚀 Starting server...');
console.log(`📁 Current working directory: ${process.cwd()}`);
console.log(`📊 NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`🔌 PORT: ${process.env.PORT}`);
console.log(`🗄️  DATABASE_URL exists: ${!!process.env.DATABASE_URL}`);

// Import routes
import portfolioRoutes from './routes/portfolio.js';
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

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/pricing', pricingRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message
  });
});

// Initialize database and start server
async function startServer() {
  const fs = await import('fs');

  // Log directory contents for debugging
  console.log(`📁 Current working directory: ${process.cwd()}`);
  console.log(`📂 Directory contents:`);
  try {
    const files = fs.readdirSync(process.cwd());
    files.forEach(f => console.log(`   - ${f}`));
  } catch (e) {
    console.log(`   Error reading directory: ${e.message}`);
  }

  // Serve static files in production
  if (process.env.NODE_ENV === 'production') {
    // Serve static files from the dist directory
    // Use absolute path from root of project
    const distPath = path.join(process.cwd(), 'dist');
    console.log(`📁 Looking for static files at: ${distPath}`);

    // Check if dist directory exists
    if (fs.existsSync(distPath)) {
      const distFiles = fs.readdirSync(distPath);
      console.log(`✅ Found dist directory with ${distFiles.length} files:`);
      distFiles.forEach(f => console.log(`   - ${f}`));
      app.use(express.static(distPath));

      // For any other route, serve index.html
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    } else {
      console.log(`❌ Dist directory not found at: ${distPath}`);
      // Fallback to API-only mode
      app.use('*', (req, res) => {
        res.status(404).json({
          error: 'Frontend not built',
          message: 'The frontend static files were not found. Please check the build process.',
          api: 'Available at /api endpoints'
        });
      });
    }
  } else {
    // 404 handler for development
    app.use('*', (req, res) => {
      res.status(404).json({ error: 'Route not found' });
    });
  }
  try {
    await initDatabase();

    app.listen(PORT, () => {
      console.log(`🚀 Backend server running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();