import { Response } from 'express';
import { ApprovalsService } from './approvals.service';
import { AuthenticatedRequest } from '../../types';

const service = new ApprovalsService();

export const getApprovals = async (req: AuthenticatedRequest, res: Response) => {
    const { userId, role, tenantId } = req.user!;
    const status = (req.query.status as string) || 'pending';
    const data = await service.getApprovals(userId, role, tenantId, status);
    res.json({ success: true, data });
};

export const createApprovalRequest = async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.user!.tenantId;
    await service.createApprovalRequest(tenantId, req.body);
    res.status(201).json({ success: true });
};

export const updateApprovalAction = async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { action, type } = req.body;
    await service.updateApprovalAction(req.params.id, action, type, tenantId);
    res.json({ success: true });
};
