import express from 'express';
import pool from '../../config/database.js';
import { requireAuth } from '../../middleware/auth.js';

const router = express.Router();

// GET /dashboard - Get all portfolio data for dashboard
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.userId;

    // Fetch all asset types in parallel
    const [
      stocksResult,
      bondsResult,
      peFundsResult,
      peDealsResult,
      liquidFundsResult,
      cashDepositsResult,
      liabilitiesResult
    ] = await Promise.all([
      pool.query('SELECT * FROM stocks WHERE user_id = $1', [userId]),
      pool.query('SELECT * FROM bonds WHERE user_id = $1', [userId]),
      pool.query('SELECT * FROM pe_funds WHERE user_id = $1', [userId]),
      pool.query('SELECT * FROM pe_deals WHERE user_id = $1', [userId]),
      pool.query('SELECT * FROM liquid_funds WHERE user_id = $1', [userId]),
      pool.query('SELECT * FROM cash_deposits WHERE user_id = $1', [userId]),
      pool.query('SELECT * FROM liabilities WHERE user_id = $1', [userId])
    ]);

    const portfolioData = {
      stocks: stocksResult.rows,
      bonds: bondsResult.rows,
      peFunds: peFundsResult.rows,
      peDeals: peDealsResult.rows,
      liquidFunds: liquidFundsResult.rows,
      cashDeposits: cashDepositsResult.rows,
      liabilities: liabilitiesResult.rows
    };

    res.json(portfolioData);
  } catch (error) {
    console.error('Error fetching portfolio data:', error);
    res.status(500).json({ error: 'Failed to fetch portfolio data' });
  }
});

export default router;
