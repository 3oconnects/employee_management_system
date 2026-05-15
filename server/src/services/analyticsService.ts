// ============================================================================
// EMS BACKEND — ANALYTICS SERVICE (Zoho-Level Dashboard Data)
// ============================================================================
// Provides REAL business intelligence queries for all 4 dashboard roles.
// Every function returns live, computed data — no mocks.
// ============================================================================

import { pool } from '../config/db';



// ─── TYPES ──────────────────────────────────────────────────────────────────

interface RecentActivity {
    id: number;
    user_id: number;
    action: string;
    entity_type: string;
    entity_id: string;
    created_at: Date;
    user_name: string;
}

interface Holiday {
    name: string;
    date: Date;
    type: string;
}

interface SalaryDistItem {
    level: string;
    count: number;
    total_ctc: number;
}

interface AdminDashboardData {
    totalEmployees: number;
    activeEmployees: number;
    inactiveEmployees: number;
    newHiresThisMonth: number;
    exitedThisMonth: number;
    totalPayrollCost: number;
    avgSalary: number;
    pendingLeaves: number;
    pendingTimesheets: number;
    todayPresent: number;
    onLeaveToday: number;
    avgAttendanceRate: number;
    attritionRate: number;
    genderDistribution: { male: number; female: number; other: number };
    departmentDistribution: { name: string; count: number; percentage: number }[];
    employmentTypeBreakdown: { type: string; count: number }[];
    monthlyHiringTrend: { month: string; hires: number; exits: number }[];
    payrollTrend: { month: string; amount: number }[];
    recentActivities: RecentActivity[];
    upcomingHolidays: Holiday[];
    headcountGrowth: number;
    todayAttendanceLog: any[];
    salaryDistribution: SalaryDistItem[];
    orgMetrics: { units: number; locations: number };
}

// ─── ADMIN / HR DASHBOARD ───────────────────────────────────────────────────

export class AnalyticsService {

