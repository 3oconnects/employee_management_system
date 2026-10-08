import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

// HF-10: nobody can escalate authorization state.
//   M-01 role create · M-02 role update (dashboard_type) · M-03 permission grants · M-04 role delete
//   M-05 settings user create · M-06 settings user role · M-07 password/reset · M-08 status/delete
//   M-09 employee create + bulk upload · M-10 employee update (role, login e-mail)
//
// Real: JWT, route guards, controllers, services, the shared policy (core/security/authzState).
// Fake: repositories (in-memory, mirroring the tenant-strict SQL), the transaction wrapper, mail.

type Row = Record<string, any>;
const ALL_PERMS = [
    'employees:view', 'employees:create', 'employees:update', 'employees:manage', 'leave:approve', 'leave:view', 'payroll:run', 'payroll:manage',
    'reports:view', 'attendance:view', 'attendance:manage', 'timesheet:approve', 'settings:manage',
    'roles:assign', 'roles:manage', 'permissions:grant', 'users:manage',
];
const W = vi.hoisted(() => ({
    roles: [] as Row[],
    rolePerms: {} as Record<number, string[]>,
    users: [] as Row[],
    employees: [] as Row[],
    perms: [] as string[],
    writes: [] as string[],
    race: false,
    nextId: 100,
}));

const SHARED = ['tenant_default', 'default'];
const visible = (r: Row, tenant: string) => r.tenant_id === tenant || SHARED.includes(r.tenant_id) || r.tenant_id === null;
const withPerms = (r: Row) => ({ ...r, is_system: !!r.is_system, permissions: [...(W.rolePerms[r.id] || [])] });
const userAuthz = (u: Row) => {
    const rid = u.role_id ?? 4;
    const r = W.roles.find((x) => x.id === rid);
    return { id: u.id, tenant_id: u.tenant_id, role_id: rid, role_name: r?.name ?? null, dashboard_type: r?.dashboard_type ?? null, permissions: [...(W.rolePerms[rid] || [])] };
};

vi.mock('../../src/core/security/authzState.repository', () => ({
    SHARED_TEMPLATE_TENANTS: ['tenant_default', 'default'],
    AuthzStateRepository: class {
        async findVisibleRoleById(id: number, tenant: string) { const r = W.roles.find((x) => x.id === id && visible(x, tenant)); return r ? withPerms(r) : null; }
        async findVisibleRoleByName(name: string, tenant: string) {
            const c = W.roles.filter((x) => x.name.toLowerCase() === name.trim().toLowerCase() && visible(x, tenant)).sort((a, b) => Number(b.tenant_id === tenant) - Number(a.tenant_id === tenant));
            return c[0] ? withPerms(c[0]) : null;
        }
        async findUserAuthz(id: number, tenant: string) { const u = W.users.find((x) => x.id === id && x.tenant_id === tenant && !x.deleted_at); return u ? userAuthz(u) : null; }
        async findUserAuthzByEmail(email: string, tenant: string) { const u = W.users.find((x) => x.email.toLowerCase() === email.trim().toLowerCase() && x.tenant_id === tenant); return u ? userAuthz(u) : null; }
        async existingPermissions(keys: string[]) { return new Set(keys.filter((k) => W.perms.includes(k))); }
    },
}));

vi.mock('../../src/modules/settings/rbac/rbac.repository', () => ({
    RBACRepository: class {
        async getPermissions() { return []; }
        async getRoles() { return []; }
        async getRolesFallback() { return []; }
        async getRolePermissions() { return []; }
        async createRole(tenant: string, name: string, description: string | null, dashboard_type: string) {
            const r = { id: W.nextId++, tenant_id: tenant, name: name.trim(), description, dashboard_type, is_system: false };
            W.roles.push(r); W.rolePerms[r.id] = []; W.writes.push(`role.create:${r.id}`); return { ...r };
        }
        async getPermissionId(m: string, a: string) { return W.perms.includes(`${m}:${a}`) ? `${m}:${a}` : null; }
        async addRolePermission(roleId: number, key: string) { (W.rolePerms[roleId] ||= []).push(key); W.writes.push(`perm.add:${roleId}:${key}`); }
        async updateRole(id: string, tenant: string, name: string | null, description: string | null, dashboard_type: string | null) {
            const r = W.roles.find((x) => String(x.id) === String(id) && x.tenant_id === tenant);
            if (!r) return undefined;
            if (!r.is_system && name) r.name = name;
            if (dashboard_type) r.dashboard_type = dashboard_type;
            W.writes.push(`role.update:${id}`); return { ...r };
        }
        async deleteRole(id: string, tenant: string) {
            const i = W.roles.findIndex((x) => String(x.id) === String(id) && x.tenant_id === tenant && !x.is_system);
            if (i < 0) return { deleted: false };
            W.roles.splice(i, 1); W.writes.push(`role.delete:${id}`); return { deleted: true };
        }
        async checkRoleExists(id: string, tenant: string) { return W.roles.some((x) => String(x.id) === String(id) && x.tenant_id === tenant); }
        async clearRolePermissions(id: string) { W.rolePerms[Number(id)] = []; W.writes.push(`perm.clear:${id}`); }
    },
}));

vi.mock('../../src/modules/settings/user-assignments/user-assignments.repository', () => ({
    UserAssignmentsRepository: class {
        async getUsers() { return []; }
        async getUsersFallback() { return []; }
        async checkEmailExists(email: string) { return W.users.some((u) => u.email.toLowerCase() === email.toLowerCase()); }
        async getRoleIdByName() { return null; }
        async createUser(tenant: string, data: Row, _h: string, _f: string | null, _a: boolean, roleId: number) {
            const u = { id: W.nextId++, tenant_id: tenant, name: data.name, email: data.email, role: data.role, role_id: roleId, is_active: true };
            W.users.push(u); W.writes.push(`user.create:${u.id}`); return { id: u.id, name: u.name, email: u.email, role: u.role, is_active: true };
        }
        async getUser(id: string, tenant: string) { const u = W.users.find((x) => String(x.id) === String(id) && x.tenant_id === tenant); return u ? { ...u } : undefined; }
        async updatePassword(id: string, tenant: string) { const u = W.users.find((x) => String(x.id) === String(id) && x.tenant_id === tenant); if (!u) return undefined; W.writes.push(`user.password:${id}`); return { email: u.email, name: u.name }; }
        async updateUserRole(id: string, tenant: string, role: string | null, roleId: number | null) { const u = W.users.find((x) => String(x.id) === String(id) && x.tenant_id === tenant); if (u) { u.role = role ?? u.role; u.role_id = roleId; } W.writes.push(`user.role:${id}:${roleId}`); }
        async updateUserStatus(id: string, tenant: string, active: boolean) { const u = W.users.find((x) => String(x.id) === String(id) && x.tenant_id === tenant); if (u) u.is_active = active; W.writes.push(`user.status:${id}`); }
        async deleteUser(id: string, tenant: string) { const u = W.users.find((x) => String(x.id) === String(id) && x.tenant_id === tenant); if (u) u.deleted_at = 'now'; W.writes.push(`user.delete:${id}`); }
    },
}));

