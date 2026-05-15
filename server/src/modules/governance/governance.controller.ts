import { Response } from 'express';
import { GovernanceService } from './governance.service';
import { AuthenticatedRequest } from '../../types';

const service = new GovernanceService();

export const resolveOwnership = async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.user!.tenantId;
    const data = await service.resolveOwnership(req.params.nodeId, tenantId);
    res.json({ success: true, ...data });
};

export const getOrgTree = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const tenantId = req.user!.tenantId;
        const data = await service.getOrgTree(tenantId);
        res.json({ success: true, data });
    } catch (err: any) {
        console.error('[Governance] getOrgTree failed:', err.message);
        res.json({ success: true, data: [] });
    }
};

export const updateGovernance = async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.user!.tenantId;
    await service.updateGovernance(req.params.nodeId, req.body, tenantId);
    res.json({ success: true, message: 'Governance updated' });
};

export const searchNodes = async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.user!.tenantId;
    const data = await service.searchNodes(req.query.q as string, tenantId);
    res.json({ success: true, data });
};

export const syncGraph = async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.user!.tenantId;
    await service.syncGraph(tenantId);
    res.json({ success: true, message: 'Structural graph synchronized successfully' });
};
