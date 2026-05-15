import { pool } from '../../config/db';

export class AttendanceRepository {
    async resolveEmployeeId(userId: string | number, tenantId: string): Promise<string | null> {
        const r1 = await pool.query(
            `SELECT e.id FROM employees e
             JOIN users u ON u.email = e.email AND u.tenant_id = e.tenant_id
             WHERE u.id = $1 AND u.tenant_id = $2 LIMIT 1`,
            [userId, tenantId]
        );
        if (r1.rows.length > 0) return r1.rows[0].id;

        const r2 = await pool.query(
            'SELECT id FROM employees WHERE user_id = $1 AND tenant_id = $2 LIMIT 1',
            [userId, tenantId]
        );
        if (r2.rows.length > 0) return r2.rows[0].id;

        return null;
    }

    async getOpenSession(empId: string, tenantId: string) {
        const result = await pool.query(
            `SELECT * FROM attendance
             WHERE employee_id = $1
               AND date = CURRENT_DATE
               AND check_out_time IS NULL
               AND tenant_id = $2
             ORDER BY check_in_time DESC LIMIT 1`,
            [empId, tenantId]
        );
        return result.rows[0];
    }

    async getTodayStats(empId: string, tenantId: string) {
        const result = await pool.query(
            `SELECT
                COUNT(*) AS sessions_count,
                COALESCE(SUM(
                    EXTRACT(EPOCH FROM (check_out_time - check_in_time)) / 3600
                ) FILTER (WHERE check_out_time IS NOT NULL), 0) AS closed_hours
             FROM attendance
             WHERE employee_id = $1 AND date = CURRENT_DATE AND tenant_id = $2`,
            [empId, tenantId]
        );
        return result.rows[0];
    }

    async checkIn(empId: string, tenantId: string) {
        const now = new Date();
        const result = await pool.query(
            `INSERT INTO attendance (employee_id, check_in_time, date, status, tenant_id)
             VALUES ($1, $2, CURRENT_DATE, 'present', $3) RETURNING *`,
            [empId, now, tenantId]
        );
        return result.rows[0];
    }

    async checkOut(empId: string, tenantId: string) {
        const now = new Date();
        const result = await pool.query(
            `UPDATE attendance
             SET check_out_time = $1
             WHERE employee_id = $2 AND date = CURRENT_DATE AND check_out_time IS NULL AND tenant_id = $3
             RETURNING *`,
            [now, empId, tenantId]
        );
        return result.rows[0];
    }

    async getHistory(empId: string, tenantId: string, month: number, year: number) {
        const result = await pool.query(
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
               AND tenant_id = $4
             ORDER BY check_in_time DESC`,
            [empId, month, year, tenantId]
        );
        return { items: result.rows, total: result.rowCount };
    }

    async getWeeklyHours(empId: string, tenantId: string, weekStart: string, weekEnd: string) {
        const result = await pool.query(
            `SELECT
                TO_CHAR(check_in_time, 'YYYY-MM-DD') AS day,
                SUM(EXTRACT(EPOCH FROM (COALESCE(check_out_time, check_in_time) - check_in_time)) / 3600) AS hours
             FROM attendance
             WHERE employee_id = $1
               AND check_in_time::date BETWEEN $2::date AND $3::date
               AND tenant_id = $4
             GROUP BY TO_CHAR(check_in_time, 'YYYY-MM-DD')
             ORDER BY day`,
            [empId, weekStart, weekEnd, tenantId]
        );
        return result.rows;
    }

    async getSummary(empId: string, tenantId: string, month: number, year: number) {
        const result = await pool.query(
            `SELECT
                COUNT(*) FILTER (WHERE status = 'present') AS present_days,
                COUNT(*) FILTER (WHERE status = 'half_day') AS half_days,
                COUNT(*) AS total_entries,
                AVG(EXTRACT(EPOCH FROM (check_out_time - check_in_time)) / 3600)
                    FILTER (WHERE check_out_time IS NOT NULL) AS avg_hours
             FROM attendance
             WHERE employee_id = $1
               AND EXTRACT(MONTH FROM check_in_time) = $2
               AND EXTRACT(YEAR  FROM check_in_time) = $3
               AND tenant_id = $4`,
            [empId, month, year, tenantId]
        );
        return result.rows[0];
    }

    async regularize(empId: string, tenantId: string, date: string, checkInTime: string, checkOutTime: string | null) {
        const result = await pool.query(
            `INSERT INTO attendance (employee_id, check_in_time, check_out_time, date, status, tenant_id)
             VALUES ($1, $2, $3, $4::date, 'present', $5) RETURNING *`,
            [empId, `${date} ${checkInTime}`, checkOutTime ? `${date} ${checkOutTime}` : null, date, tenantId]
        );
        return result.rows[0];
    }
}
