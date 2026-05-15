import { Router } from 'express';
import { submitClaim, getEmployeeClaims, getAllClaims, updateClaimStatus } from './claims.controller';
import { authenticate } from '../../core/security/authorize';
import { validateRequest } from '../../core/validation/validateRequest';
import { submitClaimSchema, updateClaimStatusSchema } from './claims.schema';
import { asyncHandler } from '../../core/errors/asyncHandler';

const router = Router();

router.use(authenticate);

router.post('/', validateRequest(submitClaimSchema, 'body'), asyncHandler(submitClaim));
router.get('/employee/:employeeId', asyncHandler(getEmployeeClaims));
router.get('/', asyncHandler(getAllClaims));
router.put('/:id/status', validateRequest(updateClaimStatusSchema, 'body'), asyncHandler(updateClaimStatus));

export default router;
