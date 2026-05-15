import { Request, Response } from 'express';
import { PayrollService } from './payroll.service';
import { AuthenticatedRequest } from '../../types';

const service = new PayrollService();

export const getPayrollEmployees = async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.user!.tenantId;
    const result = await service.getPayrollEmployees(tenantId);
    res.json(result);
};

export const updatePayrollProfile = async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.user!.tenantId;
    await service.updatePayrollProfile(req.params.id, tenantId, req.body);
    res.json({ success: true, message: 'Salary structure updated.' });
};

export const getPayrollRuns = async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.user!.tenantId;
    const result = await service.getPayrollRuns(tenantId);
    res.json(result);
};

export const getPayrollActivity = async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.user!.tenantId;
    const result = await service.getPayrollActivity(tenantId);
    res.json(result);
};

export const getPendingApprovals = async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.user!.tenantId;
    const result = await service.getPendingApprovals(tenantId);
    res.json(result);
};

export const getLiveSummary = async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.user!.tenantId;
    const result = await service.getLiveSummary(tenantId);
    res.json(result);
};

export const getPayrollDeadlines = async (_req: Request, res: Response) => {
    const result = await service.getPayrollDeadlines();
    res.json(result);
};

export const getTaxSummary = async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.user!.tenantId;
    const result = await service.getTaxSummary(tenantId);
    res.json(result);
};

export const processPayroll = async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { month, year } = req.body;
    const result = await service.processPayroll(tenantId, String(month), String(year));
    res.json({ success: true, ...result });
};
