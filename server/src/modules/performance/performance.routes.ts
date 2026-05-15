import { Router } from 'express';
import { getPerformanceReviews, createPerformanceReview, updatePerformanceReview, deletePerformanceReview } from './performance.controller';
import { authenticate, authorize } from '../../core/security/authorize';
import { validateRequest } from '../../core/validation/validateRequest';
import { createPerformanceReviewSchema, updatePerformanceReviewSchema } from './performance.schema';
import { asyncHandler } from '../../core/errors/asyncHandler';
import { UserRole } from '../../types';

const router = Router();

router.use(authenticate);

router.get('/', asyncHandler(getPerformanceReviews));
router.post('/', authorize([UserRole.MANAGER, UserRole.HR, UserRole.ADMIN, UserRole.SUPER_ADMIN]), validateRequest(createPerformanceReviewSchema, 'body'), asyncHandler(createPerformanceReview));
router.put('/:id', validateRequest(updatePerformanceReviewSchema, 'body'), asyncHandler(updatePerformanceReview));
router.delete('/:id', authorize([UserRole.ADMIN, UserRole.SUPER_ADMIN]), asyncHandler(deletePerformanceReview));

export default router;
