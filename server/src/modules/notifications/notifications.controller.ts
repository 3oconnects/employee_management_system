import { Response } from 'express';
import { NotificationsService } from './notifications.service';
import { AuthenticatedRequest } from '../../types';

const service = new NotificationsService();

export const getNotifications = async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.user!.tenantId;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;
    
    const { items, unreadCount } = await service.getNotifications(req.user!.userId, tenantId, limit, offset);
    res.json({ success: true, data: items, unreadCount });
};

export const markAsRead = async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.user!.tenantId;
    await service.markAsRead(req.params.id, req.user!.userId, tenantId);
    res.json({ success: true, message: 'Notification marked as read.' });
};

export const markAllAsRead = async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.user!.tenantId;
    await service.markAllAsRead(req.user!.userId, tenantId);
    res.json({ success: true, message: 'All notifications marked as read.' });
};
