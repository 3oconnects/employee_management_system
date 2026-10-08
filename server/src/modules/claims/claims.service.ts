import { ClaimsRepository } from './claims.repository';
import { AppError } from '../../core/errors/AppError';
import { hasAccess } from '../../core/security/authorize';
import { resolveEmployeeIdForUser } from '../../core/security/identity';
import { ApprovalsService } from '../approvals/approvals.service';

export class ClaimsService {
    private repo: ClaimsRepository;

    private approvals = new ApprovalsService();

    constructor() {
        this.repo = new ClaimsRepository();
    }

    /** A claim is always filed by, and for, the caller. The employee in the body is only checked, never trusted. */
    async submitClaim(actor: { userId: number; email: string; tenantId: string }, data: any) {
        const own = await resolveEmployeeIdForUser(actor.tenantId, actor.userId, actor.email);
        if (!own) throw AppError.notFound('No employee record found for this user.');
        if (data.employee_id !== own) throw AppError.forbidden('You can only submit claims for yourself.');
        const id = `CLM-${Date.now()}`;
        return this.repo.submitClaim(id, own, data.amount, data.category, data.description, actor.tenantId);
    }

    /** Your own claims, or any employee's if you may approve claims. */
    async getEmployeeClaims(actor: any, employeeId: string) {
        const own = await resolveEmployeeIdForUser(actor.tenantId, actor.userId, actor.email);
        if (employeeId !== own && !hasAccess(actor, ['claims:approve'])) {
            throw AppError.forbidden('Access denied: you can only view your own claims.');
        }
        return this.repo.getEmployeeClaims(employeeId, actor.tenantId);
    }

    async getAllClaims(tenantId: string) {
        return this.repo.getAllClaims(tenantId);
    }

    /** Decided by the one central approval path (HF-4): permission, no self-approval, tenant, pending-only. */
    async updateClaimStatus(actor: any, id: string, status: 'approved' | 'rejected') {
        return this.approvals.updateApprovalAction(actor, `claim-${id}`, status === 'approved' ? 'approve' : 'reject', 'claim');
    }
}
