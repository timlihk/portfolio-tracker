import express from 'express';
import pool from '../../config/database.js';
import { requireAuth } from '../../middleware/auth.js';
import logger from '../../services/logger.js';

const router = express.Router();

// GET /pe-deals - List all PE deals
router.get('/', requireAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM pe_deals WHERE user_id = $1', [req.userId]);
    res.json(result.rows);
  } catch (error) {
    logger.error('Error fetching PE deals:', { error: error.message, userId: req.userId });
    res.status(500).json({ error: 'Failed to fetch PE deals' });
  }
});

// POST /pe-deals - Create a PE deal
router.post('/', requireAuth, async (req, res) => {
  try {
    const {
      company_name,
      sector,
      deal_type,
      investment_amount,
      current_value,
      ownership_percentage,
      sponsor,
      status,
      investment_date,
      notes
    } = req.body;

    const result = await pool.query(
      `INSERT INTO pe_deals (user_id, company_name, sector, deal_type, investment_amount, current_value, ownership_percentage, sponsor, status, investment_date, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [req.userId, company_name, sector, deal_type, investment_amount, current_value, ownership_percentage, sponsor, status || 'Active', investment_date, notes]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    logger.error('Error creating PE deal:', { error: error.message, userId: req.userId });
    res.status(500).json({ error: 'Failed to create PE deal' });
  }
});

// PUT /pe-deals/:id - Update a PE deal
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { company_name, sector, deal_type, investment_amount, current_value, ownership_percentage, sponsor, status, investment_date, notes } = req.body;

    const result = await pool.query(
      `UPDATE pe_deals SET company_name = $1, sector = $2, deal_type = $3, investment_amount = $4,
       current_value = $5, ownership_percentage = $6, sponsor = $7, status = $8, investment_date = $9, notes = $10, updated_at = NOW()
       WHERE id = $11 AND user_id = $12 RETURNING *`,
      [company_name, sector, deal_type, investment_amount, current_value, ownership_percentage, sponsor, status, investment_date, notes, id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'PE Deal not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Error updating PE deal:', { error: error.message, userId: req.userId, peDealId: id });
    res.status(500).json({ error: 'Failed to update PE deal' });
  }
});

// DELETE /pe-deals/:id - Delete a PE deal
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM pe_deals WHERE id = $1 AND user_id = $2 RETURNING *', [id, req.userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'PE Deal not found' });
    }
    res.json({ message: 'PE Deal deleted successfully' });
  } catch (error) {
    logger.error('Error deleting PE deal:', { error: error.message, userId: req.userId, peDealId: id });
    res.status(500).json({ error: 'Failed to delete PE deal' });
  }
});

export default router;
