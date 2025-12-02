import express from 'express';
import { body, param, validationResult } from 'express-validator';
import pool from '../../config/database.js';
import { requireAuth } from '../../middleware/auth.js';
import logger from '../../services/logger.js';

const router = express.Router();

// GET /stocks - List all stocks
router.get('/', requireAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM stocks WHERE user_id = $1', [req.userId]);
    res.json(result.rows);
  } catch (error) {
    logger.error('Error fetching stocks:', { error: error.message, userId: req.userId });
    res.status(500).json({ error: 'Failed to fetch stocks' });
  }
});

// POST /stocks - Create a stock
router.post('/', requireAuth, [
  body('ticker').notEmpty().trim().isLength({ max: 20 }),
  body('shares').isFloat({ gt: 0 }),
  body('average_cost').isFloat({ gt: 0 }),
  body('currency').optional().isLength({ max: 10 }),
  body('account').optional().isLength({ max: 255 }),
  body('purchase_date').optional().isISO8601(),
  body('notes').optional().isLength({ max: 1000 }),
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      ticker,
      company_name,
      sector,
      shares,
      average_cost,
      current_price,
      currency,
      account,
      purchase_date,
      notes
    } = req.body;

    const result = await pool.query(
      `INSERT INTO stocks (user_id, ticker, company_name, sector, shares, average_cost, current_price, currency, account, purchase_date, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [req.userId, ticker, company_name, sector, shares, average_cost, current_price, currency, account, purchase_date, notes]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    logger.error('Error creating stock:', { error: error.message, userId: req.userId });
    res.status(500).json({ error: 'Failed to create stock' });
  }
});

// PUT /stocks/:id - Update a stock
router.put('/:id', requireAuth, [
  param('id').isInt({ gt: 0 }),
  body('ticker').optional().notEmpty().trim().isLength({ max: 20 }),
  body('shares').optional().isFloat({ gt: 0 }),
  body('average_cost').optional().isFloat({ gt: 0 }),
  body('currency').optional().isLength({ max: 10 }),
  body('account').optional().isLength({ max: 255 }),
  body('purchase_date').optional().isISO8601(),
  body('notes').optional().isLength({ max: 1000 }),
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { ticker, company_name, sector, shares, average_cost, current_price, currency, account, purchase_date, notes } = req.body;

    const result = await pool.query(
      `UPDATE stocks SET ticker = $1, company_name = $2, sector = $3, shares = $4, average_cost = $5,
       current_price = $6, currency = $7, account = $8, purchase_date = $9, notes = $10, updated_at = NOW()
       WHERE id = $11 AND user_id = $12 RETURNING *`,
      [ticker, company_name, sector, shares, average_cost, current_price, currency, account, purchase_date, notes, id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Stock not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Error updating stock:', { error: error.message, userId: req.userId, stockId: id });
    res.status(500).json({ error: 'Failed to update stock' });
  }
});

// DELETE /stocks/:id - Delete a stock
router.delete('/:id', requireAuth, [
  param('id').isInt({ gt: 0 }),
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const result = await pool.query('DELETE FROM stocks WHERE id = $1 AND user_id = $2 RETURNING *', [id, req.userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Stock not found' });
    }
    res.json({ message: 'Stock deleted successfully' });
  } catch (error) {
    logger.error('Error deleting stock:', { error: error.message, userId: req.userId, stockId: id });
    res.status(500).json({ error: 'Failed to delete stock' });
  }
});

export default router;
