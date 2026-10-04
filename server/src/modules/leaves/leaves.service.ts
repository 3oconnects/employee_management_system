import { LeavesRepository } from './leaves.repository';
import { NotificationService } from '../../services/notificationService';
import { AppError } from '../../core/errors/AppError';
import { hasAccess } from '../../core/security/authorize';
import { ApprovalsService } from '../approvals/approvals.service';

export class LeavesService {
    private repo: LeavesRepository;

    private approvals = new ApprovalsService();

    constructor() {
        this.repo = new LeavesRepository();
    }

    async getLeaveTypes() {
        return this.repo.getLeaveTypes();
    }

    async applyLeave(tenantId: string, data: any) {
        const leave = await this.repo.applyLeave(
            data.userId,
            data.leave_type_id,
            data.start_date,
            data.end_date,
            data.reason || null,
            tenantId
        );

        const { user, leaveType } = await this.repo.getUserAndLeaveTypeName(data.userId, data.leave_type_id);
        if (user && leaveType) {
            NotificationService.onLeaveApplied(tenantId, user.name, leaveType.name);
        }

        return leave;
    }

    /**
     * Without leave:approve a caller sees only their own requests; asking for someone else's is refused.
     * Approvers may list the tenant's requests, optionally filtered.
     */
    async getLeaveRequests(actor: { userId: number; tenantId: string; role?: string; dashboard_type?: string; permissions?: string[] }, options: any) {
        const options2 = { ...options };
        if (!hasAccess(actor, ['leave:approve'])) {
            if (options.userId !== undefined && String(options.userId) !== String(actor.userId)) {
                throw AppError.forbidden('Access denied: you can only view your own leave requests.');
            }
            options2.userId = actor.userId;
        }
        return this.repo.getLeaveRequests(actor.tenantId, options2);
    }

    /**
     * Decided by the one central approval path (HF-4): permission, no self-approval, tenant, pending-only,
     * row lock. Direct callers keep the historical side effects: the approver is recorded (from the token)
     * and the applicant is notified.
     */
    async approveLeave(actor: any, id: string, action: 'approved' | 'rejected') {
        const decision = await this.approvals.updateApprovalAction(
            actor, `leave-${id}`, action === 'approved' ? 'approve' : 'reject', 'leave', { recordApprover: true });
        const row = decision.row;
        const { leaveType } = await this.repo.getUserAndLeaveTypeName(row.user_id, row.leave_type_id);
        const leaveTypeName = leaveType?.name || 'Leave';
        if (action === 'approved') NotificationService.onLeaveApproved(actor.tenantId, row.user_id, leaveTypeName);
        else NotificationService.onLeaveRejected(actor.tenantId, row.user_id, leaveTypeName);
        return { row, decision };
    }

    /** Only the requester may change or withdraw a request, and only while it is pending. */
    async updateLeaveRequest(id: string, tenantId: string, userId: number, data: any) {
        const leaveRow = await this.repo.updateLeaveRequest(id, tenantId, userId, data);
        if (!leaveRow) await this.explainRefusal(id, tenantId, userId);
        return leaveRow;
    }

    async deleteLeaveRequest(id: string, tenantId: string, userId: number) {
        const leaveRow = await this.repo.deleteLeaveRequest(id, tenantId, userId);
        if (!leaveRow) await this.explainRefusal(id, tenantId, userId);
        return leaveRow;
    }

    private async explainRefusal(id: string, tenantId: string, userId: number): Promise<never> {
        // Someone else's (or a missing) request is simply "not found"; your own, already decided, is a conflict.
        if (await this.repo.leaveBelongsToUser(id, tenantId, userId)) {
            throw AppError.conflict('This leave request has already been decided and can no longer be changed.');
        }
        throw AppError.notFound('Leave request not found.');
    }

    async getLeaveBalance(userId: string | number, tenantId: string, year: number) {
        return this.repo.getLeaveBalance(userId, tenantId, year);
    }
}
