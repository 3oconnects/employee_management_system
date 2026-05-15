import { PerformanceRepository } from './performance.repository';
import { AppError } from '../../core/errors/AppError';
import { UserRole } from '../../types';

export class PerformanceService {
    private repo: PerformanceRepository;

    constructor() {
        this.repo = new PerformanceRepository();
    }

    async getPerformanceReviews(tenantId: string, employeeId?: string, status?: string) {
        return this.repo.getPerformanceReviews(tenantId, employeeId, status);
    }

    async createPerformanceReview(data: any, tenantId: string, reviewerId: number) {
        return this.repo.createPerformanceReview(data, tenantId, reviewerId);
    }

    async updatePerformanceReview(id: string, data: any, tenantId: string) {
        const review = await this.repo.updatePerformanceReview(id, data, tenantId);
        if (!review) throw AppError.notFound('Performance Review');
        return review;
    }

    async deletePerformanceReview(id: string, tenantId: string, role: string) {
        if (role !== UserRole.ADMIN && role !== UserRole.SUPER_ADMIN) {
            throw AppError.forbidden('Only admins can delete reviews');
        }
        const deletedCount = await this.repo.deletePerformanceReview(id, tenantId);
        if (deletedCount === 0) throw AppError.notFound('Performance Review');
    }
}
