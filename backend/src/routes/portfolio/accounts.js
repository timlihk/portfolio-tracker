import express from 'express';
import pool from '../../config/database.js';
import { requireAuth } from '../../middleware/auth.js';

const router = express.Router();

// GET /accounts - List all accounts
router.get('/', requireAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM accounts WHERE user_id = $1', [req.userId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching accounts:', error);
    res.status(500).json({ error: 'Failed to fetch accounts' });
  }
});

// POST /accounts - Create an account
router.post('/', requireAuth, async (req, res) => {
  try {
    const { name, institution, account_type, account_number } = req.body;

    const result = await pool.query(
      `INSERT INTO accounts (user_id, name, institution, account_type, account_number)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.userId, name, institution, account_type, account_number]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating account:', error);
    res.status(500).json({ error: 'Failed to create account' });
  }
});

// PUT /accounts/:id - Update an account
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, institution, account_type, account_number } = req.body;

    const result = await pool.query(
      `UPDATE accounts SET name = $1, institution = $2, account_type = $3, account_number = $4, updated_at = NOW()
       WHERE id = $5 AND user_id = $6 RETURNING *`,
      [name, institution, account_type, account_number, id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating account:', error);
    res.status(500).json({ error: 'Failed to update account' });
  }
});

// DELETE /accounts/:id - Delete an account
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM accounts WHERE id = $1 AND user_id = $2 RETURNING *', [id, req.userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }
    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

export default router;
