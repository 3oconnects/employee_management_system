import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { query } from './db/connection';
import { initializeDatabase } from './db/schema';

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// ─────────────────────────────────────────────────────────────
//  ATTENDANCE & TIME TRACKING
// ─────────────────────────────────────────────────────────────

// Today's status for current user
app.get('/api/v1/attendance/today', async (req, res) => {
    try {
        const userId = req.query.userId;
        const result = await query(
            `SELECT * FROM attendance
             WHERE user_id = $1 AND check_in::date = CURRENT_DATE
             ORDER BY check_in DESC LIMIT 1`,
            [userId]
        );
        if (result.rows.length === 0) return res.json({ status: 'OUT' });
        const record = result.rows[0];
        res.json({
            status: record.check_out ? 'COMPLETED' : 'IN',
            checkIn: record.check_in,
            checkOut: record.check_out,
            ipAddress: record.ip_address
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Check-in
app.post('/api/v1/attendance/check-in', async (req, res) => {
    try {
        const { userId, ipAddress } = req.body;
        const result = await query(
            `INSERT INTO attendance (user_id, check_in, ip_address, status)
             VALUES ($1, NOW(), $2, 'present') RETURNING *`,
            [userId, ipAddress || null]
        );
        res.status(201).json({ ...result.rows[0], message: 'Checked in successfully.' });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Check-out
app.post('/api/v1/attendance/check-out', async (req, res) => {
    try {
        const { userId } = req.body;
        const result = await query(
            `UPDATE attendance SET check_out = NOW()
             WHERE user_id = $1 AND check_in::date = CURRENT_DATE AND check_out IS NULL
             RETURNING *`,
            [userId]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'No open check-in found for today.' });
        res.json({ ...result.rows[0], message: 'Checked out successfully.' });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Attendance history (monthly) – includes computed overtime_hours
app.get('/api/v1/attendance/history', async (req, res) => {
    try {
        const { userId, month, year } = req.query;
        const result = await query(
            `SELECT *,
                CASE
                    WHEN check_out IS NOT NULL THEN
                        GREATEST(0, EXTRACT(EPOCH FROM (check_out - check_in)) / 3600 - 9)
                    ELSE 0
                END AS overtime_hours
             FROM attendance
             WHERE user_id = $1
             AND EXTRACT(MONTH FROM check_in) = $2
             AND EXTRACT(YEAR FROM check_in) = $3
             ORDER BY check_in DESC`,
            [userId, parseInt(month as string), parseInt(year as string)]
        );
        res.json({ items: result.rows, total: result.rowCount });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Attendance summary for an employee
app.get('/api/v1/attendance/summary/:userId', async (req, res) => {
    try {
        const { month, year } = req.query;
        const result = await query(
            `SELECT
                COUNT(*) FILTER (WHERE status = 'present')  AS present_days,
                COUNT(*) FILTER (WHERE status = 'half_day')  AS half_days,
                COUNT(*) FILTER (WHERE status = 'on_duty')   AS on_duty_days,
                COUNT(*)                                     AS total_entries,
                AVG(EXTRACT(EPOCH FROM (check_out - check_in)) / 3600) FILTER (WHERE check_out IS NOT NULL) AS avg_hours
             FROM attendance
             WHERE user_id = $1
             AND EXTRACT(MONTH FROM check_in) = $2
             AND EXTRACT(YEAR FROM check_in) = $3`,
            [req.params.userId, parseInt(month as string) || new Date().getMonth() + 1, parseInt(year as string) || new Date().getFullYear()]
        );
        res.json({ userId: req.params.userId, ...result.rows[0] });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// ─────────────────────────────────────────────────────────────
//  LEAVE TYPES (Policy Config)
// ─────────────────────────────────────────────────────────────

app.get('/api/v1/leave-types', async (req, res) => {
    try {
        const result = await query(`SELECT * FROM leave_types ORDER BY name`);
        res.json({ items: result.rows, total: result.rowCount });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/v1/leave-types', async (req, res) => {
    try {
        const { name, annual_quota } = req.body;
        const result = await query(
            `INSERT INTO leave_types (name, annual_quota) VALUES ($1, $2) RETURNING *`,
            [name, annual_quota]
        );
        res.status(201).json({ ...result.rows[0], message: 'Leave type created.' });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/v1/leave-types/:id', async (req, res) => {
    try {
        const { name, annual_quota } = req.body;
        const result = await query(
            `UPDATE leave_types SET name = COALESCE($1, name), annual_quota = COALESCE($2, annual_quota), updated_at = NOW()
             WHERE id = $3 RETURNING *`,
            [name, annual_quota, req.params.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Leave type not found.' });
        res.json({ ...result.rows[0], message: 'Leave type updated.' });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/v1/leave-types/:id', async (req, res) => {
    try {
        await query(`DELETE FROM leave_types WHERE id = $1`, [req.params.id]);
        res.json({ message: 'Leave type deleted.' });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// ─────────────────────────────────────────────────────────────
//  LEAVE REQUESTS
// ─────────────────────────────────────────────────────────────

// Apply for leave
app.post('/api/v1/leave/apply', async (req, res) => {
    try {
        const { userId, leave_type_id, start_date, end_date, reason } = req.body;
        const result = await query(
            `INSERT INTO leave_requests (user_id, leave_type_id, start_date, end_date, reason)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [userId, leave_type_id, start_date, end_date, reason || null]
        );
        res.status(201).json({ ...result.rows[0], message: 'Leave application submitted.' });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// List leave requests (with filters)
app.get('/api/v1/leave/requests', async (req, res) => {
    try {
        const { userId, status, leave_type_id } = req.query;
        let sql = `SELECT lr.*, lt.name AS leave_type_name, u.email AS applicant_email
                    FROM leave_requests lr
                    JOIN leave_types lt ON lt.id = lr.leave_type_id
                    JOIN users u ON u.id = lr.user_id
                    WHERE 1=1`;
        const params: any[] = [];
        let i = 1;

        if (userId) { sql += ` AND lr.user_id = $${i++}`; params.push(userId); }
        if (status) { sql += ` AND lr.status = $${i++}`; params.push(status); }
        if (leave_type_id) { sql += ` AND lr.leave_type_id = $${i++}`; params.push(leave_type_id); }

        sql += ` ORDER BY lr.created_at DESC`;
        const result = await query(sql, params);
        res.json({ items: result.rows, total: result.rowCount });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Get single leave request
app.get('/api/v1/leave/requests/:id', async (req, res) => {
    try {
        const result = await query(
            `SELECT lr.*, lt.name AS leave_type_name, u.email AS applicant_email
             FROM leave_requests lr
             JOIN leave_types lt ON lt.id = lr.leave_type_id
             JOIN users u ON u.id = lr.user_id
             WHERE lr.id = $1`,
            [req.params.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Leave request not found.' });
        res.json(result.rows[0]);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Approve / reject leave
app.put('/api/v1/leave/requests/:id/approve', async (req, res) => {
    try {
        const { action, approved_by } = req.body; // action = 'approved' | 'rejected'
        const result = await query(
            `UPDATE leave_requests SET status = $1, approved_by = $2, updated_at = NOW()
             WHERE id = $3 RETURNING *`,
            [action, approved_by || null, req.params.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Leave request not found.' });
        res.json({ ...result.rows[0], message: `Leave request ${action}.` });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Cancel leave request (set status to rejected by self)
app.put('/api/v1/leave/requests/:id/cancel', async (req, res) => {
    try {
        const result = await query(
            `UPDATE leave_requests SET status = 'rejected', updated_at = NOW()
             WHERE id = $1 AND status = 'pending' RETURNING *`,
            [req.params.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Leave request not found or already processed.' });
        res.json({ ...result.rows[0], message: 'Leave request cancelled.' });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Team calendar – who's on leave
app.get('/api/v1/leave/team-calendar', async (req, res) => {
    try {
        const { month, year, dept_id } = req.query;
        let sql = `SELECT lr.*, lt.name AS leave_type_name, u.email, p.employee_id, p.designation
                    FROM leave_requests lr
                    JOIN leave_types lt ON lt.id = lr.leave_type_id
                    JOIN users u ON u.id = lr.user_id
                    JOIN profiles p ON p.user_id = u.id
                    WHERE lr.status = 'approved'
                    AND EXTRACT(MONTH FROM lr.start_date) = $1
                    AND EXTRACT(YEAR FROM lr.start_date) = $2`;
        const params: any[] = [parseInt(month as string) || new Date().getMonth() + 1, parseInt(year as string) || new Date().getFullYear()];

        if (dept_id) { sql += ` AND p.dept_id = $3`; params.push(dept_id); }

        sql += ` ORDER BY lr.start_date`;
        const result = await query(sql, params);
        res.json({ items: result.rows, total: result.rowCount });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Leave balance for a user (quota – used)
app.get('/api/v1/leave/balance', async (req, res) => {
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
});

// ─────────────────────────────────────────────────────────────
//  REGULARIZATION REQUESTS
// ─────────────────────────────────────────────────────────────

// Submit a regularization request
app.post('/api/v1/attendance/regularize', async (req, res) => {
    try {
        const { userId, date, check_in_time, check_out_time, reason } = req.body;
        const result = await query(
            `INSERT INTO regularization_requests (user_id, date, check_in_time, check_out_time, reason)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [userId, date, check_in_time, check_out_time || null, reason]
        );
        res.status(201).json({ ...result.rows[0], message: 'Regularization request submitted.' });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// List regularization requests for a user
app.get('/api/v1/attendance/regularize', async (req, res) => {
    try {
        const { userId } = req.query;
        const result = await query(
            `SELECT rr.*, u.email AS approved_by_email
             FROM regularization_requests rr
             LEFT JOIN users u ON u.id = rr.approved_by
             WHERE rr.user_id = $1
             ORDER BY rr.date DESC`,
            [userId]
        );
        res.json({ items: result.rows, total: result.rowCount });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// All pending regularization requests (for managers/HR)
app.get('/api/v1/attendance/regularize/pending', async (req, res) => {
    try {
        const result = await query(
            `SELECT rr.*, u.email AS applicant_email, p.employee_id, p.designation
             FROM regularization_requests rr
             JOIN users u ON u.id = rr.user_id
             LEFT JOIN profiles p ON p.user_id = rr.user_id
             WHERE rr.status = 'pending'
             ORDER BY rr.created_at DESC`
        );
        res.json({ items: result.rows, total: result.rowCount });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Approve / reject a regularization request
app.put('/api/v1/attendance/regularize/:id/approve', async (req, res) => {
    try {
        const { action, approved_by } = req.body; // action = 'approved' | 'rejected'
        const result = await query(
            `UPDATE regularization_requests SET status = $1, approved_by = $2, updated_at = NOW()
             WHERE id = $3 RETURNING *`,
            [action, approved_by || null, req.params.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Request not found.' });
        res.json({ ...result.rows[0], message: `Regularization request ${action}.` });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// ─────────────────────────────────────────────────────────────
//  START SERVER
// ─────────────────────────────────────────────────────────────

const start = async () => {
    try {
        await initializeDatabase();
        app.listen(port, () => {
            console.log(`🚀 Server running at http://localhost:${port}`);
        });
    } catch (err) {
        console.error('❌ Failed to start server:', err);
        process.exit(1);
    }
};

start();
