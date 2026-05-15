import { Response } from 'express';
import { SyncGovernanceService } from './sync.service';
import { AuthenticatedRequest } from '../../../types';

const service = new SyncGovernanceService();

export const syncGraph = async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.user!.tenantId;
    await service.syncGraph(tenantId);
    res.json({ success: true, message: 'Structural graph synchronized successfully' });
};
