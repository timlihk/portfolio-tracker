import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: 'postgresql://dummy:pass@localhost:5432/db',
  connectionTimeoutMillis: 2000,
});

async function test() {
  console.log('Testing pool.query...');
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('Success:', result.rows[0]);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
    console.log('Pool closed');
  }
}

test();