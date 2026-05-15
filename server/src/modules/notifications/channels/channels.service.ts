import { NotificationChannelsRepository } from './channels.repository';

export class NotificationChannelsService {
    private static repo = new NotificationChannelsRepository();

    static async notify(params: any): Promise<void> {
        await this.repo.insertNotification(params);
    }

    static async notifyMany(tenantId: string, userIds: number[], params: any): Promise<void> {
        for (const userId of userIds) {
            await this.notify({ tenantId, userId, ...params });
        }
    }

    static async notifyByRole(tenantId: string, roles: string[], params: any): Promise<void> {
        const userIds = await this.repo.getUsersForRoles(tenantId, roles);
        await this.notifyMany(tenantId, userIds, params);
    }

    static async getUnreadCount(tenantId: string, userId: number): Promise<number> {
        return this.repo.getUnreadCount(tenantId, userId);
    }
}
