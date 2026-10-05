import { Response } from 'express';
import { RBACService } from './rbac.service';
import { AuthenticatedRequest } from '../../../types';

const service = new RBACService();
const DEFAULT_TENANT = 'tenant_default';

export const getPermissions = async (_req: AuthenticatedRequest, res: Response) => {
    const { grouped, flat } = await service.getPermissions();
    res.json({ success: true, data: grouped, flat });
};

export const getRoles = async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.user?.tenantId || DEFAULT_TENANT;
    const { roles, warning } = await service.getRoles(tenantId);
    if (warning) {
        res.json({ success: true, data: roles, warning });
    } else {
        res.json({ success: true, data: roles });
    }
};

export const getRoleMembers = async (req: AuthenticatedRequest, res: Response) => {
    const data = await service.listRoleMembers(req.user!, req.params.id, req.query);
    res.json({ success: true, ...data });
};

export const getRoleCandidates = async (req: AuthenticatedRequest, res: Response) => {
    const data = await service.listRoleMembers(req.user!, req.params.id, req.query, true);
    res.json({ success: true, ...data });
};

export const createRole = async (req: AuthenticatedRequest, res: Response) => {
    const role = await service.createRole(req.user!, req.body);
    res.status(201).json({ success: true, data: role });
};

export const updateRole = async (req: AuthenticatedRequest, res: Response) => {
    const role = await service.updateRole(req.params.id, req.user!, req.body);
    res.json({ success: true, data: role });
};

export const deleteRole = async (req: AuthenticatedRequest, res: Response) => {
    await service.deleteRole(req.params.id, req.user!);
    res.json({ success: true, message: 'Role deleted.' });
};

export const updateRolePermissions = async (req: AuthenticatedRequest, res: Response) => {
    await service.updateRolePermissions(req.params.id, req.user!, req.body.permissions || []);
    res.json({ success: true, message: 'Permissions updated.', permissions: req.body.permissions || [] });
};
