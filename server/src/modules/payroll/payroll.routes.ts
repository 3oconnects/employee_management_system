import { Router } from 'express';
import { 
    getPayrollEmployees, 
    updatePayrollProfile, 
    getPayrollRuns, 
    getPayrollActivity, 
    getPendingApprovals, 
    getLiveSummary, 
    getPayrollDeadlines, 
    getTaxSummary, 
    processPayroll,
    createPayrollProfile,
    getMonthlyPayslip,
    getYearlyPayslip,
    getBulkPayslips
} from './payroll.controller';
import { authenticate, authorize } from '../../core/security/authorize';
import { validateRequest } from '../../core/validation/validateRequest';
import { updatePayrollProfileSchema, processPayrollSchema } from './payroll.schema';
import { asyncHandler } from '../../core/errors/asyncHandler';

const router = Router();

router.use(authenticate);

// HF-5: every payroll route needs an explicit permission. Salaries and bank details are
// payroll:view; changing a salary structure is payroll:manage; running payroll is payroll:run.
router.get('/employees', authorize(['payroll:view']), asyncHandler(getPayrollEmployees));
router.put('/employees/:id', authorize(['payroll:manage']), validateRequest(updatePayrollProfileSchema, 'body'), asyncHandler(updatePayrollProfile));
router.post('/profiles', authorize(['payroll:manage']), asyncHandler(createPayrollProfile));

// Payslips & Document Generation
router.get('/payslip/:employeeId/monthly', asyncHandler(getMonthlyPayslip));
router.get('/payslip/:employeeId/yearly', asyncHandler(getYearlyPayslip));
router.get('/documents/bulk-payslips', authorize(['payroll:view']), asyncHandler(getBulkPayslips));

// Legacy alias (still a stub that returns nothing)
router.get('/history/:employeeId', authorize(['payroll:view', 'payroll:view_own']), asyncHandler(async (req, res) => {
    res.json({ payroll_history: [] });
}));

router.get('/runs', authorize(['payroll:view']), asyncHandler(getPayrollRuns));
router.get('/activity', authorize(['payroll:view']), asyncHandler(getPayrollActivity));
router.get('/pending-approvals', authorize(['payroll:view']), asyncHandler(getPendingApprovals));
router.get('/live-summary', authorize(['payroll:view']), asyncHandler(getLiveSummary));
router.get('/deadlines', authorize(['payroll:view']), asyncHandler(getPayrollDeadlines));
router.get('/tax-summary', authorize(['payroll:view']), asyncHandler(getTaxSummary));

// Contract alias: /run aliased to /process for frontend orchestration engine
router.post('/process', authorize(['payroll:run']), validateRequest(processPayrollSchema, 'body'), asyncHandler(processPayroll));
router.post('/run', authorize(['payroll:run']), validateRequest(processPayrollSchema, 'body'), asyncHandler(processPayroll));

export default router;
