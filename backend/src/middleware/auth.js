import jwt from 'jsonwebtoken';
import logger from '../services/logger.js';

/**
 * Authentication middleware that verifies JWTs and populates req.userId.
 * Also supports a shared-secret shortcut for family/demo use.
 */
export const requireAuth = (req, res, next) => {
  const sharedSecret = process.env.SHARED_SECRET || process.env.SECRET_PHRASE;
  const sharedSecretUserId = Number(process.env.SHARED_SECRET_USER_ID || 1);

  try {
    const authHeader = req.headers.authorization;

    // Primary: Bearer JWT
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');

      if (!process.env.JWT_SECRET) {
        logger.error('JWT_SECRET environment variable is not set');
        return res.status(500).json({ error: 'Server configuration error' });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.userId = decoded.userId;
      return next();
    }

    // Secondary: Shared secret (family/demo). Accept header Authorization: Shared <secret> or x-shared-secret.
    const sharedHeader =
      (authHeader?.startsWith('Shared ') && authHeader.replace('Shared ', '')) ||
      req.headers['x-shared-secret'];

    if (sharedSecret && sharedHeader && sharedHeader === sharedSecret) {
      req.userId = sharedSecretUserId;
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
