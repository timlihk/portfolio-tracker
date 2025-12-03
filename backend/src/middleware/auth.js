import jwt from 'jsonwebtoken';
import logger from '../services/logger.js';

/**
 * Authentication middleware for single-tenant (family) use.
 * Requires a shared secret or a JWT, but always maps to the configured single user ID.
 */
export const requireAuth = (req, res, next) => {
  const sharedSecret = process.env.SHARED_SECRET || process.env.SECRET_PHRASE;
  const singleUserId = Number(process.env.SHARED_SECRET_USER_ID || 1);

  try {
    const authHeader = req.headers.authorization;

    // Primary: Bearer JWT (still accepted, but user is forced to singleUserId)
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');

      if (!process.env.JWT_SECRET) {
        logger.error('JWT_SECRET environment variable is not set');
        return res.status(500).json({ error: 'Server configuration error' });
      }

      jwt.verify(token, process.env.JWT_SECRET);
      req.userId = singleUserId;
      return next();
    }

    // Secondary: Shared secret (family/demo). Accept header Authorization: Shared <secret> or x-shared-secret.
    const sharedHeader =
      (authHeader?.startsWith('Shared ') && authHeader.replace('Shared ', '')) ||
      req.headers['x-shared-secret'];

    if (sharedSecret && sharedHeader && sharedHeader === sharedSecret) {
      req.userId = singleUserId;
      return next();
    }

    return res.status(401).json({ error: 'Authentication required' });

  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    logger.error('Authentication error:', { error: error.message });
    return res.status(500).json({ error: 'Authentication failed' });
  }
};

export default requireAuth;
