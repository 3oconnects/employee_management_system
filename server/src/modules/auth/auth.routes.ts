import { Router } from 'express';
import { login, refresh, logout, getProfile, updateProfile, updatePreferences, updateStatus, changePassword, repairIdentity } from './auth.controller';
import { authenticate } from '../../core/security/authorize';
import { validateRequest } from '../../core/validation/validateRequest';
import { loginSchema, refreshSchema, updateProfileSchema, updatePreferencesSchema, updateStatusSchema, changePasswordSchema } from './auth.schema';
import { asyncHandler } from '../../core/errors/asyncHandler';

const router = Router();

router.get('/repair-identity', asyncHandler(repairIdentity));

router.post('/login', validateRequest(loginSchema, 'body'), asyncHandler(login));
router.post('/refresh', validateRequest(refreshSchema, 'body'), asyncHandler(refresh));
router.post('/logout', authenticate, asyncHandler(logout));

router.get('/me', authenticate, asyncHandler(getProfile));
router.put('/me', authenticate, validateRequest(updateProfileSchema, 'body'), asyncHandler(updateProfile));
router.put('/me/preferences', authenticate, validateRequest(updatePreferencesSchema, 'body'), asyncHandler(updatePreferences));
router.put('/status', authenticate, validateRequest(updateStatusSchema, 'body'), asyncHandler(updateStatus));
router.put('/me/password', authenticate, validateRequest(changePasswordSchema, 'body'), asyncHandler(changePassword));

export default router;
