const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function check() {
  try {
    const res = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'approvals'
    `);
    console.log('--- APPROVALS COLUMNS ---');
    console.table(res.rows);
    
    const res2 = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'leave_requests'
    `);
    console.log('--- LEAVE_REQUESTS COLUMNS ---');
    console.table(res2.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

check();
