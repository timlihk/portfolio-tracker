import express from 'express';
import pool from '../../config/database.js';
import { requireAuth } from '../../middleware/auth.js';

const router = express.Router();

// GET /liabilities - List all liabilities
router.get('/', requireAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM liabilities WHERE user_id = $1', [req.userId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching liabilities:', error);
    res.status(500).json({ error: 'Failed to fetch liabilities' });
  }
});

// POST /liabilities - Create a liability
router.post('/', requireAuth, async (req, res) => {
  try {
    const {
      name,
      liability_type,
      account,
      principal,
      outstanding_balance,
      interest_rate,
      rate_type,
      collateral,
      start_date,
      maturity_date,
      currency,
      status,
      notes
    } = req.body;

    const result = await pool.query(
      `INSERT INTO liabilities (user_id, name, liability_type, account, principal, outstanding_balance, interest_rate, rate_type, collateral, start_date, maturity_date, currency, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`,
      [req.userId, name, liability_type, account, principal, outstanding_balance, interest_rate, rate_type, collateral, start_date, maturity_date, currency || 'USD', status || 'Active', notes]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating liability:', error);
    res.status(500).json({ error: 'Failed to create liability' });
  }
});

// PUT /liabilities/:id - Update a liability
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, liability_type, account, principal, outstanding_balance, interest_rate, rate_type, collateral, start_date, maturity_date, currency, status, notes } = req.body;

    const result = await pool.query(
      `UPDATE liabilities SET name = $1, liability_type = $2, account = $3, principal = $4, outstanding_balance = $5,
       interest_rate = $6, rate_type = $7, collateral = $8, start_date = $9, maturity_date = $10, currency = $11, status = $12, notes = $13, updated_at = NOW()
       WHERE id = $14 AND user_id = $15 RETURNING *`,
      [name, liability_type, account, principal, outstanding_balance, interest_rate, rate_type, collateral, start_date, maturity_date, currency, status, notes, id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Liability not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating liability:', error);
    res.status(500).json({ error: 'Failed to update liability' });
  }
});

// DELETE /liabilities/:id - Delete a liability
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM liabilities WHERE id = $1 AND user_id = $2 RETURNING *', [id, req.userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Liability not found' });
    }
    res.json({ message: 'Liability deleted successfully' });
  } catch (error) {
    console.error('Error deleting liability:', error);
    res.status(500).json({ error: 'Failed to delete liability' });
  }
});

export default router;
