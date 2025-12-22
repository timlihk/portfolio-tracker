import type { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import logger from '../services/logger.js';
import prisma from '../lib/prisma.js';
import type { AuthRequest, JWTPayload } from '../types/index.js';
import { sendUnauthorized } from '../routes/response.js';

let singleUserEnsured = false;
let ensurePromise: Promise<void> | null = null;

async function ensureSingleUserExists(userId: number): Promise<void> {
  if (singleUserEnsured) return;
  if (ensurePromise) {
    await ensurePromise;
    return;
  }

  ensurePromise = (async () => {
    const existing = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true }
    });

    if (!existing) {
      await prisma.user.upsert({
        where: { id: userId },
        update: {},
        create: {
          id: userId,
          email: process.env.SHARED_SECRET_USER_EMAIL || `family${userId}@local`,
          passwordHash: await bcrypt.hash(crypto.randomUUID(), 12),
          name: 'Family User'
        }
      });
      logger.info('Created default single-tenant user', { userId });
    }
    singleUserEnsured = true;
  })().catch((error) => {
    const err = error as Error;
    logger.error('Failed to ensure single-tenant user exists', { error: err.message, userId });
  }).finally(() => {
    ensurePromise = null;
  });

  await ensurePromise;
}

/**
 * Authentication middleware for single-tenant (family) use.
 * Requires a shared secret or a JWT, but always maps to the configured single user ID.
 */
export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
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
        logger.warn('JWT auth attempted but JWT_SECRET is not set; rejecting Bearer token');
        return sendUnauthorized(res);
      }

      const payload = jwt.verify(token, process.env.JWT_SECRET) as JWTPayload;
      if (payload.userId && payload.userId !== singleUserId) {
        return res.status(403).json({ error: 'Invalid user for this tenant' });
      }
      req.userId = payload.userId || singleUserId;
      return next();
    }

    // Secondary: Shared secret (family/demo). Accept header Authorization: Shared <secret> or x-shared-secret.
    const sharedHeader =
      (authHeader?.startsWith('Shared ') && authHeader.replace('Shared ', '')) ||
      (req.headers['x-shared-secret'] as string | undefined);

    if (sharedSecret && sharedHeader && sharedHeader === sharedSecret) {
      req.userId = singleUserId;
      return next();
    }

    return sendUnauthorized(res);

  } catch (error) {
    const err = error as Error & { name?: string };
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    logger.error('Authentication error:', { error: err.message });
    return res.status(500).json({ error: 'Authentication failed' });
  }
};

export default requireAuth;