const norm = (s: string) => s.replace(/\s+/g, ' ').trim();
const client = {
    query: async (sql: string, p: any[] = []) => {
        const q = norm(sql);
        if (q.startsWith('SELECT id, name, email, tenant_id FROM employees WHERE LOWER(email) = LOWER($1)')) return { rows: W.employees.filter((e) => e.email?.toLowerCase() === String(p[0]).toLowerCase()) };
        if (q.startsWith('SELECT id, name, email, tenant_id FROM users WHERE LOWER(email) = LOWER($1)')) {
            if (W.race) return { rows: [] };
            return { rows: W.users.filter((u) => u.email.toLowerCase() === String(p[0]).toLowerCase()) };
        }
        if (q.startsWith('SELECT id, name, email, tenant_id FROM employees WHERE LOWER(email) = $1')) return { rows: [] };
        if (q.startsWith('SELECT id, name, email, tenant_id FROM users WHERE LOWER(email) = $1')) return { rows: W.users.filter((u) => u.email.toLowerCase() === String(p[0])) };
        if (q.startsWith("SELECT id FROM employees WHERE id ~")) return { rows: [{ id: 'EMP050' }] };
        if (q.startsWith('SELECT id, tenant_id FROM employees WHERE LOWER(email) = LOWER($1) AND id != $2')) return { rows: W.employees.filter((e) => e.email?.toLowerCase() === String(p[0]).toLowerCase() && e.id !== p[1]) };
        if (q.startsWith('SELECT id FROM users WHERE LOWER(email) = LOWER($1)')) return { rows: W.users.filter((u) => u.email.toLowerCase() === String(p[0]).toLowerCase()) };
        return { rows: [], rowCount: 0 };
    },
};
vi.mock('../../src/config/db', () => ({ pool: { query: async () => ({ rows: [] }), connect: async () => ({ query: client.query, release() {} }) }, directPool: {}, query: async () => ({ rows: [] }) }));
vi.mock('../../src/database/transaction', () => ({ withTransaction: async (cb: (c: unknown) => Promise<unknown>) => cb(client) }));

vi.mock('../../src/modules/employees/employees.repository', () => ({
    EmployeesRepository: class {
        async findMany(tenant: string, opts: Row) { return { items: W.employees.filter((e) => e.tenant_id === tenant && String(e.email).toLowerCase().includes(String(opts.search || '').toLowerCase())), total: 0 }; }
        async createEmployee(_c: unknown, params: any[]) { const row = { id: params[0], name: params[1], email: params[2], tenant_id: params[params.length - 1] }; W.employees.push(row); W.writes.push(`employee.create:${row.id}`); return row; }
        async createUserAccount(_c: unknown, name: string, email: string, _h: string, role: string, tenant: string, _t: boolean, roleId: number) {
            if (W.users.some((u) => u.email.toLowerCase() === email.toLowerCase())) { W.writes.push('user.create-conflict-ignored'); return false; }
            W.users.push({ id: W.nextId++, tenant_id: tenant, name, email, role, role_id: roleId, is_active: true }); W.writes.push(`user.account:${email}:${roleId}`); return true;
        }
        async createPayrollProfile() {}
        async findById(id: string, tenant: string) {
            const e = W.employees.find((x) => x.id === id && (x.tenant_id === tenant || SHARED.includes(x.tenant_id)));
            if (!e) return undefined;
            const u = W.users.find((x) => x.email.toLowerCase() === String(e.email).toLowerCase());
            return { ...e, role: u ? (W.roles.find((r) => r.id === (u.role_id ?? 4))?.name ?? u.role) : 'employee' };
        }
        async updateEmployeeProfile() {}
        async updateUserAvatar() {}
        async updatePayrollProfile() {}
        async updateUserRole(_c: unknown, email: string, roleName: string, roleId: number) { const u = W.users.find((x) => x.email.toLowerCase() === email.toLowerCase()); if (u) { u.role = roleName; u.role_id = roleId; } W.writes.push(`employee.role:${email}:${roleId}`); }
        async updateUserEmail(_c: unknown, newEmail: string, oldEmail: string) { const u = W.users.find((x) => x.email.toLowerCase() === oldEmail.toLowerCase()); if (u) u.email = newEmail; W.writes.push(`employee.email:${oldEmail}->${newEmail}`); }
        async update() {}
    },
}));
vi.mock('../../src/services/emailService', () => ({
    sendEmail: vi.fn().mockResolvedValue(true), buildWelcomeEmail: vi.fn().mockReturnValue('<p/>'), buildRoleAssignmentEmail: vi.fn().mockReturnValue('<p/>'),
    sendCandidateWelcomeAndOffer: vi.fn().mockResolvedValue(true), sendEmployeeActionNotification: vi.fn().mockResolvedValue(true), sendPasswordResetEmail: vi.fn(),
}));
vi.mock('../../src/services/notificationService', () => ({ NotificationService: { onAccountCreated: vi.fn(), onRoleUpdated: vi.fn(), onEmployeeCreated: vi.fn(), onLeaveApplied: vi.fn() } }));
vi.mock('../../src/modules/workspace/workspace.service', () => ({ getOrganizationName: vi.fn().mockResolvedValue('Org') }));
vi.mock('../../src/services/analyticsService', () => ({ AnalyticsService: {} }));

