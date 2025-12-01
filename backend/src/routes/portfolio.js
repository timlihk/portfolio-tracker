import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

// Middleware to check if user is authenticated (placeholder for now)
const requireAuth = (req, res, next) => {
  // TODO: Implement proper JWT authentication
  req.userId = 1; // Default user ID for development
  next();
};

// Get all portfolio data for dashboard
router.get('/dashboard', requireAuth, async (req, res) => {
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

// Stock routes
router.get('/stocks', requireAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM stocks WHERE user_id = $1', [req.userId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching stocks:', error);
    res.status(500).json({ error: 'Failed to fetch stocks' });
  }
});

router.post('/stocks', requireAuth, async (req, res) => {
  try {
    const {
      ticker,
      company_name,
      sector,
      shares,
      average_cost,
      current_price,
      currency,
      purchase_date
    } = req.body;

    const result = await pool.query(
      `INSERT INTO stocks (user_id, ticker, company_name, sector, shares, average_cost, current_price, currency, purchase_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [req.userId, ticker, company_name, sector, shares, average_cost, current_price, currency, purchase_date]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating stock:', error);
    res.status(500).json({ error: 'Failed to create stock' });
  }
});

// Bond routes
router.get('/bonds', requireAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM bonds WHERE user_id = $1', [req.userId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching bonds:', error);
    res.status(500).json({ error: 'Failed to fetch bonds' });
  }
});

router.post('/bonds', requireAuth, async (req, res) => {
  try {
    const {
      name,
      bond_type,
      face_value,
      coupon_rate,
      maturity_date,
      rating,
      purchase_price,
      current_value,
      currency,
      purchase_date
    } = req.body;

    const result = await pool.query(
      `INSERT INTO bonds (user_id, name, bond_type, face_value, coupon_rate, maturity_date, rating, purchase_price, current_value, currency, purchase_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [req.userId, name, bond_type, face_value, coupon_rate, maturity_date, rating, purchase_price, current_value, currency, purchase_date]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating bond:', error);
    res.status(500).json({ error: 'Failed to create bond' });
  }
});

// PE Fund routes
router.get('/pe-funds', requireAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM pe_funds WHERE user_id = $1', [req.userId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching PE funds:', error);
    res.status(500).json({ error: 'Failed to fetch PE funds' });
  }
});

router.post('/pe-funds', requireAuth, async (req, res) => {
  try {
    const {
      fund_name,
      fund_type,
      vintage_year,
      commitment,
      called_capital,
      nav,
      distributions,
      commitment_date
    } = req.body;

    const result = await pool.query(
      `INSERT INTO pe_funds (user_id, fund_name, fund_type, vintage_year, commitment, called_capital, nav, distributions, commitment_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [req.userId, fund_name, fund_type, vintage_year, commitment, called_capital, nav, distributions, commitment_date]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating PE fund:', error);
    res.status(500).json({ error: 'Failed to create PE fund' });
  }
});

// Similar routes for other asset types (PE Deals, Liquid Funds, Cash Deposits, Liabilities)
// ...

export default router;