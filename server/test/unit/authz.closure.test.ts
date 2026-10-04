import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';

// HF-5: authorization closure for leave, timesheets, claims, attendance regularization, payroll,
// audit logs and report/profile reads.
//
// Real: JWT authentication, route guards, controllers, services, the central approval path (HF-4),
// the identity resolver and the audit event. Fake: repositories (in-memory, mirroring the tenant-strict,
// ownership- and state-guarded SQL), the transaction wrapper (serialised, like a row lock), and the
// database pool. SQL is verified separately against a scratch PostgreSQL cluster.

type Row = Record<string, any>;
const W = vi.hoisted(() => ({
    employees: [] as Row[],
    users: [] as Row[],
    leave: [] as Row[],
    timesheet: [] as Row[],
    claim: [] as Row[],
    std: [] as Row[],
    onboarding: [] as Row[],
    attendance: [] as Row[],
    calls: {
        payroll: [] as string[], audit: [] as any[], leaveList: [] as any[], notify: [] as string[],
        analytics: [] as string[], entriesSaved: 0,
    },
}));

const kinds = () => ({ std: W.std, leave: W.leave, onboarding: W.onboarding, timesheet: W.timesheet, claim: W.claim });
const norm = (s: string) => s.replace(/\s+/g, ' ');

vi.mock('../../src/config/db', () => {
    const query = async (sql: string, p: any[] = []) => {
        const q = norm(sql);
        if (q.includes('(user_id = $2 OR LOWER(email) = LOWER($3))')) {
            const e = W.employees.find((x) => x.tenant_id === p[0] && (x.user_id === p[1] || String(x.email).toLowerCase() === String(p[2]).toLowerCase()));
            return { rows: e ? [{ id: e.id }] : [] };
        }
        if (q.includes('SELECT id, user_id, email FROM employees WHERE id = $1 AND tenant_id = $2')) {
            const e = W.employees.find((x) => x.id === p[0] && x.tenant_id === p[1]);
            return { rows: e ? [{ id: e.id, user_id: e.user_id, email: e.email }] : [] };
        }
        if (q.includes('FROM users WHERE id = $1 AND tenant_id = $2')) {
            return { rows: W.users.some((u) => u.id === p[0] && u.tenant_id === p[1]) ? [{ '?column?': 1 }] : [] };
        }
        return { rows: [{ count: 1, present_count: 1 }] }; // aggregate-style default for the report queries
    };
    return { pool: { query, connect: async () => ({ query, release() {} }) }, directPool: {}, query };
});

vi.mock('../../src/database/transaction', () => {
    let tail: Promise<unknown> = Promise.resolve();
    return {
        withTransaction: (cb: (c: unknown) => Promise<unknown>) => {
            const run = tail.then(() => cb({}));
            tail = run.catch(() => undefined);
            return run;
        },
    };
});

vi.mock('../../src/services/emailService', () => ({ sendEmployeeActionNotification: vi.fn().mockResolvedValue(true) }));
vi.mock('../../src/services/notificationService', () => ({
    NotificationService: {
        onLeaveApplied: vi.fn(),
        onLeaveApproved: (_t: string, userId: number) => { W.calls.notify.push(`approved:${userId}`); },
        onLeaveRejected: (_t: string, userId: number) => { W.calls.notify.push(`rejected:${userId}`); },
    },
}));

// ── central approval repository (HF-4 + HF-5 extensions) ──
vi.mock('../../src/modules/approvals/approvals.repository', () => {
    const impl = {
        async getEmployeeIdByUserId() { return undefined; },
        async getApprovals() { return []; },
        async resolveActorEmployeeId(_c: unknown, tenantId: string, userId: number, email: string) {
            const e = W.employees.find((x) => x.tenant_id === tenantId && (x.user_id === userId || String(x.email).toLowerCase() === email.toLowerCase()));
            return e ? e.id : null;
        },
        async lockApproval(_c: unknown, kind: string, id: string, tenantId: string) {
            const r = (kinds() as any)[kind].find((x: Row) => String(x.id) === id && x.tenant_id === tenantId);
            return r ? { ...r } : null;
        },
        async setDecision(_c: unknown, kind: string, id: string, status: string, tenantId: string, extras?: Row) {
            const r = (kinds() as any)[kind].find((x: Row) => String(x.id) === id && x.tenant_id === tenantId);
            if (!r) return;
            r.status = status;
            if (extras?.approvedBy !== undefined) r.approved_by = extras.approvedBy;
            if (extras && 'remarks' in extras && kind === 'timesheet') r.remarks = extras.remarks;
        },
        async applyAttendanceRegularization(_c: unknown, row: Row, tenantId: string) {
            W.attendance.push({ employee_id: row.employee_id, date: row.metadata.date, in: row.metadata.check_in_time, out: row.metadata.check_out_time, tenant_id: tenantId });
        },
        async executeDepartmentCreation() {},
        async executeTeamCreation() {},
        async employeeExistsInTenant(id: string, t: string) { return W.employees.some((x) => x.id === id && x.tenant_id === t); },
        async createApprovalRequest() {},
    };
    return { ApprovalsRepository: vi.fn().mockImplementation(() => impl) };
});

vi.mock('../../src/modules/leaves/leaves.repository', () => {
    const impl = {
        async getLeaveTypes() { return { items: [], total: 0 }; },
        async applyLeave() { return {}; },
        async getLeaveRequests(tenantId: string, options: Row) {
            W.calls.leaveList.push({ tenantId, ...options });
            const items = W.leave.filter((l) => l.tenant_id === tenantId && (!options.userId || String(l.user_id) === String(options.userId)));
            return { items, total: items.length };
        },
        async updateLeaveRequest(id: string, tenantId: string, userId: number, data: Row) {
            const r = W.leave.find((l) => String(l.id) === id && l.tenant_id === tenantId && l.user_id === userId && l.status === 'pending');
            if (!r) return undefined;
            Object.assign(r, data);
            return { ...r };
        },
        async deleteLeaveRequest(id: string, tenantId: string, userId: number) {
            const i = W.leave.findIndex((l) => String(l.id) === id && l.tenant_id === tenantId && l.user_id === userId && l.status === 'pending');
            if (i < 0) return undefined;
            return W.leave.splice(i, 1)[0];
        },
        async leaveBelongsToUser(id: string, tenantId: string, userId: number) {
            return W.leave.some((l) => String(l.id) === id && l.tenant_id === tenantId && l.user_id === userId);
        },
        async getUserAndLeaveTypeName() { return { user: { name: 'x' }, leaveType: { name: 'Casual' } }; },
        async getLeaveBalance() { return []; },
    };
    return { LeavesRepository: vi.fn().mockImplementation(() => impl) };
});

