import { Response } from 'express';
import { OrgTreeService } from './org-tree.service';
import { AuthenticatedRequest } from '../../../types';

const service = new OrgTreeService();

export const getOrgTree = async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.user!.tenantId;
    const data = await service.getOrgTree(tenantId);
    res.json({ success: true, data });
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
