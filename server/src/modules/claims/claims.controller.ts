import { Response } from 'express';
import { ClaimsService } from './claims.service';
import { AuthenticatedRequest } from '../../types';
import { publishDecisionAudit } from '../approvals/approvals.audit';

const service = new ClaimsService();

export const submitClaim = async (req: AuthenticatedRequest, res: Response) => {
    const result = await service.submitClaim(req.user!, req.body);
    res.status(201).json({ success: true, claimId: result.id });
};

export const getEmployeeClaims = async (req: AuthenticatedRequest, res: Response) => {
    const result = await service.getEmployeeClaims(req.user!, req.params.employeeId);
    res.json(result);
};

export const getAllClaims = async (req: AuthenticatedRequest, res: Response) => {
    const result = await service.getAllClaims(req.user!.tenantId);
    res.json(result);
};

export const updateClaimStatus = async (req: AuthenticatedRequest, res: Response) => {
    // HF-5: only the decision is read from the body; the approver and tenant are the verified token.
    const { status } = req.body;
    const decision = await service.updateClaimStatus(req.user!, req.params.id, status);
    publishDecisionAudit(req, decision, status === 'approved' ? 'approve' : 'reject');
    res.json({ success: true });
};
