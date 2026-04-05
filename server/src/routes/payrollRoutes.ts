import express from 'express';
import { 
    getPayrollEmployees, 
    updatePayrollProfile, 
    getPayrollRuns,
    getPayrollActivity,
    getPendingApprovals,
    getLiveSummary,
    getPayrollDeadlines,
    getTaxSummary,
    processPayroll
} from '../controllers/payrollController';
import { pool } from '../config/db';
import { generatePayslipPDF, getPayslipPDFBuffer } from '../utils/pdfGenerator';
import AdmZip from 'adm-zip';

const router = express.Router();

router.get('/employees', getPayrollEmployees);
router.post('/profiles', async (req, res) => {
    // Proxy to updatePayrollProfile, setting id from body
    (req.params as any).id = req.body.employee_id || req.body.id;
    return updatePayrollProfile(req, res);
});
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
    
    try {
        const empResult = await pool.query('SELECT * FROM employees WHERE id = $1', [empId]);
        const payResult = await pool.query(
            'SELECT * FROM payroll_entries WHERE employee_id = $1 AND month = $2 AND year = $3 LIMIT 1',
            [empId, String(month), String(year)]
        );

        if (empResult.rows.length === 0 || payResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Payroll record not found for this period.' });
        }

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Payslip_${empId}_${month}_${year}.pdf`);
        
        generatePayslipPDF(empResult.rows[0], payResult.rows[0], res);
    } catch (err: any) {
        res.status(500).json({ success: false, message: 'PDF Generation failed: ' + err.message });
    }
});

router.get('/documents/bulk-payslips', async (req, res) => {
    const { month, year } = req.query;
    
    try {
        const payEntries = await pool.query(
            'SELECT pe.*, e.name, e.department FROM payroll_entries pe JOIN employees e ON pe.employee_id = e.id WHERE pe.month = $1 AND pe.year = $2',
            [String(month), String(year)]
        );

        if (payEntries.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'No payroll records found for this period.' });
        }

        const zip = new AdmZip();
        
        for (const entry of payEntries.rows) {
            const pdfBuffer = await getPayslipPDFBuffer(
                { id: entry.employee_id, name: entry.name, department: entry.department },
                entry
            );
            const fileName = `${entry.name.replace(/\s+/g, '_')}_${month}_${year}_Payslip.pdf`;
            zip.addFile(fileName, pdfBuffer);
        }

        const zipBuffer = zip.toBuffer();
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename=Bulk_Payslips_${month}_${year}.zip`);
        res.send(zipBuffer);
    } catch (err: any) {
        console.error("Bulk Export Error:", err);
        res.status(500).json({ success: false, message: 'Bulk Export failed: ' + err.message });
    }
});

router.get('/payslip/:empId/yearly', async (req, res) => {
    const { empId } = req.params;
    const { year } = req.query;
    
    try {
        const empResult = await pool.query('SELECT * FROM employees WHERE id = $1', [empId]);
        const payEntries = await pool.query(
            'SELECT * FROM payroll_entries WHERE employee_id = $1 AND year = $2',
            [empId, String(year)]
        );

        if (payEntries.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'No payroll records found for this year.' });
        }

        const zip = new AdmZip();
        for (const entry of payEntries.rows) {
            const pdfBuffer = await getPayslipPDFBuffer(empResult.rows[0], entry);
            const fileName = `Payslip_${entry.month}_${year}.pdf`;
            zip.addFile(fileName, pdfBuffer);
        }

        const zipBuffer = zip.toBuffer();
        res.setHeader('Content-Type', 'application/zip');
        res.send(zipBuffer);
    } catch (err: any) {
        res.status(500).json({ success: false, message: 'Yearly export failed.' });
    }
});

router.post('/run', processPayroll);

router.get('/runs', getPayrollRuns);

export default router;
