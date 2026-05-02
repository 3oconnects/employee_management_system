const { Pool } = require('pg');
require('dotenv').config({ path: '../.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/ems_db',
});

async function checkData() {
  try {
    console.log('--- USERS ---');
    const users = await pool.query("SELECT id, email, role, role_id FROM users");
    console.table(users.rows);

    console.log('--- ROLES ---');
    const roles = await pool.query("SELECT id, name, dashboard_type FROM roles");
    console.table(roles.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

checkData();