vi.mock('../../src/modules/timesheets/timesheets.repository', () => {
    const impl = {
        async getTimesheet() { return undefined; },
        async createTimesheet() { return {}; },
        async getOwnTimesheet(id: string, tenantId: string, userId: number) {
            const r = W.timesheet.find((t) => String(t.id) === id && t.tenant_id === tenantId && t.user_id === userId);
            return r ? { ...r } : undefined;
        },
        async clearEntries() {},
        async insertEntry() { W.calls.entriesSaved++; },
        async updateTimesheetHours() { return { id: 1 }; },
        async submitTimesheet(id: string, tenantId: string, userId: number) {
            const r = W.timesheet.find((t) => String(t.id) === id && t.tenant_id === tenantId && t.user_id === userId && ['draft', 'rejected'].includes(t.status));
            if (!r) return undefined;
            r.status = 'submitted';
            return { ...r };
        },
        async getTimesheetHistory() { return { items: [], total: 0 }; },
        async getPendingTimesheets(tenantId: string) {
            const items = W.timesheet.filter((t) => t.tenant_id === tenantId && t.status === 'submitted');
            return { items, total: items.length };
        },
    };
    return { TimesheetsRepository: vi.fn().mockImplementation(() => impl) };
});

vi.mock('../../src/modules/claims/claims.repository', () => {
    const impl = {
        async submitClaim(id: string, employeeId: string, amount: number, category: string, description: string, tenantId: string) {
            const row = { id, employee_id: employeeId, amount, category, status: 'pending', tenant_id: tenantId };
            W.claim.push(row);
            return row;
        },
        async getEmployeeClaims(employeeId: string, tenantId: string) {
            return W.claim.filter((c) => c.employee_id === employeeId && c.tenant_id === tenantId);
        },
        async getAllClaims(tenantId: string) { return W.claim.filter((c) => c.tenant_id === tenantId); },
    };
    return { ClaimsRepository: vi.fn().mockImplementation(() => impl) };
});

vi.mock('../../src/modules/attendance/attendance.repository', () => {
    const impl = {
        async resolveEmployeeId(userId: number, tenantId: string) {
            const e = W.employees.find((x) => x.tenant_id === tenantId && x.user_id === userId);
            return e ? e.id : null;
        },
        async hasPendingRegularization(empId: string, tenantId: string, date: string) {
            return W.std.some((r) => r.type === 'attendance_regularization' && r.status === 'pending' && r.employee_id === empId && r.tenant_id === tenantId && r.metadata.date === date);
        },
        async createRegularizationRequest(d: Row) {
            W.std.push({ id: d.id, tenant_id: d.tenantId, type: 'attendance_regularization', status: 'pending', employee_id: d.employeeId, requested_by: d.requestedBy, metadata: d.metadata });
        },
    };
    return { AttendanceRepository: vi.fn().mockImplementation(() => impl) };
});

vi.mock('../../src/modules/payroll/payroll.service', () => {
    const rec = (name: string, ret: unknown = {}) => async (...a: unknown[]) => { W.calls.payroll.push(`${name}:${JSON.stringify(a)}`); return ret; };
    class PayrollService {
        getPayrollEmployees = rec('employees', []);
        updatePayrollProfile = rec('update');
        getPayrollRuns = rec('runs', []);
        getPayrollActivity = rec('activity', []);
        getPendingApprovals = rec('pending', {});
        getLiveSummary = rec('live', {});
        getPayrollDeadlines = rec('deadlines', []);
        getTaxSummary = rec('tax', {});
        processPayroll = rec('process', { runId: 'RUN-1' });
    }
    return { PayrollService };
});

vi.mock('../../src/modules/audit/read/read.service', () => ({
    AuditReadService: class { async getLogs(tenantId: string, filters: Row) { W.calls.audit.push({ tenantId, filters }); return { items: [], total: 0 }; } },
}));

vi.mock('../../src/services/analyticsService', () => {
    const rec = (name: string, ret: unknown) => async (...a: unknown[]) => { W.calls.analytics.push(`${name}:${JSON.stringify(a)}`); return ret; };
    return {
        AnalyticsService: {
            getAdminDashboard: rec('admin', { activeEmployees: 1, totalEmployees: 1, avgSalary: 0, attritionRate: 0, departmentDistribution: [] }),
            getManagerDashboard: rec('manager', {}),
            getEmployeeDashboard: rec('employee', {}),
            getTeamEmployees: rec('team', []),
            getEmployeeProfile: async (id: string) => { W.calls.analytics.push(`profile:${id}`); return { employee: { id } }; },
        },
    };
});

import approvalsRouter from '../../src/modules/approvals/approvals.routes';
import leavesRouter from '../../src/modules/leaves/leaves.routes';
import timesheetsRouter from '../../src/modules/timesheets/timesheets.routes';
import claimsRouter from '../../src/modules/claims/claims.routes';
import attendanceRouter from '../../src/modules/attendance/attendance.routes';
import payrollRouter from '../../src/modules/payroll/payroll.routes';
import auditRouter from '../../src/modules/audit/read/read.routes';
import reportsRouter from '../../src/modules/reports/reports.routes';
import { globalErrorHandler } from '../../src/core/errors/errorHandler';
import { JwtService } from '../../src/core/security/jwt.service';
import { eventBus } from '../../src/core/events/eventBus';
import { DomainEventType } from '../../src/core/events/eventTypes';

