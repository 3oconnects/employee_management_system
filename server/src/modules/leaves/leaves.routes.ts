import { Router } from 'express';
import {
    getLeaveTypes,
    applyLeave,
    getLeaveRequests,
    approveLeave,
    updateLeaveRequest,
    deleteLeaveRequest,
    getLeaveBalance,
} from './leaves.controller';
import { authenticate, requireSelfOrAdmin } from '../../core/security/authorize';
import { validateRequest } from '../../core/validation/validateRequest';
import { applyLeaveSchema, approveLeaveSchema, updateLeaveSchema } from './leaves.schema';
import { asyncHandler } from '../../core/errors/asyncHandler';

const router = Router();

router.use(authenticate);

router.get('/types', asyncHandler(getLeaveTypes));

// POST mutation — userId always from JWT (Phase 1)
router.post('/apply', validateRequest(applyLeaveSchema, 'body'), asyncHandler(applyLeave));

// GET list — admin/HR filter via req.query handled inside service; no userId spoofing risk
router.get('/', asyncHandler(getLeaveRequests));

// Legacy aliases
router.get('/requests', asyncHandler(getLeaveRequests));
router.delete('/requests/:id', asyncHandler(deleteLeaveRequest));
router.put('/requests/:id', validateRequest(updateLeaveSchema, 'body'), asyncHandler(updateLeaveRequest));

// GET balance — accepts ?userId= for admin/HR cross-user viewing; guarded
router.get('/balance', requireSelfOrAdmin, asyncHandler(getLeaveBalance));

router.put('/:id/approve', validateRequest(approveLeaveSchema, 'body'), asyncHandler(approveLeave));
router.put('/:id', validateRequest(updateLeaveSchema, 'body'), asyncHandler(updateLeaveRequest));
router.delete('/:id', asyncHandler(deleteLeaveRequest));

export default router;
