import { Request, Response } from 'express';
import { LeavesService } from './leaves.service';
import { AuthenticatedRequest } from '../../types';

const service = new LeavesService();

export const getLeaveTypes = async (_req: Request, res: Response) => {
    const result = await service.getLeaveTypes();
    res.json(result);
};

export const applyLeave = async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.user!.tenantId;
    // POST mutation — always use the authenticated user's ID; ignore any userId in body
    const userId = req.user!.userId;
    const result = await service.applyLeave(tenantId, { ...req.body, userId });
    res.status(201).json({ ...result, message: 'Leave application submitted.' });
};

export const getLeaveRequests = async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.user!.tenantId;
    // GET — admin/HR filtering behavior handled inside service via req.query
    const result = await service.getLeaveRequests(tenantId, req.query);
    res.json(result);
};

export const approveLeave = async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { action, approved_by } = req.body;
    // approved_by from body preserved here — approval workflow is out of Phase 1 scope
    const result = await service.approveLeave(req.params.id, tenantId, action, approved_by || req.user!.userId);
    res.json({ ...result, message: `Leave request ${action}.` });
};

export const updateLeaveRequest = async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.user!.tenantId;
    const result = await service.updateLeaveRequest(req.params.id, tenantId, req.body);
    res.json({ ...result, message: 'Leave request updated successfully.' });
};

export const deleteLeaveRequest = async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.user!.tenantId;
    await service.deleteLeaveRequest(req.params.id, tenantId);
    res.json({ message: 'Leave request deleted successfully.' });
};

export const getLeaveBalance = async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.user!.tenantId;
    // GET — allow admin/HR to pass ?userId= for viewing other users' balances
    const userId = req.query.userId || req.user!.userId;
    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    const balances = await service.getLeaveBalance(userId as string, tenantId, year);
    res.json({ userId, year, balances });
};