import settingsRouter from '../../src/modules/settings';
import employeesRouter from '../../src/modules/employees/employees.routes';
import { globalErrorHandler } from '../../src/core/errors/errorHandler';
import { JwtService } from '../../src/core/security/jwt.service';
import { assertMayAssignRole, assertMayGrantPermissions, assertMayModifyRole } from '../../src/core/security/authzState';

const app = express();
app.use(express.json());
app.use('/api/v1/settings', settingsRouter);
app.use('/api/v1/employees', employeesRouter);
app.use(globalErrorHandler);

// ── world ──────────────────────────────────────────────────────────────────
const EMP_PERMS = ['attendance:view', 'leave:view'];
const MGR_PERMS = [...EMP_PERMS, 'employees:view', 'leave:approve', 'reports:view', 'attendance:manage', 'timesheet:approve'];
const HR_PERMS = [...MGR_PERMS, 'employees:create', 'employees:update', 'employees:manage', 'roles:assign', 'roles:manage', 'permissions:grant', 'users:manage'];
function seed() {
    W.perms = [...ALL_PERMS]; W.writes = []; W.race = false; W.nextId = 100;
    W.roles = [
        { id: 1, tenant_id: 'tA', name: 'super_admin', dashboard_type: 'admin', is_system: true },
        { id: 2, tenant_id: 'tA', name: 'admin', dashboard_type: 'admin', is_system: true },
        { id: 3, tenant_id: 'tA', name: 'hr', dashboard_type: 'employee', is_system: false },        // ordinary, holds the 4 authz perms
        { id: 4, tenant_id: 'tA', name: 'manager', dashboard_type: 'manager', is_system: true },
        { id: 5, tenant_id: 'tA', name: 'employee', dashboard_type: 'employee', is_system: true },
        { id: 6, tenant_id: 'tA', name: 'power', dashboard_type: 'employee', is_system: false },    // more than hr: payroll:run
        { id: 7, tenant_id: 'tB', name: 'b_role', dashboard_type: 'employee', is_system: false },
        { id: 9, tenant_id: 'tenant_default', name: 'shared_tpl', dashboard_type: 'employee', is_system: true },
        { id: 10, tenant_id: 'tA', name: 'hr', dashboard_type: 'employee', is_system: false },       // no roles:assign
    ];
    W.rolePerms = { 1: [...ALL_PERMS], 2: [...ALL_PERMS], 3: [...HR_PERMS], 4: [...MGR_PERMS], 5: [...EMP_PERMS], 6: [...HR_PERMS, 'payroll:run', 'payroll:manage'], 7: ['leave:view'], 9: ['leave:view'], 10: ['employees:manage', 'employees:create', 'employees:update'] };
    W.users = [
        { id: 1, tenant_id: 'tA', name: 'Root', email: 'root@a.test', role_id: 1 },
        { id: 2, tenant_id: 'tA', name: 'Admin', email: 'adm@a.test', role_id: 2 },
        { id: 3, tenant_id: 'tA', name: 'Hana HR', email: 'hana@a.test', role_id: 3 },
        { id: 4, tenant_id: 'tA', name: 'Mo Manager', email: 'mo@a.test', role_id: 4 },
        { id: 5, tenant_id: 'tA', name: 'Eve Emp', email: 'eve@a.test', role_id: 5 },
        { id: 6, tenant_id: 'tA', name: 'Pat Power', email: 'pat@a.test', role_id: 6 },
        { id: 7, tenant_id: 'tB', name: 'Bob B', email: 'bob@b.test', role_id: 7 },
        { id: 8, tenant_id: 'tA', name: 'Lee Lite', email: 'lee@a.test', role_id: 10 },
        { id: 9, tenant_id: 'tA', name: 'Vic Admin', email: 'vic@a.test', role_id: 2 },
        { id: 20, tenant_id: 'tenant_default', name: 'Dee Default', email: 'dee@d.test', role_id: 5 },
    ];
    W.employees = [
        { id: 'E3', tenant_id: 'tA', email: 'hana@a.test', name: 'Hana HR' }, { id: 'E5', tenant_id: 'tA', email: 'eve@a.test', name: 'Eve Emp' },
        { id: 'E2', tenant_id: 'tA', email: 'adm@a.test', name: 'Admin' }, { id: 'E7', tenant_id: 'tB', email: 'bob@b.test', name: 'Bob B' },
        { id: 'E6', tenant_id: 'tA', email: 'pat@a.test', name: 'Pat Power' }, { id: 'E20', tenant_id: 'tenant_default', email: 'dee@d.test', name: 'Dee Default' },
    ];
}
beforeEach(seed);

type Who = { id: number; email: string; tenant: string; roleId: number };
const who = (userId: number): Who => { const u = W.users.find((x) => x.id === userId)!; return { id: u.id, email: u.email, tenant: u.tenant_id, roleId: u.role_id }; };
const token = (w: Who) => {
    const role = W.roles.find((r) => r.id === w.roleId)!;
    return 'Bearer ' + JwtService.generateAccessToken({ userId: w.id, email: w.email, tenantId: w.tenant, role: role.name as any, dashboard_type: role.dashboard_type as any, permissions: [...(W.rolePerms[w.roleId] || [])] } as any);
};
const call = (base: '/settings' | '/employees', method: 'get' | 'post' | 'put' | 'delete', url: string, w: Who, body?: Row) => {
    const r = (request(app) as any)[method](`/api/v1${base}${url}`).set('Authorization', token(w));
    return body ? r.send(body) : r;
};
const S = (m: 'get' | 'post' | 'put' | 'delete', url: string, w: Who, body?: Row) => call('/settings', m, url, w, body);
const E = (m: 'get' | 'post' | 'put' | 'delete', url: string, w: Who, body?: Row) => call('/employees', m, url, w, body);
const root = () => who(1), adm = () => who(2), hana = () => who(3), mo = () => who(4), eve = () => who(5), pat = () => who(6), lee = () => who(8);
const userRole = (id: number) => W.users.find((u) => u.id === id)!.role_id;
const writesOf = (prefix: string) => W.writes.filter((w) => w.startsWith(prefix));
const body = (name: string, extra: Row = {}) => ({ name, annualCTC: 1, department: 'Eng', joinDate: '2026-01-01', ...extra });

