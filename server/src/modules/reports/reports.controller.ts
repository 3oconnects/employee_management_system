import { Request, Response } from 'express';
import { AnalyticsService } from '../../services/analyticsService';
import { AuthenticatedRequest } from '../../types';
import { AppError } from '../../core/errors/AppError';
import { pool } from '../../config/db';

export const getAdminDashboard = async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.user!.tenantId;
    const data = await AnalyticsService.getAdminDashboard(tenantId);
    res.json(data);
};

export const getManagerDashboard = async (req: Request, res: Response) => {
    const userId = parseInt(req.query.userId as string);
    if (!userId) throw AppError.badRequest('userId required');
    const data = await AnalyticsService.getManagerDashboard(userId);
    res.json(data);
};

export const getEmployeeDashboard = async (req: Request, res: Response) => {
    const userId = parseInt(req.query.userId as string);
    if (!userId) throw AppError.badRequest('userId required');
    const data = await AnalyticsService.getEmployeeDashboard(userId);
    res.json(data);
};

export const getTeamEmployees = async (req: Request, res: Response) => {
    const managerId = parseInt(req.query.managerId as string);
    if (!managerId) throw AppError.badRequest('managerId required');
    const employees = await AnalyticsService.getTeamEmployees(managerId);
    res.json({ items: employees, total: employees.length });
};

export const getEmployeeProfile = async (req: Request, res: Response) => {
    const { employeeId } = req.params;
    if (!employeeId) throw AppError.badRequest('employeeId required');
    const profile = await AnalyticsService.getEmployeeProfile(employeeId);
    if (!profile.employee) throw AppError.notFound('Employee not found');
    res.json(profile);
};

export const getAnalytics = async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.user!.tenantId;

    const [empCount, attendanceCount, leaveCount, timesheetCount] = await Promise.all([
        pool.query('SELECT COUNT(*)::int FROM employees WHERE tenant_id = $1', [tenantId]),
        pool.query('SELECT COUNT(DISTINCT COALESCE(user_id::text, employee_id))::int FROM attendance WHERE COALESCE(check_in, check_in_time)::date = CURRENT_DATE AND tenant_id = $1', [tenantId]),
        pool.query("SELECT COUNT(DISTINCT user_id)::int FROM leave_requests WHERE status = 'approved' AND CURRENT_DATE BETWEEN start_date AND end_date AND tenant_id = $1", [tenantId]),
        pool.query("SELECT COUNT(DISTINCT user_id)::int FROM timesheets WHERE week_start <= CURRENT_DATE AND week_end >= CURRENT_DATE AND tenant_id = $1", [tenantId])
    ]);

    const totalEmployees = empCount.rows[0].count || 1;
    const attendanceCompliance = ((attendanceCount.rows[0].count / totalEmployees) * 100).toFixed(1) + '%';
    const leaveUtilization = ((leaveCount.rows[0].count / totalEmployees) * 100).toFixed(1) + '%';
    const timesheetRate = ((timesheetCount.rows[0].count / totalEmployees) * 100).toFixed(1) + '%';

    res.json({
        operational: {
            attendance: { val: attendanceCompliance, desc: 'Daily presence' },
            leave: { val: leaveUtilization, desc: 'Staff on leave' },
            timesheet: { val: timesheetRate, desc: 'Timesheet compliance' }
        }
    });
};

export const getReportSummary = async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.user!.tenantId;
    const dashData = await AnalyticsService.getAdminDashboard(tenantId);

    let attendanceTrend = Array(30).fill(0);
    try {
        const trendRes = await pool.query(`
            WITH RECURSIVE days AS (
                SELECT CURRENT_DATE - INTERVAL '29 days' as day
                UNION ALL
                SELECT day + INTERVAL '1 day' FROM days WHERE day < CURRENT_DATE
            )
            SELECT
                d.day::date,
                COALESCE(COUNT(DISTINCT COALESCE(a.user_id::text, a.employee_id::text)), 0) as present_count
            FROM days d
            LEFT JOIN attendance a ON COALESCE(a.check_in, a.check_in_time)::date = d.day::date AND a.tenant_id = $1
            GROUP BY d.day
            ORDER BY d.day
        `, [tenantId]);

        const totalUsers = dashData.activeEmployees || 1;
        attendanceTrend = trendRes.rows.map(row => Math.round((parseInt(row.present_count) / totalUsers) * 100));
    } catch (trendErr: any) {
        console.warn('[ReportSummary] Attendance trend query failed:', trendErr.message);
    }

    const getDeptColor = (dept: string) => {
        const colors: {[key: string]: string} = {
            'Engineering': 'bg-blue-500', 'Product': 'bg-indigo-500', 'Sales': 'bg-emerald-500',
            'Marketing': 'bg-teal-500', 'Operations': 'bg-amber-500', 'Human Resources': 'bg-purple-500',
            'Finance': 'bg-rose-500', 'Management': 'bg-sky-500',
        };
        return colors[dept] || 'bg-gray-500';
    };

    res.json({
        headcount: dashData.activeEmployees,
        enrolledHeadcount: dashData.totalEmployees,
        avgSalary: (dashData.avgSalary || 0) * 12,
        attritionRate: (dashData.attritionRate || 0) + '%',
        departments: (dashData.departmentDistribution || []).map(d => ({
            name: d.name, val: d.percentage, color: getDeptColor(d.name),
        })),
        attendanceTrend,
        attendance: { avgCompliance: dashData.avgAttendanceRate, todayPresent: dashData.todayPresent },
        leave: { pending: dashData.pendingLeaves, approved: 0 },
        payroll: { monthlyPayout: dashData.totalPayrollCost },
        monthlyHiringTrend: dashData.monthlyHiringTrend,
        payrollTrend: dashData.payrollTrend,
        genderDistribution: dashData.genderDistribution,
        employmentType: dashData.employmentTypeBreakdown,
        todayAttendanceLog: dashData.todayAttendanceLog,
        salaryDistribution: dashData.salaryDistribution,
        orgMetrics: dashData.orgMetrics,
        recentReports: [
            { name: 'Monthly Attendance Ledger', type: 'Compliance', size: '2.4 MB', date: new Date().toLocaleDateString() },
            { name: 'Payroll Summary', type: 'Finance', size: '1.8 MB', date: new Date().toLocaleDateString() },
            { name: 'Leave Balance Statement', type: 'HR Ops', size: '840 KB', date: new Date().toLocaleDateString() }
        ],
    });
};