const app = express();
app.use(express.json());
app.use('/api/v1/approvals', approvalsRouter);
app.use('/api/v1/leave', leavesRouter);
app.use('/api/v1/timesheets', timesheetsRouter);
app.use('/api/v1/claims', claimsRouter);
app.use('/api/v1/attendance', attendanceRouter);
app.use('/api/v1/payroll', payrollRouter);
app.use('/api/v1/audit-logs', auditRouter);
app.use('/api/v1/reports', reportsRouter);
app.use(globalErrorHandler);

type Who = { id: number; email: string; tenant: string; role: string; dash?: string; perms: string[] };
const eve: Who = { id: 10, email: 'eve@t1.test', tenant: 't1', role: 'employee', perms: [] };
const evan: Who = { id: 16, email: 'evan@t1.test', tenant: 't1', role: 'employee', perms: [] }; // another plain employee
const mia: Who = { id: 11, email: 'mia@t1.test', tenant: 't1', role: 'manager', dash: 'manager', perms: ['leave:approve', 'timesheet:approve', 'attendance:manage', 'employees:view', 'reports:view'] };
const lou: Who = { id: 13, email: 'lou@t1.test', tenant: 't1', role: 'custom', perms: ['claims:approve'] };
const pam: Who = { id: 17, email: 'pam@t1.test', tenant: 't1', role: 'custom', perms: ['payroll:view', 'payroll:manage', 'payroll:run'] };
const vic: Who = { id: 18, email: 'vic@t1.test', tenant: 't1', role: 'custom', perms: ['payroll:view'] };
const ada: Who = { id: 19, email: 'ada@t1.test', tenant: 't1', role: 'custom', perms: ['audit:view'] };
const mo: Who = { id: 20, email: 'mo@t2.test', tenant: 't2', role: 'manager', dash: 'manager', perms: ['leave:approve', 'timesheet:approve', 'claims:approve', 'employees:view', 'reports:view', 'audit:view', 'payroll:view', 'payroll:manage', 'payroll:run'] };

const bearer = (w: Who) =>
    'Bearer ' + JwtService.generateAccessToken({ userId: w.id, email: w.email, tenantId: w.tenant, role: w.role as any, dashboard_type: w.dash, permissions: w.perms } as any);
const call = (method: 'get' | 'post' | 'put' | 'delete', url: string, who: Who | null, body?: Record<string, unknown>) => {
    let r = (request(app) as any)[method](`/api/v1${url}`);
    if (who) r = r.set('Authorization', bearer(who));
    return body ? r.send(body) : r;
};
const find = (list: Row[], id: string | number) => list.find((r) => String(r.id) === String(id));

let audits: any[] = [];
const onAudit = (e: any) => audits.push(e);
let warn: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
    const emp = (id: string, user_id: number | null, email: string, tenant_id = 't1') => ({ id, user_id, email, tenant_id });
    W.employees = [
        emp('EMP10', 10, 'eve@t1.test'), emp('EMP11', 11, 'mia@t1.test'), emp('EMP13', null, 'lou@t1.test'),
        emp('EMP16', 16, 'evan@t1.test'), emp('EMP17', 17, 'pam@t1.test'), emp('EMP18', 18, 'vic@t1.test'),
        emp('EMP19', 19, 'ada@t1.test'), emp('EMP20', 20, 'mo@t2.test', 't2'), emp('EMP99', 99, 'zed@t2.test', 't2'),
    ];
    W.users = [10, 11, 13, 16, 17, 18, 19].map((id) => ({ id, tenant_id: 't1' })).concat([{ id: 20, tenant_id: 't2' }, { id: 99, tenant_id: 't2' }]);
    W.leave = [
        { id: 1, tenant_id: 't1', user_id: 10, employee_id: 'EMP10', status: 'pending', leave_type_id: 1 },
        { id: 2, tenant_id: 't1', user_id: 11, employee_id: null, status: 'pending', leave_type_id: 1 }, // Mia's own
        { id: 3, tenant_id: 't1', user_id: 10, employee_id: 'EMP10', status: 'approved', leave_type_id: 1 },
        { id: 4, tenant_id: 't1', user_id: 16, employee_id: 'EMP16', status: 'pending', leave_type_id: 1 },
        { id: 7, tenant_id: 't2', user_id: 99, employee_id: 'EMP99', status: 'pending', leave_type_id: 1 },
    ];
    W.timesheet = [
        { id: 5, tenant_id: 't1', user_id: 10, employee_id: null, status: 'submitted' },
        { id: 6, tenant_id: 't1', user_id: 10, employee_id: null, status: 'draft' },
        { id: 8, tenant_id: 't1', user_id: 11, employee_id: null, status: 'submitted' }, // Mia's own
        { id: 9, tenant_id: 't2', user_id: 99, employee_id: null, status: 'submitted' },
        { id: 12, tenant_id: 't1', user_id: 16, employee_id: null, status: 'draft' },
    ];
    W.claim = [
        { id: 'C1', tenant_id: 't1', employee_id: 'EMP10', amount: 50, status: 'pending' },
        { id: 'C2', tenant_id: 't1', employee_id: 'EMP13', amount: 70, status: 'pending' }, // Lou's own
        { id: 'C3', tenant_id: 't1', employee_id: 'EMP10', amount: 20, status: 'approved' },
        { id: 'C9', tenant_id: 't2', employee_id: 'EMP99', amount: 5, status: 'pending' },
    ];
    W.std = []; W.onboarding = []; W.attendance = [];
    W.calls = { payroll: [], audit: [], leaveList: [], notify: [], analytics: [], entriesSaved: 0 };
    audits = [];
    eventBus.on(DomainEventType.AUDIT_LOG_REQUESTED, onAudit);
    warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => {
    eventBus.off(DomainEventType.AUDIT_LOG_REQUESTED, onAudit);
    warn.mockRestore();
});

