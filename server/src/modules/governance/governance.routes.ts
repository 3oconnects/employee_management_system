import { Router } from 'express';
import { getOrgTree, syncGraph, searchNodes, resolveOwnership, updateGovernance } from './governance.controller';
import { authenticate, authorize } from '../../core/security/authorize';
import { validateRequest } from '../../core/validation/validateRequest';
import { updateGovernanceSchema } from './governance.schema';
import { asyncHandler } from '../../core/errors/asyncHandler';

const router = Router();

router.use(authenticate);

router.get('/tree', asyncHandler(getOrgTree));
router.post('/sync', authorize(['admin', 'hr', 'super_admin']), asyncHandler(syncGraph));
router.get('/search', asyncHandler(searchNodes));
router.get('/resolve/:nodeId', asyncHandler(resolveOwnership));
router.put('/:nodeId', authorize(['admin', 'hr', 'super_admin']), validateRequest(updateGovernanceSchema, 'body'), asyncHandler(updateGovernance));

export default router;
