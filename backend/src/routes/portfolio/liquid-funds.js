import express from 'express';
import pool from '../../config/database.js';
import { requireAuth } from '../../middleware/auth.js';

const router = express.Router();

// GET /liquid-funds - List all liquid funds
router.get('/', requireAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM liquid_funds WHERE user_id = $1', [req.userId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching liquid funds:', error);
    res.status(500).json({ error: 'Failed to fetch liquid funds' });
  }
});

// POST /liquid-funds - Create a liquid fund
router.post('/', requireAuth, async (req, res) => {
  try {
    const {
      fund_name,
      manager,
      fund_type,
      strategy,
      investment_amount,
      current_value,
      ytd_return,
      management_fee,
      performance_fee,
      redemption_frequency,
      lockup_end_date,
      investment_date,
      status,
      notes
    } = req.body;

    const result = await pool.query(
      `INSERT INTO liquid_funds (user_id, fund_name, manager, fund_type, strategy, investment_amount, current_value, ytd_return, management_fee, performance_fee, redemption_frequency, lockup_end_date, investment_date, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING *`,
      [req.userId, fund_name, manager, fund_type, strategy, investment_amount, current_value, ytd_return, management_fee, performance_fee, redemption_frequency, lockup_end_date, investment_date, status || 'Active', notes]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating liquid fund:', error);
    res.status(500).json({ error: 'Failed to create liquid fund' });
  }
});

// PUT /liquid-funds/:id - Update a liquid fund
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { fund_name, manager, fund_type, strategy, investment_amount, current_value, ytd_return, management_fee, performance_fee, redemption_frequency, lockup_end_date, investment_date, status, notes } = req.body;

    const result = await pool.query(
      `UPDATE liquid_funds SET fund_name = $1, manager = $2, fund_type = $3, strategy = $4, investment_amount = $5,
       current_value = $6, ytd_return = $7, management_fee = $8, performance_fee = $9, redemption_frequency = $10,
       lockup_end_date = $11, investment_date = $12, status = $13, notes = $14, updated_at = NOW()
       WHERE id = $15 AND user_id = $16 RETURNING *`,
      [fund_name, manager, fund_type, strategy, investment_amount, current_value, ytd_return, management_fee, performance_fee, redemption_frequency, lockup_end_date, investment_date, status, notes, id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Liquid Fund not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating liquid fund:', error);
    res.status(500).json({ error: 'Failed to update liquid fund' });
  }
});

// DELETE /liquid-funds/:id - Delete a liquid fund
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM liquid_funds WHERE id = $1 AND user_id = $2 RETURNING *', [id, req.userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Liquid Fund not found' });
    }
    res.json({ message: 'Liquid Fund deleted successfully' });
  } catch (error) {
    console.error('Error deleting liquid fund:', error);
    res.status(500).json({ error: 'Failed to delete liquid fund' });
  }
});

export default router;
