import { Router } from 'express';
import { getStream } from './realtime.controller';
import { authenticateRealtime } from '../../core/security/authorize';

const router = Router();

// ARC-08: SSE stream is the ONLY endpoint permitted to use ?token= query parameter auth.
// All other routes use the header-only `authenticate` middleware.
router.get('/stream', authenticateRealtime, getStream);

export default router;
