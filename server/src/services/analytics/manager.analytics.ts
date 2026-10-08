/**
 * Manager Team Analytics Domain Service
 * 
 * Provides metrics and visibility scoped to a reporting manager's direct team,
 * including daily check-ins, punctuality, pending team leave approvals, and timesheets.
 */

import { pool } from '../../config/db';
import { ManagerDashboardSubmodel, ManagerTeamMemberSubmodel } from './analytics.submodels';

export async function fetchManagerDashboard(userId: number, tenantId: string): Promise<ManagerDashboardSubmodel> {
    const [
        teamMembers,
        teamAttendance,
        pendingLeaves,
        lateCheckins,
        timesheetStatus,
    ] = await Promise.all([
        // Team members
        pool.query(`
            SELECT e.id, e.name, e.department, e.position, e.status, e.email,
                   u.id AS user_id
            FROM employees e
            LEFT JOIN users u ON u.email = e.email AND u.tenant_id = e.tenant_id
            WHERE e.reporting_manager_id = $1 AND e.tenant_id = $2
            AND e.status = 'active'
            AND e.deleted_at IS NULL
        `, [userId, tenantId]),
        // Team attendance today
        pool.query(`
            SELECT
                u.name,
                a.check_in,
                a.check_out,
                CASE
                    WHEN a.check_in IS NULL THEN 'absent'
                    WHEN EXTRACT(HOUR FROM a.check_in) >= 10 THEN 'late'
                    ELSE 'on_time'
                END AS att_status
            FROM employees e
            JOIN users u ON u.email = e.email AND u.tenant_id = e.tenant_id
            LEFT JOIN attendance a ON a.user_id = u.id AND a.tenant_id = e.tenant_id AND a.check_in::date = CURRENT_DATE
            WHERE e.reporting_manager_id = $1 AND e.tenant_id = $2
            AND e.status = 'active'
        `, [userId, tenantId]),
        // Pending leaves for team
        pool.query(`
            SELECT 
                lr.id, lr.employee_id, lr.type, lr.start_date, lr.end_date, lr.reason, lr.status, lr.created_at,
                u.name AS applicant_name, lt.name AS leave_type
            FROM leave_requests lr
            JOIN users u ON u.id = lr.user_id AND u.tenant_id = lr.tenant_id
            JOIN leave_types lt ON lt.id = lr.leave_type_id
            WHERE lr.status = 'pending' AND lr.tenant_id = $2
            AND lr.user_id IN (
                SELECT u2.id FROM employees e
                JOIN users u2 ON u2.email = e.email AND u2.tenant_id = e.tenant_id
                WHERE e.reporting_manager_id = $1 AND e.tenant_id = $2
            )
            ORDER BY lr.created_at DESC
        `, [userId, tenantId]),
        // Late check-ins today
        pool.query(`
            SELECT u.name, a.check_in,
                EXTRACT(HOUR FROM a.check_in) AS hour,
                EXTRACT(MINUTE FROM a.check_in) AS minute
            FROM attendance a
            JOIN users u ON u.id = a.user_id AND u.tenant_id = a.tenant_id
            JOIN employees e ON e.email = u.email AND e.tenant_id = u.tenant_id
            WHERE e.reporting_manager_id = $1 AND e.tenant_id = $2
            AND a.check_in::date = CURRENT_DATE
            AND EXTRACT(HOUR FROM a.check_in) >= 10
        `, [userId, tenantId]),
        // Timesheet completion
        pool.query(`
            SELECT
                COUNT(*) FILTER (WHERE t.status = 'submitted') AS submitted,
                COUNT(*) FILTER (WHERE t.status = 'approved') AS approved,
                COUNT(*) FILTER (WHERE t.status = 'draft' OR t.status IS NULL) AS pending
            FROM employees e
            JOIN users u ON u.email = e.email AND u.tenant_id = e.tenant_id
            LEFT JOIN timesheets t ON t.user_id = u.id AND t.tenant_id = e.tenant_id
                AND t.week_start >= CURRENT_DATE - INTERVAL '7 days'
            WHERE e.reporting_manager_id = $1 AND e.tenant_id = $2
            AND e.status = 'active'
        `, [userId, tenantId]),
    ]);

    const team = teamMembers.rows;
    const att = teamAttendance.rows;
    const present = att.filter((a: any) => a.check_in !== null).length;
    const late = lateCheckins.rows.length;
    const absent = team.length - present;

    return {
        teamSize: team.length,
        teamMembers: team,
        todayPresent: present,
        todayAbsent: absent,
        todayLate: late,
        attendanceRate: team.length > 0 ? Math.round((present / team.length) * 100) : 0,
        teamAttendance: att,
        pendingLeaves: pendingLeaves.rows,
        pendingLeaveCount: pendingLeaves.rows.length,
        lateCheckins: lateCheckins.rows,
        timesheetStatus: timesheetStatus.rows[0] || { submitted: 0, approved: 0, pending: 0 },
    };
}

export async function fetchTeamEmployees(managerId: number, tenantId: string): Promise<ManagerTeamMemberSubmodel[]> {
    const result = await pool.query(`
        SELECT
            e.id, e.name, e.department, e.position, e.status,
            e.email, e.phone, e.join_date, e.employment_type,
            u.id AS user_id, u.role,
            (SELECT check_in FROM attendance a WHERE a.user_id = u.id AND a.tenant_id = e.tenant_id AND a.check_in::date = CURRENT_DATE ORDER BY check_in DESC LIMIT 1) AS today_check_in,
            (SELECT status FROM leave_requests lr WHERE lr.user_id = u.id AND lr.tenant_id = e.tenant_id AND lr.status = 'approved' AND CURRENT_DATE BETWEEN lr.start_date AND lr.end_date LIMIT 1) AS on_leave
        FROM employees e
        LEFT JOIN users u ON u.email = e.email AND u.tenant_id = e.tenant_id
        WHERE e.reporting_manager_id = $1 AND e.tenant_id = $2
        AND e.status = 'active'
        AND e.deleted_at IS NULL
        ORDER BY e.name
    `, [managerId, tenantId]);
    return result.rows;
}
