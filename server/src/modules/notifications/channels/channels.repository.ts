import { query } from '../../../db/connection';

export class NotificationChannelsRepository {
    async insertNotification(params: any) {
        try {
            await query(
                `INSERT INTO notifications (tenant_id, user_id, title, message, type, link)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [
                    params.tenantId,
                    params.userId,
                    params.title,
                    params.message,
                    params.type || 'info',
                    params.link || null,
                ]
            );
        } catch (err) {
            console.error('⚠️ Notification write failed (non-blocking):', err);
        }
    }

    async getUsersForRoles(tenantId: string, roles: string[]) {
        try {
            const result = await query(
                `SELECT id FROM users WHERE tenant_id = $1 AND role = ANY($2) AND is_active = true AND deleted_at IS NULL`,
                [tenantId, roles]
            );
            return result.rows.map((r: any) => r.id);
        } catch (err) {
            console.error('⚠️ Bulk notification failed (non-blocking):', err);
            return [];
        }
    }

    async getUnreadCount(tenantId: string, userId: number) {
        const result = await query(
            'SELECT COUNT(*) FROM notifications WHERE tenant_id = $1 AND user_id = $2 AND is_read = false',
            [tenantId, userId]
        );
        return parseInt(result.rows[0].count);
    }
}
