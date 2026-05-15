import { Router } from 'express';
import { getApprovals, createApprovalRequest, updateApprovalAction } from './approvals.controller';
import { authenticate } from '../../core/security/authorize';
import { validateRequest } from '../../core/validation/validateRequest';
import { createApprovalSchema, updateApprovalActionSchema } from './approvals.schema';
import { asyncHandler } from '../../core/errors/asyncHandler';

const router = Router();

router.use(authenticate);

router.get('/', asyncHandler(getApprovals));
router.post('/', validateRequest(createApprovalSchema, 'body'), asyncHandler(createApprovalRequest));
router.post('/:id/action', validateRequest(updateApprovalActionSchema, 'body'), asyncHandler(updateApprovalAction));

export default router;
