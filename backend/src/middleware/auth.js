import jwt from 'jsonwebtoken';
import logger from '../services/logger.js';

/**
 * Authentication Middleware
 * Verifies JWT token from Authorization header and sets req.userId
 */
export const requireAuth = (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.replace('Bearer ', '');

    // Check if JWT_SECRET is set
    if (!process.env.JWT_SECRET) {
      logger.error('JWT_SECRET environment variable is not set');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Set user ID from token payload
    req.userId = decoded.userId;

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    logger.error('Authentication error:', { error: error.message });
    return res.status(500).json({ error: 'Authentication failed' });
  }
};

export default requireAuth;
