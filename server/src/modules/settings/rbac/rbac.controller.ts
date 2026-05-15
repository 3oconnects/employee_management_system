import { Response } from 'express';
import { RBACService } from './rbac.service';
import { AuthenticatedRequest } from '../../../types';

const service = new RBACService();
const DEFAULT_TENANT = 'default';

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

export const createRole = async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.user?.tenantId || DEFAULT_TENANT;
    const role = await service.createRole(tenantId, req.body);
    res.status(201).json({ success: true, data: role });
};

export const updateRole = async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.user?.tenantId || DEFAULT_TENANT;
    const role = await service.updateRole(req.params.id, tenantId, req.body);
    res.json({ success: true, data: role });
};

export const deleteRole = async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.user?.tenantId;
    await service.deleteRole(req.params.id, tenantId!);
    res.json({ success: true, message: 'Role deleted.' });
};

export const updateRolePermissions = async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.user?.tenantId || DEFAULT_TENANT;
    await service.updateRolePermissions(req.params.id, tenantId, req.body.permissions || []);
    res.json({ success: true, message: 'Permissions updated.', permissions: req.body.permissions || [] });
};
