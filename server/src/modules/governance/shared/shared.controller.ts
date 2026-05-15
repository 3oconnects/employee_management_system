import { Response } from 'express';
import { SharedGovernanceService } from './shared.service';
import { AuthenticatedRequest } from '../../../types';

const service = new SharedGovernanceService();

export const resolveOwnership = async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.user!.tenantId;
    const data = await service.resolveOwnership(req.params.nodeId, tenantId);
    res.json({ success: true, ...data });
};
