// ============================================================================
// EMS BACKEND — MULTI-TENANT DATABASE SCHEMA (v2)
// ============================================================================
// This is the UPGRADED schema that:
//   1. Adds multi-tenancy (tenant_id on all tables)
//   2. Adds RBAC (roles, permissions, role_permissions)
//   3. Adds audit_logs and notifications tables
//   4. Adds soft deletes (deleted_at) to key tables
//   5. Adds proper indexes for performance
//   6. Preserves ALL existing table structures (additive migration)
//   7. Seeds default tenant, roles, and permissions
// ============================================================================

import bcrypt from 'bcryptjs';
import { query } from './connection';

// ─── SCHEMA: TENANT & RBAC TABLES ──────────────────────────────────────────

const TENANT_SCHEMA = `
    -- ╔══════════════════════════════════════════════════════════════╗
    -- ║  TENANTS — The foundation of multi-tenancy                 ║
    -- ╚══════════════════════════════════════════════════════════════╝
    CREATE TABLE IF NOT EXISTS tenants (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        domain TEXT,
        logo_url TEXT,
        is_active BOOLEAN DEFAULT true,
        plan TEXT DEFAULT 'free',
        max_employees INTEGER DEFAULT 50,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
    );

    -- ╔══════════════════════════════════════════════════════════════╗
    -- ║  PERMISSIONS — Granular access control actions              ║
    -- ╚══════════════════════════════════════════════════════════════╝
    CREATE TABLE IF NOT EXISTS permissions (
        id SERIAL PRIMARY KEY,
        module TEXT NOT NULL,
        action TEXT NOT NULL,
        description TEXT,
        UNIQUE(module, action)
    );

    -- ╔══════════════════════════════════════════════════════════════╗
    -- ║  ROLES — Tenant-scoped role definitions                    ║
    -- ╚══════════════════════════════════════════════════════════════╝
    CREATE TABLE IF NOT EXISTS roles (
        id SERIAL PRIMARY KEY,
        tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        description TEXT,
        is_system BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(tenant_id, name)
    );

    -- ╔══════════════════════════════════════════════════════════════╗
    -- ║  ROLE_PERMISSIONS — Maps roles to permissions              ║
    -- ╚══════════════════════════════════════════════════════════════╝
    CREATE TABLE IF NOT EXISTS role_permissions (
        role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
        permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
        PRIMARY KEY (role_id, permission_id)
    );
`;

// ─── SCHEMA: CORE TABLES (UPGRADED) ────────────────────────────────────────

