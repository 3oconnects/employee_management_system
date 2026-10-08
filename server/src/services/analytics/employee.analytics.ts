/**
 * Individual Employee Analytics & Profile Domain Service
 * 
 * Computes individual attendance telemetry, leave quotas, weekly trends,
 * payslip references, and 360-degree profile details.
 */

import { pool } from '../../config/db';
import { EmployeeDashboardSubmodel, EmployeeProfileSubmodel } from './analytics.submodels';

export async function fetchEmployeeDashboard(userId: number, tenantId: string): Promise<EmployeeDashboardSubmodel> {
    const safeQuery = async (sql: string, params?: any[], fallback: any = { rows: [] }) => {
        try { 
            return await pool.query(sql, params); 
        } catch (e: any) { 
            console.warn('[AnalyticsService:Employee] Query fallback:', e.message?.slice(0, 100));
            return fallback;
        }
    };

    const [
        attendanceToday,
        monthlySummary,
        leaveBalances,
        upcomingHolidays,
        recentPayslip,
        notifications,
        weeklyHours,
    ] = await Promise.all([
        // Today's attendance
        safeQuery(`
            SELECT
                CASE WHEN EXISTS (
                    SELECT 1 FROM attendance WHERE user_id = $1 AND tenant_id = $2
                    AND COALESCE(check_in, check_in_time)::date = CURRENT_DATE
                    AND COALESCE(check_out, check_out_time) IS NULL
                ) THEN 'IN'
                WHEN EXISTS (
                    SELECT 1 FROM attendance WHERE user_id = $1 AND tenant_id = $2
                    AND COALESCE(check_in, check_in_time)::date = CURRENT_DATE
                ) THEN 'COMPLETED'
                ELSE 'OUT'
                END AS status,
                (SELECT COALESCE(check_in, check_in_time) FROM attendance WHERE user_id = $1 AND tenant_id = $2
                 AND COALESCE(check_in, check_in_time)::date = CURRENT_DATE
                 AND COALESCE(check_out, check_out_time) IS NULL 
                 ORDER BY COALESCE(check_in, check_in_time) DESC LIMIT 1) AS check_in,
                (SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (COALESCE(check_out, check_out_time, NOW()) - COALESCE(check_in, check_in_time))) / 3600), 0)
                 FROM attendance WHERE user_id = $1 AND tenant_id = $2
                 AND COALESCE(check_in, check_in_time)::date = CURRENT_DATE) AS total_hours
        `, [userId, tenantId], { rows: [{ status: 'OUT', check_in: null, total_hours: '0' }] }),
        // Monthly summary
        safeQuery(`
            SELECT
                COUNT(DISTINCT COALESCE(check_in, check_in_time)::date) AS present_days,
                COALESCE(AVG(EXTRACT(EPOCH FROM (COALESCE(check_out, check_out_time) - COALESCE(check_in, check_in_time))) / 3600) 
                    FILTER (WHERE COALESCE(check_out, check_out_time) IS NOT NULL), 0) AS avg_hours,
                COUNT(*) FILTER (WHERE EXTRACT(HOUR FROM COALESCE(check_in, check_in_time)) >= 10) AS late_days
            FROM attendance
            WHERE user_id = $1 AND tenant_id = $2
            AND EXTRACT(MONTH FROM COALESCE(check_in, check_in_time)) = EXTRACT(MONTH FROM CURRENT_DATE)
            AND EXTRACT(YEAR FROM COALESCE(check_in, check_in_time)) = EXTRACT(YEAR FROM CURRENT_DATE)
        `, [userId, tenantId], { rows: [{ present_days: '0', avg_hours: '0', late_days: '0' }] }),
        // Leave balances
        safeQuery(`
            SELECT
                lt.id AS leave_type_id,
                lt.name,
                lt.annual_quota,
                COALESCE(COUNT(lr.id) FILTER (WHERE lr.status = 'approved'), 0) AS used,
                lt.annual_quota - COALESCE(COUNT(lr.id) FILTER (WHERE lr.status = 'approved'), 0) AS available
            FROM leave_types lt
            LEFT JOIN leave_requests lr ON lr.leave_type_id = lt.id 
                AND COALESCE(lr.user_id::text, '') = $1::text AND lr.tenant_id = $2
                AND EXTRACT(YEAR FROM lr.start_date) = EXTRACT(YEAR FROM CURRENT_DATE)
            GROUP BY lt.id, lt.name, lt.annual_quota
            ORDER BY lt.name
        `, [userId, tenantId], { rows: [] }),
        // Upcoming holidays
        safeQuery(`
            SELECT name, date, type FROM holidays
            WHERE date >= CURRENT_DATE AND (tenant_id = $1 OR tenant_id IS NULL)
            ORDER BY date LIMIT 5
        `, [tenantId], { rows: [] }),
        // Recent payslip
        safeQuery(`
            SELECT 
                ph.id, ph.employee_id, ph.month, ph.year, ph.gross_salary, ph.deductions, ph.net_salary, ph.paid_at
            FROM payroll_history ph
            WHERE ph.tenant_id = $2 AND ph.employee_id = (
                SELECT e.id FROM employees e JOIN users u ON u.email = e.email AND u.tenant_id = e.tenant_id
                WHERE u.id = $1 AND e.tenant_id = $2 LIMIT 1
            )
            ORDER BY ph.paid_at DESC
            LIMIT 1
        `, [userId, tenantId], { rows: [] }),
        // Notifications
        safeQuery(`
            SELECT * FROM notifications
            WHERE user_id = $1 AND tenant_id = $2
            ORDER BY created_at DESC
            LIMIT 5
        `, [userId, tenantId], { rows: [] }),
        // Weekly hours (last 7 days)
        safeQuery(`
            SELECT
                TO_CHAR(COALESCE(check_in, check_in_time)::date, 'Dy') AS day,
                COALESCE(check_in, check_in_time)::date AS date,
                COALESCE(SUM(EXTRACT(EPOCH FROM 
                    (COALESCE(check_out, check_out_time, COALESCE(check_in, check_in_time)) 
                     - COALESCE(check_in, check_in_time))) / 3600), 0) AS hours
            FROM attendance
            WHERE user_id = $1 AND tenant_id = $2
            AND COALESCE(check_in, check_in_time)::date >= CURRENT_DATE - INTERVAL '6 days'
            GROUP BY COALESCE(check_in, check_in_time)::date
            ORDER BY COALESCE(check_in, check_in_time)::date
        `, [userId, tenantId], { rows: [] }),
    ]);

    const att = attendanceToday.rows[0];
    const monthly = monthlySummary.rows[0];

    return {
        attendance: {
            status: att?.status || 'OUT',
            checkIn: att?.check_in,
            totalHoursToday: parseFloat(att?.total_hours || '0').toFixed(2),
        },
        monthlySummary: {
            presentDays: parseInt(monthly?.present_days || '0'),
            avgHours: parseFloat(monthly?.avg_hours || '0').toFixed(1),
            lateDays: parseInt(monthly?.late_days || '0'),
        },
        leaveBalances: leaveBalances.rows.map((r: any) => ({
            leave_type_id: r.leave_type_id,
            name: r.name,
            annual_quota: r.annual_quota,
            used: parseInt(r.used),
            available: parseInt(r.available),
        })),
        upcomingHolidays: upcomingHolidays.rows,
        recentPayslip: recentPayslip.rows[0] || null,
        notifications: notifications.rows,
        weeklyHours: weeklyHours.rows.map((r: any) => ({
            day: r.day,
            date: r.date,
            hours: parseFloat(r.hours).toFixed(1),
        })),
    };
}

