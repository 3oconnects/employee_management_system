import { pool } from '../../config/db';
import { ApprovalKind } from './approvals.policy';
import { resolveEmployeeIdForUser } from '../../core/security/identity';

export class ApprovalsRepository {
    async getEmployeeIdByUserId(userId: string | number) {
        const empResult = await pool.query('SELECT id FROM employees WHERE user_id = $1', [userId]);
        return empResult.rows[0]?.id;
    }

    /** Employee id -> user id of who they report to (reporting_manager_id, else the manager employee's login). */
    async getReportingManagerUserIds(employeeIds: string[], tenantId: string, db: { query: (sql: string, p: any[]) => Promise<{ rows: any[] }> } = pool) {
        const out = new Map<string, number | null>();
        if (!employeeIds.length) return out;
        const { rows } = await db.query(
            `SELECT e.id, COALESCE(e.reporting_manager_id, mu.id) AS mgr_user_id
             FROM employees e
             LEFT JOIN employees me ON me.id = e.manager_id
             LEFT JOIN users mu ON mu.tenant_id = e.tenant_id AND (mu.id = me.user_id OR LOWER(mu.email) = LOWER(me.email))
             WHERE e.id = ANY($1::text[]) AND e.tenant_id = $2`,
            [employeeIds, tenantId],
        );
        for (const r of rows) out.set(r.id, r.mgr_user_id != null ? Number(r.mgr_user_id) : null);
        return out;
    }