const CORE_SCHEMA = `
    -- ╔══════════════════════════════════════════════════════════════╗
    -- ║  USERS — Authentication & identity (upgraded)              ║
    -- ╚══════════════════════════════════════════════════════════════╝
    -- Existing columns preserved. New: tenant_id, role_id, refresh_token,
    -- is_active, last_login, deleted_at
    ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id TEXT REFERENCES tenants(id);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS role_id INTEGER REFERENCES roles(id);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS refresh_token TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

    -- ╔══════════════════════════════════════════════════════════════╗
    -- ║  EMPLOYEES — Core HR data (upgraded)                       ║
    -- ╚══════════════════════════════════════════════════════════════╝
    ALTER TABLE employees ADD COLUMN IF NOT EXISTS tenant_id TEXT REFERENCES tenants(id);
    ALTER TABLE employees ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id);
    ALTER TABLE employees ADD COLUMN IF NOT EXISTS manager_id TEXT;
    ALTER TABLE employees ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
    ALTER TABLE employees ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
    ALTER TABLE employees ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

    -- ╔══════════════════════════════════════════════════════════════╗
    -- ║  PAYROLL_PROFILES (upgraded)                                ║
    -- ╚══════════════════════════════════════════════════════════════╝
    ALTER TABLE payroll_profiles ADD COLUMN IF NOT EXISTS tenant_id TEXT REFERENCES tenants(id);
    ALTER TABLE payroll_profiles ADD COLUMN IF NOT EXISTS net_salary NUMERIC DEFAULT 0;
    ALTER TABLE payroll_profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
    ALTER TABLE payroll_profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

    -- ╔══════════════════════════════════════════════════════════════╗
    -- ║  ATTENDANCE (upgraded)                                     ║
    -- ╚══════════════════════════════════════════════════════════════╝
    ALTER TABLE attendance ADD COLUMN IF NOT EXISTS tenant_id TEXT REFERENCES tenants(id);

    -- ╔══════════════════════════════════════════════════════════════╗
    -- ║  LEAVE_TYPES (upgraded)                                    ║
    -- ╚══════════════════════════════════════════════════════════════╝
    ALTER TABLE leave_types ADD COLUMN IF NOT EXISTS tenant_id TEXT REFERENCES tenants(id);

    -- ╔══════════════════════════════════════════════════════════════╗
    -- ║  LEAVE_REQUESTS (upgraded)                                 ║
    -- ╚══════════════════════════════════════════════════════════════╝
    ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS tenant_id TEXT REFERENCES tenants(id);
    ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

    -- ╔══════════════════════════════════════════════════════════════╗
    -- ║  TIMESHEETS (upgraded)                                     ║
    -- ╚══════════════════════════════════════════════════════════════╝
    ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS tenant_id TEXT REFERENCES tenants(id);

    -- ╔══════════════════════════════════════════════════════════════╗
    -- ║  PAYROLL_RUNS (upgraded)                                   ║
    -- ╚══════════════════════════════════════════════════════════════╝
    ALTER TABLE payroll_runs ADD COLUMN IF NOT EXISTS tenant_id TEXT REFERENCES tenants(id);

    -- ╔══════════════════════════════════════════════════════════════╗
    -- ║  PAYROLL_ENTRIES (upgraded)                                 ║
    -- ╚══════════════════════════════════════════════════════════════╝
    ALTER TABLE payroll_entries ADD COLUMN IF NOT EXISTS tenant_id TEXT REFERENCES tenants(id);

    -- ╔══════════════════════════════════════════════════════════════╗
    -- ║  PAYROLL_HISTORY (upgraded)                                 ║
    -- ╚══════════════════════════════════════════════════════════════╝
    ALTER TABLE payroll_history ADD COLUMN IF NOT EXISTS tenant_id TEXT REFERENCES tenants(id);

    -- ╔══════════════════════════════════════════════════════════════╗
    -- ║  CLAIMS (upgraded)                                         ║
    -- ╚══════════════════════════════════════════════════════════════╝
    ALTER TABLE claims ADD COLUMN IF NOT EXISTS tenant_id TEXT REFERENCES tenants(id);
    ALTER TABLE reimbursement_claims ADD COLUMN IF NOT EXISTS tenant_id TEXT REFERENCES tenants(id);
`;

// ─── SCHEMA: NEW TABLES ────────────────────────────────────────────────────

const NEW_TABLES_SCHEMA = `
    -- ╔══════════════════════════════════════════════════════════════╗
    -- ║  AUDIT_LOGS — Track all sensitive operations               ║
    -- ╚══════════════════════════════════════════════════════════════╝
    CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id),
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT,
        old_values TEXT,
        new_values TEXT,
        ip_address TEXT,
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT NOW()
    );

    -- ╔══════════════════════════════════════════════════════════════╗
    -- ║  NOTIFICATIONS — In-app notification system                ║
    -- ╚══════════════════════════════════════════════════════════════╝
    CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        type TEXT DEFAULT 'info',
        is_read BOOLEAN DEFAULT false,
        link TEXT,
        created_at TIMESTAMP DEFAULT NOW()
    );
`;

// ─── SCHEMA: INDEXES ───────────────────────────────────────────────────────

const INDEXES_SCHEMA = `
    -- Performance indexes for multi-tenant queries
    CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

    CREATE INDEX IF NOT EXISTS idx_employees_tenant ON employees(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department);
    CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
    CREATE INDEX IF NOT EXISTS idx_employees_user_id ON employees(user_id);

    CREATE INDEX IF NOT EXISTS idx_attendance_tenant ON attendance(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_attendance_user_date ON attendance(user_id, check_in);

    CREATE INDEX IF NOT EXISTS idx_leave_requests_tenant ON leave_requests(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_leave_requests_user ON leave_requests(user_id);
    CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);

    CREATE INDEX IF NOT EXISTS idx_timesheets_tenant ON timesheets(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_timesheets_user ON timesheets(user_id);

    CREATE INDEX IF NOT EXISTS idx_payroll_entries_tenant ON payroll_entries(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_payroll_entries_employee ON payroll_entries(employee_id);

    CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant ON audit_logs(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
    CREATE INDEX IF NOT EXISTS idx_notifications_tenant ON notifications(tenant_id);

    CREATE INDEX IF NOT EXISTS idx_roles_tenant ON roles(tenant_id);
`;

// ─── SEED DATA ──────────────────────────────────────────────────────────────

const DEFAULT_TENANT_ID = 'tenant_default';

