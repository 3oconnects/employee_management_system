import { Response } from 'express';
import { AuthenticatedRequest } from '../../../types';
import { RealtimeConnectionsService } from './connections.service';

export const getStream = (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
        res.status(401).end();
        return;
    }
    RealtimeConnectionsService.addClient(req.user.userId, req.user.tenantId, res);
};
