import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

// Someone else's profile: the work card for `employees:view`; personal records and pay only with their own grants.
// Real: JWT, route guards, controllers, the access policy. Fake: the database and the data services.

type Row = Record<string, any>;
const W = vi.hoisted(() => ({
    owner: { id: 'E-OWN', user_id: 10, email: 'me@x.test' } as Row,
    target: { id: 'E-OTH', user_id: 20, email: 'other@x.test' } as Row,
    reads: [] as string[],
}));

const fullProfile = () => ({
    employee: {
        id: 'E-OTH', name: 'Other', position: 'Engineer', department_name: 'Eng', email: 'other@x.test', phone: '+91 1', join_date: '2026-01-01',
        availability_status: 'busy', manager_name: 'Boss',
        personal_email: 'p@x.test', date_of_birth: '2000-01-01', gender: 'f', address_line1: '1 Road', city: 'C', state: 'S', pincode: '1',
        highest_degree: 'BE', field_of_study: 'CS', institution: 'U', graduation_year: 2020,
        bank_account_number: '123456789', annual_ctc: 1200000,
    },
    compensation: { annual_ctc: 1200000, bank_account: '123456789' },
    documents: [{ id: 1, document_name: 'passport.pdf' }],
    emergencyContacts: [{ name: 'Mum', phone: '999' }],
    performanceReviews: [{ id: 1, rating: 4 }],
    attendanceSummary: { present_days: 3, avg_hours: 8, late_arrivals: 0 },
    leaveBalances: [{ name: 'Casual', annual_quota: 12, used: 1, available: 11 }],
});

vi.mock('../../src/config/db', () => ({
    pool: {
        query: async (sql: string, params: any[]) => {
            if (/FROM employees WHERE id = \$1 AND tenant_id = \$2/.test(sql)) {
                const e = [W.owner, W.target].find((x) => x.id === params[0]);
                return { rows: e && params[1] === 'tA' ? [e] : [] };
            }
            return { rows: [] };
        },
    },
    directPool: {}, query: async () => ({ rows: [] }),
}));
vi.mock('../../src/services/analyticsService', () => ({
    AnalyticsService: { getEmployeeProfile: async () => fullProfile() },
}));
vi.mock('../../src/modules/employees/employees.service', () => ({
    EmployeesService: class {
        async isEmployeeOwner(id: string, _t: string, email?: string, userId?: number) {
            const e = [W.owner, W.target].find((x) => x.id === id);
            return !!e && (e.user_id === userId || e.email === email);
        }
        async getEducation(id: string) { W.reads.push(`edu:${id}`); return [{ degree: 'BE' }]; }
        async getExperience(id: string) { W.reads.push(`exp:${id}`); return [{ company: 'Acme' }]; }
        async getEmergencyContacts(id: string) { W.reads.push(`ec:${id}`); return [{ name: 'Mum' }]; }
        async getEmployeeProfileByUserIdOrEmail() { return fullProfile(); }
    },
}));
vi.mock('../../src/services/auditService', () => ({ AuditService: {} }));
vi.mock('../../src/services/realtimeService', () => ({ RealtimeService: {} }));
vi.mock('../../src/services/emailService', () => ({ sendEmail: vi.fn(), sendPasswordResetEmail: vi.fn() }));
vi.mock('../../src/core/events/eventPublisher', () => ({ EventPublisher: { publish: vi.fn() } }));

import reportsRouter from '../../src/modules/reports/reports.routes';
import employeesRouter from '../../src/modules/employees/employees.routes';
import { globalErrorHandler } from '../../src/core/errors/errorHandler';
import { JwtService } from '../../src/core/security/jwt.service';

const app = express();
app.use(express.json());
app.use('/api/v1/reports', reportsRouter);
app.use('/api/v1/employees', employeesRouter);
app.use(globalErrorHandler);

type Who = { id: number; email: string; role: string; dash?: string; perms: string[]; tenant?: string };
const bearer = (w: Who) => 'Bearer ' + JwtService.generateAccessToken({
    userId: w.id, email: w.email, tenantId: w.tenant ?? 'tA', role: w.role as any, dashboard_type: w.dash ?? 'employee', permissions: w.perms,
} as any);

const manager: Who = { id: 1, email: 'm@x.test', role: 'manager', dash: 'manager', perms: ['employees:view', 'leave:approve'] };
const hr: Who = { id: 2, email: 'hr@x.test', role: 'hr', perms: ['employees:view', 'employees:update'] };
const hrB: Who = { id: 6, email: 'hrb@x.test', role: 'hr', perms: ['employees:view', 'employees:manage'] };   // the other permission vocabulary
const payrollOfficer: Who = { id: 3, email: 'pay@x.test', role: 'custom', perms: ['employees:view', 'payroll:view'] };
const admin: Who = { id: 4, email: 'adm@x.test', role: 'admin', dash: 'admin', perms: [] };
const nobody: Who = { id: 5, email: 'n@x.test', role: 'employee', perms: ['attendance:view'] };
const theOwner: Who = { id: 20, email: 'other@x.test', role: 'employee', perms: ['attendance:view'] };

