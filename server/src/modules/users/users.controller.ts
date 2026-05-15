import { Response } from 'express';
import { UsersService } from './users.service';
import { AuthenticatedRequest } from '../../types';

const service = new UsersService();

export const updateProfile = async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { id, name, email, phone, address, emergency } = req.body;
    const user = await service.updateProfile(id, name, email, phone, address, emergency, tenantId);
    res.json({ message: 'Profile updated successfully', user });
};

export const getUsers = async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.user!.tenantId;
    const items = await service.getUsers(tenantId, req.query.role as string);
    res.json({ success: true, items });
};
