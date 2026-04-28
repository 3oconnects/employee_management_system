const pg = require('pg');
require('dotenv').config({ path: '.env' });

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const connStr = process.env.DATABASE_URL;
console.log('Connecting to:', connStr.replace(/:([^:@]+)%40/, ':%40[password]%40'));

const pool = new pg.Pool({
  connectionString: connStr,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 8000,
});

async function check() {
  try {
    // Check if user exists
    const r1 = await pool.query(
      "SELECT id, email, role, is_active, deleted_at, role_id, password FROM users WHERE email = 'admin@company.com'"
    );
    console.log('\n=== USER RECORD ===');
    console.log(JSON.stringify(r1.rows.map(r => ({...r, password: r.password ? '[HASHED]' : 'NULL'})), null, 2));

    // Check if roles table exists and has data
    const r2 = await pool.query("SELECT * FROM roles LIMIT 5");
    console.log('\n=== ROLES ===');
    console.log(JSON.stringify(r2.rows, null, 2));

    // Check if tenants exist
    const r3 = await pool.query("SELECT id, name FROM tenants LIMIT 5");
    console.log('\n=== TENANTS ===');
    console.log(JSON.stringify(r3.rows, null, 2));

    // Try the exact login query
    const r4 = await pool.query(
      `SELECT u.*, e.id as employee_id, r.id as role_record_id, r.name as role_name
       FROM users u
       LEFT JOIN employees e ON u.email = e.email AND u.tenant_id = e.tenant_id
       LEFT JOIN roles r ON u.role_id = r.id
       WHERE u.email = $1 AND u.is_active = true AND u.deleted_at IS NULL`,
      ['admin@company.com']
    );
    console.log('\n=== LOGIN QUERY RESULT ===');
    console.log('Row count:', r4.rows.length);
    if (r4.rows.length > 0) {
      const row = r4.rows[0];
      console.log('id:', row.id, 'role:', row.role, 'tenant_id:', row.tenant_id, 'is_active:', row.is_active);
    }
  } catch (e) {
    console.error('\n=== ERROR ===');
    console.error('Message:', e.message);
    console.error('Code:', e.code);
    console.error('Detail:', e.detail);
  } finally {
    await pool.end();
  }
}

check();
