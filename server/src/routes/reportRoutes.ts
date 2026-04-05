import express from 'express';
import {
    getAnalytics,
    getDashboardSummary,
    getReportSummary,
    getManagerDashboard,
    getEmployeeDashboard,
    getTeamEmployees,
    getEmployeeProfile,
    getDepartments,
    getHolidays,
} from '../controllers/reportController';

const router = express.Router();

// Dashboard endpoints (role-specific)
router.get('/dashboard', getDashboardSummary);           // Admin/HR
router.get('/dashboard/manager', getManagerDashboard);    // Manager
router.get('/dashboard/employee', getEmployeeDashboard);  // Employee

// Analytics & Reports
router.get('/analytics', getAnalytics);
router.get('/summary', getReportSummary);

// Team & Organization
router.get('/team', getTeamEmployees);
router.get('/departments', getDepartments);
router.get('/holidays', getHolidays);

// Employee Profile (detailed)
router.get('/profile/:employeeId', getEmployeeProfile);

export default router;
