import express from 'express';
import pool from '../../config/database.js';
import { requireAuth } from '../../middleware/auth.js';

const router = express.Router();

// GET /bonds - List all bonds
router.get('/', requireAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM bonds WHERE user_id = $1', [req.userId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching bonds:', error);
    res.status(500).json({ error: 'Failed to fetch bonds' });
  }
});

// POST /bonds - Create a bond
router.post('/', requireAuth, async (req, res) => {
  try {
    const {
      name,
      isin,
      bond_type,
      face_value,
      coupon_rate,
      maturity_date,
      rating,
      purchase_price,
      current_value,
      currency,
      account,
      purchase_date,
      notes
    } = req.body;

    const result = await pool.query(
      `INSERT INTO bonds (user_id, name, isin, bond_type, face_value, coupon_rate, maturity_date, rating, purchase_price, current_value, currency, account, purchase_date, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`,
      [req.userId, name, isin, bond_type, face_value, coupon_rate, maturity_date, rating, purchase_price, current_value, currency, account, purchase_date, notes]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating bond:', error);
    res.status(500).json({ error: 'Failed to create bond' });
  }
});

// PUT /bonds/:id - Update a bond
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, isin, bond_type, face_value, coupon_rate, maturity_date, rating, purchase_price, current_value, currency, account, purchase_date, notes } = req.body;

    const result = await pool.query(
      `UPDATE bonds SET name = $1, isin = $2, bond_type = $3, face_value = $4, coupon_rate = $5, maturity_date = $6,
       rating = $7, purchase_price = $8, current_value = $9, currency = $10, account = $11, purchase_date = $12, notes = $13, updated_at = NOW()
       WHERE id = $14 AND user_id = $15 RETURNING *`,
      [name, isin, bond_type, face_value, coupon_rate, maturity_date, rating, purchase_price, current_value, currency, account, purchase_date, notes, id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Bond not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating bond:', error);
    res.status(500).json({ error: 'Failed to update bond' });
  }
});

// DELETE /bonds/:id - Delete a bond
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM bonds WHERE id = $1 AND user_id = $2 RETURNING *', [id, req.userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Bond not found' });
    }
    res.json({ message: 'Bond deleted successfully' });
  } catch (error) {
    console.error('Error deleting bond:', error);
    res.status(500).json({ error: 'Failed to delete bond' });
  }
});

export default router;
