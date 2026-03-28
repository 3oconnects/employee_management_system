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
