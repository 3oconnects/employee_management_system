import { Router } from 'express';
import { getConfig, updateConfig, testEmail } from './configuration.controller';
import { asyncHandler } from '../../../core/errors/asyncHandler';

const router = Router();

router.get('/config', asyncHandler(getConfig));
router.put('/config', asyncHandler(updateConfig));
router.post('/test-email', asyncHandler(testEmail));

export default router;
