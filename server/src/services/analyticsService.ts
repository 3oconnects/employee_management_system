// ============================================================================
// EMS BACKEND — ANALYTICS SERVICE FACADE
// ============================================================================
// Provides clean business intelligence queries for Admin, Manager, and Employee
// dashboards using dedicated domain submodels:
// - analytics.submodels.ts: Strongly typed submodel interfaces
// - admin.analytics.ts: Tenant KPIs, demographics, payroll, and hiring trends
// - manager.analytics.ts: Team attendance, approvals, late check-ins, and timesheets
// - employee.analytics.ts: Personal attendance telemetry, leave quotas, and profile
// - attendance.analytics.ts: Individual employee deep-dive attendance telemetry
// ============================================================================

import {
    AdminDashboardSubmodel,
    AdminDashboardData,
    RecentActivity,
    Holiday,
    SalaryDistItem,
    ManagerDashboardSubmodel,
    ManagerTeamMemberSubmodel,
    EmployeeDashboardSubmodel,
    EmployeeProfileSubmodel,
    EmployeeAttendanceAnalysisSubmodel,
} from './analytics/analytics.submodels';

import { fetchAdminDashboard } from './analytics/admin.analytics';
import { fetchManagerDashboard, fetchTeamEmployees } from './analytics/manager.analytics';
import { fetchEmployeeDashboard, fetchEmployeeProfile } from './analytics/employee.analytics';
import { fetchEmployeeAttendanceAnalysis } from './analytics/attendance.analytics';

// Re-export all submodel interfaces for consumers and controllers
export * from './analytics/analytics.submodels';

export class AnalyticsService {

    /**
     * Complete admin dashboard — 15+ real business intelligence metrics from DB
     */
    static async getAdminDashboard(tenantId: string): Promise<AdminDashboardSubmodel> {
        return fetchAdminDashboard(tenantId);
    }

    /**
     * Get dashboard data scoped to a manager's team
     */
    static async getManagerDashboard(userId: number, tenantId: string): Promise<ManagerDashboardSubmodel> {
        return fetchManagerDashboard(userId, tenantId);
    }

    /**
     * Get personal dashboard data for an employee
     */
    static async getEmployeeDashboard(userId: number, tenantId: string): Promise<EmployeeDashboardSubmodel> {
        return fetchEmployeeDashboard(userId, tenantId);
    }

    /**
     * Get employees under a specific manager (team visibility)
     */
    static async getTeamEmployees(managerId: number, tenantId: string): Promise<ManagerTeamMemberSubmodel[]> {
        return fetchTeamEmployees(managerId, tenantId);
    }

    /**
     * Get full employee profile with all sections (compensation, documents, contacts, reviews)
     */
    static async getEmployeeProfile(employeeId: string, tenantId: string): Promise<EmployeeProfileSubmodel> {
        return fetchEmployeeProfile(employeeId, tenantId);
    }

    /**
     * Get comprehensive individual employee attendance analysis (KPIs, weekly trend, daily history, leaves)
     */
    static async getEmployeeAttendanceAnalysis(
        employeeId: string,
        tenantId: string,
        month: number,
        year: number
    ): Promise<EmployeeAttendanceAnalysisSubmodel> {
        return fetchEmployeeAttendanceAnalysis(employeeId, tenantId, month, year);
    }
}
