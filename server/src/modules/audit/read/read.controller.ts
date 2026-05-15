import { Response } from 'express';
import { AuthenticatedRequest } from '../../../types';
import { AuditReadService } from './read.service';

const service = new AuditReadService();

export const getLogs = async (req: AuthenticatedRequest, res: Response) => {
    const { entityType, entityId, userId, action, page = '1', limit = '50' } = req.query;

    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 50;
    const offset = (pageNum - 1) * limitNum;

    const result = await service.getLogs(req.user!.tenantId, {
        entityType: entityType as string,
        entityId: entityId as string,
        userId: userId ? parseInt(userId as string) : undefined,
        action: action as string,
        limit: limitNum,
        offset,
    });

    res.json({
        success: true,
        data: result.items,
        pagination: {
            page: pageNum,
            limit: limitNum,
            totalItems: result.total,
            totalPages: Math.ceil(result.total / limitNum),
        },
    });
};
