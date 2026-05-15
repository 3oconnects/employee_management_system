import { Request, Response } from 'express';
import { TimesheetsService } from './timesheets.service';
import { AuthenticatedRequest } from '../../types';
import { AppError } from '../../core/errors/AppError';

const service = new TimesheetsService();

export const getTimesheetByWeek = async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.user!.tenantId;
    const userId = req.query.userId || req.user!.userId;
    const weekStart = req.query.weekStart as string;
    
    if (!weekStart) throw AppError.badRequest('weekStart is required');

    const result = await service.getTimesheetByWeek(userId as string, weekStart, tenantId);
    res.json(result);
};

export const saveTimesheetEntries = async (req: AuthenticatedRequest, res: Response) => {
    const result = await service.saveTimesheetEntries(req.params.id, req.body.entries);
    res.json({ ...result, message: 'Entries saved.' });
};

export const submitTimesheet = async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.user!.tenantId;
    const result = await service.submitTimesheet(req.params.id, tenantId);
    res.json({ ...result, message: 'Timesheet submitted for approval.' });
};

export const approveTimesheet = async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { action, approved_by, remarks } = req.body;
    const result = await service.approveTimesheet(req.params.id, tenantId, action, approved_by || req.user!.userId, remarks || null);
    res.json({ ...result, message: `Timesheet ${action}.` });
};

export const getTimesheetHistory = async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.user!.tenantId;
    const userId = req.query.userId || req.user!.userId;
    const result = await service.getTimesheetHistory(userId as string, tenantId);
    res.json(result);
};

export const getPendingTimesheets = async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.user!.tenantId;
    const result = await service.getPendingTimesheets(tenantId);
    res.json(result);
};
