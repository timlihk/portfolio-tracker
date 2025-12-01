import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

// Middleware to check if user is authenticated (placeholder for now)
const requireAuth = (req, res, next) => {
  // TODO: Implement proper JWT authentication
  req.userId = 1; // Default user ID for development
  next();
};

// Account routes
router.get('/accounts', requireAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM accounts WHERE user_id = $1', [req.userId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching accounts:', error);
    res.status(500).json({ error: 'Failed to fetch accounts' });
  }
});

router.post('/accounts', requireAuth, async (req, res) => {
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

router.put('/accounts/:id', requireAuth, async (req, res) => {
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

router.delete('/accounts/:id', requireAuth, async (req, res) => {
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

// PE Deal routes
router.get('/pe-deals', requireAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM pe_deals WHERE user_id = $1', [req.userId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching PE deals:', error);
    res.status(500).json({ error: 'Failed to fetch PE deals' });
  }
});

router.post('/pe-deals', requireAuth, async (req, res) => {
  try {
    const {
      company_name,
      sector,
      deal_type,
      investment_amount,
      current_value,
      status,
      investment_date
    } = req.body;

    const result = await pool.query(
      `INSERT INTO pe_deals (user_id, company_name, sector, deal_type, investment_amount, current_value, status, investment_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [req.userId, company_name, sector, deal_type, investment_amount, current_value, status || 'Active', investment_date]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating PE deal:', error);
    res.status(500).json({ error: 'Failed to create PE deal' });
  }
});

// Liquid Fund routes
router.get('/liquid-funds', requireAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM liquid_funds WHERE user_id = $1', [req.userId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching liquid funds:', error);
    res.status(500).json({ error: 'Failed to fetch liquid funds' });
  }
});

router.post('/liquid-funds', requireAuth, async (req, res) => {
  try {
    const {
      fund_name,
      fund_type,
      strategy,
      investment_amount,
      current_value,
      ytd_return,
      investment_date
    } = req.body;

    const result = await pool.query(
      `INSERT INTO liquid_funds (user_id, fund_name, fund_type, strategy, investment_amount, current_value, ytd_return, investment_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [req.userId, fund_name, fund_type, strategy, investment_amount, current_value, ytd_return, investment_date]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating liquid fund:', error);
    res.status(500).json({ error: 'Failed to create liquid fund' });
  }
});

// Cash Deposit routes
router.get('/cash-deposits', requireAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM cash_deposits WHERE user_id = $1', [req.userId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching cash deposits:', error);
    res.status(500).json({ error: 'Failed to fetch cash deposits' });
  }
});

router.post('/cash-deposits', requireAuth, async (req, res) => {
  try {
    const {
      account_name,
      amount,
      currency,
      interest_rate
    } = req.body;

    const result = await pool.query(
      `INSERT INTO cash_deposits (user_id, account_name, amount, currency, interest_rate)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.userId, account_name, amount, currency || 'USD', interest_rate]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating cash deposit:', error);
    res.status(500).json({ error: 'Failed to create cash deposit' });
  }
});

// Liability routes
router.get('/liabilities', requireAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM liabilities WHERE user_id = $1', [req.userId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching liabilities:', error);
    res.status(500).json({ error: 'Failed to fetch liabilities' });
  }
});

router.post('/liabilities', requireAuth, async (req, res) => {
  try {
    const {
      name,
      type,
      outstanding_balance,
      interest_rate,
      monthly_payment,
      currency,
      status
    } = req.body;

    const result = await pool.query(
      `INSERT INTO liabilities (user_id, name, type, outstanding_balance, interest_rate, monthly_payment, currency, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [req.userId, name, type, outstanding_balance, interest_rate, monthly_payment, currency || 'USD', status || 'Active']
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating liability:', error);
    res.status(500).json({ error: 'Failed to create liability' });
  }
});

// Update routes
router.put('/stocks/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { ticker, company_name, sector, shares, average_cost, current_price, currency, purchase_date } = req.body;

    const result = await pool.query(
      `UPDATE stocks SET ticker = $1, company_name = $2, sector = $3, shares = $4, average_cost = $5,
       current_price = $6, currency = $7, purchase_date = $8, updated_at = NOW()
       WHERE id = $9 AND user_id = $10 RETURNING *`,
      [ticker, company_name, sector, shares, average_cost, current_price, currency, purchase_date, id, req.userId]
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

router.put('/bonds/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, bond_type, face_value, coupon_rate, maturity_date, rating, purchase_price, current_value, currency, purchase_date } = req.body;

    const result = await pool.query(
      `UPDATE bonds SET name = $1, bond_type = $2, face_value = $3, coupon_rate = $4, maturity_date = $5,
       rating = $6, purchase_price = $7, current_value = $8, currency = $9, purchase_date = $10, updated_at = NOW()
       WHERE id = $11 AND user_id = $12 RETURNING *`,
      [name, bond_type, face_value, coupon_rate, maturity_date, rating, purchase_price, current_value, currency, purchase_date, id, req.userId]
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

// Update routes for PE Funds
router.put('/pe-funds/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { fund_name, fund_type, vintage_year, commitment, called_capital, nav, distributions, commitment_date } = req.body;

    const result = await pool.query(
      `UPDATE pe_funds SET fund_name = $1, fund_type = $2, vintage_year = $3, commitment = $4,
       called_capital = $5, nav = $6, distributions = $7, commitment_date = $8, updated_at = NOW()
       WHERE id = $9 AND user_id = $10 RETURNING *`,
      [fund_name, fund_type, vintage_year, commitment, called_capital, nav, distributions, commitment_date, id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'PE Fund not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating PE fund:', error);
    res.status(500).json({ error: 'Failed to update PE fund' });
  }
});

// Update routes for PE Deals
router.put('/pe-deals/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { company_name, sector, deal_type, investment_amount, current_value, status, investment_date } = req.body;

    const result = await pool.query(
      `UPDATE pe_deals SET company_name = $1, sector = $2, deal_type = $3, investment_amount = $4,
       current_value = $5, status = $6, investment_date = $7, updated_at = NOW()
       WHERE id = $8 AND user_id = $9 RETURNING *`,
      [company_name, sector, deal_type, investment_amount, current_value, status, investment_date, id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'PE Deal not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating PE deal:', error);
    res.status(500).json({ error: 'Failed to update PE deal' });
  }
});

// Update routes for Liquid Funds
router.put('/liquid-funds/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { fund_name, fund_type, strategy, investment_amount, current_value, ytd_return, investment_date } = req.body;

    const result = await pool.query(
      `UPDATE liquid_funds SET fund_name = $1, fund_type = $2, strategy = $3, investment_amount = $4,
       current_value = $5, ytd_return = $6, investment_date = $7, updated_at = NOW()
       WHERE id = $8 AND user_id = $9 RETURNING *`,
      [fund_name, fund_type, strategy, investment_amount, current_value, ytd_return, investment_date, id, req.userId]
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

// Update routes for Cash Deposits
router.put('/cash-deposits/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { account_name, amount, currency, interest_rate } = req.body;

    const result = await pool.query(
      `UPDATE cash_deposits SET account_name = $1, amount = $2, currency = $3, interest_rate = $4, updated_at = NOW()
       WHERE id = $5 AND user_id = $6 RETURNING *`,
      [account_name, amount, currency, interest_rate, id, req.userId]
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

// Update routes for Liabilities
router.put('/liabilities/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, outstanding_balance, interest_rate, monthly_payment, currency, status } = req.body;

    const result = await pool.query(
      `UPDATE liabilities SET name = $1, type = $2, outstanding_balance = $3, interest_rate = $4,
       monthly_payment = $5, currency = $6, status = $7, updated_at = NOW()
       WHERE id = $8 AND user_id = $9 RETURNING *`,
      [name, type, outstanding_balance, interest_rate, monthly_payment, currency, status, id, req.userId]
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

// Delete routes
router.delete('/stocks/:id', requireAuth, async (req, res) => {
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

router.delete('/bonds/:id', requireAuth, async (req, res) => {
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

router.delete('/pe-funds/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM pe_funds WHERE id = $1 AND user_id = $2 RETURNING *', [id, req.userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'PE Fund not found' });
    }
    res.json({ message: 'PE Fund deleted successfully' });
  } catch (error) {
    console.error('Error deleting PE fund:', error);
    res.status(500).json({ error: 'Failed to delete PE fund' });
  }
});

router.delete('/pe-deals/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM pe_deals WHERE id = $1 AND user_id = $2 RETURNING *', [id, req.userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'PE Deal not found' });
    }
    res.json({ message: 'PE Deal deleted successfully' });
  } catch (error) {
    console.error('Error deleting PE deal:', error);
    res.status(500).json({ error: 'Failed to delete PE deal' });
  }
});

router.delete('/liquid-funds/:id', requireAuth, async (req, res) => {
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

router.delete('/cash-deposits/:id', requireAuth, async (req, res) => {
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

router.delete('/liabilities/:id', requireAuth, async (req, res) => {
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