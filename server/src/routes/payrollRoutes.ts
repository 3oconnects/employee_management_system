import express from 'express';
import { 
    getPayrollEmployees, 
    updatePayrollProfile, 
    getPayrollRuns,
    getPayrollActivity,
    getPendingApprovals,
    getLiveSummary,
    getPayrollDeadlines,
    getTaxSummary
} from '../controllers/payrollController';
import { pool } from '../config/db';

const router = express.Router();

router.get('/employees', getPayrollEmployees);
router.post('/profiles', updatePayrollProfile); 
router.put('/employees/:id', updatePayrollProfile);

router.get('/activity', getPayrollActivity);
router.get('/pending-approvals', getPendingApprovals);
router.get('/live-summary', getLiveSummary);
router.get('/deadlines/latest', getPayrollDeadlines);
router.get('/tax-statutory/summary', getTaxSummary);

router.get('/history/:empId', async (req, res) => {
    const { empId } = req.params;
    try {
        const result = await pool.query('SELECT * FROM payroll_history WHERE employee_id = $1 ORDER BY year DESC, month DESC', [empId]);
        res.json({ payroll_history: result.rows });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
});
router.get('/payslip/:empId/monthly', async (req, res) => {
    const { empId } = req.params;
    const { month, year } = req.query;
    res.status(200).send("Payslip download logic not fully implemented in mock/backend yet, but route is ready.");
});
router.post('/generate', async (req, res) => {
    const { month, year } = req.body;
    try {
        // Mock generation logic: Insert into history for all employees with profiles
        await pool.query(`
            INSERT INTO payroll_history (employee_id, name, month, year, net_salary, status)
            SELECT employee_id, name, $1, $2, (basic_salary + hra + allowances), 'paid'
            FROM payroll_profiles
            ON CONFLICT DO NOTHING
        `, [month, year]);
        res.json({ success: true, message: 'Payroll generated successfully for ' + month + '/' + year });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
});
router.get('/runs', getPayrollRuns);

export default router;