// ── M-01 role create ───────────────────────────────────────────────────────
describe('M-01 POST /settings/roles', () => {
    it('a user without roles:manage is refused at the route, even though the legacy settings guard lets a Manager in', async () => {
        const r = await S('post', '/roles', mo(), { name: 'x', permissions: [] });
        expect(r.status).toBe(403);
        expect(W.writes).toEqual([]);
    });
    it('an authorized actor creates an ordinary role in their own tenant; the body cannot choose the tenant', async () => {
        const r = await S('post', '/roles', hana(), { name: 'Trainer', permissions: ['leave:approve'], tenant_id: 'tB', tenantId: 'tB' });
        expect(r.status).toBe(201);
        expect(W.roles.find((x) => x.name === 'Trainer')!.tenant_id).toBe('tA');
    });
    it('cannot create a role holding permissions the actor lacks', async () => {
        const r = await S('post', '/roles', hana(), { name: 'Bigger', permissions: ['leave:approve', 'payroll:run'] });
        expect(r.status).toBe(403);
        expect(W.roles.some((x) => x.name === 'Bigger')).toBe(false);
    });
    it('cannot create a dashboard_type=admin role (a full bypass) unless the actor is itself unbounded', async () => {
        expect((await S('post', '/roles', hana(), { name: 'Boss', dashboard_type: 'admin', permissions: [] })).status).toBe(403);
        expect((await S('post', '/roles', adm(), { name: 'Boss', dashboard_type: 'admin', permissions: [] })).status).toBe(201);
    });
    it('the reserved name super_admin can never be created, by anyone, in any spelling', async () => {
        for (const n of ['super_admin', 'Super_Admin', '  SUPER_ADMIN ']) {
            expect((await S('post', '/roles', root(), { name: n })).status).toBe(400);
            expect((await S('post', '/roles', hana(), { name: n })).status).toBe(400);
        }
        expect(writesOf('role.create')).toEqual([]);
    });
    it('rejects an unknown permission and an invalid dashboard_type instead of ignoring them', async () => {
        expect((await S('post', '/roles', hana(), { name: 'Q', permissions: ['nope:nothing'] })).status).toBe(400);
        expect((await S('post', '/roles', hana(), { name: 'Q', dashboard_type: 'root' })).status).toBe(400);
    });
});

// ── M-02 role update / dashboard_type ──────────────────────────────────────
describe('M-02 PUT /settings/roles/:id (incl. dashboard_type)', () => {
    it('refuses without roles:manage', async () => { expect((await S('put', '/roles/6', mo(), { description: 'x' })).status).toBe(403); });
    it('a shared template role is read-only: 404 for a tenant that does not own it', async () => {
        expect((await S('put', '/roles/9', hana(), { description: 'x' })).status).toBe(404);
        expect(writesOf('role.update')).toEqual([]);
    });
    it("another tenant's role is 404", async () => { expect((await S('put', '/roles/7', hana(), { description: 'x' })).status).toBe(404); });
    it('promoting a role to dashboard_type=admin is refused for an ordinary actor, allowed for an unbounded one', async () => {
        expect((await S('put', '/roles/5', hana(), { dashboard_type: 'admin' })).status).toBe(403);
        expect(W.roles.find((r) => r.id === 5)!.dashboard_type).toBe('employee');
        expect((await S('put', '/roles/5', adm(), { dashboard_type: 'admin' })).status).toBe(200);
    });
    it('an ordinary actor cannot DEMOTE a bypass role either (removing the bypass is as powerful as granting it)', async () => {
        expect((await S('put', '/roles/2', hana(), { dashboard_type: 'employee' })).status).toBe(403);
    });
    it('cannot touch a role that holds more than the actor does (even the description)', async () => {
        expect((await S('put', '/roles/6', hana(), { description: 'x' })).status).toBe(403);
        expect((await S('put', '/roles/2', hana(), { description: 'x' })).status).toBe(403);
    });
    it('only a super admin may modify the super_admin role', async () => {
        expect((await S('put', '/roles/1', adm(), { description: 'x' })).status).toBe(403);
        expect((await S('put', '/roles/1', root(), { description: 'x' })).status).toBe(200);
    });
    it('cannot rename a role to the reserved name', async () => { expect((await S('put', '/roles/3', root(), { name: 'super_admin' })).status).toBe(400); });
    it('an invalid dashboard_type is rejected', async () => { expect((await S('put', '/roles/5', adm(), { dashboard_type: 'god' })).status).toBe(400); });
});

// ── M-03 permission grants ─────────────────────────────────────────────────
describe('M-03 PUT /settings/roles/:id/permissions', () => {
    it('refuses without permissions:grant', async () => { expect((await S('put', '/roles/5/permissions', mo(), { permissions: ['leave:view'] })).status).toBe(403); });
    it('grants only permissions the actor holds', async () => {
        expect((await S('put', '/roles/5/permissions', hana(), { permissions: ['attendance:view', 'leave:approve'] })).status).toBe(200);
        expect(W.rolePerms[5].sort()).toEqual(['attendance:view', 'leave:approve']);
    });
    it('cannot grant a permission the actor lacks (payroll:run) — nothing changes', async () => {
        const before = [...W.rolePerms[5]];
        expect((await S('put', '/roles/5/permissions', hana(), { permissions: ['leave:view', 'payroll:run'] })).status).toBe(403);
        expect(W.rolePerms[5]).toEqual(before);
        expect(writesOf('perm.')).toEqual([]);
    });
    it('cannot grant the authorization-state permissions themselves unless it holds them', async () => {
        expect((await S('put', '/roles/5/permissions', lee(), { permissions: ['roles:assign'] })).status).toBe(403); // lee: no permissions:grant at all
        const noAssign = { ...hana(), roleId: 10 }; // a role with permissions:grant but not roles:assign would be refused too
        W.rolePerms[10] = ['permissions:grant', 'settings:manage'];
        expect((await S('put', '/roles/5/permissions', noAssign, { permissions: ['roles:assign'] })).status).toBe(403);
    });
    it('cannot rewrite a role stronger than the actor (stripping or adding)', async () => {
        expect((await S('put', '/roles/2/permissions', hana(), { permissions: [] })).status).toBe(403);
        expect((await S('put', '/roles/6/permissions', hana(), { permissions: ['leave:view'] })).status).toBe(403);
    });
    it('shared template and other-tenant roles are 404; unknown permissions are 400', async () => {
        expect((await S('put', '/roles/9/permissions', hana(), { permissions: ['leave:view'] })).status).toBe(404);
        expect((await S('put', '/roles/7/permissions', hana(), { permissions: ['leave:view'] })).status).toBe(404);
        expect((await S('put', '/roles/5/permissions', hana(), { permissions: ['bogus:perm'] })).status).toBe(400);
    });
    it('an unbounded actor may grant any existing permission', async () => {
        expect((await S('put', '/roles/5/permissions', adm(), { permissions: ['payroll:run'] })).status).toBe(200);
    });
});

