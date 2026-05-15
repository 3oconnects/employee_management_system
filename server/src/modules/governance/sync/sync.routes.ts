import { Router } from 'express';
import { syncGraph } from './sync.controller';
import { authenticate, authorize } from '../../../core/security/authorize';
import { asyncHandler } from '../../../core/errors/asyncHandler';

const router = Router();

router.use(authenticate);

router.post('/sync', authorize(['admin', 'hr', 'super_admin']), asyncHandler(syncGraph));

export default router;
