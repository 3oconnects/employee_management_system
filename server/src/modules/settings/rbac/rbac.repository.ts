import { pool } from '../../../config/db';

export class RBACRepository {
    async getPermissions() {
        const result = await pool.query(
            `SELECT id, module, action, description FROM permissions ORDER BY module, action`
        );
        return result.rows;
    }

    async getRoles(tenantId: string) {
        const roles = await pool.query(
            `SELECT r.id, r.name, r.description, r.is_system, r.dashboard_type,
                    COUNT(DISTINCT u.id) as user_count
             FROM roles r
             LEFT JOIN users u ON u.role_id = r.id
             WHERE r.tenant_id = $1 OR r.tenant_id IS NULL
             GROUP BY r.id ORDER BY r.is_system DESC, r.name`,
            [tenantId]
        );
        return roles.rows;
    }

    async getRolesFallback() {
        const fallback = await pool.query('SELECT id, name FROM roles LIMIT 100');
        return fallback.rows;
    }

    async getRolePermissions(tenantId: string) {
        const permResult = await pool.query(
            `SELECT rp.role_id, p.module, p.action FROM role_permissions rp
             JOIN permissions p ON p.id = rp.permission_id
             JOIN roles r ON r.id = rp.role_id AND (r.tenant_id = $1 OR r.tenant_id IS NULL)`,
            [tenantId]
        );
        return permResult.rows;
    }

    async createRole(tenantId: string, name: string, description: string | null, dashboard_type: string) {
        const roleResult = await pool.query(
            `INSERT INTO roles (tenant_id, name, description, dashboard_type, is_system)
             VALUES ($1, $2, $3, $4, false) RETURNING *`,
            [tenantId, name.trim(), description || null, dashboard_type]
        );
        return roleResult.rows[0];
    }

    async getPermissionId(module: string, action: string) {
        const p = await pool.query('SELECT id FROM permissions WHERE module=$1 AND action=$2', [module, action]);
        return p.rows.length > 0 ? p.rows[0].id : null;
    }

    async addRolePermission(roleId: number, permissionId: number) {
        await pool.query('INSERT INTO role_permissions (role_id, permission_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [roleId, permissionId]);
    }

    async updateRole(id: string, tenantId: string, name: string | null, description: string | null, dashboard_type: string | null) {
        const result = await pool.query(
            `UPDATE roles SET 
                name=COALESCE($1,name), 
                description=COALESCE($2,description),
                dashboard_type=COALESCE($3,dashboard_type)
             WHERE id=$4 AND tenant_id=$5 AND is_system=false RETURNING *`,
            [name, description, dashboard_type, id, tenantId]
        );
        return result.rows[0];
    }

    async deleteRole(id: string, tenantId: string) {
        const usersOnRole = await pool.query('SELECT COUNT(*) FROM users WHERE role_id=$1', [id]);
        if (parseInt(usersOnRole.rows[0].count) > 0) {
            return { error: 'users_assigned' };
        }
        const result = await pool.query(
            'DELETE FROM roles WHERE id=$1 AND tenant_id=$2 AND is_system=false RETURNING id',
            [id, tenantId]
        );
        return { deleted: result.rows.length > 0 };
    }

    async checkRoleExists(id: string, tenantId: string) {
        const roleCheck = await pool.query('SELECT id FROM roles WHERE id=$1 AND tenant_id=$2', [id, tenantId]);
        return roleCheck.rows.length > 0;
    }

    async clearRolePermissions(id: string) {
        await pool.query('DELETE FROM role_permissions WHERE role_id=$1', [id]);
    }
}
