import { NotificationsCoreRepository } from './core.repository';
import { AppError } from '../../../core/errors/AppError';

export class NotificationsCoreService {
    private repo: NotificationsCoreRepository;

    constructor() {
        this.repo = new NotificationsCoreRepository();
    }

    async getNotifications(userId: number, tenantId: string, limit: number, offset: number) {
        return this.repo.getNotifications(userId, tenantId, limit, offset);
    }

    async markAsRead(id: string, userId: number, tenantId: string) {
        const notif = await this.repo.markAsRead(id, userId, tenantId);
        if (!notif) {
            throw AppError.notFound('Notification not found');
        }
        return notif;
    }

    async markAllAsRead(userId: number, tenantId: string) {
        await this.repo.markAllAsRead(userId, tenantId);
    }
}
