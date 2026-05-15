import { Request, Response } from 'express';
import { ClaimsService } from './claims.service';
import { AuthenticatedRequest } from '../../types';

const service = new ClaimsService();

export const submitClaim = async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.user!.tenantId;
    const result = await service.submitClaim(tenantId, req.body);
    res.status(201).json({ success: true, claimId: result.id });
};

export const getEmployeeClaims = async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.user!.tenantId;
    const result = await service.getEmployeeClaims(tenantId, req.params.employeeId);
    res.json(result);
};

export const getAllClaims = async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.user!.tenantId;
    const result = await service.getAllClaims(tenantId);
    res.json(result);
};

export const updateClaimStatus = async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.user!.tenantId;
    await service.updateClaimStatus(tenantId, req.params.id, req.body.status);
    res.json({ success: true });
};
