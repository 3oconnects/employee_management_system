import { Router } from 'express';
import { getAdminDashboard, getManagerDashboard, getEmployeeDashboard, getTeamEmployees, getEmployeeProfile, getAnalytics, getReportSummary } from './reports.controller';
import { authenticate } from '../../core/security/authorize';
import { asyncHandler } from '../../core/errors/asyncHandler';

const router = Router();

router.use(authenticate);

router.get('/admin', asyncHandler(getAdminDashboard));
router.get('/manager', asyncHandler(getManagerDashboard));
router.get('/employee', asyncHandler(getEmployeeDashboard));

// Legacy aliases for frontend compatibility
router.get('/dashboard', asyncHandler(getAdminDashboard));
router.get('/dashboard/manager', asyncHandler(getManagerDashboard));
router.get('/dashboard/employee', asyncHandler(getEmployeeDashboard));
router.get('/departments', asyncHandler(getReportSummary)); // Alias for departments

router.get('/team', asyncHandler(getTeamEmployees));
router.get('/profile/:employeeId', asyncHandler(getEmployeeProfile));
router.get('/analytics', asyncHandler(getAnalytics));
router.get('/summary', asyncHandler(getReportSummary));

export default router;
