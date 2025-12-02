import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: 'postgresql://postgres:ss123456@103.122.85.61:9095/RECOV'
});

async function addColumn() {
  try {
    await pool.query(`ALTER TABLE tts_settings ADD COLUMN IF NOT EXISTS behaviour TEXT DEFAULT 'normal'`);
    console.log('✅ behaviour column added successfully!');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

addColumn();
