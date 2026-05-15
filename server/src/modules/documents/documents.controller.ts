import { Response } from 'express';
import { DocumentsService } from './documents.service';
import { AuthenticatedRequest } from '../../types';

const service = new DocumentsService();

export const getEmployeeDocuments = async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.user!.tenantId;
    const items = await service.getEmployeeDocuments(req.params.employeeId, tenantId, req.user!.role, req.user!.userId);
    res.json({ success: true, items });
};

export const uploadDocument = async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.user!.tenantId;
    const document = await service.uploadDocument(req.body, tenantId, req.user!.userId);
    res.status(201).json({ success: true, document });
};

export const verifyDocument = async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.user!.tenantId;
    const document = await service.verifyDocument(req.params.id, req.body.verified, tenantId, req.user!.userId);
    res.json({ success: true, document });
};

export const deleteDocument = async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.user!.tenantId;
    await service.deleteDocument(req.params.id, tenantId);
    res.json({ success: true, message: 'Document removed' });
};
