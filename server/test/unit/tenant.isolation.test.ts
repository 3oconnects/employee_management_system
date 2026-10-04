import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

// HF-6: tenant isolation for the reads and writes that previously trusted a bare id.
//
// Real: JWT authentication, routes, controllers, services, repositories and the SQL text they send.
// Fake: the database pool, which records every statement and answers from a two-tenant in-memory
// model. The same SQL is run against a scratch PostgreSQL cluster separately.

type Row = Record<string, any>;
const W = vi.hoisted(() => ({
    employees: [
        { id: 'A1', tenant_id: 'tA', email: 'ann@a.test', user_id: 1, name: 'Ann (tenant A)' },
        { id: 'B1', tenant_id: 'tB', email: 'bob@b.test', user_id: 2, name: 'Bob (tenant B)' },
    ] as Row[],
    users: [
        { id: 1, tenant_id: 'tA', email: 'ann@a.test', name: 'Ann (tenant A)' },
        { id: 2, tenant_id: 'tB', email: 'bob@b.test', name: 'Bob (tenant B)' },
    ] as Row[],
    sql: [] as { sql: string; params: any[] }[],
}));

const norm = (s: string) => s.replace(/\s+/g, ' ').trim();

vi.mock('../../src/config/db', () => {
    const query = async (sql: string, p: any[] = []) => {
        W.sql.push({ sql: norm(sql), params: p });
        const q = norm(sql);
        if (q.startsWith('SELECT 1 FROM employees WHERE id = $1 AND tenant_id = $2')) {
            return { rows: W.employees.some((e) => e.id === p[0] && e.tenant_id === p[1]) ? [{ '?column?': 1 }] : [] };
        }
        if (q.includes('FROM employee_education x') || q.includes('FROM employee_experience x') || q.includes('FROM employee_emergency_contacts c')) {
            return { rows: W.employees.some((e) => e.id === p[0] && e.tenant_id === p[1]) ? [{ id: 1, employee_id: p[0] }] : [] };
        }
        if (q.startsWith('SELECT education_history FROM employees') || q.startsWith('SELECT experience_history FROM employees')) {
            return { rows: [] };
        }
        if (q.includes('FROM employees WHERE id = $1 AND tenant_id = $4') || (q.startsWith('SELECT id FROM employees WHERE id = $1 AND tenant_id = $4'))) {
            const e = W.employees.find((x) => x.id === p[0] && x.tenant_id === p[3] && (String(x.email).toLowerCase() === String(p[1]).toLowerCase() || x.user_id === p[2]));
            return { rows: e ? [{ id: e.id }] : [] };
        }
        if (q.includes('FROM employees WHERE LOWER(email) = LOWER($1) AND tenant_id = $2') || q.includes('FROM employees WHERE (LOWER(email) = LOWER($1) OR LOWER(COALESCE(personal_email')) {
            const e = W.employees.find((x) => String(x.email).toLowerCase() === String(p[0]).toLowerCase() && x.tenant_id === p[1]);
            return { rows: e ? [{ id: e.id, name: e.name, email: e.email, matched_type: 'work' }] : [] };
        }
        if (q.startsWith('SELECT id, name, email, (tenant_id = $2) AS same_tenant FROM users')) {
            const u = W.users.find((x) => String(x.email).toLowerCase() === String(p[0]).toLowerCase());
            return { rows: u ? [{ ...u, same_tenant: u.tenant_id === p[1] }] : [] };
        }
        return { rows: [], rowCount: 0 };
    };
    return { pool: { query, connect: async () => ({ query, release() {} }) }, directPool: {}, query };
});

vi.mock('../../src/database/transaction', () => ({
    withTransaction: async (cb: (c: unknown) => Promise<unknown>) => {
        const { pool } = await import('../../src/config/db');
        return cb({ query: (pool as any).query });
    },
}));
vi.mock('../../src/services/emailService', () => ({ sendEmployeeActionNotification: vi.fn().mockResolvedValue(true) }));

import employeesRouter from '../../src/modules/employees/employees.routes';
import { AnalyticsService } from '../../src/services/analyticsService';
import { globalErrorHandler } from '../../src/core/errors/errorHandler';
import { JwtService } from '../../src/core/security/jwt.service';

const app = express();
app.use(express.json());
app.use('/api/v1/employees', employeesRouter);
app.use(globalErrorHandler);

type Who = { id: number; email: string; tenant: string; role: string; perms: string[] };
const annHr: Who = { id: 1, email: 'ann@a.test', tenant: 'tA', role: 'hr', perms: ['employees:manage'] };
const bobHr: Who = { id: 2, email: 'bob@b.test', tenant: 'tB', role: 'hr', perms: ['employees:manage'] };
const bobAdmin: Who = { id: 3, email: 'root@b.test', tenant: 'tB', role: 'admin', perms: [] };

const bearer = (w: Who) =>
    'Bearer ' + JwtService.generateAccessToken({ userId: w.id, email: w.email, tenantId: w.tenant, role: w.role as any, permissions: w.perms } as any);
const call = (method: 'get' | 'post' | 'put' | 'delete', url: string, who: Who, body?: Record<string, unknown>) => {
    let r = (request(app) as any)[method](`/api/v1/employees${url}`).set('Authorization', bearer(who));
    return body ? r.send(body) : r;
};
const writes = () => W.sql.filter((s) => /^(DELETE|INSERT|UPDATE)/i.test(s.sql));

beforeEach(() => { W.sql.length = 0; });

