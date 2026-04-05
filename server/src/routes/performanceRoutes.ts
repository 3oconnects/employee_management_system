import express from 'express';
import { authenticate, authorize } from '../middleware/authMiddleware';
import { UserRole } from '../types';
import { 
    getPerformanceReviews, 
    createPerformanceReview, 
    updatePerformanceReview, 
    deletePerformanceReview 
} from '../controllers/performanceController';

const router = express.Router();

// GET /api/v1/performance — Get reviews (filterable via employeeId/status)
router.get('/', authenticate, getPerformanceReviews);

// POST /api/v1/performance — Create new review (Manager/HR/Admin)
router.post(
    '/',
    authenticate,
    authorize([UserRole.MANAGER, UserRole.HR, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
    createPerformanceReview
);

// PUT /api/v1/performance/:id — Update existing review
router.put(
    '/:id',
    authenticate,
    updatePerformanceReview
);

// DELETE /api/v1/performance/:id — Delete review
router.delete(
    '/:id',
    authenticate,
    authorize([UserRole.ADMIN, UserRole.SUPER_ADMIN]),
    deletePerformanceReview
);

export default router;
