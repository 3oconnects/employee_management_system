import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { query } from './db/connection';
import { initializeDatabase } from './db/schema';

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));
app.use(express.json());

// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
//  ATTENDANCE & TIME TRACKING
// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

// Today's status for current user ΓÇô supports multiple sessions per day
app.get('/api/v1/attendance/today', async (req, res) => {
    try {
        const userId = req.query.userId;

        // 1. Find the currently OPEN session (checked in, not yet checked out)
        const openResult = await query(
            `SELECT * FROM attendance
             WHERE user_id = $1
               AND check_in::date = CURRENT_DATE
               AND check_out IS NULL
             ORDER BY check_in DESC LIMIT 1`,
            [userId]
        );

        // 2. Aggregate today's sessions (count + cumulative hours for closed sessions)
        const statsResult = await query(
            `SELECT
                COUNT(*)                                                              AS sessions_count,
                COALESCE(SUM(
                    EXTRACT(EPOCH FROM (check_out - check_in)) / 3600
                ) FILTER (WHERE check_out IS NOT NULL), 0)                           AS closed_hours
             FROM attendance
             WHERE user_id = $1 AND check_in::date = CURRENT_DATE`,
            [userId]
        );

        const stats = statsResult.rows[0];
        const sessionsToday  = parseInt(stats.sessions_count) || 0;
        const closedHours    = parseFloat(stats.closed_hours) || 0;

        if (openResult.rows.length === 0) {
            // No open session ΓåÆ OUT (can check in again)
            return res.json({
                status:            'OUT',
                checkIn:           null,
                sessions_today:    sessionsToday,
                total_hours_today: closedHours.toFixed(2)
            });
        }

        const open = openResult.rows[0];
        // Add elapsed time of current open session to closed hours for live total
        const elapsedHours = (Date.now() - new Date(open.check_in).getTime()) / 3600000;

        res.json({
            status:            'IN',
            checkIn:           open.check_in,
            ipAddress:         open.ip_address,
            sessions_today:    sessionsToday,
            total_hours_today: (closedHours + elapsedHours).toFixed(2)
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
    console.error("CHECKIN ERROR:", err);   // <-- ADD THIS
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

// Attendance history (monthly) ΓÇô includes computed overtime_hours
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

// Weekly attendance hours ΓÇô per-day totals for timesheet auto-fill
app.get('/api/v1/attendance/weekly-hours', async (req, res) => {
    try {
        const { userId, weekStart, weekEnd } = req.query;
        const result = await query(
            `SELECT
                TO_CHAR(check_in, 'YYYY-MM-DD')            AS day,
                SUM(
                    EXTRACT(EPOCH FROM (COALESCE(check_out, check_in) - check_in)) / 3600
                )                                          AS hours
             FROM attendance
             WHERE user_id = $1
               AND check_in::date BETWEEN $2::date AND $3::date
             GROUP BY TO_CHAR(check_in, 'YYYY-MM-DD')
             ORDER BY day`,
            [userId, weekStart, weekEnd]
        );
        // Build a map { 'YYYY-MM-DD': hours }
        const map: Record<string, number> = {};
        result.rows.forEach((r: any) => {
            map[r.day] = parseFloat(r.hours) || 0;
        });
        res.json({ days: map });
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

// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
//  LEAVE TYPES (Policy Config)
// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

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

// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
//  LEAVE REQUESTS
// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

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

// Team calendar ΓÇô who's on leave
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

// Leave balance for a user (quota ΓÇô used)
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

// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
//  REGULARIZATION REQUESTS
// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

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

// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
//  TIMESHEETS
// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

// Get or create the timesheet record for a given week_start (YYYY-MM-DD = Monday)
app.get('/api/v1/timesheets/week', async (req, res) => {
    try {
        const { userId, weekStart } = req.query;
        if (!userId || !weekStart) return res.status(400).json({ error: 'userId and weekStart required.' });

        // Calculate week_end (Sunday = weekStart + 6 days)
        const start = new Date(weekStart as string);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        const weekEnd = end.toISOString().slice(0, 10);

        // Find existing or create draft
        let result = await query(
            `SELECT t.*, json_agg(te.* ORDER BY te.created_at) FILTER (WHERE te.id IS NOT NULL) AS entries
             FROM timesheets t
             LEFT JOIN timesheet_entries te ON te.timesheet_id = t.id
             WHERE t.user_id = $1 AND t.week_start = $2
             GROUP BY t.id`,
            [userId, weekStart]
        );

        if (result.rows.length === 0) {
            const created = await query(
                `INSERT INTO timesheets (user_id, week_start, week_end, status, total_hours)
                 VALUES ($1, $2, $3, 'draft', 0) RETURNING *`,
                [userId, weekStart, weekEnd]
            );
            return res.status(201).json({ ...created.rows[0], entries: [] });
        }

        res.json(result.rows[0]);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// List all timesheets for a user (history)
app.get('/api/v1/timesheets', async (req, res) => {
    try {
        const { userId } = req.query;
        const result = await query(
            `SELECT t.*, u.email AS approved_by_email
             FROM timesheets t
             LEFT JOIN users u ON u.id = t.approved_by
             WHERE t.user_id = $1
             ORDER BY t.week_start DESC`,
            [userId]
        );
        res.json({ items: result.rows, total: result.rowCount });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// List all submitted timesheets (for manager/HR approvals)
app.get('/api/v1/timesheets/pending', async (req, res) => {
    try {
        const result = await query(
            `SELECT t.*, u.email AS applicant_email, p.employee_id, p.designation
             FROM timesheets t
             JOIN users u ON u.id = t.user_id
             LEFT JOIN profiles p ON p.user_id = t.user_id
             WHERE t.status = 'submitted'
             ORDER BY t.week_start DESC`
        );
        res.json({ items: result.rows, total: result.rowCount });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Save entries for a timesheet (replaces all entries for that sheet)
app.put('/api/v1/timesheets/:id/entries', async (req, res) => {
    try {
        const { entries } = req.body;
        // entries: Array<{ project_name, task_desc, mon_hours, tue_hours, wed_hours, thu_hours, fri_hours, sat_hours, sun_hours }>
        if (!Array.isArray(entries)) return res.status(400).json({ error: 'entries must be an array.' });

        // Delete existing entries
        await query(`DELETE FROM timesheet_entries WHERE timesheet_id = $1`, [req.params.id]);

        // Insert new
        let totalHours = 0;
        for (const e of entries) {
            const dayHours = [e.mon_hours, e.tue_hours, e.wed_hours, e.thu_hours, e.fri_hours, e.sat_hours, e.sun_hours]
                .map(h => parseFloat(h) || 0);
            const rowTotal = dayHours.reduce((a, b) => a + b, 0);
            totalHours += rowTotal;
            await query(
                `INSERT INTO timesheet_entries (timesheet_id, project_name, task_desc, mon_hours, tue_hours, wed_hours, thu_hours, fri_hours, sat_hours, sun_hours)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
                [req.params.id, e.project_name, e.task_desc || null, ...dayHours]
            );
        }

        // Update total_hours + updated_at
        const updated = await query(
            `UPDATE timesheets SET total_hours = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
            [totalHours, req.params.id]
        );

        res.json({ ...updated.rows[0], message: 'Entries saved.' });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Submit timesheet for approval
app.put('/api/v1/timesheets/:id/submit', async (req, res) => {
    try {
        const result = await query(
            `UPDATE timesheets SET status = 'submitted', updated_at = NOW()
             WHERE id = $1 AND status IN ('draft','rejected') RETURNING *`,
            [req.params.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Timesheet not found or cannot be submitted.' });
        res.json({ ...result.rows[0], message: 'Timesheet submitted for approval.' });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Approve or reject a timesheet
app.put('/api/v1/timesheets/:id/approve', async (req, res) => {
    try {
        const { action, approved_by, remarks } = req.body; // action = 'approved' | 'rejected'
        const result = await query(
            `UPDATE timesheets SET status = $1, approved_by = $2, remarks = $3, updated_at = NOW()
             WHERE id = $4 RETURNING *`,
            [action, approved_by || null, remarks || null, req.params.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Timesheet not found.' });
        res.json({ ...result.rows[0], message: `Timesheet ${action}.` });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
//  START SERVER
// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

const start = async () => {
    try {
        await initializeDatabase();
        app.listen(port, () => {
            console.log(`≡ƒÜÇ Server running at http://localhost:${port}`);
        });
    } catch (err) {
        console.error('Γ¥î Failed to start server:', err);
        process.exit(1);
    }
};

start();