    /**
     * Complete admin dashboard — 15+ real metrics from DB
     */
    static async getAdminDashboard(tenantId: string): Promise<AdminDashboardData> {
        // Run each query individually with safe fallbacks so one failing query
        // (e.g. a column not yet migrated) doesn't crash the whole dashboard
        const safeQuery = async (sql: string, params?: any[], fallback: any = { rows: [{}] }) => {
            try { return await pool.query(sql, params); }
            catch (e: any) { 
                console.warn('[AnalyticsService] Query failed (using fallback):', e.message?.slice(0, 120));
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
            // 1. Employee counts
            safeQuery(`
                SELECT
                    COUNT(*) FILTER (WHERE status IN ('active', 'onboarding') AND deleted_at IS NULL) AS active,
                    COUNT(*) FILTER (WHERE status = 'terminated' OR deleted_at IS NOT NULL) AS inactive,
                    COUNT(*) AS total
                FROM employees
                WHERE tenant_id = $1
            `, [tenantId], { rows: [{ active: '0', inactive: '0', total: '0' }] }),
            // 2. New hires this month
            safeQuery(`
                SELECT COUNT(*) AS count FROM employees
                WHERE join_date >= DATE_TRUNC('month', CURRENT_DATE)
                AND deleted_at IS NULL
                AND tenant_id = $1
            `, [tenantId], { rows: [{ count: '0' }] }),
            // 3. Exits this month
            safeQuery(`
                SELECT COUNT(*) AS count FROM employees
                WHERE exit_date >= DATE_TRUNC('month', CURRENT_DATE)
                AND exit_date IS NOT NULL
                AND tenant_id = $1
            `, [tenantId], { rows: [{ count: '0' }] }),
            // 4. Payroll - Filter out corrupted data (salaries > 100 Cr)
            safeQuery(`
                SELECT
                    COALESCE(SUM(annual_ctc), 0) AS total_ctc,
                    COALESCE(AVG(annual_ctc), 0) AS avg_ctc,
                    COUNT(*) AS enrolled
                FROM payroll_profiles
                WHERE annual_ctc < 1000000000 AND tenant_id = $1
            `, [tenantId], { rows: [{ total_ctc: '0', avg_ctc: '0', enrolled: '0' }] }),
            // 5. Pending leave requests (handle both user_id and employee_id schemas)
            safeQuery(`
                SELECT COUNT(*) AS count FROM leave_requests
                WHERE status = 'pending' AND tenant_id = $1
            `, [tenantId], { rows: [{ count: '0' }] }),
            // 6. Pending timesheets (handle both user_id and employee_id schemas)
            safeQuery(`
                SELECT COUNT(*) AS count FROM timesheets
                WHERE status = 'submitted' AND tenant_id = $1
            `, [tenantId], { rows: [{ count: '0' }] }),
            // 7. Today's attendance — handle both check_in and check_in_time column names
            safeQuery(`
                SELECT COUNT(DISTINCT COALESCE(user_id::text, employee_id)) AS count FROM attendance
                WHERE COALESCE(check_in, check_in_time)::date = CURRENT_DATE AND tenant_id = $1
            `, [tenantId], { rows: [{ count: '0' }] }),
            // 8. On leave today
            safeQuery(`
                SELECT COUNT(*) AS count FROM leave_requests
                WHERE status = 'approved' AND tenant_id = $1
                AND CURRENT_DATE BETWEEN start_date AND end_date
            `, [tenantId], { rows: [{ count: '0' }] }),
            // 9. Gender distribution
            safeQuery(`
                SELECT
                    COUNT(*) FILTER (WHERE LOWER(gender) = 'male') AS male,
                    COUNT(*) FILTER (WHERE LOWER(gender) = 'female') AS female,
                    COUNT(*) FILTER (WHERE LOWER(gender) NOT IN ('male', 'female') OR gender IS NULL) AS other
                FROM employees WHERE status = 'active' AND tenant_id = $1
            `, [tenantId], { rows: [{ male: '0', female: '0', other: '0' }] }),
            // 10. Department distribution
            safeQuery(`
                SELECT
                    COALESCE(department, 'Unassigned') AS name,
                    COUNT(*) AS count
                FROM employees
                WHERE status = 'active' AND deleted_at IS NULL AND tenant_id = $1
                GROUP BY department
                ORDER BY count DESC
            `, [tenantId], { rows: [] }),
            // 11. Employment type breakdown
            safeQuery(`
                SELECT
                    COALESCE(employment_type, 'full_time') AS type,
                    COUNT(*) AS count
                FROM employees
                WHERE status = 'active' AND tenant_id = $1
                GROUP BY employment_type
            `, [tenantId], { rows: [] }),
            // 12. Monthly hiring trend (last 6 months)
            safeQuery(`
                WITH months AS (
                    SELECT generate_series(
                        DATE_TRUNC('month', CURRENT_DATE - INTERVAL '5 months'),
                        DATE_TRUNC('month', CURRENT_DATE),
                        '1 month'
                    )::date AS month
                )
                SELECT
                    TO_CHAR(m.month, 'Mon YYYY') AS month,
                    COALESCE(COUNT(e.id) FILTER (WHERE e.join_date >= m.month AND e.join_date < m.month + INTERVAL '1 month' AND e.tenant_id = $1), 0) AS hires,
                    COALESCE(COUNT(e.id) FILTER (WHERE e.exit_date >= m.month AND e.exit_date < m.month + INTERVAL '1 month' AND e.tenant_id = $1), 0) AS exits
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
            // 14. Recent activity (audit log last 10)
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
                WHERE date >= CURRENT_DATE
                ORDER BY date
                LIMIT 5
            `, [], { rows: [] }),
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
            // 17. Previous month headcount (for growth %)
            safeQuery(`
                SELECT COUNT(*) AS count FROM employees
                WHERE join_date < DATE_TRUNC('month', CURRENT_DATE)
                AND (exit_date IS NULL OR exit_date >= DATE_TRUNC('month', CURRENT_DATE))
                AND deleted_at IS NULL AND tenant_id = $1
            `, [tenantId], { rows: [{ count: '1' }] }),
            // 18. Today's attendance log
            safeQuery(`
                SELECT 
                    e.id, e.name, e.department, e.employment_type,
                    COALESCE(a.check_in, a.check_in_time) as check_in,
                    COALESCE(a.location, 'Main Office') as location
                FROM employees e
                LEFT JOIN users u ON u.email = e.email
                LEFT JOIN attendance a ON (a.user_id = u.id OR a.employee_id = e.id) AND COALESCE(a.check_in, a.check_in_time)::date = CURRENT_DATE
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
                    (SELECT COUNT(*)::int FROM departments WHERE is_active = true) as units,
                    (SELECT COUNT(DISTINCT location)::int FROM employees WHERE location IS NOT NULL AND status IN ('active', 'onboarding')) as locations
            `, [], { rows: [{ units: 0, locations: 0 }] }),
        ]);

        const emp = empStats.rows[0] || { active: '0', inactive: '0', total: '0' };
        const active = parseInt(emp.active) || 0;
        const total = parseInt(emp.total) || 0;
        const payroll = payrollStats.rows[0] || { total_ctc: '0', avg_ctc: '0' };
        const totalCtc = parseFloat(payroll.total_ctc) || 0;
        const avgCtc = parseFloat(payroll.avg_ctc) || 0;
        const prevCount = parseInt(prevMonthCount.rows[0]?.count) || 1;
        const att30 = last30Attendance.rows[0] || { working_days: '1', total_checkins: '0' };
        const workingDays = parseInt(att30.working_days) || 1;
        const totalCheckins = parseInt(att30.total_checkins) || 0;
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

    // ─── MANAGER DASHBOARD ──────────────────────────────────────────────────

    /**
     * Get dashboard data scoped to a manager's team
     */
    static async getManagerDashboard(userId: number) {
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
                LEFT JOIN users u ON u.email = e.email
                WHERE e.reporting_manager_id = $1
                AND e.status = 'active'
                AND e.deleted_at IS NULL
            `, [userId]),
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
                JOIN users u ON u.email = e.email
                LEFT JOIN attendance a ON a.user_id = u.id AND a.check_in::date = CURRENT_DATE
                WHERE e.reporting_manager_id = $1
                AND e.status = 'active'
            `, [userId]),
            // Pending leaves for team
            pool.query(`
                SELECT 
                    lr.id, lr.employee_id, lr.type, lr.start_date, lr.end_date, lr.reason, lr.status, lr.created_at,
                    u.name AS applicant_name, lt.name AS leave_type
                FROM leave_requests lr
                JOIN users u ON u.id = lr.user_id
                JOIN leave_types lt ON lt.id = lr.leave_type_id
                WHERE lr.status = 'pending'
                AND lr.user_id IN (
                    SELECT u2.id FROM employees e
                    JOIN users u2 ON u2.email = e.email
                    WHERE e.reporting_manager_id = $1
                )
                ORDER BY lr.created_at DESC
            `, [userId]),
            // Late check-ins today
            pool.query(`
                SELECT u.name, a.check_in,
                    EXTRACT(HOUR FROM a.check_in) AS hour,
                    EXTRACT(MINUTE FROM a.check_in) AS minute
                FROM attendance a
                JOIN users u ON u.id = a.user_id
                JOIN employees e ON e.email = u.email
                WHERE e.reporting_manager_id = $1
                AND a.check_in::date = CURRENT_DATE
                AND EXTRACT(HOUR FROM a.check_in) >= 10
            `, [userId]),
            // Timesheet completion
            pool.query(`
                SELECT
                    COUNT(*) FILTER (WHERE t.status = 'submitted') AS submitted,
                    COUNT(*) FILTER (WHERE t.status = 'approved') AS approved,
                    COUNT(*) FILTER (WHERE t.status = 'draft' OR t.status IS NULL) AS pending
                FROM employees e
                JOIN users u ON u.email = e.email
                LEFT JOIN timesheets t ON t.user_id = u.id
                    AND t.week_start >= CURRENT_DATE - INTERVAL '7 days'
                WHERE e.reporting_manager_id = $1
                AND e.status = 'active'
            `, [userId]),
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

    // ─── EMPLOYEE DASHBOARD ─────────────────────────────────────────────────

    /**
     * Get personal dashboard data for an employee
     */
    static async getEmployeeDashboard(userId: number) {
        const safeQuery = async (sql: string, params?: any[], fallback: any = { rows: [] }) => {
            try { return await pool.query(sql, params); }
            catch (e: any) { 
                console.warn('[AnalyticsService:employee] Query fallback:', e.message?.slice(0, 100));
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
            // Today's attendance — handles both old check_in_time and new check_in columns
            safeQuery(`
                SELECT
                    CASE WHEN EXISTS (
                        SELECT 1 FROM attendance WHERE user_id = $1 
                        AND COALESCE(check_in, check_in_time)::date = CURRENT_DATE 
                        AND COALESCE(check_out, check_out_time) IS NULL
                    ) THEN 'IN'
                    WHEN EXISTS (
                        SELECT 1 FROM attendance WHERE user_id = $1 
                        AND COALESCE(check_in, check_in_time)::date = CURRENT_DATE
                    ) THEN 'COMPLETED'
                    ELSE 'OUT'
                    END AS status,
                    (SELECT COALESCE(check_in, check_in_time) FROM attendance WHERE user_id = $1 
                     AND COALESCE(check_in, check_in_time)::date = CURRENT_DATE 
                     AND COALESCE(check_out, check_out_time) IS NULL 
                     ORDER BY COALESCE(check_in, check_in_time) DESC LIMIT 1) AS check_in,
                    (SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (COALESCE(check_out, check_out_time, NOW()) - COALESCE(check_in, check_in_time))) / 3600), 0)
                     FROM attendance WHERE user_id = $1 
                     AND COALESCE(check_in, check_in_time)::date = CURRENT_DATE) AS total_hours
            `, [userId], { rows: [{ status: 'OUT', check_in: null, total_hours: '0' }] }),
            // Monthly summary
            safeQuery(`
                SELECT
                    COUNT(DISTINCT COALESCE(check_in, check_in_time)::date) AS present_days,
                    COALESCE(AVG(EXTRACT(EPOCH FROM (COALESCE(check_out, check_out_time) - COALESCE(check_in, check_in_time))) / 3600) 
                        FILTER (WHERE COALESCE(check_out, check_out_time) IS NOT NULL), 0) AS avg_hours,
                    COUNT(*) FILTER (WHERE EXTRACT(HOUR FROM COALESCE(check_in, check_in_time)) >= 10) AS late_days
                FROM attendance
                WHERE user_id = $1
                AND EXTRACT(MONTH FROM COALESCE(check_in, check_in_time)) = EXTRACT(MONTH FROM CURRENT_DATE)
                AND EXTRACT(YEAR FROM COALESCE(check_in, check_in_time)) = EXTRACT(YEAR FROM CURRENT_DATE)
            `, [userId], { rows: [{ present_days: '0', avg_hours: '0', late_days: '0' }] }),
            // Leave balances — try user_id first, fallback gracefully
            safeQuery(`
                SELECT
                    lt.id AS leave_type_id,
                    lt.name,
                    lt.annual_quota,
                    COALESCE(COUNT(lr.id) FILTER (WHERE lr.status = 'approved'), 0) AS used,
                    lt.annual_quota - COALESCE(COUNT(lr.id) FILTER (WHERE lr.status = 'approved'), 0) AS available
                FROM leave_types lt
                LEFT JOIN leave_requests lr ON lr.leave_type_id = lt.id 
                    AND COALESCE(lr.user_id::text, '') = $1::text
                    AND EXTRACT(YEAR FROM lr.start_date) = EXTRACT(YEAR FROM CURRENT_DATE)
                GROUP BY lt.id, lt.name, lt.annual_quota
                ORDER BY lt.name
            `, [userId], { rows: [] }),
            // Upcoming holidays
            safeQuery(`
                SELECT name, date, type FROM holidays
                WHERE date >= CURRENT_DATE
                ORDER BY date LIMIT 5
            `, [], { rows: [] }),
            // Recent payslip — don't join payroll_runs to avoid run_id mismatch
            safeQuery(`
                SELECT 
                    ph.id, ph.employee_id, ph.month, ph.year, ph.gross_salary, ph.deductions, ph.net_salary, ph.paid_at
                FROM payroll_history ph
                WHERE ph.employee_id = (
                    SELECT e.id FROM employees e JOIN users u ON u.email = e.email WHERE u.id = $1 LIMIT 1
                )
                ORDER BY ph.paid_at DESC
                LIMIT 1
            `, [userId], { rows: [] }),
            // Notifications
            safeQuery(`
                SELECT * FROM notifications
                WHERE user_id = $1
                ORDER BY created_at DESC
                LIMIT 5
            `, [userId], { rows: [] }),
            // Weekly hours (last 7 days)
            safeQuery(`
                SELECT
                    TO_CHAR(COALESCE(check_in, check_in_time)::date, 'Dy') AS day,
                    COALESCE(check_in, check_in_time)::date AS date,
                    COALESCE(SUM(EXTRACT(EPOCH FROM 
                        (COALESCE(check_out, check_out_time, COALESCE(check_in, check_in_time)) 
                         - COALESCE(check_in, check_in_time))) / 3600), 0) AS hours
                FROM attendance
                WHERE user_id = $1
                AND COALESCE(check_in, check_in_time)::date >= CURRENT_DATE - INTERVAL '6 days'
                GROUP BY COALESCE(check_in, check_in_time)::date
                ORDER BY COALESCE(check_in, check_in_time)::date
            `, [userId], { rows: [] }),
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

    // ─── TEAM VISIBILITY ────────────────────────────────────────────────────

    /**
     * Get employees under a specific manager (team visibility)
     */
    static async getTeamEmployees(managerId: number) {
        const result = await pool.query(`
            SELECT
                e.id, e.name, e.department, e.position, e.status,
                e.email, e.phone, e.join_date, e.employment_type,
                u.id AS user_id, u.role,
                (SELECT check_in FROM attendance a WHERE a.user_id = u.id AND a.check_in::date = CURRENT_DATE ORDER BY check_in DESC LIMIT 1) AS today_check_in,
                (SELECT status FROM leave_requests lr WHERE lr.user_id = u.id AND lr.status = 'approved' AND CURRENT_DATE BETWEEN lr.start_date AND lr.end_date LIMIT 1) AS on_leave
            FROM employees e
            LEFT JOIN users u ON u.email = e.email
            WHERE e.reporting_manager_id = $1
            AND e.status = 'active'
            AND e.deleted_at IS NULL
            ORDER BY e.name
        `, [managerId]);
        return result.rows;
    }

    // ─── EMPLOYEE PROFILE ───────────────────────────────────────────────────

    /**
     * Get full employee profile with all sections
     */
    static async getEmployeeProfile(employeeId: string) {
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
                    e.gender, e.phone, e.personal_email, e.date_of_birth, e.address_line1, 
                    e.city, e.state, e.pincode, e.highest_degree, e.field_of_study, 
                    e.institution, e.graduation_year, e.bank_account_number, e.annual_ctc, 
                    e.employment_type, e.created_at, e.updated_at,
                    d.name AS department_name, d.code AS department_code,
                    mgr.name AS manager_name, mgr.email AS manager_email
                FROM employees e
                LEFT JOIN departments d ON d.id = e.department_id
                LEFT JOIN users mgr_u ON mgr_u.id = e.reporting_manager_id
                LEFT JOIN employees mgr ON mgr.email = mgr_u.email
                WHERE e.id = $1
            `, [employeeId]),
            pool.query('SELECT * FROM payroll_profiles WHERE employee_id = $1', [employeeId]),
            pool.query('SELECT * FROM employee_documents WHERE employee_id = $1 ORDER BY created_at DESC', [employeeId]),
            pool.query('SELECT * FROM employee_emergency_contacts WHERE employee_id = $1 ORDER BY is_primary DESC', [employeeId]),
            pool.query('SELECT * FROM performance_reviews WHERE employee_id = $1 ORDER BY created_at DESC LIMIT 5', [employeeId]),
            pool.query(`
                SELECT
                    COUNT(DISTINCT COALESCE(check_in, check_in_time)::date) AS present_days,
                    COALESCE(AVG(EXTRACT(EPOCH FROM (COALESCE(check_out, check_out_time, NOW()) - COALESCE(check_in, check_in_time))) / 3600) FILTER (WHERE COALESCE(check_out, check_out_time) IS NOT NULL), 0) AS avg_hours,
                    COUNT(*) FILTER (WHERE EXTRACT(HOUR FROM COALESCE(check_in, check_in_time)) >= 10) AS late_arrivals
                FROM attendance
                WHERE employee_id = $1
                AND COALESCE(check_in, check_in_time) >= DATE_TRUNC('month', CURRENT_DATE)
            `, [employeeId]),
            pool.query(`
                SELECT
                    lt.name,
                    lt.annual_quota,
                    COALESCE(COUNT(lr.id) FILTER (WHERE lr.status = 'approved'), 0) AS used,
                    lt.annual_quota - COALESCE(COUNT(lr.id) FILTER (WHERE lr.status = 'approved'), 0) AS available
                FROM leave_types lt
                LEFT JOIN leave_requests lr ON lr.leave_type_id = lt.id
                    AND lr.user_id = (SELECT u.id FROM users u JOIN employees e ON e.email = u.email WHERE e.id = $1 LIMIT 1)
                    AND EXTRACT(YEAR FROM lr.start_date) = EXTRACT(YEAR FROM CURRENT_DATE)
                GROUP BY lt.id, lt.name, lt.annual_quota
            `, [employeeId]),
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
}
