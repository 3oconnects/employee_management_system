import express from 'express';
import { authenticate } from '../middleware/authMiddleware';
import { RealtimeService } from '../services/realtimeService';
import { AuthenticatedRequest } from '../types';

const router = express.Router();

router.get('/stream', authenticate, (req: AuthenticatedRequest, res) => {
    if (!req.user) {
        res.status(401).end();
        return;
    }

    RealtimeService.addClient(req.user.userId, req.user.tenantId, res);
});

export default router;
