import { Response } from 'express';
import { AuthenticatedRequest } from '../../types';
import { RealtimeService } from '../../services/realtimeService';

export const getStream = (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
        res.status(401).end();
        return;
    }
    RealtimeService.addClient(req.user.userId, req.user.tenantId, res);
};
