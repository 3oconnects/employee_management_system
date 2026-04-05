import { Request, Response } from 'express';
import { pool } from '../config/db';

export const getAnalytics = async (req: Request, res: Response) => {
    try {
        const [empCount, attendanceCount, leaveCount, timesheetCount] = await Promise.all([
            pool.query('SELECT COUNT(*)::int FROM employees'),
            pool.query('SELECT COUNT(DISTINCT user_id)::int FROM attendance WHERE check_in::date = CURRENT_DATE'),
            pool.query("SELECT COUNT(DISTINCT user_id)::int FROM leave_requests WHERE status = 'approved' AND CURRENT_DATE BETWEEN start_date AND end_date"),
            pool.query("SELECT COUNT(DISTINCT user_id)::int FROM timesheets WHERE week_start <= CURRENT_DATE AND week_end >= CURRENT_DATE")
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
    } catch (err: any) {
        res.status(500).json({ success: false, message: 'Analytics error: ' + err.message });
    }
};

export const getDashboardSummary = async (req: Request, res: Response) => {
    try {
        const [empCount, payrollCost] = await Promise.all([
            pool.query('SELECT COUNT(*) FROM employees'),
            pool.query('SELECT COALESCE(SUM(annual_ctc), 0) AS total, COALESCE(AVG(annual_ctc), 0) AS average FROM payroll_profiles')
        ]);

        const totalEmployees = parseInt(empCount.rows[0].count);
        const totalAnnualCTC = parseFloat(payrollCost.rows[0].total);
        const averageAnnualSalary = parseFloat(payrollCost.rows[0].average);

        res.json({
            totalEmployees,
            totalPayrollCost: Math.round(totalAnnualCTC / 12),      // monthly cost
            totalAnnualCTC: Math.round(totalAnnualCTC),
            averageSalary: Math.round(averageAnnualSalary / 12),     // monthly average
            averageAnnualSalary: Math.round(averageAnnualSalary),
            pendingApprovals: 0 // Placeholder
        });
    } catch (err: any) {
        console.error('Dashboard endpoint error:', err.message);
        res.status(500).json({ success: false, message: 'Failed to load dashboard data' });
    }
};

export const getReportSummary = async (req: Request, res: Response) => {
    try {
        // 1. Basic Stats
        const [empRes, salaryRes] = await Promise.all([
            pool.query("SELECT COUNT(*) FROM employees WHERE status = 'active'"),
            pool.query("SELECT COALESCE(AVG(annual_ctc), 0) as avg_sal FROM payroll_profiles")
        ]);

        const headcount = parseInt(empRes.rows[0].count);
        const avgSalary = parseFloat(salaryRes.rows[0].avg_sal);

        // 2. Department Breakdown
        const deptRes = await pool.query(`
            SELECT department, COUNT(*) as count 
            FROM employees 
            WHERE status = 'active'
            GROUP BY department
        `);
        const totalDeptEmp = deptRes.rows.reduce((acc, row) => acc + parseInt(row.count), 0);
        const departments = deptRes.rows.map(row => ({
            name: row.department || 'Unknown',
            val: totalDeptEmp > 0 ? Math.round((parseInt(row.count) / totalDeptEmp) * 100) : 0,
            color: getDeptColor(row.department)
        }));

        // 3. Attendance Trend (last 30 days)
        const trendRes = await pool.query(`
            WITH RECURSIVE days AS (
                SELECT CURRENT_DATE - INTERVAL '29 days' as day
                UNION ALL
                SELECT day + INTERVAL '1 day' FROM days WHERE day < CURRENT_DATE
            )
            SELECT 
                d.day::date,
                COALESCE(COUNT(DISTINCT a.user_id), 0) as present_count
            FROM days d
            LEFT JOIN attendance a ON a.check_in::date = d.day::date
            GROUP BY d.day
            ORDER BY d.day
        `);

        // Get total users to calculate compliance %
        const userCountRes = await pool.query("SELECT COUNT(*) FROM users WHERE role != 'admin'");
        const totalUsers = parseInt(userCountRes.rows[0].count) || 1;
        
        const attendanceTrend = trendRes.rows.map(row => 
            Math.round((parseInt(row.present_count) / totalUsers) * 100)
        );

        // 4. Leave Stats
        const leaveRes = await pool.query(`
            SELECT 
                COALESCE(SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END), 0) as approved,
                COALESCE(SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END), 0) as pending
            FROM leave_requests
            WHERE start_date >= CURRENT_DATE - INTERVAL '30 days'
        `);

        // 5. Payroll Stats
        const payrollRes = await pool.query(`
            SELECT 
                COALESCE(SUM(net_salary), 0) as total_payout
            FROM payroll_history
            WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
        `);

        // Get payroll-enrolled headcount for more accurate averages
        const enrolledRes = await pool.query("SELECT COUNT(*) FROM payroll_profiles");
        const enrolledHeadcount = parseInt(enrolledRes.rows[0].count);

        res.json({
            headcount,
            enrolledHeadcount,
            avgSalary,
            attritionRate: '2.1%', // Mock for now
            satisfaction: '4.8/5', // Mock for now
            departments,
            attendanceTrend,
            recentReports: [
                { name: 'Monthly Attendance Ledger', type: 'Compliance', size: '2.4 MB', date: new Date().toLocaleDateString() },
                { name: 'Payroll Summary (FY 2025-26)', type: 'Finance', size: '1.8 MB', date: new Date().toLocaleDateString() },
                { name: 'Leave Balance Statement', type: 'HR Ops', size: '840 KB', date: new Date().toLocaleDateString() }
            ],
            // Additional section data
            attendance: {
                avgCompliance: (attendanceTrend.reduce((a, b) => a + b, 0) / (attendanceTrend.length || 1)).toFixed(1),
                totalCheckins: attendanceTrend.reduce((a, b) => a + (b * totalUsers / 100), 0)
            },
            leave: {
                approved: parseInt(leaveRes.rows[0].approved),
                pending: parseInt(leaveRes.rows[0].pending)
            },
            payroll: {
                monthlyPayout: parseFloat(payrollRes.rows[0].total_payout) || (avgSalary * enrolledHeadcount / 12)
            }
        });


    } catch (err: any) {
        console.error('Report Summary Error:', err.message);
        res.status(500).json({ success: false, message: 'Failed to load report data' });
    }
};


function getDeptColor(dept: string) {
    const colors: {[key: string]: string} = {
        'Engineering': 'bg-blue-500',
        'Product': 'bg-indigo-500',
        'Sales': 'bg-emerald-500',
        'Marketing': 'bg-emerald-500',
        'Operation': 'bg-amber-500',
        'HR': 'bg-purple-500',
        'Finance': 'bg-purple-500'
    };
    return colors[dept] || 'bg-gray-500';
}

