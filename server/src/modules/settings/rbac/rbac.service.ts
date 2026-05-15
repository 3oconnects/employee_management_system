import { RBACRepository } from './rbac.repository';
import { AppError } from '../../../core/errors/AppError';

export class RBACService {
    private repo: RBACRepository;

    constructor() {
        this.repo = new RBACRepository();
    }

    async getPermissions() {
        const rows = await this.repo.getPermissions();
        const grouped: Record<string, any[]> = {};
        for (const row of rows) {
            if (!grouped[row.module]) grouped[row.module] = [];
            grouped[row.module].push({ id: row.id, action: row.action, description: row.description });
        }
        return { grouped, flat: rows };
    }

    async getRoles(tenantId: string) {
        try {
            const roles = await this.repo.getRoles(tenantId);
            const permRows = await this.repo.getRolePermissions(tenantId);
            
            const permsByRole: Record<number, string[]> = {};
            for (const row of permRows) {
                if (!permsByRole[row.role_id]) permsByRole[row.role_id] = [];
                permsByRole[row.role_id].push(`${row.module}:${row.action}`);
            }
            
            return {
                roles: roles.map(r => ({
                    ...r,
                    created_at: new Date(),
                    user_count: parseInt(r.user_count),
                    permissions: permsByRole[r.id] || [],
                })),
                warning: null
            };
        } catch (err: any) {
            console.error('ROLES_FETCH_ERROR:', err.message);
            const fallbackRoles = await this.repo.getRolesFallback();
            return {
                roles: fallbackRoles.map(r => ({ ...r, user_count: 0, permissions: [] })),
                warning: err.message
            };
        }
    }

    async createRole(tenantId: string, data: any) {
        const { name, description, dashboard_type = 'employee', permissions = [] } = data;
        if (!name?.trim()) throw AppError.badRequest('Role name is required.');
        
        try {
            const role = await this.repo.createRole(tenantId, name, description, dashboard_type);
            for (const permKey of permissions) {
                const [module, action] = permKey.split(':');
                const pId = await this.repo.getPermissionId(module, action);
                if (pId) {
                    await this.repo.addRolePermission(role.id, pId);
                }
            }
            return { ...role, permissions };
        } catch (err: any) {
            console.error('ROLE_CREATE_ERROR:', err.message);
            throw AppError.badRequest('Failed to create role: ' + err.message);
        }
    }

    async updateRole(id: string, tenantId: string, data: any) {
        const { name, description, dashboard_type } = data;
        const role = await this.repo.updateRole(id, tenantId, name || null, description || null, dashboard_type || null);
        if (!role) throw AppError.notFound('Role not found or is a system role.');
        return role;
    }

    async deleteRole(id: string, tenantId: string) {
        if (!tenantId) throw AppError.unauthorized('No tenant context');
        const res = await this.repo.deleteRole(id, tenantId);
        if (res.error === 'users_assigned') throw AppError.badRequest('Cannot delete role: users still assigned.');
        if (!res.deleted) throw AppError.notFound('Role not found or is a system role.');
    }

    async updateRolePermissions(id: string, tenantId: string, permissions: string[]) {
        const exists = await this.repo.checkRoleExists(id, tenantId);
        if (!exists) throw AppError.notFound('Role');
        
        await this.repo.clearRolePermissions(id);
        for (const permKey of permissions) {
            const [module, action] = permKey.split(':');
            if (!module || !action) continue;
            const pId = await this.repo.getPermissionId(module, action);
            if (pId) {
                await this.repo.addRolePermission(parseInt(id), pId);
            }
        }
    }
}
