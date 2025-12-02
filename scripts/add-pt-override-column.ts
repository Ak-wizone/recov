import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function addColumn() {
  try {
    await pool.query('ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_terms_override INTEGER');
    console.log('✅ Column payment_terms_override added successfully');
  } catch (error: any) {
    if (error.code === '42701') {
      console.log('⚠️ Column already exists');
    } else {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  } finally {
    await pool.end();
    process.exit(0);
  }
}

addColumn();
