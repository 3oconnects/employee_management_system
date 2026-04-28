import { Request, Response } from 'express';
import { query } from '../db/connection';

// ─── Helper: resolve employee_id from user_id ─────────────────────────────────
// The attendance table uses employee_id (TEXT like 'EMP001'),
// but the frontend sends user_id (INTEGER from users table).
async function resolveEmployeeId(userId: string | number): Promise<string | null> {
    // Primary: join via email (always works — auth joins this way too)
    const r1 = await query(
        `SELECT e.id FROM employees e
         JOIN users u ON u.email = e.email
         WHERE u.id = $1 LIMIT 1`,
        [userId]
    ).catch(() => ({ rows: [] }));
    if (r1.rows.length > 0) return r1.rows[0].id;

    // Fallback: employees.user_id column (schema v2, may not be backfilled)
    const r2 = await query(
        'SELECT id FROM employees WHERE user_id = $1 LIMIT 1',
        [userId]
    ).catch(() => ({ rows: [] }));
    if (r2.rows.length > 0) return r2.rows[0].id;

    return null;
}

// ─── GET /attendance/today ────────────────────────────────────────────────────
export const getTodayStatus = async (req: Request, res: Response) => {
    try {
        const userId = req.query.userId;
        if (!userId) return res.status(400).json({ error: 'userId is required.' });

        const empId = await resolveEmployeeId(userId as string);
        if (!empId) {
            // No employee record — return OUT so UI still shows the button
            return res.json({ status: 'OUT', checkIn: null, sessions_today: 0, total_hours_today: '0.00' });
        }

        // Look for an open session today (no check_out_time)
        const openResult = await query(
            `SELECT * FROM attendance
             WHERE employee_id = $1
               AND date = CURRENT_DATE
               AND check_out_time IS NULL
             ORDER BY check_in_time DESC LIMIT 1`,
            [empId]
        );

        const statsResult = await query(
            `SELECT
                COUNT(*) AS sessions_count,
                COALESCE(SUM(
                    EXTRACT(EPOCH FROM (check_out_time - check_in_time)) / 3600
                ) FILTER (WHERE check_out_time IS NOT NULL), 0) AS closed_hours
             FROM attendance
             WHERE employee_id = $1 AND date = CURRENT_DATE`,
            [empId]
        );

        const stats        = statsResult.rows[0];
        const sessionsToday = parseInt(stats.sessions_count) || 0;
        const closedHours  = parseFloat(stats.closed_hours)  || 0;

        if (openResult.rows.length === 0) {
            // Always return OUT — users can always re-check-in (lunch, breaks etc.)
            return res.json({
                status: 'OUT',
                checkIn: null,
                sessions_today: sessionsToday,
                total_hours_today: closedHours.toFixed(2),
            });
        }


        const open = openResult.rows[0];
        const elapsedHours = (Date.now() - new Date(open.check_in_time).getTime()) / 3600000;

        return res.json({
            status: 'IN',
            checkIn: open.check_in_time,          // ISO timestamp for timer
            sessions_today: sessionsToday,
            total_hours_today: (closedHours + elapsedHours).toFixed(2),
        });
    } catch (err: any) {
        console.error('getTodayStatus error:', err.message);
        res.status(500).json({ error: err.message });
    }
};

// ─── POST /attendance/check-in ───────────────────────────────────────────────
export const checkIn = async (req: Request, res: Response) => {
    try {
        const { userId } = req.body;
        if (!userId) return res.status(400).json({ error: 'userId is required.' });

        const empId = await resolveEmployeeId(userId);
        if (!empId) return res.status(404).json({ error: 'No employee record found for this user. Contact your administrator.' });

        // Prevent double check-in
        const openCheck = await query(
            'SELECT id FROM attendance WHERE employee_id = $1 AND date = CURRENT_DATE AND check_out_time IS NULL',
            [empId]
        );
        if (openCheck.rows.length > 0) {
            return res.status(400).json({ error: 'You are already checked in. Please check out first.' });
        }

        const now = new Date();
        const result = await query(
            `INSERT INTO attendance (employee_id, check_in_time, date, status)
             VALUES ($1, $2, CURRENT_DATE, 'present') RETURNING *`,
            [empId, now]
        );

        const row = result.rows[0];
        return res.status(201).json({
            status: 'IN',
            checkIn: row.check_in_time,
            employee_id: empId,
            message: 'Checked in successfully.',
        });
    } catch (err: any) {
        console.error('checkIn error:', err.message);
        res.status(500).json({ error: err.message });
    }
};

