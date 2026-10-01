import { pool } from '../src/db/connection';

async function checkRoles() {
    const roles = await pool.query('SELECT * FROM roles');
    console.log('Roles:', roles.rows);

    const perms = await pool.query(`
        SELECT r.name as role_name, p.slug as permission_slug
        FROM role_permissions rp
        JOIN roles r ON rp.role_id = r.id
        JOIN permissions p ON rp.permission_id = p.id
    `);
    console.log('Role Permissions count:', perms.rows.length);
    console.log('Employee permissions:', perms.rows.filter(r => r.role_name.toLowerCase() === 'employee'));
    process.exit(0);
}
checkRoles().catch(console.error);
