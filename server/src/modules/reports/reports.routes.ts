import { Router } from 'express';
import { 
    getAdminDashboard, getManagerDashboard, getEmployeeDashboard, getTeamEmployees, 
    getEmployeeProfile, getEmployeeAttendanceAnalytics, getAnalytics, getReportSummary, getHolidays 
} from './reports.controller';
import { authenticate, authorize } from '../../core/security/authorize';
import { asyncHandler } from '../../core/errors/asyncHandler';

const router = Router();

router.use(authenticate);

// Organization holidays calendar
router.get('/holidays', asyncHandler(getHolidays));

// HF-5: organisation-wide aggregates (headcount, salary averages, attrition) need reports:view.
// Reports keyed by a user/employee id are limited to your own id unless you may view employees
// (checked in the controller, within your tenant).
router.get('/admin', authorize(['reports:view']), asyncHandler(getAdminDashboard));
router.get('/manager', asyncHandler(getManagerDashboard));
router.get('/employee', asyncHandler(getEmployeeDashboard));

// Legacy aliases for frontend compatibility
router.get('/dashboard', authorize(['reports:view']), asyncHandler(getAdminDashboard));
router.get('/dashboard/manager', asyncHandler(getManagerDashboard));
router.get('/dashboard/employee', asyncHandler(getEmployeeDashboard));
router.get('/departments', authorize(['reports:view']), asyncHandler(getReportSummary)); // Alias for departments

router.get('/team', asyncHandler(getTeamEmployees));
router.get('/profile/:employeeId', asyncHandler(getEmployeeProfile));
router.get('/attendance/employee/:employeeId', asyncHandler(getEmployeeAttendanceAnalytics));
router.get('/analytics', authorize(['reports:view']), asyncHandler(getAnalytics));
router.get('/summary', authorize(['reports:view']), asyncHandler(getReportSummary));

export default router;