    async getApprovals(
        tenantId: string, who: { userId: number | string; email: string; employeeId: string | null }, role: string, isHistory: boolean,
    ) {
        let filterClause = "WHERE (ap.tenant_id = $1 OR ap.tenant_id IS NULL OR ap.tenant_id = '')"; 
        const params: any[] = [tenantId];

        if (role === 'manager' || role === 'employee') {
            // What I raised, what is about me, what my direct reports raised, or requests from employees without an assigned reporting manager.
            filterClause += ` AND (
                ($2::text IS NOT NULL AND (ap.employee_id = $2 OR ap.requested_by = $2 OR ap.manager_id = $2))
                OR LOWER(ap.requested_by) = LOWER($3)
                OR ap.requested_by = $4::text
                OR subj.reporting_manager_id = $4::int
                OR (subj.reporting_manager_id IS NULL AND subj.manager_id IS NULL)
            )`;
            params.push(who.employeeId, who.email, String(who.userId));
        }

        const standardStatus = isHistory ? "('approved', 'rejected', 'completed')" : "('pending', 'active', 'onboarding')";
        const leaveStatus = isHistory ? "('approved', 'rejected', 'cancelled')" : "('pending', 'pending_audit')";
        const onboardingStatus = isHistory ? "('active', 'rejected')" : "('onboarding', 'pending')";

        const query = `
            WITH all_pending AS (
                SELECT 
                    'std-' || approvals.id as id, 
                    approvals.employee_id as employee_id, 
                    COALESCE(employees.name, approvals.metadata->>'name', 'Staff Member') as employee_name, 
                    COALESCE(employees.department, approvals.metadata->>'department', 'Operations') as department, 
                    approvals.type as type, 
                    approvals.status as status, 
                    approvals.metadata::jsonb as metadata, 
                    approvals.requested_by as requested_by, 
                    approvals.created_at as created_at,
                    employees.manager_id as manager_id,
                    approvals.tenant_id as tenant_id
                FROM approvals
                LEFT JOIN employees ON approvals.employee_id = employees.id 
                WHERE LOWER(approvals.status) IN ${standardStatus} 

                UNION ALL

                SELECT 
                    'leave-' || l.id as id, 
                    l.employee_id as employee_id, 
                    e.name as employee_name, 
                    e.department as department, 
                    'leave' as type, 
                    l.status as status,
                    json_build_object('leave_type', COALESCE(lt.name, 'Leave'), 'start_date', l.start_date, 'end_date', l.end_date, 'reason', l.reason)::jsonb as metadata,
                    l.employee_id as requested_by, 
                    l.created_at as created_at,
                    e.manager_id as manager_id,
                    l.tenant_id as tenant_id
                FROM leave_requests l
                JOIN employees e ON l.employee_id = e.id
                LEFT JOIN leave_types lt ON lt.id = l.leave_type_id
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
                ap.id, ap.employee_id, ap.employee_name, ap.department, ap.type, ap.status, ap.metadata, ap.requested_by, ap.created_at, ap.manager_id
            FROM all_pending ap
            LEFT JOIN employees subj ON subj.id = ap.employee_id
            ${filterClause}
            ORDER BY ap.department ASC, ap.created_at DESC
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

    async createSelfServiceRequest(id: string, employeeId: string, type: string, metadata: object, requestedBy: string, tenantId: string) {
        await pool.query(
            `INSERT INTO approvals (id, employee_id, type, status, metadata, requested_by, tenant_id)
             VALUES ($1, $2, $3, 'pending', $4, $5, $6)`,
            [id, employeeId, type, JSON.stringify(metadata), requestedBy, tenantId]
        );
    }

    async executeTeamCreation(id: string, meta: any, status: string, tenantId: string, client: any) {
        const deptId = meta.department_id && meta.department_id !== '' ? parseInt(meta.department_id, 10) : null;
        const parentTeamId = meta.parent_team_id && meta.parent_team_id !== '' ? parseInt(meta.parent_team_id, 10) : null;
        const ownerId = meta.owner_id && meta.owner_id !== '' ? parseInt(meta.owner_id, 10) : null;

        const teamRes = await client.query(
            'INSERT INTO teams (name, department_id, parent_team_id, description, manager_id, metadata, tenant_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
            [meta.name, deptId, parentTeamId, meta.description, ownerId, meta.metadata || {}, tenantId]
        );
        
        let parentNodeId = null;
        if (parentTeamId) {
            const pnRes = await client.query('SELECT id FROM org_nodes WHERE entity_type = $1 AND entity_id = $2', ['team', parentTeamId]);
            if (pnRes.rows.length > 0) parentNodeId = pnRes.rows[0].id;
        } else if (deptId) {
            const pnRes = await client.query('SELECT id FROM org_nodes WHERE entity_type = $1 AND entity_id = $2', ['department', deptId]);
            if (pnRes.rows.length > 0) parentNodeId = pnRes.rows[0].id;
        }

        const nodeRes = await client.query(
            'INSERT INTO org_nodes (entity_type, entity_id, parent_node_id, name, category) VALUES ($1, $2, $3, $4, $5) RETURNING id',
            ['team', teamRes.rows[0].id, parentNodeId, meta.name, meta.category || 'core']
        );
        await client.query('INSERT INTO org_governance (node_id, owner_id) VALUES ($1, $2)', [nodeRes.rows[0].id, ownerId]);
        // Move the listed people into the new team (and its department), within this tenant only
        const memberIds: string[] = Array.isArray(meta.member_ids) ? meta.member_ids.map(String) : [];
        if (memberIds.length) {
            let deptName: string | null = null;
            if (deptId) {
                const d = await client.query('SELECT name FROM departments WHERE id = $1 AND tenant_id = $2', [deptId, tenantId]);
                deptName = d.rows[0]?.name ?? null;
            }
            await client.query(
                `UPDATE employees SET team_id = $1,
                        department_id = COALESCE($2::int, department_id),
                        department = COALESCE($3, department)
                 WHERE id = ANY($4::text[]) AND tenant_id = $5 AND deleted_at IS NULL`,
                [teamRes.rows[0].id, deptId, deptName, memberIds, tenantId]
            );
        }
        await client.query('UPDATE approvals SET status = $1 WHERE id = $2 AND (tenant_id = $3 OR tenant_id IS NULL OR tenant_id = $4)', [status, id, tenantId, '']);
    }

    async executeDepartmentCreation(id: string, meta: any, status: string, tenantId: string, client: any) {
        const ownerId = meta.owner_id && meta.owner_id !== '' ? parseInt(meta.owner_id, 10) : null;
        const code = meta.code || (meta.name.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4) + Math.floor(100 + Math.random() * 900));

        const deptRes = await client.query(
            'INSERT INTO departments (name, code, head_user_id, description, metadata, tenant_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
            [meta.name, code, ownerId, meta.description, meta.metadata || {}, tenantId]
        );
        const nodeRes = await client.query(
            'INSERT INTO org_nodes (entity_type, entity_id, name, category) VALUES ($1, $2, $3, $4) RETURNING id',
            ['department', deptRes.rows[0].id, meta.name, meta.category || 'core']
        );
        await client.query('INSERT INTO org_governance (node_id, owner_id) VALUES ($1, $2)', [nodeRes.rows[0].id, ownerId]);

        await client.query('UPDATE approvals SET status = $1 WHERE id = $2 AND (tenant_id = $3 OR tenant_id IS NULL OR tenant_id = $4)', [status, id, tenantId, '']);
    }

    /** Applies an approved role change / promotion / team change to the requester. */
    async applySelfServiceChange(client: any, row: Record<string, any>, tenantId: string) {
        const meta = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : (row.metadata || {});
        const empId = row.employee_id;
        if (row.type === 'promotion' && meta.requested_designation) {
            await client.query('UPDATE employees SET position = $1 WHERE id = $2 AND tenant_id = $3', [meta.requested_designation, empId, tenantId]);
        } else if (row.type === 'team_change' && meta.target_team_id) {
            const t = await client.query(
                `SELECT t.id, t.department_id, d.name AS dept_name FROM teams t
                 LEFT JOIN departments d ON d.id = t.department_id
                 WHERE t.id = $1 AND t.tenant_id = $2`, [Number(meta.target_team_id), tenantId]);
            if (!t.rows[0]) return;
            await client.query(
                `UPDATE employees SET team_id = $1, department_id = COALESCE($2::int, department_id), department = COALESCE($3, department)
                 WHERE id = $4 AND tenant_id = $5`,
                [t.rows[0].id, t.rows[0].department_id, t.rows[0].dept_name, empId, tenantId]);
        } else if (row.type === 'role_change' && meta.requested_role_id) {
            const r = await client.query('SELECT id, name FROM roles WHERE id = $1 AND tenant_id = $2', [Number(meta.requested_role_id), tenantId]);
            const e = await client.query('SELECT email FROM employees WHERE id = $1 AND tenant_id = $2', [empId, tenantId]);
            if (!r.rows[0] || !e.rows[0]) return;
            await client.query('UPDATE users SET role_id = $1, role = $2 WHERE LOWER(email) = LOWER($3) AND tenant_id = $4',
                [r.rows[0].id, r.rows[0].name, e.rows[0].email, tenantId]);
        }
    }

    /** Name of a role, for the elevated-role guard. */
    async getRoleName(roleId: number, tenantId: string): Promise<string | null> {
        const { rows } = await pool.query('SELECT name FROM roles WHERE id = $1 AND tenant_id = $2', [roleId, tenantId]);
        return rows[0]?.name ?? null;
    }

    // ── Decision helpers (HF-4). All take the transaction client and are tenant-strict. ──

    /** The acting user's employee id (users and employees are linked by user_id or by email). */
    async resolveActorEmployeeId(client: any, tenantId: string, userId: number | string, email: string): Promise<string | null> {
        return resolveEmployeeIdForUser(tenantId, userId, email, client);
    }

    /**
     * Loads and row-locks the record being decided, in the caller's tenant only. A concurrent
     * decision waits here and then sees the new status, so only one can win.
     */
    async lockApproval(client: any, kind: ApprovalKind, id: string, tenantId: string): Promise<Record<string, any> | null> {
        const table = { std: 'approvals', leave: 'leave_requests', onboarding: 'employees', timesheet: 'timesheets', claim: 'claims' }[kind];
        // integer keys: a non-numeric id cannot exist, and must not reach the database as a bad cast
        if ((kind === 'leave' || kind === 'timesheet') && !/^\d+$/.test(id)) return null;
        const { rows } = await client.query(
            `SELECT * FROM ${table} WHERE id = $1 AND tenant_id = $2 FOR UPDATE`,
            [id, tenantId]
        );
        return rows[0] ?? null;
    }

    /**
     * Writes the decision. `extras` is used only by the direct leave/timesheet routes, which have always
     * recorded the approver and (timesheets) remarks; the unified-inbox path writes the status alone.
     */
    async setDecision(
        client: any, kind: ApprovalKind, id: string, status: string, tenantId: string,
        extras?: { approvedBy?: number | string; remarks?: string | null },
    ) {
        const table = { std: 'approvals', leave: 'leave_requests', onboarding: 'employees', timesheet: 'timesheets', claim: 'claims' }[kind];
        if (extras?.approvedBy !== undefined && kind === 'leave') {
            await client.query(
                'UPDATE leave_requests SET status = $1, approved_by = $2, updated_at = NOW() WHERE id = $3 AND tenant_id = $4',
                [status, extras.approvedBy, id, tenantId]);
            return;
        }
        if (extras?.approvedBy !== undefined && kind === 'timesheet') {
            await client.query(
                'UPDATE timesheets SET status = $1, approved_by = $2, remarks = $3, updated_at = NOW() WHERE id = $4 AND tenant_id = $5',
                [status, extras.approvedBy, extras.remarks ?? null, id, tenantId]);
            return;
        }
        await client.query(`UPDATE ${table} SET status = $1 WHERE id = $2 AND tenant_id = $3`, [status, id, tenantId]);
    }

    /** Applies an approved attendance regularization: the one place attendance is changed by a request. */
    async applyAttendanceRegularization(client: any, row: Record<string, any>, tenantId: string) {
        const m = row.metadata || {};
        await client.query(
            `INSERT INTO attendance (employee_id, check_in_time, check_out_time, date, status, tenant_id)
             VALUES ($1, $2, $3, $4::date, 'present', $5)`,
            [
                row.employee_id,
                `${m.date} ${m.check_in_time}`,
                m.check_out_time ? `${m.date} ${m.check_out_time}` : null,
                m.date,
                tenantId,
            ]
        );
    }

    async employeeExistsInTenant(employeeId: string | number, tenantId: string): Promise<boolean> {
        const { rows } = await pool.query('SELECT 1 FROM employees WHERE id = $1 AND tenant_id = $2', [employeeId, tenantId]);
        return rows.length > 0;
    }
}