// ─────────────────────────────────────────────── LEAVE ───────────────────────────────────────────────
describe('HF-5 leave: PUT /leave/:id/approve', () => {
    const approve = (who: Who | null, id: string | number, body: Row = { action: 'approved' }) => call('put', `/leave/${id}/approve`, who, body);

    it('unauthenticated -> 401', async () => {
        expect((await approve(null, 1)).status).toBe(401);
        expect(find(W.leave, 1)!.status).toBe('pending');
    });

    it('an employee without leave:approve -> 403 and nothing changes', async () => {
        const gated = await approve(evan, 1);
        expect(gated.status).toBe(403);
        expect(gated.body.message).toMatch(/insufficient permissions/);
        expect(find(W.leave, 1)!.status).toBe('pending');
        expect(audits).toHaveLength(0);
    });

    it('an authorised manager approves; approved_by is the token user, notification sent, audit written', async () => {
        const res = await approve(mia, 1, { action: 'approved', approved_by: 999 });
        expect(res.status).toBe(200);
        const row = find(W.leave, 1)!;
        expect(row.status).toBe('approved');
        expect(row.approved_by).toBe(11); // never the forged 999
        expect(W.calls.notify).toEqual(['approved:10']);
        expect(audits).toHaveLength(1);
        expect(audits[0]).toMatchObject({ tenantId: 't1', actorId: 11 });
        expect(audits[0].payload).toMatchObject({ action: 'APPROVAL_APPROVE', entityId: 'leave-1', newValues: { approvalType: 'leave', decision: 'approved', decidedBy: 11 } });
    });

    it('a rejection works and is recorded as a rejection', async () => {
        expect((await approve(mia, 1, { action: 'rejected' })).status).toBe(200);
        expect(find(W.leave, 1)!.status).toBe('rejected');
        expect(W.calls.notify).toEqual(['rejected:10']);
        expect(audits[0].payload.action).toBe('APPROVAL_REJECT');
    });

    it('cannot approve or reject your own leave', async () => {
        const res = await approve(mia, 2);
        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/your own request/);
        expect((await approve(mia, 2, { action: 'rejected' })).status).toBe(403);
        expect(find(W.leave, 2)!.status).toBe('pending');
        expect(W.calls.notify).toHaveLength(0);
    });

    it('a forged approved_by / user / tenant in the body cannot dodge the self-approval rule or change the tenant', async () => {
        const res = await approve(mia, 2, { action: 'approved', approved_by: 999, userId: 999, tenantId: 't2' });
        expect(res.status).toBe(403);
        expect(find(W.leave, 2)!.status).toBe('pending');
    });

    it("another tenant's leave -> 404, in both directions", async () => {
        expect((await approve(mo, 1)).status).toBe(404);
        expect((await approve(mia, 7)).status).toBe(404);
        expect(find(W.leave, 1)!.status).toBe('pending');
        expect(find(W.leave, 7)!.status).toBe('pending');
    });

    it('an already decided leave -> 409; no flipping; unknown/odd ids are not found', async () => {
        expect((await approve(mia, 3)).status).toBe(409);
        expect((await approve(mia, 1)).status).toBe(200);
        expect((await approve(mia, 1, { action: 'rejected' })).status).toBe(409);
        expect(find(W.leave, 1)!.status).toBe('approved');
        expect((await approve(mia, 'abc')).status).toBe(404);
        expect((await approve(mia, 9999)).status).toBe(404);
    });

    it('rejects an invalid action', async () => {
        expect((await approve(mia, 1, { action: 'pending' })).status).toBe(400);
        expect((await approve(mia, 1, {})).status).toBe(400);
    });

    it('simultaneous decisions: exactly one wins, one audit event, one notification', async () => {
        const results = await Promise.all(Array.from({ length: 6 }, (_, i) => approve(mia, 1, { action: i % 2 ? 'approved' : 'rejected' })));
        expect(results.filter((r) => r.status === 200)).toHaveLength(1);
        expect(results.filter((r) => r.status === 409)).toHaveLength(5);
        expect(audits).toHaveLength(1);
        expect(W.calls.notify).toHaveLength(1);
    });
});

describe('HF-5 leave: edit and delete are for the requester only, while pending', () => {
    it('the owner can edit and withdraw their own pending request (both route aliases)', async () => {
        expect((await call('put', '/leave/1', eve, { reason: 'updated' })).status).toBe(200);
        expect(find(W.leave, 1)!.reason).toBe('updated');
        expect((await call('put', '/leave/requests/1', eve, { reason: 'again' })).status).toBe(200);
        expect((await call('delete', '/leave/1', eve)).status).toBe(200);
        expect(find(W.leave, 1)).toBeUndefined();
        expect((await call('delete', '/leave/requests/4', evan)).status).toBe(200);
    });

    it("someone else cannot edit or delete it (not even an approver) - 404, unchanged", async () => {
        for (const who of [evan, mia]) {
            expect((await call('put', '/leave/1', who, { reason: 'hijack' })).status).toBe(404);
            expect((await call('put', '/leave/requests/1', who, { reason: 'hijack' })).status).toBe(404);
            expect((await call('delete', '/leave/1', who)).status).toBe(404);
            expect((await call('delete', '/leave/requests/1', who)).status).toBe(404);
        }
        expect(find(W.leave, 1)!.reason).toBeUndefined();
        expect(find(W.leave, 1)).toBeDefined();
    });

    it("another tenant's request is not found", async () => {
        expect((await call('put', '/leave/7', mo, { reason: 'x' })).status).toBe(404);
        expect((await call('delete', '/leave/7', mia)).status).toBe(404);
        expect(find(W.leave, 7)).toBeDefined();
    });

    it('an already decided request of your own -> 409', async () => {
        expect((await call('put', '/leave/3', eve, { reason: 'x' })).status).toBe(409);
        expect((await call('delete', '/leave/3', eve)).status).toBe(409);
        expect(find(W.leave, 3)).toBeDefined();
    });

    it('unauthenticated -> 401', async () => {
        expect((await call('put', '/leave/1', null, { reason: 'x' })).status).toBe(401);
        expect((await call('delete', '/leave/1', null)).status).toBe(401);
    });
});

