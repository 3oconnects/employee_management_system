import { NotificationsRepository } from './notifications.repository';
import { AppError } from '../../core/errors/AppError';

export class NotificationsService {
    private repo: NotificationsRepository;

    constructor() {
        this.repo = new NotificationsRepository();
    }

    async getNotifications(userId: number, tenantId: string, limit: number, offset: number) {
        return this.repo.getNotifications(userId, tenantId, limit, offset);
    }

    async markAsRead(id: string, userId: number, tenantId: string) {
        const notification = await this.repo.markAsRead(id, userId, tenantId);
        if (!notification) throw AppError.notFound('Notification');
        return notification;
    }

    async markAllAsRead(userId: number, tenantId: string) {
        await this.repo.markAllAsRead(userId, tenantId);
    }
}
