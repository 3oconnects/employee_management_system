import { pool } from '../../config/db';

export class TimesheetsRepository {
    async getTimesheet(userId: string | number, weekStart: string, tenantId: string) {
        const result = await pool.query(
            `SELECT t.*, json_agg(te.* ORDER BY te.created_at) FILTER (WHERE te.id IS NOT NULL) AS entries
             FROM timesheets t
             LEFT JOIN timesheet_entries te ON te.timesheet_id = t.id
             WHERE t.user_id = $1 AND t.week_start = $2 AND t.tenant_id = $3
             GROUP BY t.id`,
            [userId, weekStart, tenantId]
        );
        return result.rows[0];
    }

    async createTimesheet(userId: string | number, weekStart: string, weekEnd: string, tenantId: string) {
        const result = await pool.query(
            `INSERT INTO timesheets (user_id, week_start, week_end, status, total_hours, tenant_id)
             VALUES ($1, $2, $3, 'draft', 0, $4) RETURNING *`,
            [userId, weekStart, weekEnd, tenantId]
        );
        return result.rows[0];
    }

    async clearEntries(timesheetId: string, tenantId: string) {
        await pool.query(
            `DELETE FROM timesheet_entries WHERE timesheet_id = $1
             AND EXISTS (SELECT 1 FROM timesheets t WHERE t.id = $1 AND t.tenant_id = $2)`, [timesheetId, tenantId]);
    }

    async insertEntry(timesheetId: string, tenantId: string, entry: any, dayHours: number[]) {
        await pool.query(
            `INSERT INTO timesheet_entries (timesheet_id, project_name, task_desc, mon_hours, tue_hours, wed_hours, thu_hours, fri_hours, sat_hours, sun_hours)
             SELECT $1,$2,$3,$4,$5,$6,$7,$8,$9,$10 WHERE EXISTS (SELECT 1 FROM timesheets t WHERE t.id = $1 AND t.tenant_id = $11)`,
            [timesheetId, entry.project_name, entry.task_desc || null, ...dayHours, tenantId]
        );
    }

    async updateTimesheetHours(timesheetId: string, tenantId: string, totalHours: number) {
        const result = await pool.query(
            `UPDATE timesheets SET total_hours = $1, updated_at = NOW() WHERE id = $2 AND tenant_id = $3 RETURNING *`,
            [totalHours, timesheetId, tenantId]
        );
        return result.rows[0];
    }

    async getOwnTimesheet(id: string, tenantId: string, userId: number | string) {
        if (!/^\d+$/.test(String(id))) return undefined;
        const result = await pool.query(
            'SELECT * FROM timesheets WHERE id = $1 AND tenant_id = $2 AND user_id = $3', [id, tenantId, userId]);
        return result.rows[0];
    }

    async submitTimesheet(id: string, tenantId: string, userId: number | string) {
        if (!/^\d+$/.test(String(id))) return undefined;
        const result = await pool.query(
            `UPDATE timesheets SET status = 'submitted', updated_at = NOW()
             WHERE id = $1 AND tenant_id = $2 AND user_id = $3 AND status IN ('draft','rejected') RETURNING *`,
            [id, tenantId, userId]
        );
        return result.rows[0];
    }

    async getTimesheetHistory(userId: string | number, tenantId: string) {
        const result = await pool.query(
            `SELECT t.*, json_agg(te.* ORDER BY te.created_at) FILTER (WHERE te.id IS NOT NULL) AS entries
             FROM timesheets t
             LEFT JOIN timesheet_entries te ON te.timesheet_id = t.id
             WHERE t.user_id = $1 AND t.tenant_id = $2
             GROUP BY t.id
             ORDER BY t.week_start DESC
             LIMIT 20`,
            [userId, tenantId]
        );
        return { items: result.rows, total: result.rowCount };
    }

    async getPendingTimesheets(tenantId: string) {
        const result = await pool.query(
            `SELECT t.*, u.name as applicant_name, u.email as applicant_email,
                    COALESCE(json_agg(te.* ORDER BY te.created_at) FILTER (WHERE te.id IS NOT NULL), '[]'::json) AS entries
             FROM timesheets t
             JOIN users u ON u.id = t.user_id
             LEFT JOIN timesheet_entries te ON te.timesheet_id = t.id
             WHERE t.status = 'submitted' AND t.tenant_id = $1
             GROUP BY t.id, u.id
             ORDER BY t.updated_at DESC`,
            [tenantId]
        );
        return { items: result.rows, total: result.rowCount };
    }
}
