import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Database connection configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20, // maximum number of clients in the pool
  idleTimeoutMillis: 30000, // how long a client is allowed to remain idle before being closed
  connectionTimeoutMillis: 2000, // how long to wait for a connection
});

// Test database connection
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Database connection error:', err);
});

// Initialize database tables
export const initDatabase = async () => {
  console.log('🗄️  Initializing database connection...');

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is not set!');
    throw new Error('DATABASE_URL is required');
  }

  try {
    // Test connection first
    console.log('🔌 Testing database connection...');
    const testResult = await pool.query('SELECT NOW()');
    console.log(`✅ Database connected at: ${testResult.rows[0].now}`);

    // Create tables if they don't exist
    console.log('📋 Creating tables if they don\'t exist...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS stocks (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        ticker VARCHAR(20) NOT NULL,
        company_name VARCHAR(255),
        sector VARCHAR(100),
        shares DECIMAL(15,6),
        average_cost DECIMAL(15,6),
        current_price DECIMAL(15,6),
        currency VARCHAR(10) DEFAULT 'USD',
        account VARCHAR(255),
        purchase_date DATE,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS bonds (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        name VARCHAR(255) NOT NULL,
        isin VARCHAR(12),
        bond_type VARCHAR(100),
        face_value DECIMAL(15,6),
        coupon_rate DECIMAL(5,3),
        maturity_date DATE,
        rating VARCHAR(10),
        purchase_price DECIMAL(15,6),
        current_value DECIMAL(15,6),
        currency VARCHAR(10) DEFAULT 'USD',
        account VARCHAR(255),
        purchase_date DATE,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS pe_funds (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        fund_name VARCHAR(255) NOT NULL,
        manager VARCHAR(255),
        fund_type VARCHAR(100),
        vintage_year INTEGER,
        commitment DECIMAL(15,6),
        called_capital DECIMAL(15,6),
        nav DECIMAL(15,6),
        distributions DECIMAL(15,6),
        commitment_date DATE,
        status VARCHAR(50) DEFAULT 'Active',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS pe_deals (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        company_name VARCHAR(255) NOT NULL,
        sector VARCHAR(100),
        deal_type VARCHAR(100),
        investment_amount DECIMAL(15,6),
        current_value DECIMAL(15,6),
        ownership_percentage DECIMAL(5,3),
        sponsor VARCHAR(255),
        status VARCHAR(50) DEFAULT 'Active',
        investment_date DATE,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS liquid_funds (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        fund_name VARCHAR(255) NOT NULL,
        manager VARCHAR(255),
        fund_type VARCHAR(100),
        strategy VARCHAR(100),
        investment_amount DECIMAL(15,6),
        current_value DECIMAL(15,6),
        ytd_return DECIMAL(5,3),
        management_fee DECIMAL(5,3),
        performance_fee DECIMAL(5,3),
        redemption_frequency VARCHAR(50),
        lockup_end_date DATE,
        investment_date DATE,
        status VARCHAR(50) DEFAULT 'Active',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS cash_deposits (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        name VARCHAR(255) NOT NULL,
        deposit_type VARCHAR(100),
        amount DECIMAL(15,6),
        currency VARCHAR(10) DEFAULT 'USD',
        interest_rate DECIMAL(5,3),
        maturity_date DATE,
        account VARCHAR(255),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS liabilities (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        name VARCHAR(255) NOT NULL,
        liability_type VARCHAR(100),
        account VARCHAR(255),
        principal DECIMAL(15,6),
        outstanding_balance DECIMAL(15,6),
        interest_rate DECIMAL(5,3),
        rate_type VARCHAR(50),
        collateral VARCHAR(255),
        start_date DATE,
        maturity_date DATE,
        currency VARCHAR(10) DEFAULT 'USD',
        status VARCHAR(50) DEFAULT 'Active',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS accounts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        name VARCHAR(255) NOT NULL,
        institution VARCHAR(255),
        account_type VARCHAR(100),
        account_number VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('✅ Database tables initialized successfully');

    // Add missing columns to existing tables (ALTER TABLE is idempotent with IF NOT EXISTS in PostgreSQL 9.6+)
    console.log('📋 Adding missing columns to existing tables...');

    // Helper to add column if it doesn't exist
    const addColumnIfNotExists = async (table, column, type) => {
      try {
        await pool.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${column} ${type}`);
      } catch (e) {
        // Column might already exist in older PostgreSQL versions
        if (!e.message.includes('already exists')) {
          console.log(`Note: Could not add ${column} to ${table}: ${e.message}`);
        }
      }
    };

    // Stocks table - add account and notes columns
    await addColumnIfNotExists('stocks', 'account', 'VARCHAR(255)');
    await addColumnIfNotExists('stocks', 'notes', 'TEXT');

    // Bonds table - add isin, account, and notes columns
    await addColumnIfNotExists('bonds', 'isin', 'VARCHAR(12)');
    await addColumnIfNotExists('bonds', 'account', 'VARCHAR(255)');
    await addColumnIfNotExists('bonds', 'notes', 'TEXT');

    // PE Funds table - add manager, status, and notes columns
    await addColumnIfNotExists('pe_funds', 'manager', 'VARCHAR(255)');
    await addColumnIfNotExists('pe_funds', 'status', "VARCHAR(50) DEFAULT 'Active'");
    await addColumnIfNotExists('pe_funds', 'notes', 'TEXT');

    // PE Deals table - add ownership_percentage, sponsor, and notes columns
    await addColumnIfNotExists('pe_deals', 'ownership_percentage', 'DECIMAL(5,3)');
    await addColumnIfNotExists('pe_deals', 'sponsor', 'VARCHAR(255)');
    await addColumnIfNotExists('pe_deals', 'notes', 'TEXT');

    // Liquid Funds table - add manager, management_fee, performance_fee, redemption_frequency, lockup_end_date, status, and notes columns
    await addColumnIfNotExists('liquid_funds', 'manager', 'VARCHAR(255)');
    await addColumnIfNotExists('liquid_funds', 'management_fee', 'DECIMAL(5,3)');
    await addColumnIfNotExists('liquid_funds', 'performance_fee', 'DECIMAL(5,3)');
    await addColumnIfNotExists('liquid_funds', 'redemption_frequency', 'VARCHAR(50)');
    await addColumnIfNotExists('liquid_funds', 'lockup_end_date', 'DATE');
    await addColumnIfNotExists('liquid_funds', 'status', "VARCHAR(50) DEFAULT 'Active'");
    await addColumnIfNotExists('liquid_funds', 'notes', 'TEXT');

    // Cash Deposits table - add name, deposit_type, maturity_date, account, and notes columns
    await addColumnIfNotExists('cash_deposits', 'name', 'VARCHAR(255)');
    await addColumnIfNotExists('cash_deposits', 'deposit_type', 'VARCHAR(100)');
    await addColumnIfNotExists('cash_deposits', 'maturity_date', 'DATE');
    await addColumnIfNotExists('cash_deposits', 'account', 'VARCHAR(255)');
    await addColumnIfNotExists('cash_deposits', 'notes', 'TEXT');

    // Liabilities table - add liability_type, account, principal, rate_type, collateral, start_date, maturity_date, and notes columns
    await addColumnIfNotExists('liabilities', 'liability_type', 'VARCHAR(100)');
    await addColumnIfNotExists('liabilities', 'account', 'VARCHAR(255)');
    await addColumnIfNotExists('liabilities', 'principal', 'DECIMAL(15,6)');
    await addColumnIfNotExists('liabilities', 'rate_type', 'VARCHAR(50)');
    await addColumnIfNotExists('liabilities', 'collateral', 'VARCHAR(255)');
    await addColumnIfNotExists('liabilities', 'start_date', 'DATE');
    await addColumnIfNotExists('liabilities', 'maturity_date', 'DATE');
    await addColumnIfNotExists('liabilities', 'notes', 'TEXT');

    console.log('✅ All columns added/verified');

    // Create default user if not exists (for development)
    const defaultUserResult = await pool.query('SELECT id FROM users WHERE id = 1');
    if (defaultUserResult.rows.length === 0) {
      console.log('👤 Creating default user...');
      await pool.query(`
        INSERT INTO users (id, email, password_hash, name)
        VALUES (1, 'default@example.com', 'placeholder', 'Default User')
        ON CONFLICT (id) DO NOTHING
      `);
      console.log('✅ Default user created');
    }
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    throw error;
  }
};

export default pool;