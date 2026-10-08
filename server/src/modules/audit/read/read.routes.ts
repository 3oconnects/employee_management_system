import { Router } from 'express';
import { getLogs } from './read.controller';
import { asyncHandler } from '../../../core/errors/asyncHandler';
import { authenticate, authorize } from '../../../core/security/authorize';

const router = Router();

router.use(authenticate);
// HF-5: the audit trail is read-only through the API (there are no write, edit or delete routes)
// and only for holders of audit:view. It is always scoped to the caller's own tenant.
router.get('/', authorize(['audit:view']), asyncHandler(getLogs));

export default router;
