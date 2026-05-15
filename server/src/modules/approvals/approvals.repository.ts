import { pool } from '../../config/db';

export class ApprovalsRepository {
    async getEmployeeIdByUserId(userId: string | number) {
        const empResult = await pool.query('SELECT id FROM employees WHERE user_id = $1', [userId]);
        return empResult.rows[0]?.id;
    }

    async getApprovals(tenantId: string, currentEmployeeId: number | undefined, role: string, isHistory: boolean) {
        let filterClause = "WHERE (ap.tenant_id = $1 OR ap.tenant_id IS NULL OR ap.tenant_id = '')"; 
        const params: any[] = [tenantId];

        if ((role === 'manager' || role === 'employee') && currentEmployeeId) {
            filterClause += " AND (ap.manager_id = $2 OR ap.requested_by = $2)";
            params.push(currentEmployeeId);
        }

        const standardStatus = isHistory ? "('approved', 'rejected', 'completed')" : "('pending', 'active', 'onboarding')";
        const leaveStatus = isHistory ? "('approved', 'rejected', 'cancelled')" : "('pending', 'pending_audit')";
        const onboardingStatus = isHistory ? "('active', 'rejected')" : "('onboarding', 'pending')";

        const query = `
            WITH all_pending AS (
                SELECT 
                    'std-' || approvals.id as id, 
                    approvals.employee_id as employee_id, 
                    employees.name as employee_name, 
                    employees.department as department, 
                    approvals.type as type, 
                    approvals.status as status, 
                    approvals.metadata::jsonb as metadata, 
                    approvals.requested_by as requested_by, 
                    approvals.created_at as created_at,
                    employees.manager_id as manager_id,
                    approvals.tenant_id as tenant_id
                FROM approvals
                JOIN employees ON approvals.employee_id = employees.id 
                WHERE LOWER(approvals.status) IN ${standardStatus} 

                UNION ALL

                SELECT 
                    'leave-' || l.id as id, 
                    l.employee_id as employee_id, 
                    e.name as employee_name, 
                    e.department as department, 
                    'leave' as type, 
                    l.status as status,
                    json_build_object('leave_type', l.type, 'start_date', l.start_date, 'end_date', l.end_date, 'reason', l.reason)::jsonb as metadata,
                    l.employee_id as requested_by, 
                    l.created_at as created_at,
                    e.manager_id as manager_id,
                    l.tenant_id as tenant_id
                FROM leave_requests l
                JOIN employees e ON l.employee_id = e.id
                WHERE (NOT ${isHistory} AND LOWER(l.status) IN ${leaveStatus})
                   OR (${isHistory} AND LOWER(l.status) IN ('approved', 'rejected', 'cancelled')) 

                UNION ALL

                SELECT 
                    'onb-' || e.id as id, 
                    e.id as employee_id, 
                    e.name as employee_name, 
                    e.department as department, 
                    'onboarding' as type, 
                    e.status as status,
                    json_build_object('department', e.department, 'position', e.position)::jsonb as metadata,
                    e.id as requested_by, 
                    e.created_at as created_at,
                    e.manager_id as manager_id,
                    e.tenant_id as tenant_id
                FROM employees e
                WHERE LOWER(e.status) IN ${onboardingStatus} 

                UNION ALL

                SELECT 
                    'ts-' || t.id as id, 
                    t.employee_id as employee_id, 
                    e.name as employee_name, 
                    e.department as department, 
                    'timesheet' as type, 
                    t.status as status,
                    json_build_object('project', t.project, 'hours', t.hours, 'date', t.date)::jsonb as metadata,
                    t.employee_id as requested_by, 
                    t.created_at as created_at,
                    e.manager_id as manager_id,
                    t.tenant_id as tenant_id
                FROM timesheets t
                JOIN employees e ON t.employee_id = e.id
                WHERE (NOT ${isHistory} AND LOWER(t.status) = 'submitted')
                   OR (${isHistory} AND LOWER(t.status) IN ('approved', 'rejected'))

                UNION ALL

                SELECT 
                    'claim-' || c.id as id, 
                    c.employee_id as employee_id, 
                    e.name as employee_name, 
                    e.department as department, 
                    'claim' as type, 
                    c.status as status,
                    json_build_object('category', c.category, 'amount', c.amount, 'description', c.description)::jsonb as metadata,
                    c.employee_id as requested_by, 
                    c.created_at as created_at,
                    e.manager_id as manager_id,
                    c.tenant_id as tenant_id
                FROM claims c
                JOIN employees e ON c.employee_id = e.id
                WHERE (NOT ${isHistory} AND LOWER(c.status) = 'pending')
                   OR (${isHistory} AND LOWER(c.status) IN ('approved', 'rejected'))
            )
            SELECT 
                id, employee_id, employee_name, department, type, status, metadata, requested_by, created_at, manager_id
            FROM all_pending ap
            ${filterClause}
            ORDER BY department ASC, created_at DESC
        `;
        
        const result = await pool.query(query, params);
        return result.rows;
    }

