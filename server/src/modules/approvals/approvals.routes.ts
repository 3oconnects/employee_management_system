import { Router } from 'express';
import { getApprovals, createApprovalRequest, updateApprovalAction } from './approvals.controller';
import { authenticate, authorize } from '../../core/security/authorize';
import { ANY_APPROVER_PERMISSIONS } from './approvals.policy';
import { validateRequest } from '../../core/validation/validateRequest';
import { createApprovalSchema, updateApprovalActionSchema } from './approvals.schema';
import { asyncHandler } from '../../core/errors/asyncHandler';

const router = Router();

router.use(authenticate);

router.get('/', asyncHandler(getApprovals));
router.post('/', authorize(['approvals:approve']), validateRequest(createApprovalSchema, 'body'), asyncHandler(createApprovalRequest));
// Cheap gate: the caller must be able to decide at least one kind of request. The exact permission
// for this request's type is checked in the service once the real record is known.
router.post('/:id/action', authorize(ANY_APPROVER_PERMISSIONS), validateRequest(updateApprovalActionSchema, 'body'), asyncHandler(updateApprovalAction));

export default router;
