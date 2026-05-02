const { Pool } = require('pg');
require('dotenv').config({ path: '../.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/ems_db',
});

async function checkUser() {
  try {
    const res = await pool.query("SELECT id, name, email, role, tenant_id, role_id FROM users WHERE email = 'admin@company.com'");
    console.log('User Admin:', res.rows[0]);
    if (res.rows[0]?.role_id) {
        const roleRes = await pool.query("SELECT * FROM roles WHERE id = $1", [res.rows[0].role_id]);
        console.log('Role Record:', roleRes.rows[0]);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

checkUser();
