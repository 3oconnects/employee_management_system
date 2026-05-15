import { query } from '../../db/connection';

export class NotificationsRepository {
    async getNotifications(userId: number, tenantId: string, limit: number, offset: number) {
        const result = await query(
            `SELECT * FROM notifications
             WHERE user_id = $1 AND tenant_id = $2
             ORDER BY created_at DESC
             LIMIT $3 OFFSET $4`,
            [userId, tenantId, limit, offset]
        );

        const unreadCount = await query(
            `SELECT COUNT(*) FROM notifications
             WHERE user_id = $1 AND tenant_id = $2 AND is_read = false`,
            [userId, tenantId]
        );

        return {
            items: result.rows,
            unreadCount: parseInt(unreadCount.rows[0].count),
        };
    }

    async markAsRead(id: string, userId: number, tenantId: string) {
        const result = await query(
            `UPDATE notifications SET is_read = true
             WHERE id = $1 AND user_id = $2 AND tenant_id = $3
             RETURNING *`,
            [id, userId, tenantId]
        );
        return result.rows[0];
    }

    async markAllAsRead(userId: number, tenantId: string) {
        await query(
            `UPDATE notifications SET is_read = true
             WHERE user_id = $1 AND tenant_id = $2 AND is_read = false`,
            [userId, tenantId]
        );
    }
}
