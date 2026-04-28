import { Request, Response } from 'express';
import { query } from '../db/connection';
import { NotificationService } from '../services/notificationService';
import { AuditService } from '../services/auditService';

export const getLeaveTypes = async (req: Request, res: Response) => {
    try {
        const result = await query(`SELECT * FROM leave_types ORDER BY name`);
        res.json({ items: result.rows, total: result.rowCount });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
};

export const applyLeave = async (req: Request, res: Response) => {
    try {
        const { userId, leave_type_id, start_date, end_date, reason } = req.body;
        const result = await query(
            `INSERT INTO leave_requests (user_id, leave_type_id, start_date, end_date, reason)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [userId, leave_type_id, start_date, end_date, reason || null]
        );

        // Trigger notification to admins/HR/managers
        const userRes = await query('SELECT name, tenant_id FROM users WHERE id = $1', [userId]);
        const ltRes = await query('SELECT name FROM leave_types WHERE id = $1', [leave_type_id]);
        if (userRes.rows[0] && ltRes.rows[0]) {
            NotificationService.onLeaveApplied(
                userRes.rows[0].tenant_id || 'tenant_default',
                userRes.rows[0].name,
                ltRes.rows[0].name
            );
        }

        res.status(201).json({ ...result.rows[0], message: 'Leave application submitted.' });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
};

export const getLeaveRequests = async (req: Request, res: Response) => {
    try {
        const { userId, status, leave_type_id } = req.query;
        let sql = `SELECT lr.*, lt.name AS leave_type_name, u.email AS applicant_email
                    FROM leave_requests lr
                    JOIN leave_types lt ON lt.id = lr.leave_type_id
                    JOIN users u ON u.id = lr.user_id
                    WHERE 1=1`;
        const params: any[] = [];
        let i = 1;

        if (userId) { sql += ` AND lr.user_id = $${i++}::int`; params.push(userId); }
        if (status) { sql += ` AND lr.status = $${i++}`; params.push(status); }
        if (leave_type_id) { sql += ` AND lr.leave_type_id = $${i++}::int`; params.push(leave_type_id); }

        sql += ` ORDER BY lr.created_at DESC`;
        const result = await query(sql, params);
        res.json({ items: result.rows, total: result.rowCount });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
};

export const approveLeave = async (req: Request, res: Response) => {
    try {
        const { action, approved_by } = req.body;
        const result = await query(
            `UPDATE leave_requests SET status = $1, approved_by = $2, updated_at = NOW()
             WHERE id = $3 RETURNING *`,
            [action, approved_by || null, req.params.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Leave request not found.' });

        // Notify the applicant
        const leaveRow = result.rows[0];
        const ltRes = await query('SELECT name FROM leave_types WHERE id = $1', [leaveRow.leave_type_id]);
        const userRes = await query('SELECT tenant_id FROM users WHERE id = $1', [leaveRow.user_id]);
        const tenantId = userRes.rows[0]?.tenant_id || 'tenant_default';
        const leaveTypeName = ltRes.rows[0]?.name || 'Leave';

        if (action === 'approved') {
            NotificationService.onLeaveApproved(tenantId, leaveRow.user_id, leaveTypeName);
        } else if (action === 'rejected') {
            NotificationService.onLeaveRejected(tenantId, leaveRow.user_id, leaveTypeName);
        }

        res.json({ ...result.rows[0], message: `Leave request ${action}.` });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
};

export const getLeaveBalance = async (req: Request, res: Response) => {
    try {
        const { userId, year } = req.query;
        const yr = parseInt(year as string) || new Date().getFullYear();
        const result = await query(
            `SELECT lt.id AS leave_type_id, lt.name, lt.annual_quota,
                    COALESCE(SUM(CASE WHEN lr.status = 'approved' THEN (lr.end_date - lr.start_date + 1) ELSE 0 END), 0)::int AS used,
                    (lt.annual_quota - COALESCE(SUM(CASE WHEN lr.status = 'approved' THEN (lr.end_date - lr.start_date + 1) ELSE 0 END), 0))::int AS available
             FROM leave_types lt
             LEFT JOIN leave_requests lr ON lr.leave_type_id = lt.id
                 AND lr.user_id = $1
                 AND EXTRACT(YEAR FROM lr.start_date) = $2
             GROUP BY lt.id, lt.name, lt.annual_quota
             ORDER BY lt.name`,
            [userId, yr]
        );
        res.json({ userId, year: yr, balances: result.rows });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
};
