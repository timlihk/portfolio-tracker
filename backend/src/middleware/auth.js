import jwt from 'jsonwebtoken';
import logger from '../services/logger.js';
import pool from '../config/database.js';

let singleUserEnsured = false;

async function ensureSingleUserExists(userId) {
  if (singleUserEnsured) return;

  try {
    const existing = await pool.query('SELECT id FROM users WHERE id = $1', [userId]);
    if (existing.rows.length === 0) {
      await pool.query(
        `INSERT INTO users (id, email, password_hash, name)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO NOTHING`,
        [userId, process.env.SHARED_SECRET_USER_EMAIL || `family${userId}@local`, 'placeholder', 'Family User']
      );
      logger.info('Created default single-tenant user', { userId });
    }
    singleUserEnsured = true;
  } catch (error) {
    logger.error('Failed to ensure single-tenant user exists', { error: error.message, userId });
  }
}

/**
 * Authentication middleware for single-tenant (family) use.
 * Requires a shared secret or a JWT, but always maps to the configured single user ID.
 */
export const requireAuth = async (req, res, next) => {
  const sharedSecret = process.env.SHARED_SECRET || process.env.SECRET_PHRASE;
  const singleUserId = Number(process.env.SHARED_SECRET_USER_ID || 1);

  try {
    // Ensure the single tenant user exists to avoid FK violations on inserts
    await ensureSingleUserExists(singleUserId);

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
