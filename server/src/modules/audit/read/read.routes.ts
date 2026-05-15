import { Router } from 'express';
import { getLogs } from './read.controller';
import { asyncHandler } from '../../../core/errors/asyncHandler';
import { authenticate } from '../../../core/security/authorize';

const router = Router();

router.use(authenticate);
router.get('/', asyncHandler(getLogs));

export default router;
