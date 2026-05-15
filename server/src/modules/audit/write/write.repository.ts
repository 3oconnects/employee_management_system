import { query } from '../../../db/connection';

export class AuditWriteRepository {
    async log(params: any) {
        try {
            await query(
                `INSERT INTO audit_logs
                    (tenant_id, user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                [
                    params.tenantId,
                    params.userId,
                    params.action,
                    params.entityType,
                    params.entityId || null,
                    params.oldValues ? JSON.stringify(params.oldValues) : null,
                    params.newValues ? JSON.stringify(params.newValues) : null,
                    params.ipAddress || null,
                    params.userAgent || null,
                ]
            );
        } catch (err) {
            console.error('⚠️ Audit log write failed (non-blocking):', err);
        }
    }
}
