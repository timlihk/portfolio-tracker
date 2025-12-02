import express from 'express';
import pool from '../../config/database.js';
import { requireAuth } from '../../middleware/auth.js';
import logger from '../../services/logger.js';

const router = express.Router();

// GET /pe-funds - List all PE funds
router.get('/', requireAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM pe_funds WHERE user_id = $1', [req.userId]);
    res.json(result.rows);
  } catch (error) {
    logger.error('Error fetching PE funds:', { error: error.message, userId: req.userId });
    res.status(500).json({ error: 'Failed to fetch PE funds' });
  }
});

// POST /pe-funds - Create a PE fund
router.post('/', requireAuth, async (req, res) => {
  try {
    const {
      fund_name,
      manager,
      fund_type,
      vintage_year,
      commitment,
      called_capital,
      nav,
      distributions,
      commitment_date,
      status,
      notes
    } = req.body;

    const result = await pool.query(
      `INSERT INTO pe_funds (user_id, fund_name, manager, fund_type, vintage_year, commitment, called_capital, nav, distributions, commitment_date, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [req.userId, fund_name, manager, fund_type, vintage_year, commitment, called_capital, nav, distributions, commitment_date, status || 'Active', notes]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    logger.error('Error creating PE fund:', { error: error.message, userId: req.userId });
    res.status(500).json({ error: 'Failed to create PE fund' });
  }
});

// PUT /pe-funds/:id - Update a PE fund
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { fund_name, manager, fund_type, vintage_year, commitment, called_capital, nav, distributions, commitment_date, status, notes } = req.body;

    const result = await pool.query(
      `UPDATE pe_funds SET fund_name = $1, manager = $2, fund_type = $3, vintage_year = $4, commitment = $5,
       called_capital = $6, nav = $7, distributions = $8, commitment_date = $9, status = $10, notes = $11, updated_at = NOW()
       WHERE id = $12 AND user_id = $13 RETURNING *`,
      [fund_name, manager, fund_type, vintage_year, commitment, called_capital, nav, distributions, commitment_date, status, notes, id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'PE Fund not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Error updating PE fund:', { error: error.message, userId: req.userId, peFundId: id });
    res.status(500).json({ error: 'Failed to update PE fund' });
  }
});

// DELETE /pe-funds/:id - Delete a PE fund
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM pe_funds WHERE id = $1 AND user_id = $2 RETURNING *', [id, req.userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'PE Fund not found' });
    }
    res.json({ message: 'PE Fund deleted successfully' });
  } catch (error) {
    logger.error('Error deleting PE fund:', { error: error.message, userId: req.userId, peFundId: id });
    res.status(500).json({ error: 'Failed to delete PE fund' });
  }
});

export default router;
