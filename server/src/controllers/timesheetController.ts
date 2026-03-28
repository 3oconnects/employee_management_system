import { Request, Response } from 'express';
import { query } from '../db/connection';

export const getTimesheetByWeek = async (req: Request, res: Response) => {
    try {
        const { userId, weekStart } = req.query;
        if (!userId || !weekStart) return res.status(400).json({ error: 'userId and weekStart required.' });

        const start = new Date(weekStart as string);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        const weekEnd = end.toISOString().slice(0, 10);

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
};

export const saveTimesheetEntries = async (req: Request, res: Response) => {
    try {
        const { entries } = req.body;
        if (!Array.isArray(entries)) return res.status(400).json({ error: 'entries must be an array.' });

        await query(`DELETE FROM timesheet_entries WHERE timesheet_id = $1`, [req.params.id]);

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

        const updated = await query(
            `UPDATE timesheets SET total_hours = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
            [totalHours, req.params.id]
        );

        res.json({ ...updated.rows[0], message: 'Entries saved.' });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
};

export const submitTimesheet = async (req: Request, res: Response) => {
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
};

export const approveTimesheet = async (req: Request, res: Response) => {
    try {
        const { action, approved_by, remarks } = req.body;
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
};
