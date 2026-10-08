import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';

// HF-4: approval actions need an explicit permission, may not be self-approved, must match the
// real record's type, apply only to pending requests, and take identity from the token only.
//
// Real: JWT authentication, the route guard, controller, policy, service, audit event.
// Fake: the repository (an in-memory stand-in that mirrors the tenant-strict, row-locked SQL) and
// the transaction wrapper (serialised, like a row lock). The SQL itself is verified separately
// against a scratch PostgreSQL cluster (see the HF-4 verification report).

const store = vi.hoisted(() => ({
    rows: { std: [] as any[], leave: [] as any[], onboarding: [] as any[], timesheet: [] as any[], claim: [] as any[] },
    employees: [] as any[],
    calls: { lock: 0, execDept: [] as any[], created: [] as any[] },
}));

vi.mock('../../src/services/emailService', () => ({ 
    sendEmployeeActionNotification: vi.fn().mockResolvedValue(true),
    sendOnboardingCredentialsEmail: vi.fn().mockResolvedValue(true)
}));

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

vi.mock('../../src/modules/approvals/approvals.repository', () => {
    const impl = {
        async getEmployeeIdByUserId() { return undefined; },
        async getApprovals() { return []; },
        async getReportingManagerUserIds(ids: string[]) { return new Map(ids.map((i) => [i, null])); },
        async applySelfServiceChange() { /* nothing to apply in the fixture */ },
        async getRoleName() { return null; },
        async resolveActorEmployeeId(_c: unknown, tenantId: string, userId: number, email: string) {
            const e = store.employees.find((x) => x.tenant_id === tenantId && (x.user_id === userId || x.email.toLowerCase() === email.toLowerCase()));
            return e ? e.id : null;
        },
        async lockApproval(_c: unknown, kind: keyof typeof store.rows, id: string, tenantId: string) {
            store.calls.lock++;
            const r = store.rows[kind].find((x) => String(x.id) === id && x.tenant_id === tenantId);
            return r ? { ...r } : null;
        },
        async setDecision(_c: unknown, kind: keyof typeof store.rows, id: string, status: string, tenantId: string) {
            const r = store.rows[kind].find((x) => String(x.id) === id && x.tenant_id === tenantId);
            if (r) r.status = status;
        },
        async executeDepartmentCreation(id: string, meta: any, status: string, tenantId: string) {
            store.calls.execDept.push({ id, meta, tenantId });
            const r = store.rows.std.find((x) => x.id === id && x.tenant_id === tenantId);
            if (r) r.status = status;
        },
        async executeTeamCreation() { /* not exercised */ },
        async employeeExistsInTenant(employeeId: string, tenantId: string) {
            return store.employees.some((x) => x.id === employeeId && x.tenant_id === tenantId);
        },
        async createApprovalRequest(id: string, employeeId: string, type: string, status: string, tenantId: string) {
            store.calls.created.push({ id, employeeId, type, status, tenantId });
        },
    };
    return { ApprovalsRepository: vi.fn().mockImplementation(() => impl) };
});

import approvalsRouter from '../../src/modules/approvals/approvals.routes';
import { globalErrorHandler } from '../../src/core/errors/errorHandler';
import { JwtService } from '../../src/core/security/jwt.service';
import { eventBus } from '../../src/core/events/eventBus';
import { DomainEventType } from '../../src/core/events/eventTypes';

const app = express();
app.use(express.json());
app.use('/api/v1/approvals', approvalsRouter);
app.use(globalErrorHandler);

type Who = { id: number; email: string; tenant: string; role: string; dash?: string; perms: string[] };
const eve: Who = { id: 10, email: 'eve@t1.test', tenant: 't1', role: 'employee', perms: [] };
const mia: Who = { id: 11, email: 'mia@t1.test', tenant: 't1', role: 'manager', dash: 'manager', perms: ['leave:approve', 'timesheet:approve'] };
const hana: Who = { id: 12, email: 'hana@t1.test', tenant: 't1', role: 'hr', dash: 'admin', perms: [] }; // dashboard_type admin passes every permission check today
const lou: Who = { id: 13, email: 'lou@t1.test', tenant: 't1', role: 'custom', perms: ['claims:approve'] };
const sam: Who = { id: 14, email: 'sam@t1.test', tenant: 't1', role: 'custom', perms: ['settings:manage'] };
const gus: Who = { id: 15, email: 'gus@t1.test', tenant: 't1', role: 'custom', perms: ['approvals:approve'] };
const mo: Who = { id: 20, email: 'mo@t2.test', tenant: 't2', role: 'manager', dash: 'manager', perms: ['leave:approve', 'timesheet:approve', 'claims:approve'] };

