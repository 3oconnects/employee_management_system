import { pool } from '../src/config/db';

async function test() {
    const res = await pool.query(`
        SELECT t.*, u.name as applicant_name, u.email as applicant_email,
               COALESCE(json_agg(te.* ORDER BY te.created_at) FILTER (WHERE te.id IS NOT NULL), '[]'::json) AS entries
        FROM timesheets t
        JOIN users u ON u.id = t.user_id
        LEFT JOIN timesheet_entries te ON te.timesheet_id = t.id
        WHERE t.status = 'submitted' AND t.tenant_id = 'tenant_default'
        GROUP BY t.id, u.id
        ORDER BY t.updated_at DESC
    `);
    console.log('Result count:', res.rows.length);
    await pool.end();
}

test().catch(console.error);
