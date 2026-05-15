import { Response } from 'express';
import { PerformanceService } from './performance.service';
import { AuthenticatedRequest } from '../../types';

const service = new PerformanceService();

export const getPerformanceReviews = async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { employeeId, status } = req.query;
    const items = await service.getPerformanceReviews(tenantId, employeeId as string, status as string);
    res.json({ success: true, items });
};

export const createPerformanceReview = async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.user!.tenantId;
    const review = await service.createPerformanceReview(req.body, tenantId, req.user!.userId);
    res.status(201).json({ success: true, review });
};

export const updatePerformanceReview = async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.user!.tenantId;
    const review = await service.updatePerformanceReview(req.params.id, req.body, tenantId);
    res.json({ success: true, review });
};

export const deletePerformanceReview = async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.user!.tenantId;
    await service.deletePerformanceReview(req.params.id, tenantId, req.user!.role);
    res.json({ success: true, message: 'Review deleted' });
};
