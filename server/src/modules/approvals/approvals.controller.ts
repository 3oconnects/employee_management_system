import { Response } from 'express';
import { ApprovalsService } from './approvals.service';
import { AuthenticatedRequest } from '../../types';
import { publishDecisionAudit } from './approvals.audit';

const service = new ApprovalsService();

export const getApprovals = async (req: AuthenticatedRequest, res: Response) => {
    const status = (req.query.status as string) || 'pending';
    const data = await service.getApprovals(req.user!, status);
    res.json({ success: true, data });
};

export const createApprovalRequest = async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.user!.tenantId;
    await service.createApprovalRequest(tenantId, req.body);
    res.status(201).json({ success: true });
};

export const createSelfServiceRequest = async (req: AuthenticatedRequest, res: Response) => {
    const { type, ...details } = req.body;
    const result = await service.createSelfServiceRequest(req.user!, type, details);
    res.status(201).json({ success: true, ...result });
};

export const updateApprovalAction = async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const { action, type } = req.body;
    // Who decided is always the authenticated user; nothing identity-like is read from the body.
    const result = await service.updateApprovalAction(user, req.params.id, action, type);

    publishDecisionAudit(req, result, action);

    res.json({ success: true });
};
