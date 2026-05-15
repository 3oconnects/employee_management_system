import { Router } from 'express';
import { getStream } from './realtime.controller';
import { authenticate } from '../../core/security/authorize';

const router = Router();

router.get('/stream', authenticate, getStream);

export default router;
