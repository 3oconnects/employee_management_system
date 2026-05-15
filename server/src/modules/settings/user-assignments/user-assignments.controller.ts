import { Response } from 'express';
import { UserAssignmentsService } from './user-assignments.service';
import { AuthenticatedRequest } from '../../../types';

const service = new UserAssignmentsService();
const DEFAULT_TENANT = 'default';

export const getUsers = async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.user?.tenantId || DEFAULT_TENANT;
    const result = await service.getUsers(tenantId);
    res.json({ success: true, ...result });
};

export const createUser = async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.user?.tenantId || DEFAULT_TENANT;
    const newUser = await service.createUser(tenantId, req.body);
    res.status(201).json({ success: true, data: newUser });
};

export const sendWelcome = async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.user?.tenantId || DEFAULT_TENANT;
    const result = await service.sendWelcome(req.params.id, tenantId, req.body.temp_password);
    res.json({ success: true, ...result });
};

export const resetPassword = async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.user?.tenantId || DEFAULT_TENANT;
    const temp_password = await service.resetPassword(req.params.id, tenantId);
    res.json({ success: true, temp_password, message: 'Password reset successful.' });
};

export const getTempPassword = async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.user?.tenantId || DEFAULT_TENANT;
    const data = await service.getTempPassword(req.params.id, tenantId);
    res.json({ success: true, data });
};

export const updatePassword = async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.user?.tenantId || DEFAULT_TENANT;
    await service.updatePassword(req.params.id, tenantId, req.body.password);
    res.json({ success: true, message: 'Password updated successfully.' });
};

export const updateUserRole = async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.user?.tenantId || DEFAULT_TENANT;
    const { role, role_id, notify_user } = req.body;
    await service.updateUserRole(req.params.id, tenantId, role, role_id, notify_user);
    res.json({ success: true, message: 'Role updated.' });
};

export const updateUserStatus = async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.user?.tenantId || DEFAULT_TENANT;
    await service.updateUserStatus(req.params.id, tenantId, req.body.is_active);
    res.json({ success: true, message: `User ${req.body.is_active ? 'activated' : 'deactivated'}.` });
};

export const deleteUser = async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.user?.tenantId || DEFAULT_TENANT;
    await service.deleteUser(req.params.id, tenantId, req.user!.userId);
    res.json({ success: true, message: 'User removed.' });
};