const PERMISSIONS_LIST = [
    // Dashboard
    { module: 'dashboard', action: 'view' },
    // Employees
    { module: 'employees', action: 'view' },
    { module: 'employees', action: 'create' },
    { module: 'employees', action: 'update' },
    { module: 'employees', action: 'delete' },
    // Attendance
    { module: 'attendance', action: 'view' },
    { module: 'attendance', action: 'check_in' },
    { module: 'attendance', action: 'manage' },
    { module: 'attendance', action: 'regularize' },
    // Leave
    { module: 'leave', action: 'view' },
    { module: 'leave', action: 'apply' },
    { module: 'leave', action: 'approve' },
    // Payroll
    { module: 'payroll', action: 'view' },
    { module: 'payroll', action: 'manage' },
    { module: 'payroll', action: 'run' },
    { module: 'payroll', action: 'view_own' },
    // Timesheets
    { module: 'timesheet', action: 'view' },
    { module: 'timesheet', action: 'submit' },
    { module: 'timesheet', action: 'approve' },
    // Onboarding
    { module: 'onboarding', action: 'view' },
    { module: 'onboarding', action: 'manage' },
    // Reports
    { module: 'reports', action: 'view' },
    { module: 'reports', action: 'export' },
    // Profile
    { module: 'profile', action: 'view' },
    { module: 'profile', action: 'update' },
    // Audit
    { module: 'audit', action: 'view' },
    // Settings
    { module: 'settings', action: 'manage' },
];

// Role → permissions mapping
const ROLE_PERMISSIONS_MAP: Record<string, string[]> = {
    admin: PERMISSIONS_LIST.map(p => `${p.module}:${p.action}`),
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
    manager: [
        'dashboard:view',
        'employees:view',
        'attendance:view', 'attendance:check_in', 'attendance:manage',
        'leave:view', 'leave:apply', 'leave:approve',
        'timesheet:view', 'timesheet:submit', 'timesheet:approve',
        'reports:view',
        'profile:view', 'profile:update',
    ],
    employee: [
        'attendance:view', 'attendance:check_in',
        'leave:view', 'leave:apply',
        'payroll:view_own',
        'timesheet:view', 'timesheet:submit',
        'profile:view', 'profile:update',
    ],
};

// ─── INITIALIZATION ─────────────────────────────────────────────────────────

