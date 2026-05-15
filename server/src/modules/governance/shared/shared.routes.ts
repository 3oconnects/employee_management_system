import { Router } from 'express';
import { resolveOwnership } from './shared.controller';
import { authenticate } from '../../../core/security/authorize';
import { asyncHandler } from '../../../core/errors/asyncHandler';

const router = Router();

router.use(authenticate);

router.get('/resolve/:nodeId', asyncHandler(resolveOwnership));

export default router;
