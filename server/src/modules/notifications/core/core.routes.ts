import { Router } from 'express';
import { getNotifications, markAsRead, markAllAsRead } from './core.controller';
import { authenticate } from '../../../core/security/authorize';
import { asyncHandler } from '../../../core/errors/asyncHandler';

const router = Router();

router.use(authenticate);

router.get('/', asyncHandler(getNotifications));
router.put('/read-all', asyncHandler(markAllAsRead));
router.put('/:id/read', asyncHandler(markAsRead));

export default router;
