// ============================================================================
// EMS BACKEND — AUDIT LOG ROUTES
// ============================================================================

import express from 'express';
import { authenticate, authorize } from '../middleware/authMiddleware';
import { asyncHandler } from '../middleware/errorHandler';
import { AuditService } from '../services/auditService';
import { AuthenticatedRequest, UserRole } from '../types';

const router = express.Router();

// GET /api/v1/audit-logs — List audit logs for the current tenant
router.get(
    '/',
    authenticate,
    authorize([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.HR]),
    asyncHandler(async (req: AuthenticatedRequest, res) => {
        const { entityType, entityId, userId, action, page = '1', limit = '50' } = req.query;

        const pageNum = parseInt(page as string) || 1;
        const limitNum = parseInt(limit as string) || 50;
        const offset = (pageNum - 1) * limitNum;

        const result = await AuditService.getLogsByTenant(req.user!.tenantId, {
            entityType: entityType as string,
            entityId: entityId as string,
            userId: userId ? parseInt(userId as string) : undefined,
            action: action as string,
            limit: limitNum,
            offset,
        });

        res.json({
            success: true,
            data: result.items,
            pagination: {
                page: pageNum,
                limit: limitNum,
                totalItems: result.total,
                totalPages: Math.ceil(result.total / limitNum),
            },
        });
    })
);

export default router;