const bearer = (w: Who) =>
    'Bearer ' + JwtService.generateAccessToken({ userId: w.id, email: w.email, tenantId: w.tenant, role: w.role as any, dashboard_type: w.dash, permissions: w.perms } as any);
const act = (w: Who | null, id: string, body: Record<string, unknown>) => {
    const r = request(app).post(`/api/v1/approvals/${id}/action`);
    return (w ? r.set('Authorization', bearer(w)) : r).send(body);
};
const row = (kind: keyof typeof store.rows, id: string | number) => store.rows[kind].find((r) => String(r.id) === String(id));

let audits: any[] = [];
const onAudit = (e: any) => audits.push(e);
let warn: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
    store.employees = [
        { id: 'EMP10', tenant_id: 't1', user_id: 10, email: 'eve@t1.test' },
        { id: 'EMP11', tenant_id: 't1', user_id: 11, email: 'mia@t1.test' },
        { id: 'EMP12', tenant_id: 't1', user_id: 12, email: 'hana@t1.test' },
        { id: 'EMP13', tenant_id: 't1', user_id: null, email: 'lou@t1.test' }, // linked by email only
        { id: 'EMP14', tenant_id: 't1', user_id: 14, email: 'sam@t1.test' },
        { id: 'EMP20', tenant_id: 't2', user_id: 20, email: 'mo@t2.test' },
    ];
    store.rows = {
        leave: [
            { id: 1, tenant_id: 't1', user_id: 10, employee_id: 'EMP10', status: 'pending' },
            { id: 2, tenant_id: 't1', user_id: 11, employee_id: null, status: 'pending' }, // Mia's own (new column)
            { id: 3, tenant_id: 't1', user_id: 10, employee_id: 'EMP10', status: 'approved' },
            { id: 4, tenant_id: 't1', user_id: null, employee_id: 'EMP11', status: 'pending' }, // Mia's own (legacy column)
            { id: 7, tenant_id: 't2', user_id: 99, employee_id: 'EMP99', status: 'pending' },
        ],
        claim: [
            { id: 'C1', tenant_id: 't1', employee_id: 'EMP10', status: 'pending' },
            { id: 'C2', tenant_id: 't1', employee_id: 'EMP13', status: 'pending' }, // Lou's own
        ],
        timesheet: [
            { id: 5, tenant_id: 't1', user_id: 10, employee_id: null, status: 'submitted' },
            { id: 6, tenant_id: 't1', user_id: 10, employee_id: null, status: 'draft' },
        ],
        onboarding: [
            { id: 'EMP90', tenant_id: 't1', status: 'onboarding', name: 'New Hire', email: 'new@t1.test', user_id: null },
            { id: 'EMP12', tenant_id: 't1', status: 'onboarding', name: 'Hana', email: 'hana@t1.test', user_id: 12 }, // Hana's own
        ],
        std: [
            { id: 'STR-1', tenant_id: 't1', type: 'department_creation', status: 'pending', employee_id: 'EMP10', requested_by: null, metadata: { name: 'Ops' } },
            { id: 'APP-9', tenant_id: 't1', type: 'role_change', status: 'pending', employee_id: 'EMP10', requested_by: 'EMP10', metadata: null },
            { id: 'PR-legacy', tenant_id: 't1', type: 'password_reset', status: 'pending', employee_id: 'EMP10', requested_by: 'eve@t1.test', metadata: { email: 'eve@t1.test', reset_token: 'raw' } },
            { id: 'PR-sam', tenant_id: 't1', type: 'password_reset', status: 'pending', employee_id: 'EMP14', requested_by: 'sam@t1.test', metadata: { email: 'sam@t1.test' } },
        ],
    };
    store.calls = { lock: 0, execDept: [], created: [] };
    audits = [];
    eventBus.on(DomainEventType.AUDIT_LOG_REQUESTED, onAudit);
    warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => {
    eventBus.off(DomainEventType.AUDIT_LOG_REQUESTED, onAudit);
    warn.mockRestore();
});

