const pg = require('pg');
require('dotenv').config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const cols = await pool.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'approvals'
    ORDER BY ordinal_position;
  `);
  console.table(cols.rows);

  const sample = await pool.query('SELECT * FROM approvals LIMIT 2');
  console.log('Sample rows:', sample.rows);

  await pool.end();
}

run().catch(console.error);
