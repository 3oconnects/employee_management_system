import { Router } from 'express';
import {
    getTodayStatus,
    checkIn,
    checkOut,
    getHistory,
    getWeeklyHours,
    getSummary,
    regularize,
} from './attendance.controller';
import { authenticate, requireSelfOrAdmin } from '../../core/security/authorize';
import { validateRequest } from '../../core/validation/validateRequest';
import { checkInSchema, checkOutSchema, regularizeSchema } from './attendance.schema';
import { asyncHandler } from '../../core/errors/asyncHandler';

const router = Router();

router.use(authenticate);

// GET endpoints that accept ?userId= — guarded so only admin/HR/manager
// can view another user's data; employees are limited to their own.
router.get('/today',        requireSelfOrAdmin, asyncHandler(getTodayStatus));
router.get('/history',      requireSelfOrAdmin, asyncHandler(getHistory));
router.get('/weekly-hours', requireSelfOrAdmin, asyncHandler(getWeeklyHours));

// :userId route param — requireSelfOrAdmin reads req.query.userId;
// for param-based routes we pass the param into query so the same
// middleware works uniformly. Guard applied here, not in controller.
router.get('/summary/:userId', requireSelfOrAdmin, asyncHandler(getSummary));

// POST mutations — userId always sourced from JWT (Phase 1 fix)
router.post('/check-in',   validateRequest(checkInSchema, 'body'),   asyncHandler(checkIn));
router.post('/check-out',  validateRequest(checkOutSchema, 'body'),  asyncHandler(checkOut));
router.post('/regularize', validateRequest(regularizeSchema, 'body'), asyncHandler(regularize));

export default router;
