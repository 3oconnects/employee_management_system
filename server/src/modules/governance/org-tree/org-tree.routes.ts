import { Router } from 'express';
import { getOrgTree, searchNodes, updateGovernance } from './org-tree.controller';
import { authenticate, authorize } from '../../../core/security/authorize';
import { validateRequest } from '../../../core/validation/validateRequest';
import { updateGovernanceSchema } from '../governance.schema';
import { asyncHandler } from '../../../core/errors/asyncHandler';

const router = Router();

router.use(authenticate);

router.get('/tree', asyncHandler(getOrgTree));
router.get('/search', asyncHandler(searchNodes));
router.put('/:nodeId', authorize(['admin', 'hr', 'super_admin']), validateRequest(updateGovernanceSchema, 'body'), asyncHandler(updateGovernance));

export default router;