    async createApprovalRequest(id: string, employeeId: string | number, type: string, status: string, tenantId: string) {
        await pool.query(
            'INSERT INTO approvals (id, employee_id, type, status, tenant_id) VALUES ($1, $2, $3, $4, $5)', 
            [id, employeeId, type, status, tenantId]
        );
    }

    async getApprovalMetadata(id: string, tenantId: string) {
        const { rows } = await pool.query('SELECT metadata FROM approvals WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
        return rows[0]?.metadata;
    }

    async executeTeamCreation(id: string, meta: any, status: string, tenantId: string, client: any) {
        const teamRes = await client.query(
            'INSERT INTO teams (name, department_id, parent_team_id, description, manager_id, metadata, tenant_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
            [meta.name, meta.department_id, meta.parent_team_id || null, meta.description, meta.owner_id || null, meta.metadata || {}, tenantId]
        );
        
        let parentNodeId = null;
        if (meta.parent_team_id) {
            const pnRes = await client.query('SELECT id FROM org_nodes WHERE entity_type = $1 AND entity_id = $2 AND tenant_id = $3', ['team', meta.parent_team_id, tenantId]);
            if (pnRes.rows.length > 0) parentNodeId = pnRes.rows[0].id;
        } else {
            const pnRes = await client.query('SELECT id FROM org_nodes WHERE entity_type = $1 AND entity_id = $2 AND tenant_id = $3', ['department', meta.department_id, tenantId]);
            if (pnRes.rows.length > 0) parentNodeId = pnRes.rows[0].id;
        }

        const nodeRes = await client.query(
            'INSERT INTO org_nodes (entity_type, entity_id, parent_node_id, name, category, tenant_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
            ['team', teamRes.rows[0].id, parentNodeId, meta.name, meta.category || 'core', tenantId]
        );
        await client.query('INSERT INTO org_governance (node_id, owner_id, tenant_id) VALUES ($1, $2, $3)', [nodeRes.rows[0].id, meta.owner_id || null, tenantId]);
        await client.query('UPDATE approvals SET status = $1, actioned_at = NOW() WHERE id = $2 AND tenant_id = $3', [status, id, tenantId]);
    }

    async executeDepartmentCreation(id: string, meta: any, status: string, tenantId: string, client: any) {
        const deptRes = await client.query(
            'INSERT INTO departments (name, description, manager_id, metadata, tenant_id) VALUES ($1, $2, $3, $4, $5) RETURNING id',
            [meta.name, meta.description, meta.owner_id || null, meta.metadata || {}, tenantId]
        );
        const nodeRes = await client.query(
            'INSERT INTO org_nodes (entity_type, entity_id, name, category, tenant_id) VALUES ($1, $2, $3, $4, $5) RETURNING id',
            ['department', deptRes.rows[0].id, meta.name, meta.category || 'core', tenantId]
        );
        await client.query('INSERT INTO org_governance (node_id, owner_id, tenant_id) VALUES ($1, $2, $3)', [nodeRes.rows[0].id, meta.owner_id || null, tenantId]);
        await client.query('UPDATE approvals SET status = $1, actioned_at = NOW() WHERE id = $2 AND tenant_id = $3', [status, id, tenantId]);
    }

    async updateLeaveStatus(id: string, status: string, tenantId: string) {
        await pool.query('UPDATE leave_requests SET status = $1 WHERE id = $2 AND tenant_id = $3', [status, id, tenantId]);
    }

    async updateEmployeeStatus(id: string, status: string, tenantId: string) {
        await pool.query('UPDATE employees SET status = $1 WHERE id = $2 AND tenant_id = $3', [status, id, tenantId]);
    }

    async updateTimesheetStatus(id: string, status: string, tenantId: string) {
        await pool.query('UPDATE timesheets SET status = $1 WHERE id = $2 AND tenant_id = $3', [status, id, tenantId]);
    }

    async updateClaimStatus(id: string, status: string, tenantId: string) {
        await pool.query('UPDATE claims SET status = $1 WHERE id = $2 AND tenant_id = $3', [status, id, tenantId]);
    }

    async updateApprovalStatus(id: string, status: string, tenantId: string) {
        await pool.query('UPDATE approvals SET status = $1, actioned_at = NOW() WHERE id = $2 AND tenant_id = $3', [status, id, tenantId]);
    }
}