describe('HF-5 leave: reads', () => {
    it('an employee sees only their own requests', async () => {
        const res = await call('get', '/leave', eve);
        expect(res.status).toBe(200);
        expect(W.calls.leaveList[0]).toMatchObject({ tenantId: 't1', userId: 10 });
        expect(res.body.items.every((l: Row) => l.user_id === 10)).toBe(true);
        expect((await call('get', '/leave/requests', eve)).status).toBe(200);
    });

    it("an employee asking for someone else's requests by id is refused", async () => {
        expect((await call('get', '/leave?userId=16', eve)).status).toBe(403);
        expect((await call('get', '/leave/requests?userId=11', eve)).status).toBe(403);
        expect((await call('get', '/leave?userId=10', eve)).status).toBe(200);
    });

    it('an approver may list the tenant, but only their own tenant', async () => {
        const res = await call('get', '/leave', mia);
        expect(res.status).toBe(200);
        expect(W.calls.leaveList[0]).toMatchObject({ tenantId: 't1' });
        expect(W.calls.leaveList[0].userId).toBeUndefined();
        expect(res.body.items.every((l: Row) => l.tenant_id === 't1')).toBe(true);
    });
});

// ─────────────────────────────────────────────── TIMESHEETS ───────────────────────────────────────────────
describe('HF-5 timesheets: PUT /timesheets/:id/approve', () => {
    const approve = (who: Who | null, id: string | number, body: Row = { action: 'approved' }) => call('put', `/timesheets/${id}/approve`, who, body);

    it('unauthenticated -> 401; no permission -> 403', async () => {
        expect((await approve(null, 5)).status).toBe(401);
        const gated = await approve(evan, 5);
        expect(gated.status).toBe(403);
        expect(gated.body.message).toMatch(/insufficient permissions/);
        expect(find(W.timesheet, 5)!.status).toBe('submitted');
    });

    it('an authorised manager approves; approver and remarks are recorded from the token/body correctly', async () => {
        const res = await approve(mia, 5, { action: 'approved', approved_by: 999, remarks: 'looks good' });
        expect(res.status).toBe(200);
        const row = find(W.timesheet, 5)!;
        expect(row).toMatchObject({ status: 'approved', approved_by: 11, remarks: 'looks good' });
        expect(audits).toHaveLength(1);
        expect(audits[0].payload).toMatchObject({ entityId: 'ts-5', newValues: { approvalType: 'timesheet', decision: 'approved', decidedBy: 11 } });
        expect(audits[0].actorId).toBe(11);
    });

    it('cannot approve your own timesheet, even with forged ids', async () => {
        expect((await approve(mia, 8)).status).toBe(403);
        expect((await approve(mia, 8, { action: 'approved', approved_by: 999, userId: 999, employee_id: 'EMP999' })).status).toBe(403);
        expect(find(W.timesheet, 8)!.status).toBe('submitted');
    });

    it("another tenant's timesheet -> 404; draft -> 409; no overwriting a decision", async () => {
        expect((await approve(mia, 9)).status).toBe(404);
        expect((await approve(mo, 5)).status).toBe(404);
        expect((await approve(mia, 6)).status).toBe(409);
        expect(find(W.timesheet, 6)!.status).toBe('draft');
        expect((await approve(mia, 5)).status).toBe(200);
        expect((await approve(mia, 5, { action: 'rejected' })).status).toBe(409);
        expect(find(W.timesheet, 5)!.status).toBe('approved');
    });

    it('simultaneous decisions: exactly one wins', async () => {
        const results = await Promise.all([approve(mia, 5), approve(mia, 5, { action: 'rejected' }), approve(mia, 5)]);
        expect(results.filter((r) => r.status === 200)).toHaveLength(1);
        expect(audits).toHaveLength(1);
    });
});

describe('HF-5 timesheets: reads and employee edits', () => {
    it('the pending list (names and e-mails of everyone submitting) is for approvers only, in their tenant', async () => {
        expect((await call('get', '/timesheets/pending', null)).status).toBe(401);
        expect((await call('get', '/timesheets/pending', eve)).status).toBe(403);
        const res = await call('get', '/timesheets/pending', mia);
        expect(res.status).toBe(200);
        expect(res.body.items.every((t: Row) => t.tenant_id === 't1')).toBe(true);
    });

    it('an employee can still edit and submit their own timesheet', async () => {
        const entries = { entries: [{ project_name: 'P', mon_hours: 8 }] };
        expect((await call('put', '/timesheets/6/entries', eve, entries)).status).toBe(200);
        expect(W.calls.entriesSaved).toBe(1);
        expect((await call('put', '/timesheets/6/submit', eve)).status).toBe(200);
        expect(find(W.timesheet, 6)!.status).toBe('submitted');
    });

    it("nobody can edit or submit someone else's or another tenant's timesheet", async () => {
        const entries = { entries: [{ project_name: 'P', mon_hours: 8 }] };
        for (const who of [eve, mia, mo]) {
            expect((await call('put', '/timesheets/12/entries', who, entries)).status).toBe(404);
            expect((await call('put', '/timesheets/12/submit', who)).status).toBe(404);
        }
        expect((await call('put', '/timesheets/9/entries', eve, entries)).status).toBe(404);
        expect(W.calls.entriesSaved).toBe(0);
        expect(find(W.timesheet, 12)!.status).toBe('draft');
    });

    it('a submitted or approved timesheet is no longer editable, and cannot be submitted twice (409)', async () => {
        const entries = { entries: [{ project_name: 'P', mon_hours: 8 }] };
        expect((await call('put', '/timesheets/5/entries', eve, entries)).status).toBe(409);
        expect((await call('put', '/timesheets/5/submit', eve)).status).toBe(409);
        expect(W.calls.entriesSaved).toBe(0);
    });
});

