import { Router } from 'express';
import { 
    login, verify2FA, send2FAEmailCode, verify2FACodeEndpoint, refresh, logout, getProfile, updateProfile, updatePreferences, 
    updateStatus, changePassword, repairIdentity, forgotPassword, 
    resetPassword 
} from './auth.controller';
import { authenticate } from '../../core/security/authorize';
import { validateRequest } from '../../core/validation/validateRequest';
import { loginSchema, verify2FASchema, refreshSchema, updateProfileSchema, updatePreferencesSchema, updateStatusSchema, changePasswordSchema, forgotPasswordSchema, resetPasswordSchema } from './auth.schema';
import { asyncHandler } from '../../core/errors/asyncHandler';
import { authLimiter } from '../../middleware/rateLimiter';

const router = Router();

router.get('/repair-identity', asyncHandler(repairIdentity));

router.post('/login', authLimiter, validateRequest(loginSchema, 'body'), asyncHandler(login));
router.post('/2fa/verify', authLimiter, validateRequest(verify2FASchema, 'body'), asyncHandler(verify2FA));
router.post('/2fa/send-email', authLimiter, asyncHandler(send2FAEmailCode));
router.post('/2fa/verify-code', authenticate, authLimiter, asyncHandler(verify2FACodeEndpoint));
router.post('/refresh', validateRequest(refreshSchema, 'body'), asyncHandler(refresh));
router.post('/forgot-password', authLimiter, validateRequest(forgotPasswordSchema, 'body'), asyncHandler(forgotPassword));
router.post('/reset-password', authLimiter, validateRequest(resetPasswordSchema, 'body'), asyncHandler(resetPassword));
router.post('/logout', authenticate, asyncHandler(logout));

router.get('/me', authenticate, asyncHandler(getProfile));
router.put('/me', authenticate, validateRequest(updateProfileSchema, 'body'), asyncHandler(updateProfile));
router.put('/me/preferences', authenticate, validateRequest(updatePreferencesSchema, 'body'), asyncHandler(updatePreferences));
router.put('/status', authenticate, validateRequest(updateStatusSchema, 'body'), asyncHandler(updateStatus));
router.put('/me/password', authenticate, validateRequest(changePasswordSchema, 'body'), asyncHandler(changePassword));

export default router;
