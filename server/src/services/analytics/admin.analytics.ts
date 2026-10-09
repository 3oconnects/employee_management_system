/**
 * Admin & HR Analytics Domain Service
 * 
 * Computes live, aggregated business intelligence metrics for tenant leadership,
 * including headcount growth, salary distributions, hiring trends, attendance logs, and org metrics.
 */

import { pool } from '../../config/db';
import { AdminDashboardSubmodel } from './analytics.submodels';

export async function fetchAdminDashboard(tenantId: string): Promise<AdminDashboardSubmodel> {
    const safeQuery = async (sql: string, params?: any[], fallback: any = { rows: [{}] }) => {
        try { 
            return await pool.query(sql, params); 
        } catch (e: any) { 
            console.warn('[AnalyticsService:Admin] Query fallback:', e.message?.slice(0, 120));
            return fallback;
        }
    };

    const [
        empStats,
        newHires,
        exited,
        payrollStats,
        pendingLeaves,
        pendingTimesheets,
        todayAttendance,
        onLeaveToday,
        genderDist,
        deptDist,
        empTypeDist,
        hiringTrend,
        payrollTrend,
        recentActivity,
        holidays,
        last30Attendance,
        prevMonthCount,
        todayAttendanceLog,
        salaryDistribution,
        orgMetrics,
    ] = await Promise.all([
        // 1. Employee status counts (Strict: candidates in onboarding/offer stages are prospective, not active hires)
        safeQuery(`
            SELECT
                COUNT(*) FILTER (WHERE status = 'active' AND deleted_at IS NULL) AS active,
                COUNT(*) FILTER (WHERE status IN ('terminated', 'resigned', 'suspended') OR deleted_at IS NOT NULL) AS inactive,
                COUNT(*) FILTER (WHERE status = 'active' OR deleted_at IS NOT NULL) AS total
            FROM employees WHERE tenant_id = $1
        `, [tenantId], { rows: [{ active: '0', inactive: '0', total: '0' }] }),
        // 2. New hires this month (Only confirmed, active hires)
        safeQuery(`
            SELECT COUNT(*) AS count FROM employees
            WHERE status = 'active'
            AND (confirmation_date >= DATE_TRUNC('month', CURRENT_DATE) OR (confirmation_date IS NULL AND join_date >= DATE_TRUNC('month', CURRENT_DATE)))
            AND deleted_at IS NULL AND tenant_id = $1
        `, [tenantId], { rows: [{ count: '0' }] }),
        // 3. Exited this month
        safeQuery(`
            SELECT COUNT(*) AS count FROM employees
            WHERE exit_date >= DATE_TRUNC('month', CURRENT_DATE) AND tenant_id = $1
        `, [tenantId], { rows: [{ count: '0' }] }),
        // 4. Payroll cost and averages
        safeQuery(`
            SELECT
                COALESCE(SUM(annual_ctc), 0) AS total_ctc,
                COALESCE(AVG(annual_ctc) FILTER (WHERE annual_ctc > 0), 0) AS avg_ctc
            FROM payroll_profiles pp
            JOIN employees e ON e.id = pp.employee_id
            WHERE e.status = 'active' AND e.deleted_at IS NULL AND e.tenant_id = $1
        `, [tenantId], { rows: [{ total_ctc: '0', avg_ctc: '0' }] }),
        // 5. Pending leaves
        safeQuery(`SELECT COUNT(*) AS count FROM leave_requests WHERE status = 'pending' AND tenant_id = $1`, [tenantId], { rows: [{ count: '0' }] }),
        // 6. Pending timesheets
        safeQuery(`SELECT COUNT(*) AS count FROM timesheets WHERE status = 'submitted' AND tenant_id = $1`, [tenantId], { rows: [{ count: '0' }] }),
        // 7. Today's attendance
        safeQuery(`
            SELECT COUNT(DISTINCT COALESCE(user_id::text, employee_id)) AS count 
            FROM attendance 
            WHERE TO_CHAR(COALESCE(check_in, check_in_time), 'YYYY-MM-DD') = TO_CHAR(CURRENT_TIMESTAMP, 'YYYY-MM-DD')
            AND tenant_id = $1
        `, [tenantId], { rows: [{ count: '0' }] }),
        // 8. On leave today
        safeQuery(`
            SELECT COUNT(DISTINCT employee_id) AS count FROM leave_requests
            WHERE status = 'approved' AND CURRENT_DATE BETWEEN start_date AND end_date AND tenant_id = $1
        `, [tenantId], { rows: [{ count: '0' }] }),
        // 9. Gender breakdown
        safeQuery(`
            SELECT
                COUNT(*) FILTER (WHERE LOWER(gender) = 'male') AS male,
                COUNT(*) FILTER (WHERE LOWER(gender) = 'female') AS female,
                COUNT(*) FILTER (WHERE LOWER(gender) NOT IN ('male', 'female') OR gender IS NULL) AS other
            FROM employees WHERE status = 'active' AND deleted_at IS NULL AND tenant_id = $1
        `, [tenantId], { rows: [{ male: '0', female: '0', other: '0' }] }),
        // 10. Department distribution
        safeQuery(`
            SELECT COALESCE(d.name, e.department, 'Unassigned') AS name, COUNT(e.id) AS count
            FROM employees e
            LEFT JOIN departments d ON d.id = e.department_id AND d.tenant_id = e.tenant_id
            WHERE e.status = 'active' AND e.deleted_at IS NULL AND e.tenant_id = $1
            GROUP BY COALESCE(d.name, e.department, 'Unassigned')
            ORDER BY count DESC
        `, [tenantId], { rows: [] }),
        // 11. Employment type breakdown
        safeQuery(`
            SELECT COALESCE(employment_type, 'full_time') AS type, COUNT(*) AS count
            FROM employees WHERE status = 'active' AND deleted_at IS NULL AND tenant_id = $1
            GROUP BY COALESCE(employment_type, 'full_time')
        `, [tenantId], { rows: [] }),
        // 12. Monthly hiring trend (last 6 months)
        safeQuery(`
            WITH months AS (
                SELECT DATE_TRUNC('month', CURRENT_DATE - (n || ' months')::INTERVAL) AS month
                FROM generate_series(5, 0, -1) n
            )
            SELECT
                TO_CHAR(m.month, 'Mon YYYY') AS month,
                COUNT(DISTINCT e.id) FILTER (WHERE e.join_date >= m.month AND e.join_date < m.month + INTERVAL '1 month') AS hires,
                COUNT(DISTINCT e.id) FILTER (WHERE e.exit_date >= m.month AND e.exit_date < m.month + INTERVAL '1 month') AS exits
            FROM months m
            LEFT JOIN employees e ON (
                (e.join_date >= m.month AND e.join_date < m.month + INTERVAL '1 month')
                OR (e.exit_date >= m.month AND e.exit_date < m.month + INTERVAL '1 month')
            ) AND e.tenant_id = $1
            GROUP BY m.month
            ORDER BY m.month
        `, [tenantId], { rows: [] }),
        // 13. Payroll trend (last 6 months)
        safeQuery(`
            SELECT
                TO_CHAR(DATE_TRUNC('month', paid_at), 'Mon YYYY') AS month,
                COALESCE(SUM(net_salary), 0) AS amount
            FROM payroll_history
            WHERE paid_at >= CURRENT_DATE - INTERVAL '6 months' AND tenant_id = $1
            GROUP BY DATE_TRUNC('month', paid_at)
            ORDER BY DATE_TRUNC('month', paid_at)
        `, [tenantId], { rows: [] }),
        // 14. Recent activity
        safeQuery(`
            SELECT 
                al.id, al.user_id, al.action, al.entity_type, al.entity_id, al.created_at,
                u.name AS user_name
            FROM audit_logs al
            LEFT JOIN users u ON u.id = al.user_id
            WHERE al.tenant_id = $1
            ORDER BY al.created_at DESC
            LIMIT 10
        `, [tenantId], { rows: [] }),
        // 15. Upcoming holidays
        safeQuery(`
            SELECT name, date, type FROM holidays
            WHERE date >= CURRENT_DATE AND (tenant_id = $1 OR tenant_id IS NULL)
            ORDER BY date
            LIMIT 5
        `, [tenantId], { rows: [] }),
        // 16. Avg attendance (last 30 days)
        safeQuery(`
            WITH daily_counts AS (
                SELECT 
                    COALESCE(check_in, check_in_time)::date as d,
                    COUNT(DISTINCT COALESCE(user_id::text, employee_id)) as present
                FROM attendance
                WHERE COALESCE(check_in, check_in_time) >= CURRENT_DATE - INTERVAL '30 days' AND tenant_id = $1
                GROUP BY 1
            )
            SELECT 
                COALESCE(AVG(present), 0) as avg_present,
                (SELECT COUNT(DISTINCT COALESCE(check_in, check_in_time)::date) FROM attendance WHERE COALESCE(check_in, check_in_time) >= CURRENT_DATE - INTERVAL '30 days' AND tenant_id = $1) as working_days
            FROM daily_counts
        `, [tenantId], { rows: [{ avg_present: '0', working_days: '1' }] }),
        // 17. Previous month headcount
        safeQuery(`
            SELECT COUNT(*) AS count FROM employees
            WHERE join_date < DATE_TRUNC('month', CURRENT_DATE)
            AND (exit_date IS NULL OR exit_date >= DATE_TRUNC('month', CURRENT_DATE))
            AND deleted_at IS NULL AND tenant_id = $1
        `, [tenantId], { rows: [{ count: '1' }] }),
        // 18. Today's attendance log with monthly cumulative metrics
        safeQuery(`
            SELECT 
                e.id, e.name, e.department, e.position, e.employment_type, e.email, e.avatar_url,
                e.id as employee_id,
                COALESCE(a.check_in, a.check_in_time) as check_in,
                COALESCE(a.check_out, a.check_out_time) as check_out,
                COALESCE(a.location, 'Main Office') as location,
                CASE 
                    WHEN COALESCE(a.check_out, a.check_out_time) IS NOT NULL THEN
                        ROUND(EXTRACT(EPOCH FROM (COALESCE(a.check_out, a.check_out_time) - COALESCE(a.check_in, a.check_in_time))) / 3600, 2)
                    WHEN TO_CHAR(COALESCE(a.check_in, a.check_in_time), 'YYYY-MM-DD') = TO_CHAR(CURRENT_TIMESTAMP, 'YYYY-MM-DD') THEN
                        ROUND(EXTRACT(EPOCH FROM (NOW() - COALESCE(a.check_in, a.check_in_time))) / 3600, 2)
                    ELSE 0
                END as today_hours,
                COALESCE(m.days_present, 0)::int as days_present,
                COALESCE(m.total_hours, 0)::numeric as total_hours,
                COALESCE(m.avg_daily_hours, 0)::numeric as avg_daily_hours,
                COALESCE(m.overtime_hours, 0)::numeric as overtime_hours
            FROM employees e
            LEFT JOIN users u ON u.email = e.email
            LEFT JOIN attendance a ON (a.user_id = u.id OR a.employee_id = e.id) 
                AND TO_CHAR(COALESCE(a.check_in, a.check_in_time), 'YYYY-MM-DD') = TO_CHAR(CURRENT_TIMESTAMP, 'YYYY-MM-DD')
            LEFT JOIN (
                SELECT 
                    COALESCE(att.employee_id, att.user_id::text) as emp_ref,
                    COUNT(DISTINCT TO_CHAR(COALESCE(att.check_in, att.check_in_time, att.date), 'YYYY-MM-DD')) as days_present,
                    ROUND(COALESCE(SUM(
                        CASE 
                            WHEN COALESCE(att.check_out, att.check_out_time) IS NOT NULL THEN
                                EXTRACT(EPOCH FROM (COALESCE(att.check_out, att.check_out_time) - COALESCE(att.check_in, att.check_in_time))) / 3600
                            ELSE 8.0
                        END
                    ), 0), 1) as total_hours,
                    ROUND(COALESCE(AVG(
                        CASE 
                            WHEN COALESCE(att.check_out, att.check_out_time) IS NOT NULL THEN
                                EXTRACT(EPOCH FROM (COALESCE(att.check_out, att.check_out_time) - COALESCE(att.check_in, att.check_in_time))) / 3600
                            ELSE 8.0
                        END
                    ), 0), 1) as avg_daily_hours,
                    ROUND(COALESCE(SUM(
                        GREATEST(0, (
                            CASE 
                                WHEN COALESCE(att.check_out, att.check_out_time) IS NOT NULL THEN
                                    EXTRACT(EPOCH FROM (COALESCE(att.check_out, att.check_out_time) - COALESCE(att.check_in, att.check_in_time))) / 3600
                                ELSE 8.0
                            END
                        ) - 8.0)
                    ), 0), 1) as overtime_hours
                FROM attendance att
                WHERE COALESCE(att.check_in, att.check_in_time, att.date) >= DATE_TRUNC('month', CURRENT_DATE)
                  AND att.tenant_id = $1
                GROUP BY COALESCE(att.employee_id, att.user_id::text)
            ) m ON (m.emp_ref = e.id OR (u.id IS NOT NULL AND m.emp_ref = u.id::text))
            WHERE e.status IN ('active', 'onboarding') AND e.deleted_at IS NULL AND e.tenant_id = $1
            ORDER BY a.check_in DESC NULLS LAST, e.name
        `, [tenantId], { rows: [] }),
        // 19. Salary distribution
        safeQuery(`
            SELECT 
                e.position as level,
                COUNT(*) as count,
                COALESCE(SUM(pp.annual_ctc), 0) as total_ctc
            FROM employees e
            LEFT JOIN payroll_profiles pp ON pp.employee_id = e.id
            WHERE e.status IN ('active', 'onboarding') AND e.deleted_at IS NULL AND e.tenant_id = $1
            GROUP BY e.position
        `, [tenantId], { rows: [] }),
        // 20. Org metrics
        safeQuery(`
            SELECT 
                (SELECT COUNT(*)::int FROM departments WHERE is_active = true AND tenant_id = $1) as units,
                (SELECT COUNT(DISTINCT location)::int FROM employees WHERE location IS NOT NULL AND status IN ('active', 'onboarding') AND tenant_id = $1) as locations
        `, [tenantId], { rows: [{ units: 0, locations: 0 }] }),
    ]);

    const emp = empStats.rows[0] || { active: '0', inactive: '0', total: '0' };
    const active = parseInt(emp.active) || 0;
    const total = parseInt(emp.total) || 0;
    const payroll = payrollStats.rows[0] || { total_ctc: '0', avg_ctc: '0' };
    const totalCtc = parseFloat(payroll.total_ctc) || 0;
    const avgCtc = parseFloat(payroll.avg_ctc) || 0;
    const prevCount = parseInt(prevMonthCount.rows[0]?.count) || 1;
    const att30 = last30Attendance.rows[0] || { working_days: '1', avg_present: '0' };
    const attendanceLog = todayAttendanceLog.rows || [];
    const salaryDist = salaryDistribution.rows || [];
    const org = orgMetrics.rows[0] || { units: 0, locations: 0 };

    // Department distribution with percentages
    const totalDeptEmp = deptDist.rows.reduce((s: number, r: any) => s + parseInt(r.count), 0) || 1;
    const departments = deptDist.rows.map((r: any) => ({
        name: r.name,
        count: parseInt(r.count),
        percentage: totalDeptEmp > 0 ? Math.round((parseInt(r.count) / totalDeptEmp) * 100) : 0,
    }));

    // Attrition rate (annualized)
    const exitedCount = parseInt(exited.rows[0]?.count) || 0;
    const avgHeadcount = (active + prevCount) / 2 || 1;
    const monthlyAttrition = exitedCount / avgHeadcount;
    const annualizedAttrition = Math.round(monthlyAttrition * 12 * 100 * 10) / 10;
    const genderRow = genderDist.rows[0] || { male: '0', female: '0', other: '0' };

    return {
        totalEmployees: total,
        activeEmployees: active,
        inactiveEmployees: parseInt(emp.inactive) || 0,
        newHiresThisMonth: parseInt(newHires.rows[0]?.count) || 0,
        exitedThisMonth: exitedCount,
        totalPayrollCost: Math.round(totalCtc / 12),
        avgSalary: Math.round(avgCtc / 12),
        pendingLeaves: parseInt(pendingLeaves.rows[0]?.count) || 0,
        pendingTimesheets: parseInt(pendingTimesheets.rows[0]?.count) || 0,
        todayPresent: parseInt(todayAttendance.rows[0]?.count) || 0,
        onLeaveToday: parseInt(onLeaveToday.rows[0]?.count) || 0,
        avgAttendanceRate: active > 0 ? Math.round((parseFloat(att30.avg_present) / active) * 100) : 0,
        attritionRate: annualizedAttrition,
        genderDistribution: {
            male: parseInt(genderRow.male) || 0,
            female: parseInt(genderRow.female) || 0,
            other: parseInt(genderRow.other) || 0,
        },
        departmentDistribution: departments,
        employmentTypeBreakdown: empTypeDist.rows.map((r: any) => ({
            type: r.type,
            count: parseInt(r.count),
        })),
        monthlyHiringTrend: hiringTrend.rows.map((r: any) => ({
            month: r.month,
            hires: parseInt(r.hires),
            exits: parseInt(r.exits),
        })),
        payrollTrend: payrollTrend.rows.map((r: any) => ({
            month: r.month,
            amount: parseFloat(r.amount),
        })),
        recentActivities: recentActivity.rows,
        upcomingHolidays: holidays.rows,
        headcountGrowth: Math.round(((active - prevCount) / prevCount) * 100 * 10) / 10,
        todayAttendanceLog: attendanceLog,
        salaryDistribution: salaryDist,
        orgMetrics: {
            units: parseInt(org.units) || 0,
            locations: parseInt(org.locations) || 1,
        },
    };
}
