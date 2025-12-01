import express from 'express';
import pool from '../../config/database.js';
import { requireAuth } from '../../middleware/auth.js';

const router = express.Router();

// GET /stocks - List all stocks
router.get('/', requireAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM stocks WHERE user_id = $1', [req.userId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching stocks:', error);
    res.status(500).json({ error: 'Failed to fetch stocks' });
  }
});

// POST /stocks - Create a stock
router.post('/', requireAuth, async (req, res) => {
  try {
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
    console.error('Error creating stock:', error);
    res.status(500).json({ error: 'Failed to create stock' });
  }
});

// PUT /stocks/:id - Update a stock
router.put('/:id', requireAuth, async (req, res) => {
  try {
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
    console.error('Error updating stock:', error);
    res.status(500).json({ error: 'Failed to update stock' });
  }
});

// DELETE /stocks/:id - Delete a stock
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM stocks WHERE id = $1 AND user_id = $2 RETURNING *', [id, req.userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Stock not found' });
    }
    res.json({ message: 'Stock deleted successfully' });
  } catch (error) {
    console.error('Error deleting stock:', error);
    res.status(500).json({ error: 'Failed to delete stock' });
  }
});

export default router;