export async function fetchEmployeeProfile(employeeId: string, tenantId: string): Promise<EmployeeProfileSubmodel> {
    const [
        employee,
        payroll,
        documents,
        emergencyContacts,
        reviews,
        attendanceSummary,
        leaveBalances,
    ] = await Promise.all([
        pool.query(`
            SELECT 
                e.id, e.name, e.department, e.position, e.join_date, e.email, e.status, 
                e.avatar_url,
                e.gender, e.phone, e.personal_email, e.date_of_birth, e.address_line1, 
                e.city, e.state, e.pincode, e.highest_degree, e.field_of_study, 
                e.institution, e.graduation_year, e.bank_account_number, e.annual_ctc, 
                e.employment_type, e.created_at, e.updated_at,
                d.name AS department_name, d.code AS department_code,
                mgr.name AS manager_name, mgr.email AS manager_email,
                own_u.availability_status
            FROM employees e
            LEFT JOIN users own_u ON own_u.email = e.email AND own_u.tenant_id = e.tenant_id
            LEFT JOIN departments d ON d.id = e.department_id AND d.tenant_id = e.tenant_id
            LEFT JOIN users mgr_u ON mgr_u.id = e.reporting_manager_id AND mgr_u.tenant_id = e.tenant_id
            LEFT JOIN employees mgr ON mgr.email = mgr_u.email AND mgr.tenant_id = e.tenant_id
            WHERE e.id = $1 AND e.tenant_id = $2
        `, [employeeId, tenantId]),
        pool.query('SELECT * FROM payroll_profiles WHERE employee_id = $1 AND tenant_id = $2', [employeeId, tenantId]),
        pool.query('SELECT * FROM employee_documents WHERE employee_id = $1 AND tenant_id = $2 ORDER BY created_at DESC', [employeeId, tenantId]),
        pool.query('SELECT * FROM employee_emergency_contacts WHERE employee_id = $1 AND tenant_id = $2 ORDER BY is_primary DESC', [employeeId, tenantId]),
        pool.query('SELECT * FROM performance_reviews WHERE employee_id = $1 AND tenant_id = $2 ORDER BY created_at DESC LIMIT 5', [employeeId, tenantId]),
        pool.query(`
            SELECT
                COUNT(DISTINCT COALESCE(check_in, check_in_time)::date) AS present_days,
                COALESCE(AVG(EXTRACT(EPOCH FROM (COALESCE(check_out, check_out_time, NOW()) - COALESCE(check_in, check_in_time))) / 3600) FILTER (WHERE COALESCE(check_out, check_out_time) IS NOT NULL), 0) AS avg_hours,
                COUNT(*) FILTER (WHERE EXTRACT(HOUR FROM COALESCE(check_in, check_in_time)) >= 10) AS late_arrivals
            FROM attendance
            WHERE employee_id = $1 AND tenant_id = $2
            AND COALESCE(check_in, check_in_time) >= DATE_TRUNC('month', CURRENT_DATE)
        `, [employeeId, tenantId]),
        pool.query(`
            SELECT
                lt.name,
                lt.annual_quota,
                COALESCE(COUNT(lr.id) FILTER (WHERE lr.status = 'approved'), 0) AS used,
                lt.annual_quota - COALESCE(COUNT(lr.id) FILTER (WHERE lr.status = 'approved'), 0) AS available
            FROM leave_types lt
            LEFT JOIN leave_requests lr ON lr.leave_type_id = lt.id
                AND lr.tenant_id = $2
                AND lr.user_id = (SELECT u.id FROM users u JOIN employees e ON e.email = u.email AND e.tenant_id = u.tenant_id WHERE e.id = $1 AND e.tenant_id = $2 LIMIT 1)
                AND EXTRACT(YEAR FROM lr.start_date) = EXTRACT(YEAR FROM CURRENT_DATE)
            GROUP BY lt.id, lt.name, lt.annual_quota
        `, [employeeId, tenantId]),
    ]);

    return {
        employee: employee.rows[0] || null,
        compensation: payroll.rows[0] || null,
        documents: documents.rows,
        emergencyContacts: emergencyContacts.rows,
        performanceReviews: reviews.rows,
        attendanceSummary: attendanceSummary.rows[0] || { present_days: 0, avg_hours: 0, late_arrivals: 0 },
        leaveBalances: leaveBalances.rows,
    };
}
