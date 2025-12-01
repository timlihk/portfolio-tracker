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
        purchase_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS bonds (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        name VARCHAR(255) NOT NULL,
        bond_type VARCHAR(100),
        face_value DECIMAL(15,6),
        coupon_rate DECIMAL(5,3),
        maturity_date DATE,
        rating VARCHAR(10),
        purchase_price DECIMAL(15,6),
        current_value DECIMAL(15,6),
        currency VARCHAR(10) DEFAULT 'USD',
        purchase_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS pe_funds (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        fund_name VARCHAR(255) NOT NULL,
        fund_type VARCHAR(100),
        vintage_year INTEGER,
        commitment DECIMAL(15,6),
        called_capital DECIMAL(15,6),
        nav DECIMAL(15,6),
        distributions DECIMAL(15,6),
        commitment_date DATE,
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
        status VARCHAR(50) DEFAULT 'Active',
        investment_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS liquid_funds (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        fund_name VARCHAR(255) NOT NULL,
        fund_type VARCHAR(100),
        strategy VARCHAR(100),
        investment_amount DECIMAL(15,6),
        current_value DECIMAL(15,6),
        ytd_return DECIMAL(5,3),
        investment_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS cash_deposits (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        account_name VARCHAR(255) NOT NULL,
        amount DECIMAL(15,6),
        currency VARCHAR(10) DEFAULT 'USD',
        interest_rate DECIMAL(5,3),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS liabilities (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        name VARCHAR(255) NOT NULL,
        type VARCHAR(100),
        outstanding_balance DECIMAL(15,6),
        interest_rate DECIMAL(5,3),
        monthly_payment DECIMAL(15,6),
        currency VARCHAR(10) DEFAULT 'USD',
        status VARCHAR(50) DEFAULT 'Active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('✅ Database tables initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    throw error;
  }
};

export default pool;