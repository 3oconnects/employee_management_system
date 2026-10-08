import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import pg from 'pg';

// ============================================================================
// Integration test seed (Release 0 — B0-03)
// ============================================================================
// Seeds one tenant plus the five system roles and one custom role, with the
// permission sets the application seeds today. The sets are copied (not
// imported) because the source constants are not exported and src/db/** is
// out of scope for Release 0:
//   - ROLE_PERMISSIONS_MAP  → server/src/db/schema.ts:363-393
//   - super_admin = all     → server/src/scripts/seedPermissions.ts:127-136
// Column names follow the repo scripts; re-check them against
// server/db/baseline/0000_live_schema.sql once B0-01 lands.
//
// Runs once, from the integration global setup. It must not import anything
// from src/ (that would load server/.env into the main test process).
// ============================================================================

export const TEST_TENANT_ID = 'tenant_test';

const PERMISSIONS: Record<string, string[]> = {
    employee: [
        'dashboard:view',
        'attendance:view', 'attendance:check_in',
        'leave:view', 'leave:apply',
        'payroll:view_own',
        'timesheet:view', 'timesheet:submit',
        'profile:view', 'profile:update',
    ],
    manager: [
        'dashboard:view',
        'employees:view',
        'attendance:view', 'attendance:check_in', 'attendance:manage',
        'leave:view', 'leave:apply', 'leave:approve',
        'timesheet:view', 'timesheet:submit', 'timesheet:approve',
        'reports:view',
        'profile:view', 'profile:update',
    ],
    hr: [
        'dashboard:view',
        'employees:view', 'employees:create', 'employees:update',
        'attendance:view', 'attendance:manage', 'attendance:regularize',
        'leave:view', 'leave:apply', 'leave:approve',
        'payroll:view', 'payroll:manage', 'payroll:run',
        'timesheet:view', 'timesheet:submit', 'timesheet:approve',
        'onboarding:view', 'onboarding:manage',
        'reports:view', 'reports:export',
        'profile:view', 'profile:update',
    ],
};

export interface TestRoleSpec {
    key: string;
    roleName: string;
    dashboardType: 'admin' | 'manager' | 'employee';
    permissions: string[] | 'ALL';
}

/** super_admin, admin, hr, manager, employee + one custom role ("trainee"). */
export const ROLE_SPECS: TestRoleSpec[] = [
    { key: 'super_admin', roleName: 'super_admin', dashboardType: 'admin', permissions: 'ALL' },
    { key: 'admin', roleName: 'admin', dashboardType: 'admin', permissions: 'ALL' },
    { key: 'hr', roleName: 'hr', dashboardType: 'admin', permissions: PERMISSIONS.hr },
    { key: 'manager', roleName: 'manager', dashboardType: 'manager', permissions: PERMISSIONS.manager },
    { key: 'employee', roleName: 'employee', dashboardType: 'employee', permissions: PERMISSIONS.employee },
    { key: 'custom', roleName: 'trainee', dashboardType: 'employee', permissions: PERMISSIONS.employee },
];

export interface SeededUser {
    key: string;
    tenantId: string;
    userId: number;
    employeeId: string;
    email: string;
    password: string;
    roleName: string;
    dashboardType: string;
    permissions: string[];
}

const allPermissionStrings = (): string[] =>
    Array.from(new Set(Object.values(PERMISSIONS).flat().concat(['settings:manage', 'audit:view', 'payroll:finalize'])));

export interface SeedOptions {
    /** Tenant to create/use. Default: TEST_TENANT_ID. */
    tenantId?: string;
    /** Password for every seeded user. Default: a random password per user. */
    password?: string;
    /** Reserved, non-routable domain for seeded emails. Default: ems.example.test */
    emailDomain?: string;
    /** bcrypt cost. Default 4 (tests); use 10 for staging to mirror production. */
    bcryptRounds?: number;
}

/**
 * Seeds the tenant, permissions, roles and one user + employee per role.
 * Idempotent: safe to call repeatedly. Shared by integration tests (B0-03)
 * and the staging seed (B0-05).
 */
export async function seedTenantWithRoles(db: pg.Client | pg.Pool, opts: SeedOptions = {}): Promise<Record<string, SeededUser>> {
    const tenantId = opts.tenantId ?? TEST_TENANT_ID;
    const domain = opts.emailDomain ?? 'ems.example.test';
    const rounds = opts.bcryptRounds ?? 4;
    await db.query(
        `INSERT INTO tenants (id, name, slug) VALUES ($1, $2, $3)
         ON CONFLICT (id) DO NOTHING`,
        [tenantId, `Seed tenant ${tenantId}`, tenantId.replace(/_/g, '-')]
    );

    const permIds = new Map<string, number>();
    for (const p of allPermissionStrings()) {
        const [module, action] = p.split(':');
        const r = await db.query(
            `INSERT INTO permissions (module, action) VALUES ($1, $2)
             ON CONFLICT (module, action) DO UPDATE SET module = EXCLUDED.module RETURNING id`,
            [module, action]
        );
        permIds.set(p, r.rows[0].id);
    }

    const users: Record<string, SeededUser> = {};
    for (const spec of ROLE_SPECS) {
        const perms = spec.permissions === 'ALL' ? allPermissionStrings() : spec.permissions;
        const role = await db.query(
            `INSERT INTO roles (tenant_id, name, dashboard_type, is_system) VALUES ($1, $2, $3, $4)
             ON CONFLICT (tenant_id, name) DO UPDATE SET dashboard_type = EXCLUDED.dashboard_type RETURNING id`,
            [tenantId, spec.roleName, spec.dashboardType, spec.key !== 'custom']
        );
        const roleId: number = role.rows[0].id;
        for (const p of perms) {
            await db.query(
                'INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                [roleId, permIds.get(p)]
            );
        }

        const password = opts.password ?? crypto.randomBytes(12).toString('base64url');
        const email = `${spec.key}@${domain}`;
        const user = await db.query(
            `INSERT INTO users (name, email, password, role, tenant_id, role_id, is_active)
             VALUES ($1, $2, $3, $4, $5, $6, true)
             ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password, role = EXCLUDED.role,
                 tenant_id = EXCLUDED.tenant_id, role_id = EXCLUDED.role_id, is_active = true
             RETURNING id`,
            [`Test ${spec.key}`, email, await bcrypt.hash(password, rounds), spec.roleName, tenantId, roleId]
        );
        const userId: number = user.rows[0].id;
        const employeeId = `EMP-TEST-${spec.key.toUpperCase()}`;
        await db.query(
            `INSERT INTO employees (id, name, email, tenant_id, user_id, status, department, position, join_date)
             VALUES ($1, $2, $3, $4, $5, 'active', 'Engineering', 'Engineer', NOW())
             ON CONFLICT (id) DO UPDATE SET user_id = EXCLUDED.user_id, tenant_id = EXCLUDED.tenant_id, status = 'active'`,
            [employeeId, `Test ${spec.key}`, email, tenantId, userId]
        );

        users[spec.key] = {
            key: spec.key, tenantId, userId, employeeId, email, password,
            roleName: spec.roleName, dashboardType: spec.dashboardType, permissions: perms,
        };
    }
    return users;
}