// ── M-04 role delete ───────────────────────────────────────────────────────
describe('M-04 DELETE /settings/roles/:id', () => {
    it('needs roles:manage and the role must be the tenant\'s own and covered', async () => {
        expect((await S('delete', '/roles/6', mo())).status).toBe(403);
        expect((await S('delete', '/roles/6', hana())).status).toBe(403);   // power > hr
        expect((await S('delete', '/roles/9', hana())).status).toBe(404);   // shared template
        expect((await S('delete', '/roles/7', hana())).status).toBe(404);   // other tenant
        expect(writesOf('role.delete')).toEqual([]);
    });
});

// ── M-05 settings user create ──────────────────────────────────────────────
describe('M-05 POST /settings/users', () => {
    const create = (w: Who, extra: Row) => S('post', '/users', w, { name: 'New', email: `n${Math.random().toString(36).slice(2, 7)}@a.test`, ...extra });
    it('refused without users:manage (route), even for a legacy-guard passer', async () => { expect((await create(mo(), {})).status).toBe(403); });
    it('no role named → the baseline role, resolved by the server', async () => {
        const r = await create(hana(), {});
        expect(r.status).toBe(201);
        expect(W.users.find((u) => u.id === r.body.data.id)!.role_id).toBe(5);
    });
    it('role_id substitution: a role id from ANOTHER tenant is not found; a shared template needs the same grant rules', async () => {
        expect((await create(hana(), { role_id: 7 })).status).toBe(404);
        expect((await create(hana(), { role_id: 9 })).status).toBe(201);
        expect((await create(hana(), { role_id: 999 })).status).toBe(404);
    });
    it('cannot create an account holding a role stronger than the actor (admin, power) or the super_admin role', async () => {
        for (const role_id of [2, 6]) expect((await create(hana(), { role_id })).status).toBe(403);
        expect((await create(adm(), { role_id: 1 })).status).toBe(403);   // only a super admin may grant super_admin
        expect((await create(root(), { role_id: 1 })).status).toBe(201);
    });
    it('the client\'s role STRING can neither override role_id nor smuggle a name: the stored role is the resolved record', async () => {
        const r = await create(hana(), { role_id: 5, role: 'super_admin' });
        expect(r.status).toBe(201);
        const u = W.users.find((x) => x.id === r.body.data.id)!;
        expect([u.role, u.role_id]).toEqual(['employee', 5]);
        expect((await create(hana(), { role: 'super_admin' })).status).toBe(403);
        expect((await create(hana(), { role: 'admin' })).status).toBe(403);
    });
    it('needs roles:assign for any role other than the baseline', async () => {
        const noAssign = { ...hana(), roleId: 10 }; W.rolePerms[10] = ['users:manage', 'settings:manage'];
        expect((await create(noAssign, { role_id: 4 })).status).toBe(403);   // manager
        expect((await create(noAssign, { role_id: 5 })).status).toBe(201);   // the baseline, named
        expect((await create(noAssign, {})).status).toBe(201);               // the baseline, implied
    });
    it('the baseline does not require the actor to hold each baseline permission, unless the baseline became a bypass role', async () => {
        const narrow = { ...hana(), roleId: 10 }; W.rolePerms[10] = ['users:manage', 'settings:manage'];       // holds none of attendance:view / leave:view
        expect((await create(narrow, {})).status).toBe(201);
        W.roles.find((r) => r.id === 5)!.dashboard_type = 'admin';                            // baseline tampered into a bypass role
        expect((await create(narrow, {})).status).toBe(403);
    });
});

// ── M-06 settings user role ────────────────────────────────────────────────
describe('M-06 PUT /settings/users/:id/role', () => {
    it('refused without roles:assign (route)', async () => { expect((await S('put', '/users/5/role', mo(), { role_id: 5 })).status).toBe(403); });
    it('self-assignment is refused, including a no-op and a demotion', async () => {
        expect((await S('put', '/users/3/role', hana(), { role_id: 6 })).status).toBe(403);
        expect((await S('put', '/users/3/role', hana(), { role_id: 5 })).status).toBe(403);
        expect(userRole(3)).toBe(3);
    });
    it('cannot give anyone a role stronger than the actor, or super_admin', async () => {
        expect((await S('put', '/users/5/role', hana(), { role_id: 6 })).status).toBe(403);
        expect((await S('put', '/users/5/role', hana(), { role_id: 2 })).status).toBe(403);
        expect((await S('put', '/users/5/role', adm(), { role_id: 1 })).status).toBe(403);
        expect(userRole(5)).toBe(5);
    });
    it('cannot re-role a target who outranks the actor (admin, super_admin, power)', async () => {
        for (const id of [9, 1, 6]) expect((await S('put', `/users/${id}/role`, hana(), { role_id: 5 })).status).toBe(403);
        expect(userRole(9)).toBe(2);
    });
    it('role / role_id substitution: other tenant 404, unknown 404, nothing given 400, name-only lookup cannot cross tenants', async () => {
        expect((await S('put', '/users/5/role', hana(), { role_id: 7 })).status).toBe(404);
        expect((await S('put', '/users/5/role', hana(), { role_id: 12345 })).status).toBe(404);
        expect((await S('put', '/users/5/role', hana(), {})).status).toBe(400);
        expect((await S('put', '/users/5/role', hana(), { role: 'b_role' })).status).toBe(404);
        expect((await S('put', '/users/5/role', hana(), { role_id: 'abc' })).status).toBe(400);
        expect(userRole(5)).toBe(5);
    });
    it("a user of another tenant is 404 (cross-tenant)", async () => { expect((await S('put', '/users/7/role', hana(), { role_id: 5 })).status).toBe(404); });
    it('legitimate: an authorized actor re-roles a lower user to a role it covers', async () => {
        expect((await S('put', '/users/5/role', hana(), { role_id: 4 })).status).toBe(200);
        expect(userRole(5)).toBe(4);
    });
    it('an unbounded actor can promote to admin; only a super admin can assign super_admin', async () => {
        expect((await S('put', '/users/5/role', adm(), { role_id: 2 })).status).toBe(200);
        expect((await S('put', '/users/4/role', adm(), { role_id: 1 })).status).toBe(403);
        expect((await S('put', '/users/4/role', root(), { role_id: 1 })).status).toBe(200);
    });
});

