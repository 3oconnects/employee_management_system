import { pool } from '../src/db/connection';

async function check() {
    const res = await pool.query('SELECT p.module, p.action FROM role_permissions rp JOIN permissions p ON p.id = rp.permission_id WHERE rp.role_id = 4');
    console.log('Employee permissions for role 4:', res.rows);
    const allPerms = await pool.query('SELECT * FROM permissions LIMIT 20');
    console.log('Sample permissions:', allPerms.rows);
    process.exit(0);
}
check().catch(console.error);
