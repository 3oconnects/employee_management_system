import { Router } from 'express';
import { getDepartments } from './departments.controller';
import { authenticate } from '../../core/security/authorize';
import { asyncHandler } from '../../core/errors/asyncHandler';

const router = Router();

router.use(authenticate);

router.get('/', asyncHandler(getDepartments));

export default router;
