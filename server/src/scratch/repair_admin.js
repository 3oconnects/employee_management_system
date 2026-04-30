const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function repair() {
    try {
        console.log('🛠️ Repairing Admin Credentials...');
        const hashed = await bcrypt.hash('admin123', 10);
        
        // 1. Ensure tenant exists
        await pool.query("INSERT INTO tenants (id, name, slug, status) VALUES ('tenant_default', 'AURA Default', 'default', 'active') ON CONFLICT (id) DO NOTHING");
        
        // 2. Check if user exists
        const { rows } = await pool.query("SELECT id FROM users WHERE email = 'admin@company.com'");
        
        if (rows.length > 0) {
            console.log('  Updating existing admin password...');
            await pool.query(
                "UPDATE users SET password = $1, is_active = true, deleted_at = NULL, tenant_id = 'tenant_default', role = 'admin' WHERE email = 'admin@company.com'",
                [hashed]
            );
        } else {
            console.log('  Seeding new admin user...');
            await pool.query(
                "INSERT INTO users (name, email, password, role, tenant_id, is_active) VALUES ('System Admin', 'admin@company.com', $1, 'admin', 'tenant_default', true)",
                [hashed]
            );
        }
        
        // 3. Ensure employee record exists
        await pool.query(`
            INSERT INTO employees (id, name, email, department, position, tenant_id, status)
            VALUES ('EMP000', 'System Admin', 'admin@company.com', 'Management', 'Admin', 'tenant_default', 'active')
            ON CONFLICT (id) DO UPDATE SET email = 'admin@company.com'
        `);
        
        console.log('✅ Admin credentials repaired: admin@company.com / admin123');
        await pool.end();
    } catch (err) {
        console.error('❌ Repair failed:', err);
        process.exit(1);
    }
}
repair();
