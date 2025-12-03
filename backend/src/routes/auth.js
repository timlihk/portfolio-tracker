import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/database.js';
import logger from '../services/logger.js';

const router = express.Router();

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Check if user already exists
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const result = await pool.query(
      'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name',
      [email, passwordHash, name]
    );

    const user = result.rows[0];

    // Generate JWT token
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET environment variable is not set');
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      },
      token
    });
  } catch (error) {
    logger.error('Error registering user:', { error: error.message, email });
    res.status(500).json({ error: 'Failed to register user' });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET environment variable is not set');
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      },
      token
    });
  } catch (error) {
    logger.error('Error logging in:', { error: error.message, email });
    res.status(500).json({ error: 'Failed to login' });
  }
});

// Get current user profile
router.get('/profile', async (req, res) => {
  try {
    const sharedSecret = process.env.SHARED_SECRET || process.env.SECRET_PHRASE;
    const singleUserId = Number(process.env.SHARED_SECRET_USER_ID || 1);
    const authHeader = req.headers.authorization;
    const sharedHeader =
      (authHeader?.startsWith('Shared ') && authHeader.replace('Shared ', '')) ||
      req.headers['x-shared-secret'];

    // Shared-secret path (family/demo) — single tenant only
    if (sharedSecret && sharedHeader && sharedHeader === sharedSecret) {
      const sharedUser = await pool.query('SELECT id, email, name, created_at FROM users WHERE id = $1', [singleUserId]);
      if (sharedUser.rows.length === 0) {
        return res.status(404).json({ error: 'User not found for shared secret' });
      }
      return res.json(sharedUser.rows[0]);
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
    const result = await pool.query('SELECT id, email, name, created_at FROM users WHERE id = $1', [singleUserId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Error fetching profile:', { error: error.message, userId: req.userId });
    res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;
