import { DocumentsRepository } from './documents.repository';
import { AppError } from '../../core/errors/AppError';
import { UserRole } from '../../types';

export class DocumentsService {
    private repo: DocumentsRepository;

    constructor() {
        this.repo = new DocumentsRepository();
    }

    async getEmployeeDocuments(employeeId: string, tenantId: string, userRole: string, userId: number) {
        if (userRole === UserRole.EMPLOYEE) {
            const documentOwnerUserId = await this.repo.getEmployeeUserId(employeeId, tenantId);
            if (documentOwnerUserId !== userId) {
                throw AppError.forbidden('You can only see your own documents');
            }
        }
        return this.repo.getEmployeeDocuments(employeeId, tenantId);
    }

    async uploadDocument(data: any, tenantId: string, uploadedBy: number) {
        return this.repo.uploadDocument(data, tenantId, uploadedBy);
    }

    async verifyDocument(id: string, verified: boolean, tenantId: string, verifiedBy: number) {
        const doc = await this.repo.verifyDocument(id, verified, verifiedBy, tenantId);
        if (!doc) throw AppError.notFound('Document');
        return doc;
    }

    async deleteDocument(id: string, tenantId: string) {
        const deletedCount = await this.repo.deleteDocument(id, tenantId);
        if (deletedCount === 0) throw AppError.notFound('Document');
    }
}
