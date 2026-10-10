import { pool } from '../../config/db';

export class OrganizationRepository {
    async getDepartments(tenantId: string) {
        const { rows } = await pool.query(`
            SELECT d.*, 
                   (SELECT COUNT(*) FROM employees e 
                    WHERE e.department_id = d.id 
                      AND (e.tenant_id = $1 OR e.tenant_id = 'tenant_default' OR e.tenant_id = 'default')
                      AND e.deleted_at IS NULL 
                      AND (e.status IS NULL OR e.status <> 'terminated')) as employee_count,
                   (SELECT COUNT(*) FROM teams t 
                    WHERE t.department_id = d.id 
                      AND (t.tenant_id = $1 OR t.tenant_id = 'tenant_default' OR t.tenant_id = 'default')) as team_count
            FROM departments d
            WHERE d.tenant_id = $1 OR d.tenant_id = 'tenant_default' OR d.tenant_id = 'default'
            ORDER BY d.name ASC
        `, [tenantId]);
        return rows;
    }

    async getEmployeeIdByUserId(userId: string | number, tenantId: string) {
        const res = await pool.query('SELECT id FROM employees WHERE user_id = $1 AND (tenant_id = $2 OR tenant_id = \'tenant_default\' OR tenant_id = \'default\')', [userId, tenantId]);
        return res.rows[0]?.id;
    }

