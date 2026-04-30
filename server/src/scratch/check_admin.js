const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function check() {
    try {
        const res = await pool.query("SELECT id, email, password, role, is_active, tenant_id FROM users WHERE email = 'admin@company.com'");
        console.log('User found:', res.rows[0]);
        if (res.rows[0]) {
            const bcrypt = require('bcryptjs');
            const match = await bcrypt.compare('admin123', res.rows[0].password);
            console.log('Password "admin123" matches:', match);
        }
        await pool.end();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
check();
