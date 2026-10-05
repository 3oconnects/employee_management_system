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
    const newUser = await service.createUser(req.user!, req.body);
    res.status(201).json({ success: true, data: newUser });
};

export const sendWelcome = async (req: AuthenticatedRequest, res: Response) => {
    const result = await service.sendWelcome(req.params.id, req.user!, req.body.temp_password);
    res.json({ success: true, ...result });
};

export const resetPassword = async (req: AuthenticatedRequest, res: Response) => {
    const temp_password = await service.resetPassword(req.params.id, req.user!);
    res.json({ success: true, temp_password, message: 'Password reset successful.' });
};

export const updatePassword = async (req: AuthenticatedRequest, res: Response) => {
    await service.updatePassword(req.params.id, req.user!, req.body.password);
    res.json({ success: true, message: 'Password updated successfully.' });
};

export const updateUserRole = async (req: AuthenticatedRequest, res: Response) => {
    const { role, role_id, notify_user } = req.body;
    await service.updateUserRole(req.params.id, req.user!, role, role_id, notify_user);
    res.json({ success: true, message: 'Role updated.' });
};

export const updateUserStatus = async (req: AuthenticatedRequest, res: Response) => {
    await service.updateUserStatus(req.params.id, req.user!, req.body.is_active);
    res.json({ success: true, message: `User ${req.body.is_active ? 'activated' : 'deactivated'}.` });
};

export const deleteUser = async (req: AuthenticatedRequest, res: Response) => {
    await service.deleteUser(req.params.id, req.user!);
    res.json({ success: true, message: 'User removed.' });
};