// ─────────────────────────────────────────────── CLAIMS ───────────────────────────────────────────────
describe('HF-5 claims', () => {
    const claim = { employee_id: 'EMP10', amount: 99.5, category: 'Travel', description: 'cab' };

    it('submission is filed for the caller; a different employee_id in the body is refused', async () => {
        const ok = await call('post', '/claims', eve, claim);
        expect(ok.status).toBe(201);
        expect(W.claim.find((c) => c.id === ok.body.claimId)!.employee_id).toBe('EMP10');
        expect((await call('post', '/claims', eve, { ...claim, employee_id: 'EMP16' })).status).toBe(403);
        expect((await call('post', '/claims', eve, { ...claim, employee_id: 'EMP99' })).status).toBe(403);
        expect((await call('post', '/claims', null, claim)).status).toBe(401);
        expect(W.claim.filter((c) => c.amount === 99.5)).toHaveLength(1);
    });

    it('amount validation: zero, negative and non-numeric amounts are rejected', async () => {
        for (const amount of [0, -5, 'abc', null]) {
            expect((await call('post', '/claims', eve, { ...claim, amount })).status).toBe(400);
        }
        expect(W.claim.filter((c) => c.category === 'Travel')).toHaveLength(0);
    });

    it('a user with no employee record cannot file a claim', async () => {
        const ghost: Who = { id: 77, email: 'ghost@t1.test', tenant: 't1', role: 'employee', perms: [] };
        expect((await call('post', '/claims', ghost, claim)).status).toBe(404);
    });

    it('GET /claims (everyone\'s claims) needs claims:approve and stays in the tenant', async () => {
        expect((await call('get', '/claims', null)).status).toBe(401);
        expect((await call('get', '/claims', eve)).status).toBe(403);
        expect((await call('get', '/claims', mia)).status).toBe(403); // a manager is not a claims approver
        const res = await call('get', '/claims', lou);
        expect(res.status).toBe(200);
        expect(res.body.every((c: Row) => c.tenant_id === 't1')).toBe(true);
        expect(res.body.some((c: Row) => c.id === 'C9')).toBe(false);
    });

    it("an employee can read their own claims, but not another employee's by changing the id", async () => {
        const own = await call('get', '/claims/employee/EMP10', eve);
        expect(own.status).toBe(200);
        expect(own.body.map((c: Row) => c.id).sort()).toEqual(['C1', 'C3']);
        expect((await call('get', '/claims/employee/EMP16', eve)).status).toBe(403);
        expect((await call('get', '/claims/employee/EMP13', eve)).status).toBe(403);
        expect((await call('get', '/claims/employee/EMP10', null)).status).toBe(401);
    });

    it("an approver can read an employee's claims, within their own tenant only", async () => {
        expect((await call('get', '/claims/employee/EMP10', lou)).status).toBe(200);
        const cross = await call('get', '/claims/employee/EMP99', lou);
        expect(cross.status).toBe(200);
        expect(cross.body).toEqual([]); // tenant-strict query: nothing from t2
        const mine = await call('get', '/claims/employee/EMP99', mo);
        expect(mine.body.map((c: Row) => c.id)).toEqual(['C9']);
    });

    describe('PUT /claims/:id/status', () => {
        const decide = (who: Who | null, id: string, body: Row = { status: 'approved' }) => call('put', `/claims/${id}/status`, who, body);

        it('unauthenticated -> 401; no permission -> 403', async () => {
            expect((await decide(null, 'C1')).status).toBe(401);
            const gated = await decide(eve, 'C1');
            expect(gated.status).toBe(403);
            // a caller who can decide NO kind of request is stopped by the route gate itself
            expect(gated.body.message).toMatch(/insufficient permissions/);
            expect((await decide(mia, 'C1')).status).toBe(403); // can decide other kinds, not claims: stopped by the per-type check
            expect(find(W.claim, 'C1')!.status).toBe('pending');
        });

        it('an authorised approver decides, and the decision is audited with the token identity', async () => {
            expect((await decide(lou, 'C1', { status: 'approved', approved_by: 999, tenant_id: 't2' })).status).toBe(200);
            expect(find(W.claim, 'C1')!.status).toBe('approved');
            expect(audits).toHaveLength(1);
            expect(audits[0]).toMatchObject({ tenantId: 't1', actorId: 13 });
            expect(audits[0].payload).toMatchObject({ entityId: 'claim-C1', newValues: { approvalType: 'claim', decision: 'approved', decidedBy: 13, subjectEmployeeId: 'EMP10' } });
        });

        it('cannot decide your own claim (employee linked by e-mail only)', async () => {
            expect((await decide(lou, 'C2')).status).toBe(403);
            expect((await decide(lou, 'C2', { status: 'rejected' })).status).toBe(403);
            expect(find(W.claim, 'C2')!.status).toBe('pending');
        });

        it("another tenant's claim -> 404; already decided -> 409; no flipping; bad status -> 400", async () => {
            expect((await decide(lou, 'C9')).status).toBe(404);
            expect((await decide(mo, 'C1')).status).toBe(404);
            expect((await decide(lou, 'C3')).status).toBe(409);
            expect((await decide(lou, 'C1')).status).toBe(200);
            expect((await decide(lou, 'C1', { status: 'rejected' })).status).toBe(409);
            expect(find(W.claim, 'C1')!.status).toBe('approved');
            expect((await decide(lou, 'C1', { status: 'pending' })).status).toBe(400);
        });

        it('simultaneous decisions: exactly one wins', async () => {
            const results = await Promise.all([decide(lou, 'C1'), decide(lou, 'C1', { status: 'rejected' }), decide(lou, 'C1')]);
            expect(results.filter((r) => r.status === 200)).toHaveLength(1);
            expect(audits).toHaveLength(1);
        });
    });
});

