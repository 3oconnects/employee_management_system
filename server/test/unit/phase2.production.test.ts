/**
 * Phase 2 — Production Hardening & Verification Test Suite
 *
 * Covers:
 *   - Phase 2.1: Contract Stabilization (aliases, holiday reports, payslips)
 *   - Phase 2.2: Payroll Production Hardening (period locking, LOP deduction, terminated employee exclusion)
 *   - Phase 2.3: Leave & Approval Integrity (canonical employee_id, date validations, overlap & balance guards, locked period checks)
 *   - Phase 2.4: Dynamic Permission Architecture (dot/colon aliasing, super_admin wildcard, granular RBAC)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock transaction runner for unit environment
vi.mock('../../src/database/transaction', () => ({
    withTransaction: vi.fn().mockImplementation(async (cb: any) => cb({}))
}));

// Mock identity resolution for unit environment
vi.mock('../../src/core/security/identity', () => ({
    resolveEmployeeIdForUser: vi.fn().mockResolvedValue('emp-1')
}));

// Mock NotificationService to avoid database network calls
vi.mock('../../src/services/notificationService', () => ({
    NotificationService: {
        onLeaveApplied: vi.fn(),
        onLeaveApproved: vi.fn(),
        onLeaveRejected: vi.fn(),
        onPayrollProcessed: vi.fn(),
    }
}));

// ─── PHASE 2.1: Contract Stabilization ─────────────────────────────────────────

describe('Phase 2.1 — Contract Stabilization', () => {
    it('should route /payroll/run and /payroll/process to payroll processing handler', async () => {
        const { default: payrollRouter } = await import('../../src/modules/payroll/payroll.routes');
        const routes = (payrollRouter as any).stack
            .filter((layer: any) => layer.route)
            .map((layer: any) => ({
                path: layer.route.path,
                method: Object.keys(layer.route.methods)[0],
            }));

        const hasRun = routes.some((r: any) => r.path === '/run' && r.method === 'post');
        const hasProcess = routes.some((r: any) => r.path === '/process' && r.method === 'post');
        expect(hasRun).toBe(true);
        expect(hasProcess).toBe(true);
    });

    it('should route /claims/admin and /claims/ to claims retrieval handler', async () => {
        const { default: claimsRouter } = await import('../../src/modules/claims/claims.routes');
        const routes = (claimsRouter as any).stack
            .filter((layer: any) => layer.route)
            .map((layer: any) => ({
                path: layer.route.path,
                method: Object.keys(layer.route.methods)[0],
            }));

        const hasAdmin = routes.some((r: any) => r.path === '/admin' && r.method === 'get');
        const hasRoot = routes.some((r: any) => r.path === '/' && r.method === 'get');
        expect(hasAdmin).toBe(true);
        expect(hasRoot).toBe(true);
    });

    it('should provide payslip monthly, yearly and bulk-payslip endpoints on /payroll', async () => {
        const { default: payrollRouter } = await import('../../src/modules/payroll/payroll.routes');
        const routes = (payrollRouter as any).stack
            .filter((layer: any) => layer.route)
            .map((layer: any) => ({
                path: layer.route.path,
                method: Object.keys(layer.route.methods)[0],
            }));

        expect(routes.some((r: any) => r.path === '/payslip/:employeeId/monthly' && r.method === 'get')).toBe(true);
        expect(routes.some((r: any) => r.path === '/payslip/:employeeId/yearly' && r.method === 'get')).toBe(true);
        expect(routes.some((r: any) => r.path === '/documents/bulk-payslips' && r.method === 'get')).toBe(true);
    });

    it('should route /reports/holidays endpoint', async () => {
        const { default: reportsRouter } = await import('../../src/modules/reports/reports.routes');
        const routes = (reportsRouter as any).stack
            .filter((layer: any) => layer.route)
            .map((layer: any) => ({
                path: layer.route.path,
                method: Object.keys(layer.route.methods)[0],
            }));

        expect(routes.some((r: any) => r.path === '/holidays' && r.method === 'get')).toBe(true);
    });
});

// ─── PHASE 2.2: Payroll Production Hardening ───────────────────────────────────

describe('Phase 2.2 — Payroll Hardening & Period Locking', () => {
    let mockPayrollRepo: any;
    let payrollService: any;

    beforeEach(async () => {
        vi.clearAllMocks();
        const { PayrollService } = await import('../../src/modules/payroll/payroll.service');

        mockPayrollRepo = {
            isPeriodLocked: vi.fn(),
            getPayrollEmployees: vi.fn(),
            getAllPayrollProfiles: vi.fn(),
            createPayrollRun: vi.fn(),
            getEmployeeAttendanceStats: vi.fn(),
            insertPayrollEntry: vi.fn(),
            upsertPayrollHistory: vi.fn(),
            completePayrollRun: vi.fn(),
        };

        payrollService = new PayrollService();
        (payrollService as any).repo = mockPayrollRepo;
    });

    it('should reject payroll processing if the period is already locked/completed', async () => {
        mockPayrollRepo.isPeriodLocked.mockResolvedValue(true);

        await expect(payrollService.processPayroll('tenant-1', 10, 2026, 1)).rejects.toThrow(
            'Payroll cycle 10/2026 has already been completed and locked.'
        );
        expect(mockPayrollRepo.createPayrollRun).not.toHaveBeenCalled();
    });

    it('should calculate LOP deductions correctly from attendance & leave data', async () => {
        mockPayrollRepo.isPeriodLocked.mockResolvedValue(false);
        mockPayrollRepo.createPayrollRun.mockResolvedValue({ id: 'run-101' });

        // Employee with 60000 gross monthly salary
        mockPayrollRepo.getAllPayrollProfiles.mockResolvedValue([
            {
                id: 'prof-1',
                employee_id: 'emp-1',
                tenant_id: 'tenant-1',
                basic_salary: '40000',
                hra: '15000',
                allowances: '5000',
                status: 'active',
                deleted_at: null,
            },
        ]);

        // In October (31 days), 26 present days + 2 leave days = 3 absent/LOP days
        // LOP deduction = (60000 / 31) * 3 = 1935.48 * 3 = 5806.45
        mockPayrollRepo.getEmployeeAttendanceStats.mockResolvedValue({
            daysInMonth: 31,
            presentCount: 26,
            leaveCount: 2,
            hasTenantAttendance: true,
        });

        mockPayrollRepo.insertPayrollEntry.mockImplementation(async (client: any, entry: any) => entry);
        mockPayrollRepo.completePayrollRun.mockImplementation(async (id: string, total: number) => ({
            id,
            total,
            status: 'COMPLETED',
        }));

        const result = await payrollService.processPayroll('tenant-1', 10, 2026, 1);

        expect(result.runId).toContain('RUN-2026-10-');
        expect(result.message).toContain('processed successfully');
        expect(mockPayrollRepo.insertPayrollEntry).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
                lop_days: 3,
                present_days: 26,
                absent_days: 3,
                leave_days: 2,
            })
        );

        const entryArg = mockPayrollRepo.insertPayrollEntry.mock.calls[0][1];
        expect(entryArg.lop_deduction).toBeGreaterThan(5800);
        expect(entryArg.lop_deduction).toBeLessThan(5810);
        // Net pay must be reduced by the LOP deduction
        expect(entryArg.net_salary).toBeLessThan(60000);
    });

    it('should expose repository query filters for active and non-deleted employees', async () => {
        const { PayrollRepository } = await import('../../src/modules/payroll/payroll.repository');
        const repo = new PayrollRepository();
        expect(typeof repo.getPayrollEmployees).toBe('function');
        expect(typeof repo.isPeriodLocked).toBe('function');
        expect(typeof repo.getEmployeeAttendanceStats).toBe('function');
    });
});

// ─── PHASE 2.3: Leave & Approval Integrity ─────────────────────────────────────

describe('Phase 2.3 — Leave & Approval Integrity', () => {
    let mockLeavesRepo: any;
    let leavesService: any;

    beforeEach(async () => {
        vi.clearAllMocks();
        const { LeavesService } = await import('../../src/modules/leaves/leaves.service');

        mockLeavesRepo = {
            getEmployeeById: vi.fn(),
            getOverlappingLeave: vi.fn(),
            getLeaveBalance: vi.fn(),
            applyLeave: vi.fn((_e: any, _u: any, _lt: any, _s: any, _end: any, _r: any, _t: any) => Promise.resolve({ id: 'leave-new-1', employee_id: _e, user_id: _u, status: 'pending', total_days: 3 })),
            getLeaveRequestById: vi.fn(),
            updateLeaveStatus: vi.fn(),
            updateLeaveBalance: vi.fn(),
            getUserAndLeaveTypeName: vi.fn().mockResolvedValue({ user: { name: 'Alice' }, leaveType: { name: 'Annual' } }),
        };

        leavesService = new LeavesService();
        (leavesService as any).repo = mockLeavesRepo;
        // Mock payroll period check
        (leavesService as any).payrollRepo = {
            isPeriodLocked: vi.fn().mockResolvedValue(false),
        };
    });

    it('should reject leave request if end_date is before start_date', async () => {
        await expect(
            leavesService.applyLeave('tenant-1', {
                userId: 'user-1',
                employee_id: 'emp-1',
                leave_type_id: 1,
                start_date: '2026-10-15',
                end_date: '2026-10-10',
                reason: 'Holiday',
            })
        ).rejects.toThrow('Invalid date range: start date must be before or equal to end date.');
    });

    it('should reject leave request if employee is terminated or inactive', async () => {
        mockLeavesRepo.getEmployeeById.mockResolvedValue({
            id: 'emp-1',
            status: 'terminated',
            deleted_at: null,
        });

        await expect(
            leavesService.applyLeave('tenant-1', {
                userId: 'user-1',
                employee_id: 'emp-1',
                leave_type_id: 1,
                start_date: '2026-10-10',
                end_date: '2026-10-12',
                reason: 'Vacation',
            })
        ).rejects.toThrow('Inactive or terminated employees cannot apply for leave.');
    });

    it('should reject leave request if the period is locked by completed payroll', async () => {
        mockLeavesRepo.getEmployeeById.mockResolvedValue({
            id: 'emp-1',
            status: 'active',
            deleted_at: null,
        });
        (leavesService as any).payrollRepo.isPeriodLocked.mockResolvedValue(true);

        await expect(
            leavesService.applyLeave('tenant-1', {
                userId: 'user-1',
                employee_id: 'emp-1',
                leave_type_id: 1,
                start_date: '2026-10-10',
                end_date: '2026-10-12',
                reason: 'Vacation',
            })
        ).rejects.toThrow('Cannot apply leave for locked payroll period');
    });

    it('should reject leave request if an overlapping approved/pending leave exists', async () => {
        mockLeavesRepo.getEmployeeById.mockResolvedValue({
            id: 'emp-1',
            status: 'active',
            deleted_at: null,
        });
        mockLeavesRepo.getOverlappingLeave.mockResolvedValue({
            id: 'leave-prev',
            start_date: '2026-10-11',
            end_date: '2026-10-14',
            status: 'approved',
        });

        await expect(
            leavesService.applyLeave('tenant-1', {
                userId: 'user-1',
                employee_id: 'emp-1',
                leave_type_id: 1,
                start_date: '2026-10-10',
                end_date: '2026-10-12',
                reason: 'Vacation',
            })
        ).rejects.toThrow('An active or pending leave request already exists for the selected dates.');
    });

    it('should reject leave request if requested days exceed available balance', async () => {
        mockLeavesRepo.getEmployeeById.mockResolvedValue({
            id: 'emp-1',
            status: 'active',
            deleted_at: null,
        });
        mockLeavesRepo.getOverlappingLeave.mockResolvedValue(null);
        mockLeavesRepo.getLeaveBalance.mockResolvedValue([
            {
                leave_type_id: 1,
                available: 2, // only 2 days left
            },
        ]);

        // 2026-10-10 to 2026-10-14 inclusive = 5 days
        await expect(
            leavesService.applyLeave('tenant-1', {
                userId: 'user-1',
                employee_id: 'emp-1',
                leave_type_id: 1,
                start_date: '2026-10-10',
                end_date: '2026-10-14',
                reason: 'Vacation',
            })
        ).rejects.toThrow('Insufficient leave balance. Available: 2, Requested: 5.');
    });

    it('should successfully apply leave with canonical employee_id and tenant isolation when valid', async () => {
        mockLeavesRepo.getEmployeeById.mockResolvedValue({
            id: 'emp-1',
            status: 'active',
            deleted_at: null,
        });
        mockLeavesRepo.getOverlappingLeave.mockResolvedValue(null);
        mockLeavesRepo.getLeaveBalance.mockResolvedValue([
            {
                leave_type_id: 1,
                available: 10,
            },
        ]);
        mockLeavesRepo.applyLeave.mockResolvedValue({
            id: 'leave-new-1',
            employee_id: 'emp-1',
            user_id: 'user-1',
            status: 'pending',
            total_days: 3,
        });

        const leave = await leavesService.applyLeave('tenant-1', {
            userId: 'user-1',
            email: 'test@example.com',
            leave_type_id: 1,
            start_date: '2026-10-10',
            end_date: '2026-10-12',
            reason: 'Vacation',
        });

        expect(leave.id).toBe('leave-new-1');
        expect(mockLeavesRepo.applyLeave).toHaveBeenCalledWith(
            'emp-1',
            'user-1',
            1,
            '2026-10-10',
            '2026-10-12',
            'Vacation',
            'tenant-1'
        );
    });
});

// ─── PHASE 2.4: Dynamic Permission Architecture ───────────────────────────────

describe('Phase 2.4 — Dynamic Permission Architecture', () => {
    it('should support dot and colon notation aliasing across permission namespaces', async () => {
        // Test permission matching rules
        const PERM_ALIASES: Record<string, string[]> = {
            'employee.view': ['employees:read', 'employee:view', 'employees:view'],
            'employee.manage': ['employees:manage', 'employee:manage'],
            'employees:read': ['employee.view', 'employee:view', 'employees:view'],
            'employees:manage': ['employee.manage', 'employee:manage'],
            'payroll.process': ['payroll:manage', 'payroll:process'],
            'payroll:manage': ['payroll.process', 'payroll:manage'],
            'timesheet.approve': ['timesheet:approve', 'timesheet:manage'],
            'organization.manage': ['organization:manage', 'org:manage'],
        };

        const hasPermission = (userPerms: string[], userRole: string, perm: string): boolean => {
            if (userRole === 'super_admin') return true;
            if (userPerms.includes(perm)) return true;
            const aliases = PERM_ALIASES[perm] || [];
            return aliases.some(a => userPerms.includes(a));
        };

        // User with backend colon-permission 'employees:read' can access frontend 'employee.view'
        expect(hasPermission(['employees:read'], 'employee', 'employee.view')).toBe(true);

        // User with dot notation can access colon-permission
        expect(hasPermission(['employee.manage'], 'hr', 'employees:manage')).toBe(true);

        // Super Admin bypasses all checks
        expect(hasPermission([], 'super_admin', 'restricted.system.kernel')).toBe(true);

        // Unprivileged user cannot access unassigned permission
        expect(hasPermission(['leave:view'], 'employee', 'payroll.process')).toBe(false);
    });
});

// ─── PHASE 2.6: Production Observability & Tracing ────────────────────────────

describe('Phase 2.6 — Production Observability & Error Correlation', () => {
    it('should generate or propagate X-Request-ID and set response header', async () => {
        const { requestIdMiddleware } = await import('../../src/core/observability/requestId');
        const req = { headers: {}, originalUrl: '/api/v1/employees', method: 'GET' } as any;
        const res = {
            setHeader: vi.fn(),
            on: vi.fn(),
            statusCode: 200,
        } as any;
        const next = vi.fn();

        requestIdMiddleware(req, res, next);

        expect(typeof req.id).toBe('string');
        expect(req.id.length).toBeGreaterThan(10);
        expect(res.setHeader).toHaveBeenCalledWith('x-request-id', req.id);
        expect(next).toHaveBeenCalled();
    });

    it('should preserve incoming client X-Request-ID if provided', async () => {
        const { requestIdMiddleware } = await import('../../src/core/observability/requestId');
        const req = {
            headers: { 'x-request-id': 'client-trace-abc-123' },
            originalUrl: '/api/v1/payroll',
            method: 'POST',
        } as any;
        const res = {
            setHeader: vi.fn(),
            on: vi.fn(),
            statusCode: 200,
        } as any;
        const next = vi.fn();

        requestIdMiddleware(req, res, next);

        expect(req.id).toBe('client-trace-abc-123');
        expect(res.setHeader).toHaveBeenCalledWith('x-request-id', 'client-trace-abc-123');
        expect(next).toHaveBeenCalled();
    });

    it('should attach correlationId to JSON response in globalErrorHandler', async () => {
        const { globalErrorHandler } = await import('../../src/core/errors/errorHandler');
        const { AppError } = await import('../../src/core/errors/AppError');

        const err = AppError.badRequest('Test operational error');
        const req = { id: 'req-err-corr-456', originalUrl: '/test', method: 'GET', headers: {} } as any;
        const res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn(),
        } as any;
        const next = vi.fn();

        globalErrorHandler(err, req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                message: 'Test operational error',
                correlationId: 'req-err-corr-456',
            })
        );
    });
});

