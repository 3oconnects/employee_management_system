import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

// Role members: who holds a role, and who could be added. Real: JWT, route guards, controller, service,
// the role-visibility policy. Fake: repositories (record the arguments the real service passes).

type Row = Record<string, any>;
const W = vi.hoisted(() => ({
    roles: [
        { id: 2, tenant_id: 'tA', name: 'manager', dashboard_type: 'manager', is_system: true, permissions: [] },
        { id: 4, tenant_id: 'tenant_default', name: 'employee', dashboard_type: 'employee', is_system: true, permissions: [] },
        { id: 7, tenant_id: 'tB', name: 'b_role', dashboard_type: 'employee', is_system: false, permissions: [] },
    ] as Row[],
    calls: [] as { tenantId: string; roleId: number; inRole: boolean; search: string | null; limit: number; offset: number }[],
}));

vi.mock('../../src/core/security/authzState.repository', () => ({
    SHARED_TEMPLATE_TENANTS: ['tenant_default', 'default'],
    AuthzStateRepository: class {
        async findVisibleRoleById(id: number, tenant: string) { return W.roles.find((r) => r.id === id && (r.tenant_id === tenant || ['tenant_default', 'default'].includes(r.tenant_id))) ?? null; }
        async findVisibleRoleByName() { return null; }
        async findUserAuthz() { return null; }
        async findUserAuthzByEmail() { return null; }
        async existingPermissions() { return new Set(); }
    },
}));
vi.mock('../../src/modules/settings/rbac/rbac.repository', () => ({
    RBACRepository: class {
        async findRoleMembers(tenantId: string, roleId: number, inRole: boolean, search: string | null, limit: number, offset: number) {
            W.calls.push({ tenantId, roleId, inRole, search, limit, offset });
            return { items: [{ id: 1, name: 'Al', email: 'al@a.test', is_active: true, department: 'Finance' }], total: 1 };
        }
        async getPermissions() { return []; }
        async getRoles() { return []; }
    },
}));
vi.mock('../../src/modules/settings/user-assignments/user-assignments.repository', () => ({ UserAssignmentsRepository: class {} }));
vi.mock('../../src/config/db', () => ({ pool: { query: async () => ({ rows: [] }) }, directPool: {}, query: async () => ({ rows: [] }) }));
vi.mock('../../src/services/emailService', () => ({ sendEmail: vi.fn(), buildWelcomeEmail: vi.fn(), buildRoleAssignmentEmail: vi.fn() }));
vi.mock('../../src/services/notificationService', () => ({ NotificationService: {} }));
vi.mock('../../src/modules/workspace/workspace.service', () => ({ getOrganizationName: vi.fn() }));

import settingsRouter from '../../src/modules/settings';
import { globalErrorHandler } from '../../src/core/errors/errorHandler';
import { JwtService } from '../../src/core/security/jwt.service';

const app = express();
app.use(express.json());
app.use('/api/v1/settings', settingsRouter);
app.use(globalErrorHandler);

type Who = { id: number; tenant: string; role: string; perms: string[] };
const assigner: Who = { id: 1, tenant: 'tA', role: 'custom', perms: ['roles:assign', 'settings:manage'] };
const roleManager: Who = { id: 2, tenant: 'tA', role: 'custom', perms: ['roles:manage', 'settings:manage'] };
const userManager: Who = { id: 3, tenant: 'tA', role: 'custom', perms: ['users:manage', 'settings:manage'] };
const legacyManager: Who = { id: 4, tenant: 'tA', role: 'manager', perms: ['employees:view', 'leave:approve'] }; // passes the legacy settings guard only
const otherTenant: Who = { id: 9, tenant: 'tB', role: 'custom', perms: ['roles:assign', 'settings:manage'] };

const bearer = (w: Who) => 'Bearer ' + JwtService.generateAccessToken({ userId: w.id, email: `u${w.id}@x.test`, tenantId: w.tenant, role: w.role as any, permissions: w.perms } as any);
const get = (url: string, w: Who | null) => {
    const r = request(app).get(`/api/v1/settings${url}`);
    return w ? r.set('Authorization', bearer(w)) : r;
};

beforeEach(() => { W.calls = []; });

