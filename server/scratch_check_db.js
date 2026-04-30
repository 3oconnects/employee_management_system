const { pool } = require('./src/config/db');
require('dotenv').config();

async function test() {
    const tenantId = 'tenant_default';
    const userId = 1;
    const role = 'super_admin';

    try {
        const empResult = await pool.query('SELECT id FROM employees WHERE user_id = $1 AND tenant_id = $2', [userId, tenantId]);
        const currentEmployeeId = empResult.rows[0]?.id;

        let filterClause = "WHERE 1=1";
        const params = [tenantId];

        const query = `
            WITH all_pending AS (
                -- Standard Approvals
                SELECT 
                    a.id, a.employee_id, e.name as employee_name, e.department, a.type, a.status, a.metadata, a.requested_by, a.created_at,
                    e.manager_id
                FROM approvals a 
                JOIN employees e ON a.employee_id = e.id 
                WHERE a.status = 'pending' AND a.tenant_id = $1

                UNION ALL

                -- Leave Requests
                SELECT 
                    l.id::text, l.employee_id, e.name as employee_name, e.department, 'leave' as type, 'pending' as status,
                    json_build_object('leave_type', l.type, 'start_date', l.start_date, 'end_date', l.end_date, 'reason', l.reason) as metadata,
                    l.employee_id as requested_by, l.created_at,
                    e.manager_id
                FROM leave_requests l
                JOIN employees e ON l.employee_id = e.id
                WHERE l.status IN ('pending', 'pending_audit') AND l.tenant_id = $1

                UNION ALL

                -- Onboarding Candidates
                SELECT 
                    e.id as id, e.id as employee_id, e.name as employee_name, e.department, 'onboarding' as type, 'pending' as status,
                    json_build_object('department', e.department, 'position', e.position) as metadata,
                    e.id as requested_by, e.created_at,
                    e.manager_id
                FROM employees e
                WHERE e.status = 'onboarding' AND e.tenant_id = $1
            )
            SELECT * FROM all_pending a
            ${filterClause.replace(/e\./g, 'a.')} 
            ORDER BY a.department ASC, a.created_at DESC
        `;
        
        console.log('Running query...');
        const result = await pool.query(query, params);
        console.log('Success! Count:', result.rows.length);
    } catch (err) {
        console.error('FAILED:', err.message);
    } finally {
        process.exit();
    }
}

test();
