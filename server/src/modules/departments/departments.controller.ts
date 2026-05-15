import { Request, Response } from 'express';
import { pool } from '../../config/db';
import { AuthenticatedRequest } from '../../types';

export const getDepartments = async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.user!.tenantId;
    const result = await pool.query(`
        SELECT d.*,
            COUNT(e.id) AS employee_count,
            u.name AS head_name
        FROM departments d
        LEFT JOIN employees e ON e.department_id = d.id AND e.status = 'active'
        LEFT JOIN users u ON u.id = d.head_user_id
        WHERE d.is_active = true AND d.tenant_id = $1
        GROUP BY d.id, u.name
        ORDER BY d.name
    `, [tenantId]);
    res.json({ items: result.rows });
};