describe('HF-6 employee sub-records: a tenant-B caller cannot reach tenant-A employee A1', () => {
    for (const part of ['education', 'experience', 'emergency-contacts']) {
        it(`GET /${part} → 404 for another tenant, 200 for the owning tenant`, async () => {
            expect((await call('get', `/A1/${part}`, bobHr)).status).toBe(404);
            expect((await call('get', `/A1/${part}`, bobAdmin)).status).toBe(404);
            expect((await call('get', `/A1/${part}`, annHr)).status).toBe(200);
        });
    }

    it('PUT /education and /experience and POST /emergency-contacts → 404 and NO write is issued', async () => {
        const r1 = await call('put', '/A1/education', bobHr, { entries: [{ degree: 'X' }] });
        const r2 = await call('put', '/A1/experience', bobAdmin, { entries: [{ company: 'X' }] });
        const r3 = await call('post', '/A1/emergency-contacts', bobHr, { contacts: [{ name: 'X', relationship: 'y', phone: '1' }] });
        expect([r1.status, r2.status, r3.status]).toEqual([404, 404, 404]);
        expect(writes()).toEqual([]);
    });

    it('same-tenant writes still work and every write statement carries the tenant', async () => {
        const r = await call('put', '/A1/education', annHr, { entries: [{ degree: 'BSc', year: 2020 }] });
        expect(r.status).toBe(200);
        const w = writes();
        expect(w.length).toBeGreaterThan(0);
        for (const s of w) {
            expect(s.params).toContain('tA');
            expect(s.sql).toMatch(/tenant_id/);
        }
    });

    it('a non-HR owner of the same e-mail in another tenant is not "the owner" of A1', async () => {
        const impostor: Who = { id: 99, email: 'ann@a.test', tenant: 'tB', role: 'employee', perms: [] };
        const r = await call('put', '/A1/education', impostor, { entries: [{ degree: 'X' }] });
        expect(r.status).toBe(403);
        expect(writes()).toEqual([]);
        const ownerQ = W.sql.find((s) => /WHERE id = \$1 AND tenant_id = \$4 AND \(LOWER\(email\)/.test(s.sql));
        expect(ownerQ, 'ownership lookup must be tenant-bound').toBeDefined();
        expect(ownerQ!.params[3]).toBe('tB');
    });

    it('unscoped reads of the three tables are impossible: each SELECT is tenant-bound', async () => {
        await call('get', '/A1/education', annHr);
        await call('get', '/A1/experience', annHr);
        await call('get', '/A1/emergency-contacts', annHr);
        const reads = W.sql.filter((s) => /employee_(education|experience|emergency_contacts)/.test(s.sql));
        expect(reads.length).toBeGreaterThanOrEqual(3);
        for (const s of reads) expect(s.params).toContain('tA');
    });
});

describe('HF-6 /employees/check-email never reveals another tenant', () => {
    it("does not name another tenant's employee", async () => {
        const r = await call('get', '/check-email?email=bob@b.test', annHr);
        expect(r.status).toBe(200);
        const text = JSON.stringify(r.body);
        expect(text).not.toContain('Bob');
        expect(text).not.toContain('B1');
        expect(r.body.conflictWith).toBeNull();
    });

    it("says another tenant's login e-mail is taken without saying whose", async () => {
        const r = await call('get', '/check-email?email=bob@b.test', annHr);
        expect(r.body.available).toBe(false);
        expect(r.body.message).toBe('Email is already in use.');
    });

    it('still names a conflict inside the caller\'s own tenant', async () => {
        const r = await call('get', '/check-email?email=ann@a.test', annHr);
        expect(r.body.available).toBe(false);
        expect(r.body.conflictWith).toMatchObject({ id: 'A1' });
    });

    it('every e-mail lookup it makes is tenant-bound', async () => {
        await call('get', '/check-email?email=bob@b.test&name=Zed%20Zee', annHr);
        const lookups = W.sql.filter((s) => /FROM (employees|users)/.test(s.sql));
        expect(lookups.length).toBeGreaterThan(0);
        for (const s of lookups) expect(s.params).toContain('tA');
    });
});

describe('HF-6 analytics: every statement is bound to the caller\'s tenant', () => {
    const exercise = {
        manager: () => AnalyticsService.getManagerDashboard(1, 'tA'),
        employee: () => AnalyticsService.getEmployeeDashboard(1, 'tA'),
        team: () => AnalyticsService.getTeamEmployees(1, 'tA'),
        profile: () => AnalyticsService.getEmployeeProfile('A1', 'tA'),
        admin: () => AnalyticsService.getAdminDashboard('tA'),
    };
    for (const [name, run] of Object.entries(exercise)) {
        it(`${name}: all statements pass the tenant and mention tenant_id`, async () => {
            await run();
            expect(W.sql.length).toBeGreaterThan(0);
            for (const s of W.sql) {
                expect(s.params, s.sql.slice(0, 90)).toContain('tA');
                expect(s.sql, s.sql.slice(0, 90)).toMatch(/tenant_id/);
            }
        });
    }
});

describe('HF-6 no hard-wired tenant fallbacks on the request path', () => {
    it('employee routes and controller do not substitute a default tenant for a missing one', async () => {
        const { readFileSync } = await import('node:fs');
        for (const f of ['employees.routes.ts', 'employees.controller.ts']) {
            const src = readFileSync(`src/modules/employees/${f}`, 'utf8');
            expect(src, f).not.toMatch(/tenantId\s*\|\|\s*'(tenant_default|default)'/);
        }
    });
});
