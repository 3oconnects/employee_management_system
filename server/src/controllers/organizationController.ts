import { Request, Response } from 'express';
import { pool } from '../config/db';

// ─── DEPARTMENTS ───────────────────────────────────────────────────────────

export const getDepartments = async (req: Request, res: Response) => {
    try {
        const { rows } = await pool.query(`
            SELECT d.*, 
                   (SELECT COUNT(*) FROM employees e WHERE e.department_id = d.id) as employee_count,
                   (SELECT COUNT(*) FROM teams t WHERE t.department_id = d.id) as team_count
            FROM departments d
            ORDER BY d.name ASC
        `);
        res.json({ success: true, data: rows });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const createDepartment = async (req: any, res: Response) => {
    const { name, description, manager_id, metadata } = req.body;
    const { userId } = req.user!;
    try {
        const empRes = await pool.query('SELECT id FROM employees WHERE user_id = $1', [userId]);
        const employeeId = empRes.rows[0]?.id;

        const approvalId = `STR-${Date.now()}`;
        await pool.query(`
            INSERT INTO approvals (id, employee_id, type, status, metadata)
            VALUES ($1, $2, $3, $4, $5)
        `, [
            approvalId, 
            employeeId, 
            'department_creation', 
            'pending', 
            JSON.stringify({
                name, description, owner_id: manager_id, 
                metadata: typeof metadata === 'string' ? JSON.parse(metadata) : metadata,
                category: req.body.category || 'core'
            })
        ]);

        res.status(202).json({ success: true, message: 'Department creation request submitted for approval' });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const updateDepartment = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, description, manager_id, metadata } = req.body;
    try {
        const { rows } = await pool.query(
            'UPDATE departments SET name = $1, description = $2, manager_id = $3, metadata = $4 WHERE id = $5 RETURNING *',
            [name, description, manager_id, metadata || {}, id]
        );
        res.json({ success: true, data: rows[0] });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const deleteDepartment = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM departments WHERE id = $1', [id]);
        res.json({ success: true, message: 'Department deleted successfully' });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── TEAMS ─────────────────────────────────────────────────────────────────

export const getTeams = async (req: Request, res: Response) => {
    const { department_id } = req.query;
    try {
        let query = `
            SELECT t.*, d.name as department_name,
                   (SELECT COUNT(*) FROM employees e WHERE e.team_id = t.id) as employee_count
            FROM teams t
            JOIN departments d ON t.department_id = d.id
        `;
        const params = [];
        if (department_id) {
            query += ' WHERE t.department_id = $1';
            params.push(department_id);
        }
        query += ' ORDER BY t.name ASC';

        const { rows } = await pool.query(query, params);
        res.json({ success: true, data: rows });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const createTeam = async (req: any, res: Response) => {
    const { name, department_id, parent_team_id, description, manager_id, metadata } = req.body;
    const { userId } = req.user!;
    try {
        const empRes = await pool.query('SELECT id FROM employees WHERE user_id = $1', [userId]);
        const employeeId = empRes.rows[0]?.id;

        const approvalId = `STR-${Date.now()}`;
        await pool.query(`
            INSERT INTO approvals (id, employee_id, type, status, metadata)
            VALUES ($1, $2, $3, $4, $5)
        `, [
            approvalId, 
            employeeId, 
            'team_creation', 
            'pending', 
            JSON.stringify({
                name, department_id, parent_team_id, description, 
                owner_id: manager_id,
                metadata: typeof metadata === 'string' ? JSON.parse(metadata) : metadata,
                category: req.body.category || 'core'
            })
        ]);

        res.status(202).json({ success: true, message: 'Squad creation request submitted for approval' });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const updateTeam = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, department_id, parent_team_id, description, manager_id, metadata } = req.body;
    try {
        const { rows } = await pool.query(
            'UPDATE teams SET name = $1, department_id = $2, parent_team_id = $3, description = $4, manager_id = $5, metadata = $6 WHERE id = $7 RETURNING *',
            [name, department_id, parent_team_id || null, description, manager_id, metadata || {}, id]
        );
        res.json({ success: true, data: rows[0] });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const deleteTeam = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM teams WHERE id = $1', [id]);
        res.json({ success: true, message: 'Team deleted successfully' });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── TEAM STATUS ───────────────────────────────────────────────────────────

export const getTeamStatus = async (req: any, res: Response) => {
    const { userId, tenantId } = req.user!;
    try {
        // 1. Get user's context (Role, Department, Team, and User ID)
        const userRes = await pool.query(`
            SELECT u.role, e.department_id, e.team_id, e.user_id, e.department, e.reporting_manager_id
            FROM users u
            LEFT JOIN employees e ON LOWER(e.email) = LOWER(u.email) AND e.tenant_id = u.tenant_id
            WHERE u.id = $1 AND u.tenant_id = $2
        `, [userId, tenantId]);
        
        if (userRes.rows.length === 0) {
            return res.json({ success: true, data: [] });
        }

        const { role, department_id: deptId, team_id: teamId, user_id: empUserId, department: deptName, reporting_manager_id: managerId } = userRes.rows[0];
        const userRole = (role || '').toLowerCase();
        const isAdmin = userRole === 'admin' || userRole === 'super_admin' || userRole === 'hr' || userRole === 'administrator';

        // 2. Get all employees in the 'Span of Control'
        //    - If Admin: See everyone in tenant
        //    - If Manager/Employee: See Team + Department + Direct Reports + Manager
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
                 LIMIT 1) as clocked_in_at,
                ((SELECT id 
                  FROM attendance 
                  WHERE employee_id = e.id 
                    AND date = CURRENT_DATE 
                    AND check_out_time IS NULL 
                  LIMIT 1) IS NOT NULL) as is_clocked_in
            FROM employees e
            JOIN users u ON LOWER(e.email) = LOWER(u.email) AND e.tenant_id = u.tenant_id
            WHERE e.tenant_id = $1 
              AND e.deleted_at IS NULL
              AND u.id != $2
              AND (
                $3 = TRUE -- Global Admin override
                OR e.department_id = $4
                OR e.team_id = $5 
                OR e.reporting_manager_id = $6
                OR e.user_id = $8 -- Visibility of their Manager
                OR (e.department_id IS NULL AND e.department = $7 AND $7 IS NOT NULL)
              )
            ORDER BY is_clocked_in DESC, is_available DESC, e.name ASC
        `, [tenantId, userId, isAdmin, deptId || -1, teamId || -1, empUserId || -1, deptName || null, managerId || -1]);

        res.json({ success: true, data: rows });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
};
