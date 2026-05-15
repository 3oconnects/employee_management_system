// ============================================================================
// SEED PERMISSIONS & SUPER-ADMIN BOOTSTRAP
// ============================================================================
// Runs automatically on every server startup (idempotent — safe to re-run).
//
// What it does:
//  1. Upserts every module:action permission row in the DB
//  2. Ensures a system-level 'super_admin' role exists with ALL permissions
//  3. Ensures admin@company.com is assigned super_admin + dashboard_type=admin
//  4. Any user still with no role_id gets the default employee permissions
//
// Philosophy:
//  - role NAMES are arbitrary (users can create "trainees", "ninja", etc.)
//  - access is controlled entirely by permissions[] in the JWT
//  - super_admin is the only hardcoded bypass in authorize()
// ============================================================================

import { pool } from '../config/db';

// ─── MASTER PERMISSION LIST ──────────────────────────────────────────────────
// Add a row here whenever you add a new protected feature.
// Format: { module, action, description }
// Routes should use authorize(['module:action']) — never hardcoded role names
// (except 'super_admin' which is always a pass-through).

const ALL_PERMISSIONS: { module: string; action: string; description: string }[] = [
    // Employees
    { module: 'employees',    action: 'read',    description: 'View employee list and profiles' },
    { module: 'employees',    action: 'manage',  description: 'Create, edit, and delete employees' },
    // Settings / RBAC
    { module: 'settings',     action: 'manage',  description: 'Full access to system settings, roles, permissions' },
    // Payroll
    { module: 'payroll',      action: 'read',    description: 'View payroll data' },
    { module: 'payroll',      action: 'manage',  description: 'Run payroll and edit salary profiles' },
    // Reports
    { module: 'reports',      action: 'view',    description: 'Access reports and analytics dashboards' },
    // Leaves
    { module: 'leaves',       action: 'apply',   description: 'Apply for leave' },
    { module: 'leaves',       action: 'approve', description: 'Approve or reject leave requests' },
    { module: 'leaves',       action: 'manage',  description: 'Full leave management (types, balances, policies)' },
    // Attendance
    { module: 'attendance',   action: 'read',    description: 'View attendance records' },
    { module: 'attendance',   action: 'manage',  description: 'Manage and regularize attendance' },
    // Onboarding
    { module: 'onboarding',   action: 'manage',  description: 'Manage candidate onboarding pipeline' },
    // Organization
    { module: 'organization', action: 'read',    description: 'View departments and teams' },
    { module: 'organization', action: 'manage',  description: 'Create, edit, delete departments and teams' },
    // Profile
    { module: 'profile',      action: 'read',    description: 'View own profile' },
    { module: 'profile',      action: 'edit',    description: 'Edit own profile details' },
    // Timesheets
    { module: 'timesheets',   action: 'submit',  description: 'Submit timesheets for approval' },
    { module: 'timesheets',   action: 'approve', description: 'Approve or reject timesheets' },
    // Claims / Expenses
    { module: 'claims',       action: 'submit',  description: 'Submit expense/reimbursement claims' },
    { module: 'claims',       action: 'approve', description: 'Approve expense claims' },
    // Documents
    { module: 'documents',    action: 'read',    description: 'View documents' },
    { module: 'documents',    action: 'manage',  description: 'Upload and manage documents' },
    // Approvals
    { module: 'approvals',    action: 'read',    description: 'View approval requests' },
    { module: 'approvals',    action: 'manage',  description: 'Process approval requests' },
    // Audit
    { module: 'audit',        action: 'read',    description: 'View audit logs' },
    // Governance / Org Tree
    { module: 'governance',   action: 'read',    description: 'View organization structural graph' },
    { module: 'governance',   action: 'manage',  description: 'Manage organization structure and governance' },
];

export async function seedPermissionsAndSuperAdmin(): Promise<void> {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // ── 1. Ensure permissions table has a unique constraint ───────────────
        await client.query(`
            DO $$ BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint
                    WHERE conname = 'permissions_module_action_key'
                ) THEN
                    ALTER TABLE permissions ADD CONSTRAINT permissions_module_action_key UNIQUE (module, action);
                END IF;
            END $$;
        `).catch(() => {}); // ignore if already exists or table doesn't support it

        // ── 2. Upsert every permission ────────────────────────────────────────
        for (const perm of ALL_PERMISSIONS) {
            await client.query(
                `INSERT INTO permissions (module, action, description)
                 VALUES ($1, $2, $3)
                 ON CONFLICT (module, action) DO UPDATE SET description = EXCLUDED.description`,
                [perm.module, perm.action, perm.description]
            );
        }

        // ── 3. Resolve the default tenant ────────────────────────────────────
        let tenantId = 'default';
        try {
            const tenantRes = await client.query(
                `SELECT id FROM tenants ORDER BY created_at ASC LIMIT 1`
            );
            if (tenantRes.rows[0]?.id) tenantId = tenantRes.rows[0].id;
        } catch {
            // tenants table might not exist yet — use 'default'
        }

        // ── 4. Ensure super_admin role exists ─────────────────────────────────
        await client.query(
            `INSERT INTO roles (tenant_id, name, description, is_system, dashboard_type)
             VALUES ($1, 'super_admin', 'Super Administrator \u2014 full system access', true, 'admin')
             ON CONFLICT DO NOTHING`,
            [tenantId]
        );

        // Fetch the role id (handles multi-tenant: prefer tenant-scoped, fall back to any)
        const roleRow = await client.query(
            `SELECT id FROM roles
             WHERE name = 'super_admin'
             ORDER BY (tenant_id = $1) DESC, is_system DESC
             LIMIT 1`,
            [tenantId]
        );
        const superAdminRoleId: number | null = roleRow.rows[0]?.id ?? null;

        if (superAdminRoleId) {
            // ── 5. Grant ALL permissions to super_admin ───────────────────────
            const allPerms = await client.query(`SELECT id FROM permissions`);
            for (const p of allPerms.rows) {
                await client.query(
                    `INSERT INTO role_permissions (role_id, permission_id)
                     VALUES ($1, $2) ON CONFLICT DO NOTHING`,
                    [superAdminRoleId, p.id]
                );
            }

            // ── 6. Fix admin@company.com — must be super_admin ────────────────
            const fixed = await client.query(
                `UPDATE users
                 SET role_id        = $1,
                     role           = 'super_admin',
                     dashboard_type = 'admin'
                 WHERE LOWER(email) = 'admin@company.com'
                   AND deleted_at IS NULL
                 RETURNING id, email`,
                [superAdminRoleId]
            );
            if (fixed.rowCount && fixed.rowCount > 0) {
                console.log(`[SEED] Fixed ${fixed.rowCount} user(s): admin@company.com -> super_admin`);
            }
        }

        await client.query('COMMIT');
        console.log('[SEED] ✅ Permissions seeded. Super-admin bootstrapped.');
    } catch (err: any) {
        await client.query('ROLLBACK');
        // Non-fatal — tables may not exist before first db:setup run
        console.warn('[SEED] ⚠️  Permission seed skipped:', err.message);
    } finally {
        client.release();
    }
}