describe('HF-4: authentication and permission', () => {
    it('no token -> 401, nothing changes', async () => {
        const res = await act(null, 'leave-1', { action: 'approve', type: 'leave' });
        expect(res.status).toBe(401);
        expect(row('leave', 1).status).toBe('pending');
    });

    it('an employee with no approval permission -> 403 before any database work', async () => {
        const res = await act(eve, 'leave-1', { action: 'approve', type: 'leave' });
        expect(res.status).toBe(403);
        expect(store.calls.lock).toBe(0);
        expect(row('leave', 1).status).toBe('pending');
        expect(audits).toHaveLength(0);
    });

    it('the route gate refuses an employee for every kind of id, before any database work', async () => {
        const cases: Array<[string, string]> = [
            ['std-APP-9', 'role_change'], ['std-STR-1', 'department_creation'], ['std-PR-legacy', 'password_reset'],
            ['claim-C1', 'claim'], ['ts-5', 'timesheet'], ['onb-EMP90', 'onboarding'], ['leave-1', 'leave'],
        ];
        for (const [id, type] of cases) {
            expect((await act(eve, id, { action: 'approve', type })).status, id).toBe(403);
        }
        expect(store.calls.lock).toBe(0);
    });

    it('an authorised manager approves leave', async () => {
        const res = await act(mia, 'leave-1', { action: 'approve', type: 'leave' });
        expect(res.status).toBe(200);
        expect(row('leave', 1).status).toBe('approved');
    });

    it('an authorised manager can reject', async () => {
        expect((await act(mia, 'leave-1', { action: 'reject', type: 'leave' })).status).toBe(200);
        expect(row('leave', 1).status).toBe('rejected');
    });

    it('the permission is per type: a leave approver cannot decide a claim, an onboarding or a department request', async () => {
        expect((await act(mia, 'claim-C1', { action: 'approve', type: 'claim' })).status).toBe(403);
        expect((await act(mia, 'onb-EMP90', { action: 'approve', type: 'onboarding' })).status).toBe(403);
        expect((await act(mia, 'std-STR-1', { action: 'approve', type: 'department_creation' })).status).toBe(403);
        expect(row('claim', 'C1').status).toBe('pending');
        expect(row('onboarding', 'EMP90').status).toBe('onboarding');
        expect(row('std', 'STR-1').status).toBe('pending');
        expect(store.calls.execDept).toHaveLength(0);
    });

    it('the matching permission works for claims, and dashboard-admin HR for department creation', async () => {
        expect((await act(lou, 'claim-C1', { action: 'approve', type: 'claim' })).status).toBe(200);
        expect(row('claim', 'C1').status).toBe('approved');
        expect((await act(hana, 'std-STR-1', { action: 'approve', type: 'department_creation' })).status).toBe(200);
        expect(store.calls.execDept).toEqual([{ id: 'STR-1', meta: { name: 'Ops' }, tenantId: 't1' }]);
        expect(row('std', 'STR-1').status).toBe('approved');
    });

    it('onboarding approval activates the employee', async () => {
        expect((await act(hana, 'onb-EMP90', { action: 'approve', type: 'onboarding' })).status).toBe(200);
        expect(row('onboarding', 'EMP90').status).toBe('active');
    });

    it('generic approvals need approvals:approve', async () => {
        expect((await act(mia, 'std-APP-9', { action: 'approve', type: 'role_change' })).status).toBe(403);
        expect((await act(gus, 'std-APP-9', { action: 'approve', type: 'role_change' })).status).toBe(200);
        expect(row('std', 'APP-9').status).toBe('approved');
    });
});

describe('HF-4: no self-approval', () => {
    it('the requester cannot decide their own leave (new user_id column)', async () => {
        const res = await act(mia, 'leave-2', { action: 'approve', type: 'leave' });
        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/your own request/);
        expect(row('leave', 2).status).toBe('pending');
    });

    it('nor through the legacy employee_id column', async () => {
        expect((await act(mia, 'leave-4', { action: 'approve', type: 'leave' })).status).toBe(403);
        expect(row('leave', 4).status).toBe('pending');
    });

    it('rejecting your own request is also refused', async () => {
        expect((await act(mia, 'leave-2', { action: 'reject', type: 'leave' })).status).toBe(403);
    });

    it('the subject of a claim cannot decide it (employee linked by email only)', async () => {
        expect((await act(lou, 'claim-C2', { action: 'approve', type: 'claim' })).status).toBe(403);
        expect(row('claim', 'C2').status).toBe('pending');
    });

    it('an employee cannot approve their own onboarding', async () => {
        expect((await act(hana, 'onb-EMP12', { action: 'approve', type: 'onboarding' })).status).toBe(403);
        expect(row('onboarding', 'EMP12').status).toBe('onboarding');
    });

    it('a legacy password-reset approval cannot be decided by the person it is for', async () => {
        expect((await act(sam, 'std-PR-sam', { action: 'approve', type: 'password_reset' })).status).toBe(403);
        expect(row('std', 'PR-sam').status).toBe('pending');
    });
});

