import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

// HF-6B: the "limited data mode" fallbacks of Settings → Users and Settings → Roles must stay inside
// the caller's tenant. The primary queries are made to fail so the fallback runs.
//
// Real: JWT, the real settings router, controllers, services, repositories and their SQL text.
// Fake: the pool. A statement WITHOUT a tenant predicate returns every tenant's rows, exactly like the
// real database would; a statement WITH one is filtered by its first parameter.

type Row = Record<string, any>;
const W = vi.hoisted(() => ({
    users: [
        { id: 1, tenant_id: 'tA', name: 'Ann (A)', email: 'ann@a.test', role: 'admin' },
        { id: 2, tenant_id: 'tA', name: 'Al (A)', email: 'al@a.test', role: 'employee' },
        { id: 3, tenant_id: 'tB', name: 'Bob (B)', email: 'bob@b.test', role: 'admin' },
        { id: 4, tenant_id: 'tB', name: 'Bea (B)', email: 'bea@b.test', role: 'employee' },
    ] as Row[],
    roles: [
        { id: 10, tenant_id: 'tA', name: 'A-Payroll-Lead' },
        { id: 11, tenant_id: 'tB', name: 'B-Secret-Role' },
        { id: 12, tenant_id: 'tenant_default', name: 'Shared Employee' },
        { id: 13, tenant_id: null, name: 'Shared Manager' },
    ] as Row[],
    sql: [] as { sql: string; params: any[] }[],
}));

const norm = (s: string) => s.replace(/\s+/g, ' ').trim();

vi.mock('../../src/config/db', () => {
    const query = async (sql: string, p: any[] = []) => {
        const q = norm(sql);
        W.sql.push({ sql: q, params: p });
        // primary queries fail → fallbacks run
        if (q.startsWith('SELECT e.id as employee_id')) throw new Error('boom: users primary');
        if (q.startsWith('SELECT r.id, r.name, r.description')) throw new Error('boom: roles primary');
        if (q.startsWith('SELECT id, name, email, role FROM users')) {
            const scoped = /tenant_id\s*=\s*\$1/.test(q);
            return { rows: W.users.filter((u) => !scoped || u.tenant_id === p[0]).map(({ tenant_id, ...r }) => r) };
        }
        if (q.startsWith('SELECT id, name FROM roles')) {
            const scoped = /tenant_id\s*=\s*\$1/.test(q);
            const shared = /tenant_id = 'tenant_default'/.test(q) && /tenant_id IS NULL/.test(q);
            return {
                rows: W.roles
                    .filter((r) => !scoped || r.tenant_id === p[0] || (shared && (r.tenant_id === 'tenant_default' || r.tenant_id === null)))
                    .map(({ tenant_id, ...r }) => r),
            };
        }
        return { rows: [] };
    };
    return { pool: { query, connect: async () => ({ query, release() {} }) }, directPool: {}, query };
});

import settingsRouter from '../../src/modules/settings';
import { globalErrorHandler } from '../../src/core/errors/errorHandler';
import { JwtService } from '../../src/core/security/jwt.service';

const app = express();
app.use(express.json());
app.use('/api/v1/settings', settingsRouter);
app.use(globalErrorHandler);

const bearer = (tenant: string) =>
    'Bearer ' + JwtService.generateAccessToken({ userId: 99, email: `root@${tenant}.test`, tenantId: tenant, role: 'admin', dashboard_type: 'admin', permissions: [] } as any);
const get = (url: string, tenant: string) => request(app).get(`/api/v1/settings${url}`).set('Authorization', bearer(tenant));

beforeEach(() => { W.sql.length = 0; });

describe('HF-6B Settings → Users fallback is tenant-scoped', () => {
    it('limited-data mode is reached and shows only the caller tenant', async () => {
        const r = await get('/users', 'tA');
        expect(r.status).toBe(200);
        expect(r.body.warning).toBe('Limited data mode');
        expect(r.body.data.map((u: Row) => u.email).sort()).toEqual(['al@a.test', 'ann@a.test']);
        expect(JSON.stringify(r.body)).not.toMatch(/bob@b\.test|bea@b\.test|Bob|Bea/);
    });

    it('the other tenant sees only its own users', async () => {
        const r = await get('/users', 'tB');
        expect(r.body.data.map((u: Row) => u.email).sort()).toEqual(['bea@b.test', 'bob@b.test']);
        expect(JSON.stringify(r.body)).not.toMatch(/ann@a\.test|al@a\.test/);
    });

    it('an unknown tenant sees nothing', async () => {
        const r = await get('/users', 'tZ');
        expect(r.body.data).toEqual([]);
    });

    it('the fallback statement carries the tenant as a bound parameter', async () => {
        await get('/users', 'tA');
        const fb = W.sql.find((s) => s.sql.startsWith('SELECT id, name, email, role FROM users'));
        expect(fb, 'fallback ran').toBeDefined();
        expect(fb!.sql).toMatch(/WHERE tenant_id = \$1/);
        expect(fb!.params).toEqual(['tA']);
    });
});

describe('HF-6B Settings → Roles fallback is tenant-scoped', () => {
    it("shows the caller's roles and the shared templates, never another tenant's", async () => {
        const r = await get('/roles', 'tA');
        expect(r.status).toBe(200);
        expect(r.body.data.map((x: Row) => x.name).sort()).toEqual(['A-Payroll-Lead', 'Shared Employee', 'Shared Manager']);
        expect(JSON.stringify(r.body)).not.toContain('B-Secret-Role');
    });

    it('the other tenant likewise', async () => {
        const r = await get('/roles', 'tB');
        expect(r.body.data.map((x: Row) => x.name).sort()).toEqual(['B-Secret-Role', 'Shared Employee', 'Shared Manager']);
        expect(JSON.stringify(r.body)).not.toContain('A-Payroll-Lead');
    });

    it('the fallback statement carries the tenant as a bound parameter', async () => {
        await get('/roles', 'tA');
        const fb = W.sql.find((s) => s.sql.startsWith('SELECT id, name FROM roles'));
        expect(fb, 'fallback ran').toBeDefined();
        expect(fb!.params).toEqual(['tA']);
    });
});
