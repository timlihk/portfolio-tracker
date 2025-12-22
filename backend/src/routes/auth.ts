import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { prisma } from '../lib/prisma.js';
import logger from '../services/logger.js';
import type { RegisterRequest, LoginRequest, AuthResponse, JWTPayload } from '../types/index.js';

const router = express.Router();
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false
});

function getSharedSecretFromHeaders(req: Request): string | undefined {
  const authHeader = req.headers.authorization;
  const sharedHeader =
    (authHeader?.startsWith('Shared ') && authHeader.replace('Shared ', '')) ||
    (req.headers['x-shared-secret'] as string | undefined);
  const cookieSecret = (req as Request & { cookies?: Record<string, string> }).cookies?.shared_secret;
  return cookieSecret || sharedHeader;
}

function requireSharedSecretIfConfigured(req: Request, res: Response): boolean {
  const sharedSecret = process.env.SHARED_SECRET || process.env.SECRET_PHRASE;

  // If no secret is configured, allow (useful for local/dev multi-tenant)
  if (!sharedSecret) return true;

  const provided = getSharedSecretFromHeaders(req);
  if (provided && provided === sharedSecret) return true;

  res.status(403).json({ error: 'Shared secret required' });
  return false;
}

// Set shared secret cookie (httpOnly)
router.post('/shared-secret', authLimiter, async (req: Request, res: Response) => {
  const sharedSecret = process.env.SHARED_SECRET || process.env.SECRET_PHRASE;
  if (!sharedSecret) {
    return res.status(400).json({ error: 'Shared secret not configured on server' });
  }

  const provided = (req.body as { secret?: string }).secret?.trim();
  if (!provided || provided !== sharedSecret) {
    return res.status(403).json({ error: 'Invalid shared secret' });
  }

  const secure = process.env.NODE_ENV === 'production';
  res.cookie('shared_secret', provided, {
    httpOnly: true,
    sameSite: 'strict',
    secure,
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
  return res.json({ message: 'Shared secret accepted' });
});

router.delete('/shared-secret', authLimiter, async (_req: Request, res: Response) => {
  res.clearCookie('shared_secret', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' });
  res.json({ message: 'Shared secret cleared' });
});

// Register new user
router.post('/register', authLimiter, async (req: Request<{}, {}, RegisterRequest>, res: Response) => {
  try {
    if (!requireSharedSecretIfConfigured(req, res)) return;

    const { email, password, name } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: name || null
      },
      select: {
        id: true,
        email: true,
        name: true
      }
    });

    // Generate JWT token
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET environment variable is not set');
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email } as JWTPayload,
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    const response: AuthResponse = {
      message: 'User created successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      },
      token
    };

    res.status(201).json(response);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error registering user:', { error: errorMessage, email: req.body.email });
    res.status(500).json({ error: 'Failed to register user' });
  }
});

// Login user
router.post('/login', authLimiter, async (req: Request<{}, {}, LoginRequest>, res: Response) => {
  try {
    if (!requireSharedSecretIfConfigured(req, res)) return;

    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        passwordHash: true
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET environment variable is not set');
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email } as JWTPayload,
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    const response: AuthResponse = {
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      },
      token
    };

    res.json(response);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error logging in:', { error: errorMessage, email: req.body.email });
    res.status(500).json({ error: 'Failed to login' });
  }
});

// Get current user profile
router.get('/profile', async (req: Request, res: Response) => {
  try {
    const sharedSecret = process.env.SHARED_SECRET || process.env.SECRET_PHRASE;
    const singleUserId = Number(process.env.SHARED_SECRET_USER_ID || 1);
    const authHeader = req.headers.authorization;
    const sharedHeader =
      (authHeader?.startsWith('Shared ') && authHeader.replace('Shared ', '')) ||
      req.headers['x-shared-secret'];

    // Shared-secret path (family/demo) — single tenant only
    if (sharedSecret && sharedHeader && sharedHeader === sharedSecret) {
      const sharedUser = await prisma.user.findUnique({
        where: { id: singleUserId },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true
        }
      });

      if (!sharedUser) {
        return res.status(404).json({ error: 'User not found for shared secret' });
      }

      return res.json(sharedUser);
    }

    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET environment variable is not set');
    }

    // JWT accepted but always resolves to the single tenant user
    jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: singleUserId },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error fetching profile:', { error: errorMessage });
    res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;
