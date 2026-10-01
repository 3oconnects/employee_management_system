const pg = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const hash = await bcrypt.hash('Admin@123', 10);
  const emails = ['admin@company.com', 'priya@company.com', 'alex.rivers@company.com'];
  for (const email of emails) {
    await pool.query('UPDATE users SET password = $1 WHERE email = $2', [hash, email]);
    console.log('Updated', email);
  }
  await pool.end();
}

run().catch(console.error);
