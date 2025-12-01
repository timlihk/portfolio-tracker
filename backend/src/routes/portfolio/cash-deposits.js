import express from 'express';
import pool from '../../config/database.js';
import { requireAuth } from '../../middleware/auth.js';

const router = express.Router();

// GET /cash-deposits - List all cash deposits
router.get('/', requireAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM cash_deposits WHERE user_id = $1', [req.userId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching cash deposits:', error);
    res.status(500).json({ error: 'Failed to fetch cash deposits' });
  }
});

// POST /cash-deposits - Create a cash deposit
router.post('/', requireAuth, async (req, res) => {
  try {
    const {
      name,
      deposit_type,
      amount,
      currency,
      interest_rate,
      maturity_date,
      account,
      notes
    } = req.body;

    const result = await pool.query(
      `INSERT INTO cash_deposits (user_id, name, deposit_type, amount, currency, interest_rate, maturity_date, account, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [req.userId, name, deposit_type, amount, currency || 'USD', interest_rate, maturity_date, account, notes]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating cash deposit:', error);
    res.status(500).json({ error: 'Failed to create cash deposit' });
  }
});

// PUT /cash-deposits/:id - Update a cash deposit
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, deposit_type, amount, currency, interest_rate, maturity_date, account, notes } = req.body;

    const result = await pool.query(
      `UPDATE cash_deposits SET name = $1, deposit_type = $2, amount = $3, currency = $4, interest_rate = $5,
       maturity_date = $6, account = $7, notes = $8, updated_at = NOW()
       WHERE id = $9 AND user_id = $10 RETURNING *`,
      [name, deposit_type, amount, currency, interest_rate, maturity_date, account, notes, id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cash Deposit not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating cash deposit:', error);
    res.status(500).json({ error: 'Failed to update cash deposit' });
  }
});

// DELETE /cash-deposits/:id - Delete a cash deposit
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM cash_deposits WHERE id = $1 AND user_id = $2 RETURNING *', [id, req.userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cash Deposit not found' });
    }
    res.json({ message: 'Cash Deposit deleted successfully' });
  } catch (error) {
    console.error('Error deleting cash deposit:', error);
    res.status(500).json({ error: 'Failed to delete cash deposit' });
  }
});

export default router;
