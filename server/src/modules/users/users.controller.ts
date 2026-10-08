import { Response } from 'express';
import { UsersService } from './users.service';
import { AuthenticatedRequest } from '../../types';

const service = new UsersService();

export const updateProfile = async (req: AuthenticatedRequest, res: Response) => {
    // ARC-01: Identity comes ONLY from the authenticated token, never from the request body.
    // Hardening: strictly ignore / delete any client-provided identity or privilege fields
    const userId = req.user!.userId;
    const tenantId = req.user!.tenantId;

    delete req.body.id;
    delete req.body.userId;
    delete req.body.tenantId;
    delete req.body.role;
    delete req.body.permissions;

    const { name, first_name, last_name, email, phone, address, emergency } = req.body;
    const resolvedName = name || (first_name ? `${first_name} ${last_name || ''}`.trim() : '');
    const user = await service.updateProfile(userId, resolvedName, email, phone, address, emergency, tenantId);
    res.json({ message: 'Profile updated successfully', user });
};

export const getUsers = async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.user!.tenantId;
    const items = await service.getUsers(tenantId, req.query.role as string);
    res.json({ success: true, items });
};
