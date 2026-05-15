import { query } from '../../../db/connection';

export class AuditReadRepository {
    async getLogs(tenantId: string, filters: any) {
        const { entityType, entityId, userId, action, limit = 50, offset = 0 } = filters;
        let sql = `
            SELECT al.*, u.name as user_name, u.email as user_email
            FROM audit_logs al
            LEFT JOIN users u ON u.id = al.user_id
            WHERE al.tenant_id = $1
        `;
        const params: any[] = [tenantId];
        let idx = 2;

        if (entityType) { sql += ` AND al.entity_type = $${idx++}`; params.push(entityType); }
        if (entityId) { sql += ` AND al.entity_id = $${idx++}`; params.push(entityId); }
        if (userId) { sql += ` AND al.user_id = $${idx++}`; params.push(userId); }
        if (action) { sql += ` AND al.action = $${idx++}`; params.push(action); }

        sql += ` ORDER BY al.created_at DESC LIMIT $${idx++} OFFSET $${idx}`;
        params.push(limit, offset);

        const result = await query(sql, params);

        const countSql = `SELECT COUNT(*) FROM audit_logs WHERE tenant_id = $1`;
        const countResult = await query(countSql, [tenantId]);

        return {
            items: result.rows,
            total: parseInt(countResult.rows[0].count),
        };
    }
}
