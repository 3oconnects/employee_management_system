import { Request, Response } from 'express';
import { AttendanceService } from './attendance.service';
import { AuthenticatedRequest } from '../../types';

const service = new AttendanceService();

export const getTodayStatus = async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.user!.tenantId;
    // requireSelfOrAdmin middleware already enforced access on this route.
    // Use the requested userId if provided, otherwise fall back to own ID.
    const userId = req.query.userId || req.user!.userId;
    const result = await service.getTodayStatus(userId as string, tenantId);
    res.json(result);
};

export const checkIn = async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.user!.tenantId;
    // POST mutation — always use the authenticated user's ID; ignore any userId in body
    const userId = req.user!.userId;
    const result = await service.checkIn(userId, tenantId);
    res.status(201).json(result);
};

export const checkOut = async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.user!.tenantId;
    // POST mutation — always use the authenticated user's ID; ignore any userId in body
    const userId = req.user!.userId;
    const result = await service.checkOut(userId, tenantId);
    res.json(result);
};

export const getHistory = async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.user!.tenantId;
    // requireSelfOrAdmin middleware already enforced access on this route.
    const userId = req.query.userId || req.user!.userId;
    const month = parseInt(req.query.month as string) || (new Date().getMonth() + 1);
    const year  = parseInt(req.query.year  as string) || new Date().getFullYear();
    const result = await service.getHistory(userId as string, tenantId, month, year);
    res.json(result);
};

export const getWeeklyHours = async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.user!.tenantId;
    // requireSelfOrAdmin middleware already enforced access on this route.
    const userId = req.query.userId || req.user!.userId;
    const weekStart = req.query.weekStart as string;
    const weekEnd   = req.query.weekEnd   as string;
    const result = await service.getWeeklyHours(userId as string, tenantId, weekStart, weekEnd);
    res.json(result);
};

export const getSummary = async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.user!.tenantId;
    // Access control is enforced by requireSelfOrAdmin middleware on this route.
    // requireSelfOrAdmin reads req.params.userId (updated to check both query and params),
    // so by the time execution reaches here the caller is either the record owner
    // or holds an elevated role (admin / hr / manager / super_admin).
    const userId = req.params.userId || req.user!.userId;
    const month = parseInt(req.query.month as string) || (new Date().getMonth() + 1);
    const year  = parseInt(req.query.year  as string) || new Date().getFullYear();
    const result = await service.getSummary(userId as string, tenantId, month, year);
    res.json(result);
};

export const regularize = async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.user!.tenantId;
    // POST mutation — always use the authenticated user's ID; ignore any userId in body
    const userId = req.user!.userId;
    const { date, check_in_time, check_out_time } = req.body;
    const result = await service.regularize(userId, tenantId, date, check_in_time, check_out_time || null);
    res.status(201).json(result);
};
