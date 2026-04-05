import { Request, Response } from 'express';
import { query } from '../db/connection';

export const getTodayStatus = async (req: Request, res: Response) => {
    try {
        const userId = req.query.userId;
        if (!userId) {
            return res.status(400).json({ error: 'userId is required.' });
        }
        console.log('Fetching today status for userId:', userId);
        const openResult = await query(
            `SELECT * FROM attendance
             WHERE user_id = $1
               AND check_in::date = CURRENT_DATE
               AND check_out IS NULL
             ORDER BY check_in DESC LIMIT 1`,
            [userId]
        );
        console.log('Open result rows:', openResult.rows.length);

        const statsResult = await query(
            `SELECT
                COUNT(*) AS sessions_count,
                COALESCE(SUM(
                    EXTRACT(EPOCH FROM (check_out - check_in)) / 3600
                ) FILTER (WHERE check_out IS NOT NULL), 0) AS closed_hours
             FROM attendance
             WHERE user_id = $1 AND check_in::date = CURRENT_DATE`,
            [userId]
        );

        const stats = statsResult.rows[0];
        const sessionsToday = parseInt(stats.sessions_count) || 0;
        const closedHours = parseFloat(stats.closed_hours) || 0;

        if (openResult.rows.length === 0) {
            return res.json({
                status: 'OUT',
                checkIn: null,
                sessions_today: sessionsToday,
                total_hours_today: closedHours.toFixed(2)
            });
        }

        const open = openResult.rows[0];
        const elapsedHours = (Date.now() - new Date(open.check_in).getTime()) / 3600000;

        res.json({
            status: 'IN',
            checkIn: open.check_in,
            ipAddress: open.ip_address,
            sessions_today: sessionsToday,
            total_hours_today: (closedHours + elapsedHours).toFixed(2)
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
};

export const checkIn = async (req: Request, res: Response) => {
    try {
        const { userId, ipAddress } = req.body;
        if (!userId) return res.status(400).json({ error: 'userId is required.' });

        // Prevent multiple open sessions
        const openCheck = await query(
            'SELECT id FROM attendance WHERE user_id = $1 AND check_in::date = CURRENT_DATE AND check_out IS NULL',
            [userId]
        );
        if (openCheck.rows.length > 0) return res.status(400).json({ error: 'Session already active.' });

        const result = await query(
            `INSERT INTO attendance (user_id, check_in, ip_address, status)
             VALUES ($1, NOW(), $2, 'present') RETURNING *`,
            [userId, ipAddress || null]
        );
        
        // Return same structure as getTodayStatus for frontend consistency
        res.status(201).json({ 
            ...result.rows[0], 
            status: 'IN', 
            checkIn: result.rows[0].check_in,
            message: 'Checked in successfully.' 
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
};


export const checkOut = async (req: Request, res: Response) => {
    try {
        const { userId } = req.body;
        if (!userId) return res.status(400).json({ error: 'userId is required.' });

        const result = await query(
            `UPDATE attendance SET check_out = NOW()
             WHERE user_id = $1 AND check_in::date = CURRENT_DATE AND check_out IS NULL
             RETURNING *`,
            [userId]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'No open shift found.' });
        
        res.json({ 
            ...result.rows[0], 
            status: 'OUT', 
            checkIn: null,
            message: 'Shift ended successfully.' 
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
};


export const getHistory = async (req: Request, res: Response) => {
    try {
        const { userId } = req.query;
        if (!userId) return res.status(400).json({ error: 'userId is required.' });

        const month = parseInt(req.query.month as string) || (new Date().getMonth() + 1);
        const year = parseInt(req.query.year as string) || new Date().getFullYear();

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
            [userId, month, year]
        );
        res.json({ items: result.rows, total: result.rowCount });
    } catch (err: any) {
        console.error('getHistory Error:', err);
        res.status(500).json({ error: err.message });
    }
};

export const getWeeklyHours = async (req: Request, res: Response) => {
    try {
        const { userId, weekStart, weekEnd } = req.query;
        if (!userId) return res.status(400).json({ error: 'userId is required.' });
        const result = await query(
            `SELECT
                TO_CHAR(check_in, 'YYYY-MM-DD') AS day,
                SUM(
                    EXTRACT(EPOCH FROM (COALESCE(check_out, check_in) - check_in)) / 3600
                ) AS hours
             FROM attendance
             WHERE user_id = $1
               AND check_in::date BETWEEN $2::date AND $3::date
             GROUP BY TO_CHAR(check_in, 'YYYY-MM-DD')
             ORDER BY day`,
            [userId, weekStart, weekEnd]
        );
        const map: Record<string, number> = {};
        result.rows.forEach((r: any) => {
            map[r.day] = parseFloat(r.hours) || 0;
        });
        res.json({ days: map });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
};

export const getSummary = async (req: Request, res: Response) => {
    try {
        const { month, year } = req.query;
        const result = await query(
            `SELECT
                COUNT(*) FILTER (WHERE status = 'present') AS present_days,
                COUNT(*) FILTER (WHERE status = 'half_day') AS half_days,
                COUNT(*) FILTER (WHERE status = 'on_duty') AS on_duty_days,
                COUNT(*) AS total_entries,
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
};

export const regularize = async (req: Request, res: Response) => {
    try {
        const { userId, date, check_in_time, check_out_time, reason } = req.body;
        const result = await query(
            `INSERT INTO attendance (user_id, check_in, check_out, status, created_at)
             VALUES ($1, $2, $3, 'present', NOW()) RETURNING *`,
            [userId, `${date} ${check_in_time}`, check_out_time ? `${date} ${check_out_time}` : null]
        );
        res.status(201).json({ ...result.rows[0], message: 'Regularization request submitted.' });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
};