    async createDepartment(data: any, tenantId: string) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const ownerId = data.owner_id ? parseInt(String(data.owner_id), 10) : (data.manager_id ? parseInt(String(data.manager_id), 10) : null);
            const code = data.code || (data.name.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4) + Math.floor(100 + Math.random() * 900));
            const meta = typeof data.metadata === 'string' ? JSON.parse(data.metadata) : (data.metadata || {});

            const deptRes = await client.query(
                `INSERT INTO departments (name, code, head_user_id, description, metadata, tenant_id) 
                 VALUES ($1, $2, $3, $4, $5, $6) 
                 RETURNING *`,
                [data.name, code, ownerId, data.description || null, meta, tenantId]
            );
            const newDept = deptRes.rows[0];

            const nodeRes = await client.query(
                `INSERT INTO org_nodes (entity_type, entity_id, name, category, tenant_id) 
                 VALUES ($1, $2, $3, $4, $5) 
                 RETURNING id`,
                ['department', newDept.id, data.name, data.category || 'core', tenantId]
            );

            await client.query(
                `INSERT INTO org_governance (node_id, owner_id, tenant_id) 
                 VALUES ($1, $2, $3) 
                 ON CONFLICT (node_id) DO UPDATE SET owner_id = EXCLUDED.owner_id`,
                [nodeRes.rows[0].id, ownerId, tenantId]
            );

            await client.query('COMMIT');
            return newDept;
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }

    async createTeam(data: any, tenantId: string) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const deptId = parseInt(String(data.department_id), 10);
            const parentTeamId = data.parent_team_id ? parseInt(String(data.parent_team_id), 10) : null;
            const ownerId = data.owner_id ? parseInt(String(data.owner_id), 10) : (data.manager_id ? parseInt(String(data.manager_id), 10) : null);
            const meta = typeof data.metadata === 'string' ? JSON.parse(data.metadata) : (data.metadata || {});

            const teamRes = await client.query(
                `INSERT INTO teams (name, department_id, parent_team_id, description, manager_id, metadata, tenant_id) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7) 
                 RETURNING *`,
                [data.name, deptId, parentTeamId, data.description || null, ownerId, meta, tenantId]
            );
            const newTeam = teamRes.rows[0];

            let parentNodeId = null;
            if (parentTeamId) {
                const pnRes = await client.query('SELECT id FROM org_nodes WHERE entity_type = $1 AND entity_id = $2', ['team', parentTeamId]);
                if (pnRes.rows.length > 0) parentNodeId = pnRes.rows[0].id;
            } else if (deptId) {
                const pnRes = await client.query('SELECT id FROM org_nodes WHERE entity_type = $1 AND entity_id = $2', ['department', deptId]);
                if (pnRes.rows.length > 0) parentNodeId = pnRes.rows[0].id;
            }

            const nodeRes = await client.query(
                `INSERT INTO org_nodes (entity_type, entity_id, parent_node_id, name, category, tenant_id) 
                 VALUES ($1, $2, $3, $4, $5, $6) 
                 RETURNING id`,
                ['team', newTeam.id, parentNodeId, data.name, data.category || 'core', tenantId]
            );

            await client.query(
                `INSERT INTO org_governance (node_id, owner_id, tenant_id) 
                 VALUES ($1, $2, $3) 
                 ON CONFLICT (node_id) DO UPDATE SET owner_id = EXCLUDED.owner_id`,
                [nodeRes.rows[0].id, ownerId, tenantId]
            );

            const memberIds: string[] = Array.isArray(data.member_ids) ? data.member_ids.map(String) : [];
            if (memberIds.length > 0) {
                const d = await client.query('SELECT name FROM departments WHERE id = $1', [deptId]);
                const deptName = d.rows[0]?.name ?? null;
                await client.query(
                    `UPDATE employees SET team_id = $1, department_id = $2, department = COALESCE($3, department)
                     WHERE id = ANY($4::text[]) AND (tenant_id = $5 OR tenant_id = 'tenant_default' OR tenant_id = 'default')`,
                    [newTeam.id, deptId, deptName, memberIds, tenantId]
                );
            }

            await client.query('COMMIT');
            return newTeam;
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }

    async insertApproval(approvalId: string, employeeId: number | undefined, type: string, metadata: any, tenantId: string) {
        await pool.query(`
            INSERT INTO approvals (id, employee_id, type, status, metadata, tenant_id)
            VALUES ($1, $2, $3, $4, $5, $6)
        `, [approvalId, employeeId || null, type, 'approved', JSON.stringify(metadata), tenantId]);
    }

    async updateDepartment(id: string, data: any, tenantId: string) {
        const { rows } = await pool.query(
            'UPDATE departments SET name = $1, description = $2, head_user_id = $3, metadata = $4 WHERE id = $5 AND (tenant_id = $6 OR tenant_id = \'tenant_default\' OR tenant_id = \'default\') RETURNING *',
            [data.name, data.description, data.manager_id || data.head_user_id || null, data.metadata || {}, id, tenantId]
        );
        return rows[0];
    }

    async deleteDepartment(id: string, tenantId: string) {
        await pool.query('DELETE FROM departments WHERE id = $1 AND (tenant_id = $2 OR tenant_id = \'tenant_default\' OR tenant_id = \'default\')', [id, tenantId]);
    }

    async getTeams(tenantId: string, departmentId?: string) {
        let query = `
            SELECT t.*, d.name as department_name,
                   (SELECT COUNT(*) FROM employees e 
                    WHERE e.team_id = t.id 
                      AND (e.tenant_id = $1 OR e.tenant_id = 'tenant_default' OR e.tenant_id = 'default')
                      AND e.deleted_at IS NULL 
                      AND (e.status IS NULL OR e.status <> 'terminated')) as employee_count
            FROM teams t
            JOIN departments d ON t.department_id = d.id
            WHERE t.tenant_id = $1 OR t.tenant_id = 'tenant_default' OR t.tenant_id = 'default'
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
            JOIN users u ON LOWER(e.email) = LOWER(u.email) AND (e.tenant_id = u.tenant_id OR u.tenant_id = 'tenant_default' OR u.tenant_id = 'default')
            WHERE (e.tenant_id = $1 OR e.tenant_id = 'tenant_default' OR e.tenant_id = 'default')
              AND e.deleted_at IS NULL
              AND (e.status IS NULL OR e.status <> 'terminated')
              AND COALESCE(u.is_active, true) = true
              AND u.deleted_at IS NULL
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