// ── M-07 password / reset ──────────────────────────────────────────────────
describe('M-07 password management', () => {
    const attempts = (w: Who, id: number) => [
        S('put', `/users/${id}/password`, w, { password: 'Newpassw0rd!x' }),
        S('post', `/users/${id}/reset-password`, w, {}),
        S('post', `/users/${id}/send-welcome`, w, { temp_password: 'Temp0rary!pw' }),
    ];
    it('refused without users:manage (route)', async () => { for (const p of attempts(mo(), 5)) expect((await p).status).toBe(403); });
    it('cannot take over a more powerful account: admin, super_admin, power', async () => {
        for (const id of [9, 1, 6]) for (const p of attempts(hana(), id)) expect((await p).status).toBe(403);
        expect(writesOf('user.password')).toEqual([]);
    });
    it('another tenant\'s user is 404', async () => { for (const p of attempts(hana(), 7)) expect((await p).status).toBe(404); });
    it('legitimate: a lower user\'s password can be reset; one\'s own too', async () => {
        for (const p of attempts(hana(), 5)) expect((await p).status).toBe(200);
        expect((await S('put', '/users/3/password', hana(), { password: 'Newpassw0rd!x' })).status).toBe(200);
    });
    it('an unbounded actor can reset ordinary users but only a super admin touches a super admin', async () => {
        expect((await S('post', '/users/5/reset-password', adm(), {})).status).toBe(200);
        expect((await S('post', '/users/1/reset-password', adm(), {})).status).toBe(403);
        expect((await S('post', '/users/1/reset-password', root(), {})).status).toBe(200);
    });
});

// ── M-08 status / delete ───────────────────────────────────────────────────
describe('M-08 status and delete', () => {
    it('route gate; cannot deactivate or delete a more powerful account; not your own status', async () => {
        expect((await S('put', '/users/5/status', mo(), { is_active: false })).status).toBe(403);
        expect((await S('delete', '/users/5', mo())).status).toBe(403);
        for (const id of [9, 1, 6]) {
            expect((await S('put', `/users/${id}/status`, hana(), { is_active: false })).status).toBe(403);
            expect((await S('delete', `/users/${id}`, hana())).status).toBe(403);
        }
        expect((await S('put', '/users/3/status', hana(), { is_active: false })).status).toBe(403);
        expect((await S('delete', '/users/3', hana())).status).toBe(400);
        expect(writesOf('user.status').concat(writesOf('user.delete'))).toEqual([]);
    });
    it('legitimate: a lower user can be deactivated and removed; another tenant is 404', async () => {
        expect((await S('put', '/users/5/status', hana(), { is_active: false })).status).toBe(200);
        expect((await S('delete', '/users/5', hana())).status).toBe(200);
        expect((await S('put', '/users/7/status', hana(), { is_active: false })).status).toBe(404);
    });
});