// ─────────────────────────────────────────────── ATTENDANCE ───────────────────────────────────────────────
describe('HF-5 attendance regularization is a request, never a self-approval', () => {
    const body = { date: '2026-01-05', check_in_time: '09:00', check_out_time: '18:00', reason: 'forgot' };

    it('filing a request creates a PENDING request and does not touch attendance', async () => {
        const res = await call('post', '/attendance/regularize', eve, body);
        expect(res.status).toBe(201);
        expect(res.body.status).toBe('pending');
        expect(W.attendance).toHaveLength(0);
        const req = W.std.find((r) => r.id === res.body.id)!;
        expect(req).toMatchObject({ type: 'attendance_regularization', status: 'pending', employee_id: 'EMP10', tenant_id: 't1', requested_by: 'eve@t1.test' });
        expect(req.metadata).toMatchObject({ date: '2026-01-05', check_in_time: '09:00', check_out_time: '18:00', user_id: 10 });
    });

    it('requires authentication, and a forged userId in the body is ignored (the request is for the caller)', async () => {
        expect((await call('post', '/attendance/regularize', null, body)).status).toBe(401);
        const res = await call('post', '/attendance/regularize', eve, { ...body, userId: 16, employee_id: 'EMP16' });
        expect(res.status).toBe(201);
        expect(W.std.find((r) => r.id === res.body.id)!.employee_id).toBe('EMP10');
    });

    it('rejects future dates, bad dates/times and check-out before check-in; and a duplicate pending date (409)', async () => {
        expect((await call('post', '/attendance/regularize', eve, { ...body, date: '2999-01-01' })).status).toBe(400);
        expect((await call('post', '/attendance/regularize', eve, { ...body, date: '2026-02-30' })).status).toBe(400);
        expect((await call('post', '/attendance/regularize', eve, { ...body, date: 'yesterday' })).status).toBe(400);
        expect((await call('post', '/attendance/regularize', eve, { ...body, check_in_time: '9am' })).status).toBe(400);
        expect((await call('post', '/attendance/regularize', eve, { ...body, check_out_time: '08:00' })).status).toBe(400);
        expect(W.std).toHaveLength(0);
        expect((await call('post', '/attendance/regularize', eve, body)).status).toBe(201);
        expect((await call('post', '/attendance/regularize', eve, body)).status).toBe(409);
        expect(W.std).toHaveLength(1);
    });

    it('only an authorised approver other than the requester can approve it; then (and only then) attendance changes', async () => {
        const id = (await call('post', '/attendance/regularize', eve, body)).body.id;
        const act = (who: Who | null, action = 'approve') => call('post', `/approvals/std-${id}/action`, who, { action, type: 'attendance_regularization' });

        expect((await act(null)).status).toBe(401);
        expect((await act(evan)).status).toBe(403); // no permission
        expect((await act(eve)).status).toBe(403); // the requester, no permission
        expect(W.attendance).toHaveLength(0);

        expect((await act(mia)).status).toBe(200);
        expect(find(W.std, id)!.status).toBe('approved');
        expect(W.attendance).toEqual([{ employee_id: 'EMP10', date: '2026-01-05', in: '09:00', out: '18:00', tenant_id: 't1' }]);
        expect(audits[0].payload).toMatchObject({ action: 'APPROVAL_APPROVE', newValues: { approvalType: 'attendance_regularization', decidedBy: 11 } });

        expect((await act(mia)).status).toBe(409); // no second attendance row
        expect(W.attendance).toHaveLength(1);
    });

    it('an approver cannot approve their own regularization', async () => {
        const id = (await call('post', '/attendance/regularize', mia, body)).body.id;
        const res = await call('post', `/approvals/std-${id}/action`, mia, { action: 'approve', type: 'attendance_regularization' });
        expect(res.status).toBe(403);
        expect(W.attendance).toHaveLength(0);
        expect(find(W.std, id)!.status).toBe('pending');
    });

    it('a rejected request never changes attendance; another tenant cannot decide or even see it', async () => {
        const id = (await call('post', '/attendance/regularize', eve, body)).body.id;
        // a t2 approver does not even get to see that the t1 request exists (404 before any permission detail)
        expect((await call('post', `/approvals/std-${id}/action`, mo, { action: 'approve', type: 'attendance_regularization' })).status).toBe(404);
        const moWith: Who = { ...mo, perms: [...mo.perms, 'attendance:manage'] };
        expect((await call('post', `/approvals/std-${id}/action`, moWith, { action: 'approve', type: 'attendance_regularization' })).status).toBe(404);
        expect((await call('post', `/approvals/std-${id}/action`, mia, { action: 'reject', type: 'attendance_regularization' })).status).toBe(200);
        expect(W.attendance).toHaveLength(0);
        expect(find(W.std, id)!.status).toBe('rejected');
    });

    it('POST /approvals cannot be used to forge a regularization', async () => {
        const gus: Who = { id: 15, email: 'gus@t1.test', tenant: 't1', role: 'custom', perms: ['approvals:approve'] };
        const res = await call('post', '/approvals', gus, { employeeId: 'EMP10', type: 'attendance_regularization' });
        expect(res.status).toBe(400);
    });
});

