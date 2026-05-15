import { pool } from '../../config/db';

export class LeavesRepository {
    async getLeaveTypes() {
        const result = await pool.query(`SELECT * FROM leave_types ORDER BY name`);
        return { items: result.rows, total: result.rowCount };
    }

    async applyLeave(userId: number | string, leaveTypeId: number, startDate: string, endDate: string, reason: string | null, tenantId: string) {
        const result = await pool.query(
            `INSERT INTO leave_requests (user_id, leave_type_id, start_date, end_date, reason, tenant_id)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [userId, leaveTypeId, startDate, endDate, reason, tenantId]
        );
        return result.rows[0];
    }

    async getLeaveRequests(tenantId: string, options: any) {
        const { userId, status, leave_type_id } = options;
        let sql = `SELECT lr.*, lt.name AS leave_type_name, u.email AS applicant_email
                    FROM leave_requests lr
                    JOIN leave_types lt ON lt.id = lr.leave_type_id
                    JOIN users u ON u.id = lr.user_id
                    WHERE lr.tenant_id = $1`;
        const params: any[] = [tenantId];
        let i = 2;

        if (userId) { sql += ` AND lr.user_id = $${i++}::int`; params.push(userId); }
        if (status) { sql += ` AND lr.status = $${i++}`; params.push(status); }
        if (leave_type_id) { sql += ` AND lr.leave_type_id = $${i++}::int`; params.push(leave_type_id); }

        sql += ` ORDER BY lr.created_at DESC`;
        const result = await pool.query(sql, params);
        return { items: result.rows, total: result.rowCount };
    }

    async approveLeave(id: string, tenantId: string, action: string, approvedBy: string | number | null) {
        const result = await pool.query(
            `UPDATE leave_requests SET status = $1, approved_by = $2, updated_at = NOW()
             WHERE id = $3 AND tenant_id = $4 RETURNING *`,
            [action, approvedBy, id, tenantId]
        );
        return result.rows[0];
    }

    async updateLeaveRequest(id: string, tenantId: string, data: any) {
        const result = await pool.query(
            `UPDATE leave_requests 
             SET leave_type_id = COALESCE($1, leave_type_id), 
                 start_date = COALESCE($2, start_date), 
                 end_date = COALESCE($3, end_date), 
                 reason = COALESCE($4, reason), 
                 updated_at = NOW()
             WHERE id = $5 AND status = 'pending' AND tenant_id = $6
             RETURNING *`,
            [data.leave_type_id, data.start_date, data.end_date, data.reason, id, tenantId]
        );
        return result.rows[0];
    }

    async deleteLeaveRequest(id: string, tenantId: string) {
        const result = await pool.query(
            `DELETE FROM leave_requests WHERE id = $1 AND status = 'pending' AND tenant_id = $2 RETURNING *`,
            [id, tenantId]
        );
        return result.rows[0];
    }

    async getLeaveBalance(userId: string | number, tenantId: string, year: number) {
        const result = await pool.query(
            `SELECT lt.id AS leave_type_id, lt.name, lt.annual_quota,
                    COALESCE(SUM(CASE WHEN lr.status = 'approved' THEN (lr.end_date - lr.start_date + 1) ELSE 0 END), 0)::int AS used,
                    (lt.annual_quota - COALESCE(SUM(CASE WHEN lr.status = 'approved' THEN (lr.end_date - lr.start_date + 1) ELSE 0 END), 0))::int AS available
             FROM leave_types lt
             LEFT JOIN leave_requests lr ON lr.leave_type_id = lt.id
                 AND lr.user_id = $1
                 AND lr.tenant_id = $2
                 AND EXTRACT(YEAR FROM lr.start_date) = $3
             GROUP BY lt.id, lt.name, lt.annual_quota
             ORDER BY lt.name`,
            [userId, tenantId, year]
        );
        return result.rows;
    }

    async getUserAndLeaveTypeName(userId: string | number, leaveTypeId: number) {
        const userRes = await pool.query('SELECT name, tenant_id FROM users WHERE id = $1', [userId]);
        const ltRes = await pool.query('SELECT name FROM leave_types WHERE id = $1', [leaveTypeId]);
        return { user: userRes.rows[0], leaveType: ltRes.rows[0] };
    }

    async getLeaveTypeById(id: number) {
        const res = await pool.query('SELECT name FROM leave_types WHERE id = $1', [id]);
        return res.rows[0];
    }
}