// ── M-09 employee create / bulk upload ─────────────────────────────────────
describe('M-09 POST /employees and /employees/bulk-upload', () => {
    it('baseline role is used when none is sent; sending the baseline needs no roles:assign (the UI always sends it)', async () => {
        const r = await E('post', '/', lee(), body('Zed', { email: 'zed@a.test', role: 'employee' }));
        expect(r.status).toBe(201);
        expect(W.users.find((u) => u.email === 'zed@a.test')!.role_id).toBe(5);
        expect((await E('post', '/', lee(), body('Yan', { email: 'yan@a.test' }))).status).toBe(201);
    });
    it('a baseline role tampered into a bypass role is no longer handed out by an actor that does not cover it', async () => {
        W.roles.find((r) => r.id === 5)!.dashboard_type = 'admin';
        expect((await E('post', '/', lee(), body('T', { email: 't@a.test' }))).status).toBe(403);
    });
    it('cannot create a login with a role the actor cannot grant: admin, super_admin, a stronger custom role', async () => {
        for (const role of ['admin', 'super_admin', 'power', 'manager']) {
            const r = await E('post', '/', lee(), body('Bad', { email: `${role}@a.test`, role }));
            expect(r.status, role).toBe(403);
        }
        expect((await E('post', '/', hana(), body('Bad', { email: 'x1@a.test', role: 'admin' }))).status).toBe(403);
        expect((await E('post', '/', hana(), body('Bad', { email: 'x2@a.test', role: 'super_admin' }))).status).toBe(403);
        expect(W.users.some((u) => /^(admin|super_admin|power|manager|x1|x2)@a\.test$/.test(u.email))).toBe(false);
        expect(writesOf('employee.create')).toEqual([]);
    });
    it('an authorized actor may grant a role it covers (roles:assign)', async () => {
        expect((await E('post', '/', hana(), body('Ok', { email: 'ok@a.test', role: 'manager' }))).status).toBe(201);
        expect(W.users.find((u) => u.email === 'ok@a.test')!.role_id).toBe(4);
    });
    it('NEVER creates a role: an unknown role name is refused and no role row appears', async () => {
        const before = W.roles.length;
        const r = await E('post', '/', hana(), body('Ghost', { email: 'ghost@a.test', role: 'Brand New Role' }));
        expect(r.status).toBe(404);
        expect(W.roles.length).toBe(before);
        expect(W.users.some((u) => u.email === 'ghost@a.test')).toBe(false);
    });
    it('another tenant\'s role name is not resolvable', async () => { expect((await E('post', '/', hana(), body('B', { email: 'b@a.test', role: 'b_role' }))).status).toBe(404); });
    it('cross-tenant e-mail collision (login account): safe conflict, no names/ids, the existing account is untouched', async () => {
        const before = JSON.stringify(W.users.find((u) => u.id === 7));
        const r = await E('post', '/', hana(), body('Imposter', { email: 'bob@b.test', personalEmail: 'attacker@evil.test', role: 'manager' }));
        expect(r.status).toBe(409);
        expect(JSON.stringify(r.body)).not.toMatch(/Bob|E7|tB|b_role/);
        expect(r.body.message).toBe('Email is already in use.');
        expect(JSON.stringify(W.users.find((u) => u.id === 7))).toBe(before);
        expect(writesOf('user.')).toEqual([]);
    });
    it('cross-tenant collision with another tenant\'s EMPLOYEE record reveals nothing either', async () => {
        W.users = W.users.filter((u) => u.id !== 7); // employee record only
        const r = await E('post', '/', hana(), body('Imposter', { email: 'bob@b.test' }));
        expect(r.status).toBe(409);
        expect(JSON.stringify(r.body)).not.toMatch(/Bob|E7/);
    });
    it('same-tenant collision: the existing lifecycle conflict (named), still no overwrite', async () => {
        const before = JSON.stringify(W.users.find((u) => u.id === 5));
        const r = await E('post', '/', hana(), body('Dup', { email: 'eve@a.test', role: 'manager' }));
        expect(r.status).toBe(409);
        expect(JSON.stringify(W.users.find((u) => u.id === 5))).toBe(before);
    });
    it('race: even if the pre-check misses, an existing account is never overwritten and the request fails', async () => {
        W.race = true;
        W.employees = W.employees.filter((e) => e.id !== 'E7'); // so only the login-account pre-check could have caught it
        const before = JSON.stringify(W.users.find((u) => u.id === 7));
        const r = await E('post', '/', hana(), body('Racer', { email: 'bob@b.test' }));
        expect(r.status).toBe(409);
        expect(JSON.stringify(W.users.find((u) => u.id === 7))).toBe(before);
        expect(W.writes).toContain('user.create-conflict-ignored');
    });
    it('bulk upload: one row asking for a role the actor cannot grant aborts the whole batch; nothing is inserted', async () => {
        const r = await E('post', '/bulk-upload', lee(), { employees: [body('A', { email: 'a1@a.test' }), body('B', { email: 'b1@a.test', role: 'admin' }), body('C', { email: 'c1@a.test', role: 'super_admin' })] });
        expect(r.body.aborted).toBe(true);
        expect(r.body.inserted).toBe(0);
        expect(W.users.some((u) => /@a\.test$/.test(u.email) && /^(a1|b1|c1)@/.test(u.email))).toBe(false);
        expect(writesOf('employee.create')).toEqual([]);
    });
    it('bulk upload: roles the actor may grant go through, baseline included', async () => {
        const r = await E('post', '/bulk-upload', hana(), { employees: [body('A', { email: 'a2@a.test', role: 'employee' }), body('B', { email: 'b2@a.test', role: 'manager' })] });
        expect([r.body.inserted, r.body.skipped]).toEqual([2, 0]);
    });
    it('bulk upload: a cross-tenant e-mail in a row is reported generically, never overwritten', async () => {
        const r = await E('post', '/bulk-upload', hana(), { employees: [body('A', { email: 'bob@b.test' })] });
        expect(JSON.stringify(r.body)).not.toMatch(/Bob|E7|tB/);
        expect(W.users.find((u) => u.id === 7)!.role_id).toBe(7);
    });
});

// ── M-10 employee update ───────────────────────────────────────────────────
describe('M-10 PUT /employees/:id', () => {
    it('the UI re-sends the current role on every edit: unchanged role needs no roles:assign and changes nothing', async () => {
        const r = await E('put', '/E5', lee(), { name: 'Eve Emp', role: 'employee' });
        expect(r.status).toBe(200);
        expect(writesOf('employee.role')).toEqual([]);
    });
    it('changing a role needs roles:assign', async () => {
        expect((await E('put', '/E5', lee(), { role: 'manager' })).status).toBe(403);
        expect(userRole(5)).toBe(5);
    });
    it('self-escalation through the employee record is refused (the legacy "hr" name check no longer suffices)', async () => {
        for (const role of ['admin', 'super_admin', 'power', 'manager']) expect((await E('put', '/E3', hana(), { role })).status, role).toBe(403);
        expect(userRole(3)).toBe(3);
    });
    it('cannot promote someone to a role the actor cannot grant, nor re-role a more powerful target', async () => {
        expect((await E('put', '/E5', hana(), { role: 'admin' })).status).toBe(403);
        expect((await E('put', '/E5', hana(), { role: 'super_admin' })).status).toBe(403);
        expect((await E('put', '/E2', hana(), { role: 'employee' })).status).toBe(403);   // target is admin
        expect((await E('put', '/E6', hana(), { role: 'employee' })).status).toBe(403);   // target is power
        expect(userRole(5)).toBe(5); expect(userRole(2)).toBe(2);
    });
    it('an unknown role name never creates a role', async () => {
        const before = W.roles.length;
        expect((await E('put', '/E5', hana(), { role: 'Totally New' })).status).toBe(404);
        expect(W.roles.length).toBe(before);
    });
    it('legitimate role change by an authorized actor', async () => {
        expect((await E('put', '/E5', hana(), { role: 'manager' })).status).toBe(200);
        expect(userRole(5)).toBe(4);
    });
    it('login e-mail change is authorization state: refused for a more powerful target, allowed for a lower one', async () => {
        expect((await E('put', '/E2', hana(), { email: 'hijack@evil.test' })).status).toBe(403);
        expect(W.users.find((u) => u.id === 2)!.email).toBe('adm@a.test');
        expect((await E('put', '/E5', hana(), { email: 'eve2@a.test' })).status).toBe(200);
        expect(W.users.find((u) => u.id === 5)!.email).toBe('eve2@a.test');
    });
    it('cannot rename a login to an address that exists in another tenant — and learns nothing about it', async () => {
        const r = await E('put', '/E5', hana(), { email: 'bob@b.test' });
        expect(r.status).toBe(409);
        expect(JSON.stringify(r.body)).not.toMatch(/Bob|E7|tB/);
    });
    it('employee rows of the shared/default tenant are not reachable for role or e-mail changes from another tenant', async () => {
        expect((await E('put', '/E20', hana(), { role: 'manager' })).status).toBe(404);
        expect((await E('put', '/E20', hana(), { email: 'dee2@d.test' })).status).toBe(404);
        expect(W.users.find((u) => u.id === 20)!.role_id).toBe(5);
    });
    it("another tenant's employee is 404", async () => { expect((await E('put', '/E7', hana(), { role: 'manager' })).status).toBe(404); });
});