describe('GET /settings/roles/:id/members', () => {
    it('lists the members for anyone who administers roles or users', async () => {
        for (const w of [assigner, roleManager, userManager]) {
            const r = await get('/roles/2/members', w);
            expect(r.status, String(w.perms)).toBe(200);
            expect(r.body.items[0].name).toBe('Al');
        }
    });

    it('is refused without a token, and to a user who only passes the legacy settings guard (e.g. a Manager)', async () => {
        expect((await get('/roles/2/members', null)).status).toBe(401);
        expect((await get('/roles/2/members', legacyManager)).status).toBe(403);
        expect(W.calls).toEqual([]);
    });

    it('asks for the CALLER\'s tenant only; a tenant in the query string is ignored', async () => {
        await get('/roles/2/members?tenantId=tB&tenant_id=tB&search=al', assigner);
        expect(W.calls[0].tenantId).toBe('tA');
        expect(W.calls[0]).toMatchObject({ roleId: 2, inRole: true, search: 'al' });
    });

    it('a shared template role is allowed, but still only this tenant\'s people are requested', async () => {
        expect((await get('/roles/4/members', assigner)).status).toBe(200);
        expect(W.calls[0].tenantId).toBe('tA');
    });

    it('another tenant\'s role, an unknown role and a malformed id never reach the data layer', async () => {
        expect((await get('/roles/7/members', assigner)).status).toBe(404);
        expect((await get('/roles/999/members', assigner)).status).toBe(404);
        expect((await get('/roles/abc/members', assigner)).status).toBe(400);
        expect((await get('/roles/0/members', assigner)).status).toBe(400);
        expect(W.calls).toEqual([]);
    });

    it('the other tenant cannot list tenant A\'s role either', async () => {
        expect((await get('/roles/2/members', otherTenant)).status).toBe(404);
    });

    it('search is escaped (LIKE wildcards and the escape character are literal), trimmed and capped', async () => {
        await get('/roles/2/members?search=' + encodeURIComponent('  50%_off\\x  '), assigner);
        expect(W.calls[0].search).toBe('50\\%\\_off\\\\x');
        W.calls = [];
        await get('/roles/2/members?search=' + 'a'.repeat(500), assigner);
        expect(W.calls[0].search!.length).toBe(100);
        W.calls = [];
        await get('/roles/2/members?search=%20%20', assigner);
        expect(W.calls[0].search).toBeNull();
    });

    it('limit and offset are clamped to sane values', async () => {
        await get('/roles/2/members?limit=100000&offset=-5', assigner);
        expect(W.calls[0]).toMatchObject({ limit: 50, offset: 0 });
        W.calls = [];
        await get('/roles/2/members?limit=abc&offset=xyz', assigner);
        expect(W.calls[0]).toMatchObject({ limit: 25, offset: 0 });
    });
});

describe('GET /settings/roles/:id/candidates (people who could be added)', () => {
    it('needs roles:assign: a user or role manager without it is refused', async () => {
        expect((await get('/roles/2/candidates', assigner)).status).toBe(200);
        expect((await get('/roles/2/candidates', roleManager)).status).toBe(403);
        expect((await get('/roles/2/candidates', userManager)).status).toBe(403);
        expect((await get('/roles/2/candidates', legacyManager)).status).toBe(403);
    });

    it('asks for people who are NOT in the role, in the caller\'s tenant, at most 20 at a time', async () => {
        await get('/roles/2/candidates?limit=500&tenantId=tB', assigner);
        expect(W.calls[0]).toMatchObject({ tenantId: 'tA', roleId: 2, inRole: false, limit: 20 });
    });

    it('another tenant\'s role is not found', async () => {
        expect((await get('/roles/7/candidates', assigner)).status).toBe(404);
        expect(W.calls).toEqual([]);
    });
});

describe('the role list counts people of the caller\'s tenant only', () => {
    it('the query joins users on the tenant and ignores removed accounts', async () => {
        const { readFileSync } = await import('node:fs');
        const sql = readFileSync('src/modules/settings/rbac/rbac.repository.ts', 'utf8');
        expect(sql).toMatch(/LEFT JOIN users u ON u\.role_id = r\.id AND u\.tenant_id = \$1 AND u\.deleted_at IS NULL/);
    });
});