export const initializeDatabase = async () => {
    try {
        console.log('🔧 Initializing database schema (v2 — Multi-Tenant)...');

        // 1. Create tenant & RBAC tables
        await query(TENANT_SCHEMA);
        console.log('  ✅ Tenant & RBAC tables created.');

        // 2. Seed default tenant
        await query(`
            INSERT INTO tenants (id, name, slug, is_active, plan, max_employees)
            VALUES ($1, 'Default Organization', 'default', true, 'enterprise', 500)
            ON CONFLICT (id) DO NOTHING
        `, [DEFAULT_TENANT_ID]);
        console.log('  ✅ Default tenant seeded.');

        // 3. Run existing schema (preserved from original — tables already exist)
        //    The original schema.ts creates users, employees, attendance, etc.
        //    We rely on those already existing (CREATE TABLE IF NOT EXISTS).
        //    We now add new columns via ALTER TABLE.
        const altStatements = CORE_SCHEMA.split(';').filter(s => s.trim());
        for (const stmt of altStatements) {
            await query(stmt + ';').catch(() => {
                // Column already exists — safe to ignore
            });
        }
        console.log('  ✅ Existing tables upgraded with tenant_id + soft deletes.');

        // 4. Create new tables (audit_logs, notifications)
        await query(NEW_TABLES_SCHEMA);
        console.log('  ✅ New tables created (audit_logs, notifications).');

        // 5. Create indexes
        const idxStatements = INDEXES_SCHEMA.split(';').filter(s => s.trim());
        for (const stmt of idxStatements) {
            await query(stmt + ';').catch(() => {});
        }
        console.log('  ✅ Performance indexes created.');

        // 6. Seed permissions
        for (const perm of PERMISSIONS_LIST) {
            await query(
                `INSERT INTO permissions (module, action, description)
                 VALUES ($1, $2, $3)
                 ON CONFLICT (module, action) DO NOTHING`,
                [perm.module, perm.action, `${perm.action} ${perm.module}`]
            );
        }
        console.log('  ✅ Permissions seeded.');

        // 7. Seed roles for default tenant
        const systemRoles = ['admin', 'hr', 'manager', 'employee'];
        for (const roleName of systemRoles) {
            await query(
                `INSERT INTO roles (tenant_id, name, description, is_system)
                 VALUES ($1, $2, $3, true)
                 ON CONFLICT (tenant_id, name) DO NOTHING`,
                [DEFAULT_TENANT_ID, roleName, `System ${roleName} role`]
            );
        }
        console.log('  ✅ System roles seeded.');

        // 8. Map permissions to roles
        for (const [roleName, permKeys] of Object.entries(ROLE_PERMISSIONS_MAP)) {
            const roleResult = await query(
                'SELECT id FROM roles WHERE tenant_id = $1 AND name = $2',
                [DEFAULT_TENANT_ID, roleName]
            );
            if (roleResult.rows.length === 0) continue;
            const roleId = roleResult.rows[0].id;

            for (const permKey of permKeys) {
                const [mod, act] = permKey.split(':');
                const permResult = await query(
                    'SELECT id FROM permissions WHERE module = $1 AND action = $2',
                    [mod, act]
                );
                if (permResult.rows.length === 0) continue;

                await query(
                    `INSERT INTO role_permissions (role_id, permission_id)
                     VALUES ($1, $2) ON CONFLICT DO NOTHING`,
                    [roleId, permResult.rows[0].id]
                );
            }
        }
        console.log('  ✅ Role-permission mappings created.');

        // 9. Update existing data: assign default tenant_id to orphaned rows
        const tablesToBackfill = [
            'users', 'employees', 'attendance', 'leave_types', 'leave_requests',
            'timesheets', 'payroll_profiles', 'payroll_runs', 'payroll_entries',
            'payroll_history', 'claims', 'reimbursement_claims'
        ];
        for (const table of tablesToBackfill) {
            await query(
                `UPDATE ${table} SET tenant_id = $1 WHERE tenant_id IS NULL`,
                [DEFAULT_TENANT_ID]
            ).catch(() => {});
        }
        console.log('  ✅ Existing data backfilled with default tenant_id.');

        // 10. Link roles to existing users
        for (const roleName of systemRoles) {
            const roleRes = await query(
                'SELECT id FROM roles WHERE tenant_id = $1 AND name = $2',
                [DEFAULT_TENANT_ID, roleName]
            );
            if (roleRes.rows.length > 0) {
                await query(
                    'UPDATE users SET role_id = $1, tenant_id = $2 WHERE role = $3 AND role_id IS NULL',
                    [roleRes.rows[0].id, DEFAULT_TENANT_ID, roleName]
                ).catch(() => {});
            }
        }
        console.log('  ✅ Existing users linked to roles.');

        // 11. Seed Admin User if no users exist
        const { rows: userCount } = await query('SELECT COUNT(*) FROM users');
        if (parseInt(userCount[0].count) === 0) {
            const hashedPassword = await bcrypt.hash('password', 10);
            const adminRoleRes = await query(
                'SELECT id FROM roles WHERE tenant_id = $1 AND name = $2',
                [DEFAULT_TENANT_ID, 'admin']
            );
            const adminRoleId = adminRoleRes.rows[0]?.id;

            await query(`
                INSERT INTO users (name, email, password, role, tenant_id, role_id, is_active)
                VALUES ('Admin User', 'admin@example.com', $1, 'admin', $2, $3, true)
            `, [hashedPassword, DEFAULT_TENANT_ID, adminRoleId]);

            await query(`
                INSERT INTO employees (id, name, department, position, join_date, email, status, tenant_id)
                VALUES ('EMP001', 'Admin User', 'Management', 'Administrator', NOW(), 'admin@example.com', 'active', $1)
                ON CONFLICT (id) DO NOTHING
            `, [DEFAULT_TENANT_ID]);
            console.log('  ✅ Admin user seeded: admin@example.com / password');
        }

        // 12. Seed Leave Types for default tenant
        const { rows: ltCount } = await query(
            'SELECT COUNT(*) FROM leave_types WHERE tenant_id = $1', [DEFAULT_TENANT_ID]
        );
        if (parseInt(ltCount[0].count) === 0) {
            await query(`
                INSERT INTO leave_types (name, annual_quota, tenant_id) VALUES
                ('Casual Leave', 12, $1),
                ('Sick Leave', 10, $1),
                ('Earned Leave', 15, $1)
                ON CONFLICT DO NOTHING
            `, [DEFAULT_TENANT_ID]);
            console.log('  ✅ Leave types seeded for default tenant.');
        }

        console.log('🚀 Database schema v2 initialization complete.');
    } catch (err) {
        console.error('❌ Database initialization failed:', err);
        throw err;
    }
};