const profileOf = (w: Who, id = 'E-OTH') => request(app).get(`/api/v1/reports/profile/${id}`).set('Authorization', bearer(w));
const PERSONAL = ['personal_email', 'date_of_birth', 'gender', 'address_line1', 'city', 'state', 'pincode', 'highest_degree', 'field_of_study', 'institution', 'graduation_year'];

beforeEach(() => { W.reads = []; });

describe('GET /reports/profile/:id as someone else', () => {
    it('a manager (employees:view) gets the work card only: no personal fields, pay, documents, contacts or reviews', async () => {
        const r = await profileOf(manager);
        expect(r.status).toBe(200);
        expect(r.body.employee).toMatchObject({ name: 'Other', position: 'Engineer', email: 'other@x.test', phone: '+91 1', availability_status: 'busy', manager_name: 'Boss' });
        for (const f of [...PERSONAL, 'bank_account_number', 'annual_ctc']) expect(r.body.employee, f).not.toHaveProperty(f);
        expect(r.body.compensation).toBeNull();
        expect(r.body.documents).toEqual([]);
        expect(r.body.emergencyContacts).toEqual([]);
        expect(r.body.performanceReviews).toEqual([]);
        expect(r.body.leaveBalances).toHaveLength(1);                      // team-management summaries stay
        expect(r.body.access).toEqual({ own: false, personal: false, pay: false, edit: false });
        expect(JSON.stringify(r.body)).not.toMatch(/123456789|1200000|passport|Mum/);
    });

    it('HR (employees:update) also sees personal records, but not pay', async () => {
        const r = await profileOf(hr);
        for (const f of PERSONAL) expect(r.body.employee, f).toHaveProperty(f);
        expect(r.body.documents).toHaveLength(1);
        expect(r.body.emergencyContacts).toHaveLength(1);
        expect(r.body.compensation).toBeNull();
        expect(r.body.employee).not.toHaveProperty('bank_account_number');
        expect(r.body.access).toEqual({ own: false, personal: true, pay: false, edit: true });
    });

    it('HR holding employees:manage (the other vocabulary) gets the same personal access', async () => {
        const r = await profileOf(hrB);
        expect(r.body.access).toMatchObject({ personal: true, pay: false });
        expect(r.body.employee).toHaveProperty('date_of_birth');
    });

    it('payroll:view unlocks pay and nothing personal', async () => {
        const r = await profileOf(payrollOfficer);
        expect(r.body.compensation).not.toBeNull();
        expect(r.body.employee).toHaveProperty('annual_ctc');
        expect(r.body.employee).not.toHaveProperty('date_of_birth');
        expect(r.body.documents).toEqual([]);
        expect(r.body.access).toMatchObject({ pay: true, personal: false, edit: false });
    });

    it('an administrator sees everything', async () => {
        const r = await profileOf(admin);
        expect(r.body.compensation).not.toBeNull();
        expect(r.body.employee).toHaveProperty('date_of_birth');
        expect(r.body.access).toMatchObject({ personal: true, pay: true });
    });

    it('the person themself sees everything and may edit', async () => {
        const r = await profileOf(theOwner);
        expect(r.status).toBe(200);
        expect(r.body.compensation).not.toBeNull();
        expect(r.body.employee).toHaveProperty('bank_account_number');
        expect(r.body.access).toEqual({ own: true, personal: true, pay: true, edit: true });
    });

    it('without employees:view nothing is returned, and another tenant\'s employee does not exist', async () => {
        expect((await profileOf(nobody)).status).toBe(403);
        expect((await profileOf({ ...manager, tenant: 'tB' })).status).toBe(404);
    });
});

describe('education / experience / emergency contacts of someone else', () => {
    const get = (w: Who, what: string, id = 'E-OTH') => request(app).get(`/api/v1/employees/${id}/${what}`).set('Authorization', bearer(w));

    it.each(['education', 'experience', 'emergency-contacts'])('%s: refused for a plain colleague and for a manager, allowed for HR, an administrator and the owner', async (what) => {
        expect((await get(nobody, what)).status).toBe(403);
        expect((await get(manager, what)).status).toBe(403);
        expect(W.reads).toEqual([]);                                         // never even read
        expect((await get(hr, what)).status).toBe(200);
        expect((await get(admin, what)).status).toBe(200);
        expect((await get(theOwner, what)).status).toBe(200);
    });
});
