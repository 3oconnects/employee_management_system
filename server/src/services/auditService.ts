// ============================================================================
// EMS BACKEND — AUDIT LOG SERVICE
// ============================================================================
// Centralized service for logging audit trails. Every sensitive operation
// (create, update, delete, login, payroll run, etc.) should call this service.
// ============================================================================

import { query } from '../db/connection';
import { AuditAction, AuthenticatedRequest } from '../types';

interface AuditLogParams {
    tenantId: string;
    userId: number;
    action: AuditAction;
    entityType: string;
    entityId?: string;
    oldValues?: Record<string, unknown>;
    newValues?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
}

export class AuditService {
    /**
     * Create an audit log entry.
     * This is fire-and-forget — failures are logged but do not break the caller.
     */
    static async log(params: AuditLogParams): Promise<void> {
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

    /**
     * Convenience: Extract audit context from an authenticated request.
     */
    static fromRequest(req: AuthenticatedRequest): Pick<AuditLogParams, 'tenantId' | 'userId' | 'ipAddress' | 'userAgent'> {
        return {
            tenantId: req.user?.tenantId || 'unknown',
            userId: req.user?.userId || 0,
            ipAddress: (req.headers['x-forwarded-for'] as string) || req.ip || 'unknown',
            userAgent: req.headers['user-agent'] || 'unknown',
        };
    }

    /**
     * Get audit logs for a tenant, with optional filters.
     */
    static async getLogsByTenant(
        tenantId: string,
        filters: {
            entityType?: string;
            entityId?: string;
            userId?: number;
            action?: string;
            limit?: number;
            offset?: number;
        } = {}
    ) {
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
