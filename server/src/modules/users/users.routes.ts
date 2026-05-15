import { Router } from 'express';
import { updateProfile, getUsers } from './users.controller';
import { authenticate } from '../../core/security/authorize';
import { validateRequest } from '../../core/validation/validateRequest';
import { updateProfileSchema } from './users.schema';
import { asyncHandler } from '../../core/errors/asyncHandler';

const router = Router();

router.use(authenticate);

router.get('/', asyncHandler(getUsers));
router.put('/profile', validateRequest(updateProfileSchema, 'body'), asyncHandler(updateProfile));

export default router;
