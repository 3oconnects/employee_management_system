import { Router } from 'express';
import { submitClaim, getEmployeeClaims, getAllClaims, updateClaimStatus } from './claims.controller';
import { authenticate, authorize } from '../../core/security/authorize';
import { validateRequest } from '../../core/validation/validateRequest';
import { submitClaimSchema, updateClaimStatusSchema } from './claims.schema';
import { asyncHandler } from '../../core/errors/asyncHandler';

const router = Router();

router.use(authenticate);

router.post('/', validateRequest(submitClaimSchema, 'body'), asyncHandler(submitClaim));
router.get('/employee/:employeeId', asyncHandler(getEmployeeClaims));
// Every employee's claims: approvers only (HF-5). Own claims: /employee/:employeeId (own id) or approvers.
router.get('/', authorize(['claims:approve']), asyncHandler(getAllClaims));
// Contract alias for frontend admin approvals view
router.get('/admin', authorize(['claims:approve']), asyncHandler(getAllClaims));
router.put('/:id/status', authorize(['claims:approve']), validateRequest(updateClaimStatusSchema, 'body'), asyncHandler(updateClaimStatus));

export default router;