describe('HF-4: the type must match the real record', () => {
    it('a wrong claimed type is rejected, whatever the record', async () => {
        expect((await act(mia, 'leave-1', { action: 'approve', type: 'claim' })).status).toBe(400);
        expect((await act(mia, 'leave-1', { action: 'approve', type: 'whatever' })).status).toBe(400);
        expect((await act(hana, 'std-STR-1', { action: 'approve', type: 'password_reset' })).status).toBe(400);
        expect(row('leave', 1).status).toBe('pending');
        expect(row('std', 'STR-1').status).toBe('pending');
    });

    it('claiming a lower-privilege type cannot bypass the permission of the real type', async () => {
        // Mia may approve leave. She cannot approve a password reset by calling it "leave".
        const res = await act(mia, 'std-PR-legacy', { action: 'approve', type: 'leave' });
        expect(res.status).toBe(400);
        expect(row('std', 'PR-legacy').status).toBe('pending');
        // Calling it what it is requires settings:manage.
        expect((await act(mia, 'std-PR-legacy', { action: 'approve', type: 'password_reset' })).status).toBe(403);
        expect(row('std', 'PR-legacy').status).toBe('pending');
    });

    it('a settings administrator can still action a legacy password_reset record (it grants nothing)', async () => {
        expect((await act(sam, 'std-PR-legacy', { action: 'reject', type: 'password_reset' })).status).toBe(200);
        expect(row('std', 'PR-legacy').status).toBe('rejected');
    });

    it('an id without a known kind prefix, or a malformed id, is refused', async () => {
        expect((await act(hana, 'EMP90', { action: 'approve', type: 'onboarding' })).status).toBe(400);
        expect((await act(hana, 'leave-', { action: 'approve', type: 'leave' })).status).toBe(400);
        expect((await act(hana, 'leave-abc', { action: 'approve', type: 'leave' })).status).toBe(404);
    });
});

describe('HF-4: only pending requests can be decided', () => {
    it('an already decided request -> 409 and is not changed', async () => {
        const res = await act(mia, 'leave-3', { action: 'reject', type: 'leave' });
        expect(res.status).toBe(409);
        expect(row('leave', 3).status).toBe('approved');
    });

    it('a draft timesheet cannot be approved; a submitted one can', async () => {
        expect((await act(mia, 'ts-6', { action: 'approve', type: 'timesheet' })).status).toBe(409);
        expect(row('timesheet', 6).status).toBe('draft');
        expect((await act(mia, 'ts-5', { action: 'approve', type: 'timesheet' })).status).toBe(200);
    });

    it('deciding twice, or flipping a decision, is refused', async () => {
        expect((await act(mia, 'leave-1', { action: 'approve', type: 'leave' })).status).toBe(200);
        expect((await act(mia, 'leave-1', { action: 'approve', type: 'leave' })).status).toBe(409);
        expect((await act(hana, 'leave-1', { action: 'reject', type: 'leave' })).status).toBe(409);
        expect(row('leave', 1).status).toBe('approved');
    });

    it('two simultaneous decisions: exactly one wins and one audit event is written', async () => {
        const [a, b] = await Promise.all([
            act(mia, 'leave-1', { action: 'approve', type: 'leave' }),
            act(hana, 'leave-1', { action: 'reject', type: 'leave' }),
        ]);
        expect([a.status, b.status].sort()).toEqual([200, 409]);
        const winner = a.status === 200 ? { who: mia, status: 'approved' } : { who: hana, status: 'rejected' };
        expect(row('leave', 1).status).toBe(winner.status);
        expect(audits).toHaveLength(1);
        expect(audits[0].actorId).toBe(winner.who.id);
    });

    it('many simultaneous attempts: still exactly one transition', async () => {
        const results = await Promise.all(
            Array.from({ length: 8 }, (_, i) => act(i % 2 ? mia : hana, 'leave-1', { action: i % 2 ? 'approve' : 'reject', type: 'leave' })),
        );
        expect(results.filter((r) => r.status === 200)).toHaveLength(1);
        expect(results.filter((r) => r.status === 409)).toHaveLength(7);
        expect(audits).toHaveLength(1);
    });
});