// ─────────────────────────────────────────────── PAYROLL ───────────────────────────────────────────────
describe('HF-5 payroll: every route needs an explicit permission', () => {
    const reads: Array<[string, string]> = [
        ['get', '/payroll/employees'], ['get', '/payroll/runs'], ['get', '/payroll/activity'], ['get', '/payroll/pending-approvals'],
        ['get', '/payroll/live-summary'], ['get', '/payroll/deadlines'], ['get', '/payroll/tax-summary'],
    ];

    it('unauthenticated -> 401 on every payroll route', async () => {
        for (const [m, u] of reads) expect((await call(m as any, u, null)).status, u).toBe(401);
        expect((await call('put', '/payroll/employees/EMP16', null, { basicSalary: 1 })).status).toBe(401);
        expect((await call('post', '/payroll/process', null, { month: 1, year: 2026 })).status).toBe(401);
    });

    it('an employee (or a manager) with no payroll permission -> 403 everywhere, and the service is never reached', async () => {
        for (const who of [eve, mia]) {
            for (const [m, u] of reads) expect((await call(m as any, u, who)).status, `${who.role} ${u}`).toBe(403);
            expect((await call('get', '/payroll/history/EMP10', who)).status).toBe(403);
            expect((await call('put', '/payroll/employees/EMP16', who, { basicSalary: 1 })).status).toBe(403);
            expect((await call('post', '/payroll/process', who, { month: 1, year: 2026 })).status).toBe(403);
        }
        expect(W.calls.payroll).toHaveLength(0);
    });

    it('payroll:view can read but cannot change salaries or run payroll', async () => {
        for (const [m, u] of reads) expect((await call(m as any, u, vic)).status, u).toBe(200);
        expect((await call('put', '/payroll/employees/EMP16', vic, { basicSalary: 1 })).status).toBe(403);
        expect((await call('post', '/payroll/process', vic, { month: 1, year: 2026 })).status).toBe(403);
        expect(W.calls.payroll.some((c) => c.startsWith('update') || c.startsWith('process'))).toBe(false);
    });

    it('payroll:manage may change a salary structure; payroll:run may run payroll; each scoped to the caller tenant', async () => {
        expect((await call('put', '/payroll/employees/EMP16', pam, { basicSalary: 1000 })).status).toBe(200);
        expect(W.calls.payroll.find((c) => c.startsWith('update'))).toContain('"t1"');
        expect((await call('post', '/payroll/process', pam, { month: 1, year: 2026, tenantId: 't2' })).status).toBe(200);
        const proc = W.calls.payroll.find((c) => c.startsWith('process'))!;
        expect(proc).toContain('"t1"');
        expect(proc).not.toContain('"t2"');
    });

    it('nobody may change their own salary structure', async () => {
        const res = await call('put', '/payroll/employees/EMP17', pam, { basicSalary: 999999 }); // pam IS EMP17
        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/your own salary/);
        expect(W.calls.payroll.some((c) => c.startsWith('update'))).toBe(false);
    });

    it('running payroll for another tenant is impossible (the tenant is always the token\'s)', async () => {
        await call('post', '/payroll/process', mo, { month: 2, year: 2026, tenant_id: 't1' });
        expect(W.calls.payroll.find((c) => c.startsWith('process'))).toContain('"t2"');
    });
});

// ─────────────────────────────────────────────── AUDIT ───────────────────────────────────────────────
describe('HF-5 audit logs', () => {
    it('unauthenticated -> 401; without audit:view -> 403', async () => {
        expect((await call('get', '/audit-logs', null)).status).toBe(401);
        expect((await call('get', '/audit-logs', eve)).status).toBe(403);
        expect((await call('get', '/audit-logs', mia)).status).toBe(403);
        expect(W.calls.audit).toHaveLength(0);
    });

    it('with audit:view, reads only the caller tenant; tenant/actor in the query cannot override it', async () => {
        expect((await call('get', '/audit-logs?tenant_id=t2&tenantId=t2&user_id=99', ada)).status).toBe(200);
        expect(W.calls.audit[0].tenantId).toBe('t1');
        await call('get', '/audit-logs', mo);
        expect(W.calls.audit[1].tenantId).toBe('t2');
    });

    it('the API offers no way to write, edit or delete audit records', async () => {
        for (const m of ['post', 'put', 'delete', 'patch']) {
            const res = await (request(app) as any)[m]('/api/v1/audit-logs').set('Authorization', bearer(mo)).send({ action: 'x' });
            expect(res.status, m).toBe(404);
        }
    });
});

// ─────────────────────────────────────────────── REPORTS / PROFILE READS ───────────────────────────────────────────────
describe('HF-5 sensitive report and profile reads', () => {
    it('organisation-wide aggregates need reports:view', async () => {
        for (const u of ['/reports/admin', '/reports/dashboard', '/reports/analytics', '/reports/summary', '/reports/departments']) {
            expect((await call('get', u, null)).status, u).toBe(401);
            expect((await call('get', u, eve)).status, u).toBe(403);
            expect((await call('get', u, mia)).status, u).toBe(200);
        }
    });

    it('a full employee profile (pay, bank, documents) is for its owner or employees:view, in the same tenant', async () => {
        expect((await call('get', '/reports/profile/EMP10', null)).status).toBe(401);
        expect((await call('get', '/reports/profile/EMP10', eve)).status).toBe(200); // own
        expect((await call('get', '/reports/profile/EMP16', eve)).status).toBe(403); // change the id: refused
        expect((await call('get', '/reports/profile/EMP16', evan)).status).toBe(200);
        expect((await call('get', '/reports/profile/EMP16', mia)).status).toBe(200); // employees:view
        expect(W.calls.analytics.filter((c) => c === 'profile:EMP16')).toHaveLength(2);
    });

    it("another tenant's profile is not found, even for a permitted viewer; the data layer is never reached", async () => {
        expect((await call('get', '/reports/profile/EMP99', mia)).status).toBe(404);
        expect((await call('get', '/reports/profile/EMP99', eve)).status).toBe(404);
        expect((await call('get', '/reports/profile/EMP10', mo)).status).toBe(404);
        expect(W.calls.analytics.some((c) => c === 'profile:EMP99')).toBe(false);
    });

    it('dashboards keyed by a user id: own id always; someone else only with employees:view, in-tenant', async () => {
        for (const path of ['/reports/employee', '/reports/dashboard/employee', '/reports/manager', '/reports/dashboard/manager', '/reports/team']) {
            const key = path.endsWith('team') ? 'managerId' : 'userId';
            expect((await call('get', `${path}?${key}=10`, null)).status, path).toBe(401);
            expect((await call('get', `${path}?${key}=10`, eve)).status, `${path} own`).toBe(200);
            expect((await call('get', `${path}?${key}=16`, eve)).status, `${path} other`).toBe(403);
            expect((await call('get', `${path}?${key}=16`, mia)).status, `${path} permitted`).toBe(200);
            expect((await call('get', `${path}?${key}=99`, mia)).status, `${path} cross-tenant`).toBe(404);
        }
    });
});
