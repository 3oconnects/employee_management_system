import { ClaimsRepository } from './claims.repository';
import { AppError } from '../../core/errors/AppError';

export class ClaimsService {
    private repo: ClaimsRepository;

    constructor() {
        this.repo = new ClaimsRepository();
    }

    async submitClaim(tenantId: string, data: any) {
        const id = `CLM-${Date.now()}`;
        const claim = await this.repo.submitClaim(id, data.employee_id, data.amount, data.category, data.description, tenantId);
        return claim;
    }

    async getEmployeeClaims(tenantId: string, employeeId: string) {
        return this.repo.getEmployeeClaims(employeeId, tenantId);
    }

    async getAllClaims(tenantId: string) {
        return this.repo.getAllClaims(tenantId);
    }

    async updateClaimStatus(tenantId: string, id: string, status: string) {
        const claim = await this.repo.updateClaimStatus(id, status, tenantId);
        if (!claim) throw AppError.notFound('Claim not found');
        return claim;
    }
}