// ─── POST /attendance/check-out ──────────────────────────────────────────────
export const checkOut = async (req: Request, res: Response) => {
    try {
        const { userId } = req.body;
        if (!userId) return res.status(400).json({ error: 'userId is required.' });

        const empId = await resolveEmployeeId(userId);
        if (!empId) return res.status(404).json({ error: 'No employee record found for this user.' });

        const now = new Date();
        const result = await query(
            `UPDATE attendance
             SET check_out_time = $1
             WHERE employee_id = $2 AND date = CURRENT_DATE AND check_out_time IS NULL
             RETURNING *`,
            [now, empId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'No active check-in found. Please check in first.' });
        }

        const row     = result.rows[0];
        const hoursMs = now.getTime() - new Date(row.check_in_time).getTime();
        const hours   = (hoursMs / 3600000).toFixed(2);

        return res.json({
            status: 'COMPLETED',
            checkIn: null,
            total_hours: hours,
            message: `Checked out successfully. Total: ${hours}h`,
        });
    } catch (err: any) {
        console.error('checkOut error:', err.message);
        res.status(500).json({ error: err.message });
    }
};

// ─── GET /attendance/history ─────────────────────────────────────────────────
export const getHistory = async (req: Request, res: Response) => {
    try {
        const { userId } = req.query;
        if (!userId) return res.status(400).json({ error: 'userId is required.' });

        const empId = await resolveEmployeeId(userId as string);
        if (!empId) return res.json({ items: [], total: 0 });

        const month = parseInt(req.query.month as string) || (new Date().getMonth() + 1);
        const year  = parseInt(req.query.year  as string) || new Date().getFullYear();

        const result = await query(
            `SELECT *,
                CASE
                    WHEN check_out_time IS NOT NULL THEN
                        GREATEST(0, EXTRACT(EPOCH FROM (check_out_time - check_in_time)) / 3600 - 9)
                    ELSE 0
                END AS overtime_hours
             FROM attendance
             WHERE employee_id = $1
               AND EXTRACT(MONTH FROM check_in_time) = $2
               AND EXTRACT(YEAR  FROM check_in_time) = $3
             ORDER BY check_in_time DESC`,
            [empId, month, year]
        );
        res.json({ items: result.rows, total: result.rowCount });
    } catch (err: any) {
        console.error('getHistory error:', err.message);
        res.status(500).json({ error: err.message });
    }
};

// ─── GET /attendance/weekly-hours ────────────────────────────────────────────
export const getWeeklyHours = async (req: Request, res: Response) => {
    try {
        const { userId, weekStart, weekEnd } = req.query;
        if (!userId) return res.status(400).json({ error: 'userId is required.' });

        const empId = await resolveEmployeeId(userId as string);
        if (!empId) return res.json({ days: {} });

        const result = await query(
            `SELECT
                TO_CHAR(check_in_time, 'YYYY-MM-DD') AS day,
                SUM(EXTRACT(EPOCH FROM (COALESCE(check_out_time, check_in_time) - check_in_time)) / 3600) AS hours
             FROM attendance
             WHERE employee_id = $1
               AND check_in_time::date BETWEEN $2::date AND $3::date
             GROUP BY TO_CHAR(check_in_time, 'YYYY-MM-DD')
             ORDER BY day`,
            [empId, weekStart, weekEnd]
        );

        const map: Record<string, number> = {};
        result.rows.forEach((r: any) => { map[r.day] = parseFloat(r.hours) || 0; });
        res.json({ days: map });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
};

// ─── GET /attendance/summary/:userId ────────────────────────────────────────
export const getSummary = async (req: Request, res: Response) => {
    try {
        const { month, year } = req.query;
        const empId = await resolveEmployeeId(req.params.userId);
        if (!empId) return res.json({ present_days: 0, half_days: 0, avg_hours: 0 });

        const result = await query(
            `SELECT
                COUNT(*) FILTER (WHERE status = 'present') AS present_days,
                COUNT(*) FILTER (WHERE status = 'half_day') AS half_days,
                COUNT(*) AS total_entries,
                AVG(EXTRACT(EPOCH FROM (check_out_time - check_in_time)) / 3600)
                    FILTER (WHERE check_out_time IS NOT NULL) AS avg_hours
             FROM attendance
             WHERE employee_id = $1
               AND EXTRACT(MONTH FROM check_in_time) = $2
               AND EXTRACT(YEAR  FROM check_in_time) = $3`,
            [empId,
             parseInt(month as string) || new Date().getMonth() + 1,
             parseInt(year  as string) || new Date().getFullYear()]
        );
        res.json({ userId: req.params.userId, ...result.rows[0] });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
};

// ─── POST /attendance/regularize ─────────────────────────────────────────────
export const regularize = async (req: Request, res: Response) => {
    try {
        const { userId, date, check_in_time, check_out_time, reason } = req.body;
        const empId = await resolveEmployeeId(userId);
        if (!empId) return res.status(404).json({ error: 'Employee not found.' });

        const result = await query(
            `INSERT INTO attendance (employee_id, check_in_time, check_out_time, date, status)
             VALUES ($1, $2, $3, $4::date, 'present') RETURNING *`,
            [empId, `${date} ${check_in_time}`, check_out_time ? `${date} ${check_out_time}` : null, date]
        );
        res.status(201).json({ ...result.rows[0], message: 'Regularization submitted.' });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
};
