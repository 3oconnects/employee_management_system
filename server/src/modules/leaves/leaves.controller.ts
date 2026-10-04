import { Request, Response } from 'express';
import { LeavesService } from './leaves.service';
import { AuthenticatedRequest } from '../../types';
import { publishDecisionAudit } from '../approvals/approvals.audit';

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
    const result = await service.getLeaveRequests(req.user!, req.query);
    res.json(result);
};

export const approveLeave = async (req: AuthenticatedRequest, res: Response) => {
    // HF-5: only `action` is read from the body. Who approves, and in which tenant, is the verified token.
    const { action } = req.body;
    const { row, decision } = await service.approveLeave(req.user!, req.params.id, action);
    publishDecisionAudit(req, decision, action === 'approved' ? 'approve' : 'reject');
    res.json({ ...row, message: `Leave request ${action}.` });
};

export const updateLeaveRequest = async (req: AuthenticatedRequest, res: Response) => {
    const result = await service.updateLeaveRequest(req.params.id, req.user!.tenantId, req.user!.userId, req.body);
    res.json({ ...result, message: 'Leave request updated successfully.' });
};

export const deleteLeaveRequest = async (req: AuthenticatedRequest, res: Response) => {
    await service.deleteLeaveRequest(req.params.id, req.user!.tenantId, req.user!.userId);
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
