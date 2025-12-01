import { initDatabase } from '../config/database.js';

async function runMigrations() {
  try {
    console.log('🚀 Starting database migrations...');
    await initDatabase();
    console.log('✅ Database migrations completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database migrations failed:', error);
    process.exit(1);
  }
}

runMigrations();