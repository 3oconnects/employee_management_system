// ============================================================================
// EMS BACKEND — NOTIFICATION ROUTES
// ============================================================================

import express from 'express';
import { authenticate } from '../middleware/authMiddleware';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../types';
import { query } from '../db/connection';

const router = express.Router();

// GET /api/v1/notifications — Get notifications for the current user
router.get(
    '/',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res) => {
        const limit = parseInt(req.query.limit as string) || 20;
        const offset = parseInt(req.query.offset as string) || 0;

        const result = await query(
            `SELECT * FROM notifications
             WHERE user_id = $1 AND tenant_id = $2
             ORDER BY created_at DESC
             LIMIT $3 OFFSET $4`,
            [req.user!.userId, req.user!.tenantId, limit, offset]
        );

        const unreadCount = await query(
            `SELECT COUNT(*) FROM notifications
             WHERE user_id = $1 AND tenant_id = $2 AND is_read = false`,
            [req.user!.userId, req.user!.tenantId]
        );

        res.json({
            success: true,
            data: result.rows,
            unreadCount: parseInt(unreadCount.rows[0].count),
        });
    })
);

// PUT /api/v1/notifications/:id/read — Mark a notification as read
router.put(
    '/:id/read',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res) => {
        const result = await query(
            `UPDATE notifications SET is_read = true
             WHERE id = $1 AND user_id = $2 AND tenant_id = $3
             RETURNING *`,
            [req.params.id, req.user!.userId, req.user!.tenantId]
        );

        if (result.rows.length === 0) throw AppError.notFound('Notification');

        res.json({ success: true, message: 'Notification marked as read.' });
    })
);

// PUT /api/v1/notifications/read-all — Mark all notifications as read
router.put(
    '/read-all',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res) => {
        await query(
            `UPDATE notifications SET is_read = true
             WHERE user_id = $1 AND tenant_id = $2 AND is_read = false`,
            [req.user!.userId, req.user!.tenantId]
        );

        res.json({ success: true, message: 'All notifications marked as read.' });
    })
);

export default router;
