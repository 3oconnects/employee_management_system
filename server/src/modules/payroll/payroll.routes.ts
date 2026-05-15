import { Router } from 'express';
import { getPayrollEmployees, updatePayrollProfile, getPayrollRuns, getPayrollActivity, getPendingApprovals, getLiveSummary, getPayrollDeadlines, getTaxSummary, processPayroll } from './payroll.controller';
import { authenticate } from '../../core/security/authorize';
import { validateRequest } from '../../core/validation/validateRequest';
import { updatePayrollProfileSchema, processPayrollSchema } from './payroll.schema';
import { asyncHandler } from '../../core/errors/asyncHandler';

const router = Router();

router.use(authenticate);

router.get('/employees', asyncHandler(getPayrollEmployees));
router.put('/employees/:id', validateRequest(updatePayrollProfileSchema, 'body'), asyncHandler(updatePayrollProfile));

// Legacy alias
router.get('/history/:employeeId', asyncHandler(async (req, res) => {
    res.json({ payroll_history: [] });
}));

router.get('/runs', asyncHandler(getPayrollRuns));
router.get('/activity', asyncHandler(getPayrollActivity));
router.get('/pending-approvals', asyncHandler(getPendingApprovals));
router.get('/live-summary', asyncHandler(getLiveSummary));
router.get('/deadlines', asyncHandler(getPayrollDeadlines));
router.get('/tax-summary', asyncHandler(getTaxSummary));
router.post('/process', validateRequest(processPayrollSchema, 'body'), asyncHandler(processPayroll));

export default router;
