import { pool } from '../../config/db';

// Read-only lookups for the authorization-state policy (HF-10). Nothing here writes.

/** Tenant ids whose roles are shared templates, visible (never editable) to every tenant. Same set the role list uses. */
export const SHARED_TEMPLATE_TENANTS = ['tenant_default', 'default'];

export interface RoleRecord {
    id: number;
    tenant_id: string | null;
    name: string;
    is_system: boolean;
    dashboard_type: string | null;
    permissions: string[];
}

export interface UserAuthzRecord {
    id: number;
    tenant_id: string;
    role_id: number | null;
    role_name: string | null;
    dashboard_type: string | null;
    permissions: string[];
}

const ROLE_COLUMNS = `r.id, r.tenant_id, r.name, COALESCE(r.is_system, false) AS is_system, r.dashboard_type`;
const VISIBLE = `(r.tenant_id = $2 OR r.tenant_id = ANY($3::text[]) OR r.tenant_id IS NULL)`;

export class AuthzStateRepository {
    private async permissionsOfRole(roleId: number): Promise<string[]> {
        const { rows } = await pool.query(
            `SELECT p.module || ':' || p.action AS perm
               FROM role_permissions rp JOIN permissions p ON p.id = rp.permission_id
              WHERE rp.role_id = $1`,
            [roleId]
        );
        return rows.map((r: { perm: string }) => r.perm);
    }

    /** A role the tenant may see: its own, or a shared template. Anything else does not exist for the caller. */
    async findVisibleRoleById(roleId: number, tenantId: string): Promise<RoleRecord | null> {
        const { rows } = await pool.query(
            `SELECT ${ROLE_COLUMNS} FROM roles r WHERE r.id = $1 AND ${VISIBLE}`,
            [roleId, tenantId, SHARED_TEMPLATE_TENANTS]
        );
        if (!rows[0]) return null;
        return { ...rows[0], permissions: await this.permissionsOfRole(rows[0].id) };
    }

    /** By name: the caller's own role wins over a shared template of the same name. */
    async findVisibleRoleByName(name: string, tenantId: string): Promise<RoleRecord | null> {
        const { rows } = await pool.query(
            `SELECT ${ROLE_COLUMNS} FROM roles r
              WHERE LOWER(r.name) = LOWER($1) AND ${VISIBLE}
              ORDER BY (r.tenant_id = $2) DESC, r.id ASC LIMIT 1`,
            [name.trim(), tenantId, SHARED_TEMPLATE_TENANTS]
        );
        if (!rows[0]) return null;
        return { ...rows[0], permissions: await this.permissionsOfRole(rows[0].id) };
    }

    /**
     * The user's effective role exactly as login resolves it (COALESCE(role_id, 4)), but restricted to the
     * caller's tenant. A user of another tenant does not exist for the caller.
     */
    async findUserAuthz(userId: number, tenantId: string): Promise<UserAuthzRecord | null> {
        const { rows } = await pool.query(
            `SELECT u.id, u.tenant_id, COALESCE(u.role_id, 4) AS role_id, r.name AS role_name, r.dashboard_type
               FROM users u LEFT JOIN roles r ON r.id = COALESCE(u.role_id, 4)
              WHERE u.id = $1 AND u.tenant_id = $2 AND u.deleted_at IS NULL`,
            [userId, tenantId]
        );
        if (!rows[0]) return null;
        const permissions = rows[0].role_id ? await this.permissionsOfRole(rows[0].role_id) : [];
        return { ...rows[0], permissions };
    }

    async findUserAuthzByEmail(email: string, tenantId: string): Promise<UserAuthzRecord | null> {
        const { rows } = await pool.query(
            `SELECT u.id FROM users u WHERE LOWER(u.email) = LOWER($1) AND u.tenant_id = $2 AND u.deleted_at IS NULL LIMIT 1`,
            [email.trim(), tenantId]
        );
        return rows[0] ? this.findUserAuthz(rows[0].id, tenantId) : null;
    }

    /** Which of these `module:action` strings exist as permissions. */
    async existingPermissions(keys: string[]): Promise<Set<string>> {
        if (keys.length === 0) return new Set();
        const { rows } = await pool.query(
            `SELECT p.module || ':' || p.action AS perm FROM permissions p WHERE (p.module || ':' || p.action) = ANY($1::text[])`,
            [keys]
        );
        return new Set(rows.map((r: { perm: string }) => r.perm));
    }
}
