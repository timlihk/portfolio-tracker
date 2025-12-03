import jwt from 'jsonwebtoken';
import logger from '../services/logger.js';

/**
 * Temporary permissive auth for demo: tries to read JWT if present, otherwise
 * falls back to userId=1. Do not use in production.
 */
export const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader?.startsWith('Bearer ')) {
    try {
      const token = authHeader.replace('Bearer ', '');
      if (process.env.JWT_SECRET) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.userId;
      } else {
        logger.warn('JWT_SECRET not set; skipping token verification');
      }
    } catch (error) {
      logger.warn('Auth token ignored for demo (invalid/expired)', { error: error.message });
    }
  }

  // Demo fallback: default to user 1 when no valid token is provided.
  if (!req.userId) {
    req.userId = 1;
  }

  next();
};

export default requireAuth;
