import { Response } from 'express';
import { AuthenticatedRequest } from '../../../types';
import { NotificationsCoreService } from './core.service';

const service = new NotificationsCoreService();

export const getNotifications = async (req: AuthenticatedRequest, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const data = await service.getNotifications(req.user!.userId, req.user!.tenantId, limit, offset);

    res.json({
        success: true,
        data: data.items,
        meta: {
            unreadCount: data.unreadCount,
            page,
            limit,
        },
    });
};

export const markAsRead = async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const notif = await service.markAsRead(id, req.user!.userId, req.user!.tenantId);
    res.json({ success: true, data: notif });
};

export const markAllAsRead = async (req: AuthenticatedRequest, res: Response) => {
    await service.markAllAsRead(req.user!.userId, req.user!.tenantId);
    res.json({ success: true, message: 'All notifications marked as read.' });
};