describe('HF-4: identity and tenant come from the token', () => {
    it('forged approved_by / tenant / actor fields in the body are ignored', async () => {
        const res = await act(mia, 'leave-1', {
            action: 'approve', type: 'leave',
            approved_by: 999, approvedBy: 999, actor: 'hana', userId: 12, tenantId: 't2', tenant_id: 't2', decidedBy: 12,
        });
        expect(res.status).toBe(200);
        expect(row('leave', 1)).toEqual({ id: 1, tenant_id: 't1', user_id: 10, employee_id: 'EMP10', status: 'approved' }); // only status changed
        expect(audits[0].actorId).toBe(11);
        expect(audits[0].payload.newValues.decidedBy).toBe(11);
        expect(audits[0].tenantId).toBe('t1');
    });

    it('a forged userId cannot be used to dodge the self-approval rule', async () => {
        const res = await act(mia, 'leave-2', { action: 'approve', type: 'leave', userId: 999, employeeId: 'EMP999' });
        expect(res.status).toBe(403);
        expect(row('leave', 2).status).toBe('pending');
    });

    it("another tenant's request is not found, in either direction", async () => {
        expect((await act(mo, 'leave-1', { action: 'approve', type: 'leave' })).status).toBe(404); // t2 actor, t1 row
        expect((await act(mia, 'leave-7', { action: 'approve', type: 'leave' })).status).toBe(404); // t1 actor, t2 row
        expect(row('leave', 1).status).toBe('pending');
        expect(row('leave', 7).status).toBe('pending');
        expect(audits).toHaveLength(0);
    });
});

describe('HF-4: audit', () => {
    it('an authorised decision records who decided what, in which tenant', async () => {
        await act(mia, 'leave-1', { action: 'approve', type: 'leave' });
        expect(audits).toHaveLength(1);
        const e = audits[0];
        expect(e.tenantId).toBe('t1');
        expect(e.actorId).toBe(11);
        expect(e.payload).toMatchObject({
            action: 'APPROVAL_APPROVE',
            entityType: 'approval',
            entityId: 'leave-1',
            newValues: { approvalType: 'leave', decision: 'approved', subjectEmployeeId: 'EMP10', decidedBy: 11 },
        });
    });

    it('a rejection is recorded as a rejection', async () => {
        await act(hana, 'ts-5', { action: 'reject', type: 'timesheet' });
        expect(audits[0].payload).toMatchObject({ action: 'APPROVAL_REJECT', newValues: { decision: 'rejected', approvalType: 'timesheet' } });
    });

    it('a refused attempt writes no audit event and changes nothing', async () => {
        await act(mia, 'leave-2', { action: 'approve', type: 'leave' }); // own request
        await act(eve, 'leave-1', { action: 'approve', type: 'leave' }); // no permission
        await act(mia, 'leave-3', { action: 'approve', type: 'leave' }); // not pending
        expect(audits).toHaveLength(0);
    });
});

describe('HF-4: POST /approvals cannot be used to forge requests', () => {
    const create = (w: Who | null, body: Record<string, unknown>) => {
        const r = request(app).post('/api/v1/approvals');
        return (w ? r.set('Authorization', bearer(w)) : r).send(body);
    };

    it('needs approvals:approve', async () => {
        expect((await create(eve, { employeeId: 'EMP10', type: 'role_change' })).status).toBe(403);
        expect(store.calls.created).toHaveLength(0);
    });

    it('cannot create a password_reset (or any type that has its own workflow)', async () => {
        for (const type of ['password_reset', 'leave', 'claim', 'timesheet', 'onboarding', 'department_creation', 'team_creation']) {
            expect((await create(gus, { employeeId: 'EMP10', type })).status).toBe(400);
        }
        expect(store.calls.created).toHaveLength(0);
    });

    it("cannot target another tenant's employee", async () => {
        expect((await create(gus, { employeeId: 'EMP20', type: 'role_change' })).status).toBe(404);
        expect(store.calls.created).toHaveLength(0);
    });

    it('always creates a pending request in the caller tenant, ignoring a forged status', async () => {
        const res = await create(gus, { employeeId: 'EMP10', type: 'role_change', status: 'approved', tenant_id: 't2' });
        expect(res.status).toBe(201);
        expect(store.calls.created).toHaveLength(1);
        expect(store.calls.created[0]).toMatchObject({ employeeId: 'EMP10', type: 'role_change', status: 'pending', tenantId: 't1' });
    });
});
