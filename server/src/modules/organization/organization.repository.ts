import { pool } from '../../config/db';

export class OrganizationRepository {
    async getDepartments(tenantId: string) {
        const { rows } = await pool.query(`
            SELECT d.*, 
                   (SELECT COUNT(*) FROM employees e WHERE e.department_id = d.id AND e.tenant_id = $1) as employee_count,
                   (SELECT COUNT(*) FROM teams t WHERE t.department_id = d.id AND t.tenant_id = $1) as team_count
            FROM departments d
            WHERE d.tenant_id = $1
            ORDER BY d.name ASC
        `, [tenantId]);
        return rows;
    }

    async getEmployeeIdByUserId(userId: string | number, tenantId: string) {
        const res = await pool.query('SELECT id FROM employees WHERE user_id = $1 AND tenant_id = $2', [userId, tenantId]);
        return res.rows[0]?.id;
    }

    async insertApproval(approvalId: string, employeeId: number | undefined, type: string, metadata: any, tenantId: string) {
        await pool.query(`
            INSERT INTO approvals (id, employee_id, type, status, metadata, tenant_id)
            VALUES ($1, $2, $3, $4, $5, $6)
        `, [approvalId, employeeId || null, type, 'pending', JSON.stringify(metadata), tenantId]);
    }

    async updateDepartment(id: string, data: any, tenantId: string) {
        const { rows } = await pool.query(
            'UPDATE departments SET name = $1, description = $2, manager_id = $3, metadata = $4 WHERE id = $5 AND tenant_id = $6 RETURNING *',
            [data.name, data.description, data.manager_id, data.metadata || {}, id, tenantId]
        );
        return rows[0];
    }

    async deleteDepartment(id: string, tenantId: string) {
        await pool.query('DELETE FROM departments WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
    }

    async getTeams(tenantId: string, departmentId?: string) {
        let query = `
            SELECT t.*, d.name as department_name,
                   (SELECT COUNT(*) FROM employees e WHERE e.team_id = t.id AND e.tenant_id = $1) as employee_count
            FROM teams t
            JOIN departments d ON t.department_id = d.id
            WHERE t.tenant_id = $1
        `;
        const params: any[] = [tenantId];
        if (departmentId) {
            query += ' AND t.department_id = $2';
            params.push(departmentId);
        }
        query += ' ORDER BY t.name ASC';

        const { rows } = await pool.query(query, params);
        return rows;
    }

    async updateTeam(id: string, data: any, tenantId: string) {
        const { rows } = await pool.query(
            'UPDATE teams SET name = COALESCE($1, name), department_id = COALESCE($2, department_id), parent_team_id = COALESCE($3, parent_team_id), description = COALESCE($4, description), manager_id = COALESCE($5, manager_id), metadata = COALESCE($6, metadata) WHERE id = $7 AND tenant_id = $8 RETURNING *',
            [data.name, data.department_id, data.parent_team_id || null, data.description, data.manager_id, data.metadata || {}, id, tenantId]
        );
        return rows[0];
    }

    async deleteTeam(id: string, tenantId: string) {
        await pool.query('DELETE FROM teams WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
    }

    async getTeamStatus(userId: string | number, tenantId: string) {
        const userRes = await pool.query(`
            SELECT u.role, e.department_id, e.team_id, e.user_id, e.department, e.reporting_manager_id
            FROM users u
            LEFT JOIN employees e ON LOWER(e.email) = LOWER(u.email) AND e.tenant_id = u.tenant_id
            WHERE u.id = $1 AND u.tenant_id = $2
        `, [userId, tenantId]);
        
        if (userRes.rows.length === 0) return [];

        const { role, department_id: deptId, team_id: teamId, user_id: empUserId, department: deptName, reporting_manager_id: managerId } = userRes.rows[0];
        const userRole = (role || '').toLowerCase();
        const isAdmin = userRole === 'admin' || userRole === 'super_admin' || userRole === 'hr' || userRole === 'administrator';

        const { rows } = await pool.query(`
            SELECT DISTINCT
                e.id, e.name, e.position, e.email,
                u.availability_status,
                (u.availability_status = 'available') as is_available,
                (SELECT check_in_time 
                 FROM attendance 
                 WHERE employee_id = e.id 
                   AND date = CURRENT_DATE 
                   AND check_out_time IS NULL 
                   AND tenant_id = $1
                 LIMIT 1) as clocked_in_at,
                ((SELECT id 
                  FROM attendance 
                  WHERE employee_id = e.id 
                    AND date = CURRENT_DATE 
                    AND check_out_time IS NULL 
                    AND tenant_id = $1
                  LIMIT 1) IS NOT NULL) as is_clocked_in
            FROM employees e
            JOIN users u ON LOWER(e.email) = LOWER(u.email) AND e.tenant_id = u.tenant_id
            WHERE e.tenant_id = $1 
              AND e.deleted_at IS NULL
              AND u.id != $2
              AND (
                $3 = TRUE
                OR e.department_id = $4
                OR e.team_id = $5 
                OR e.reporting_manager_id = $6
                OR e.user_id = $8
                OR (e.department_id IS NULL AND e.department = $7 AND $7 IS NOT NULL)
              )
            ORDER BY is_clocked_in DESC, is_available DESC, e.name ASC
        `, [tenantId, userId, isAdmin, deptId || -1, teamId || -1, empUserId || -1, deptName || null, managerId || -1]);

        return rows;
    }
}