// ── each layer on its own (so no single check hides behind another) ────────
describe('HF-10 layers are independently enforced', () => {
    const actorOf = (userId: number, roleId: number) => {
        const u = W.users.find((x) => x.id === userId)!; const r = W.roles.find((x) => x.id === roleId)!;
        return { userId, email: u.email, tenantId: u.tenant_id, role: r.name, dashboard_type: r.dashboard_type, permissions: [...(W.rolePerms[roleId] || [])] };
    };
    it('roles:assign is required even for an actor that covers the role and the target', async () => {
        const noAssign = { ...actorOf(3, 3), permissions: HR_PERMS.filter((p) => p !== 'roles:assign') }; // covers manager, outranks Eve
        await expect(assertMayAssignRole(noAssign, 5, { roleId: 4 })).rejects.toMatchObject({ statusCode: 403 });
        await expect(assertMayAssignRole(actorOf(3, 3), 5, { roleId: 4 })).resolves.toMatchObject({ id: 4 });
        // and through the employee flow
        W.rolePerms[10] = HR_PERMS.filter((p) => p !== 'roles:assign');
        expect((await E('put', '/E5', { ...hana(), roleId: 10 }, { role: 'manager' })).status).toBe(403);
        expect(userRole(5)).toBe(5);
    });
    it('a bypass-grade role is never covered by an ordinary actor, even when it holds no listed permissions', async () => {
        W.roles.push({ id: 30, tenant_id: 'tA', name: 'z_empty_admin', dashboard_type: 'admin', is_system: false });
        W.rolePerms[30] = [];
        expect((await S('put', '/users/5/role', hana(), { role_id: 30 })).status).toBe(403);
        expect((await S('put', '/roles/30', hana(), { dashboard_type: 'employee' })).status).toBe(403);   // demotion
        expect((await S('put', '/roles/30', hana(), { description: 'x' })).status).toBe(403);
        expect((await S('put', '/roles/30/permissions', hana(), { permissions: ['leave:view'] })).status).toBe(403);
        expect(userRole(5)).toBe(5);
    });
    it('the policy itself treats a shared-template or other-tenant role as not found (no reliance on the repository filter)', async () => {
        const a = actorOf(3, 3);
        await expect(assertMayModifyRole(a, 9, { name: null })).rejects.toMatchObject({ statusCode: 404 });
        await expect(assertMayGrantPermissions(a, 9, ['leave:view'])).rejects.toMatchObject({ statusCode: 404 });
        await expect(assertMayModifyRole(a, 7, {})).rejects.toMatchObject({ statusCode: 404 });
        await expect(assertMayModifyRole(a, 5, {})).resolves.toMatchObject({ id: 5 });
    });
    it('a login e-mail in another tenant is reported generically even when that tenant has no employee record for it', async () => {
        W.employees = W.employees.filter((e) => e.id !== 'E7');
        const r = await E('post', '/', hana(), body('Imposter', { email: 'bob@b.test' }));
        expect(r.status).toBe(409);
        expect(r.body.message).toBe('Email is already in use.');
        expect(JSON.stringify(r.body)).not.toMatch(/Bob|tB/);
    });
    it('renaming a login onto another tenant\'s login is refused generically even without an employee record', async () => {
        W.employees = W.employees.filter((e) => e.id !== 'E7');
        const r = await E('put', '/E5', hana(), { email: 'bob@b.test' });
        expect(r.status).toBe(409);
        expect(r.body.message).toBe('Email is already in use.');
        expect(W.users.find((u) => u.id === 5)!.email).toBe('eve@a.test');
    });
});

// ── no role-name authorization was added ───────────────────────────────────
describe('HF-10 introduces no new role-name authorization', () => {
    it('the new policy and its repository contain no role-name or dashboard_type comparisons of their own', async () => {
        const { readFileSync } = await import('node:fs');
        for (const f of ['src/core/security/authzState.ts', 'src/core/security/authzState.repository.ts']) {
            const src = readFileSync(f, 'utf8').replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
            expect(src, f).not.toMatch(/=== *'(admin|hr|manager|employee|super_admin)'/);
            expect(src, f).not.toMatch(/\.includes\(\s*[a-z.]*role/i);
            // the only dashboard_type literal allowed is the validation set and the bypass helper call sites
            expect(src.match(/dashboard_type\s*===/g) || [], f).toEqual([]);
        }
    });
    it('the bypass identities are defined once, in authorize.ts, and hasAccess uses them', async () => {
        const { readFileSync } = await import('node:fs');
        const a = readFileSync('src/core/security/authorize.ts', 'utf8');
        expect(a).toMatch(/export const isSuperAdminIdentity/);
        expect(a).toMatch(/export const hasDashboardAdminBypass/);
        expect(a).toMatch(/if \(isSuperAdminIdentity\(user\)\) return true;/);
        expect(a).toMatch(/if \(hasDashboardAdminBypass\(user\)\) return true;/);
    });
    it('the role-creating helper of the employee flow is gone', async () => {
        const { readFileSync } = await import('node:fs');
        expect(readFileSync('src/modules/employees/employees.repository.ts', 'utf8')).not.toMatch(/ensureRoleExists/);
        expect(readFileSync('src/modules/employees/employees.service.ts', 'utf8')).not.toMatch(/ensureRoleExists/);
    });
});
