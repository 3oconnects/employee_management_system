import { LeavesRepository } from './leaves.repository';
import { PayrollRepository } from '../payroll/payroll.repository';
import { NotificationService } from '../../services/notificationService';
import { AppError } from '../../core/errors/AppError';
import { hasAccess } from '../../core/security/authorize';
import { ApprovalsService } from '../approvals/approvals.service';
import { resolveEmployeeIdForUser } from '../../core/security/identity';

export class LeavesService {
    private repo: LeavesRepository;
    private payrollRepo: PayrollRepository;
    private approvals = new ApprovalsService();

    constructor() {
        this.repo = new LeavesRepository();
        this.payrollRepo = new PayrollRepository();
    }

    async getLeaveTypes() {
        return this.repo.getLeaveTypes();
    }

    async applyLeave(tenantId: string, data: any) {
        // 1. Date range validation
        if (!data.start_date || !data.end_date) {
            throw AppError.badRequest('Both start date and end date are required.');
        }
        const start = new Date(data.start_date);
        const end = new Date(data.end_date);
        if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
            throw AppError.badRequest('Invalid date range: start date must be before or equal to end date.');
        }

        // 2. Resolve canonical employee_id and verify employee is active
        const employeeId = await resolveEmployeeIdForUser(tenantId, data.userId, data.email || '');
        if (employeeId && typeof this.repo.getEmployeeById === 'function') {
            const emp = await this.repo.getEmployeeById(employeeId, tenantId);
            if (emp && (emp.deleted_at || (emp.status && emp.status.toLowerCase() === 'terminated'))) {
                throw AppError.badRequest('Inactive or terminated employees cannot apply for leave.');
            }
        }

        // 3. Period locking guard: verify dates are not in a frozen payroll cycle
        if (await this.payrollRepo.isPeriodLocked(tenantId, start.getMonth() + 1, start.getFullYear())) {
            throw AppError.badRequest(`Cannot apply leave for locked payroll period (${start.getMonth() + 1}/${start.getFullYear()}).`);
        }
        if (await this.payrollRepo.isPeriodLocked(tenantId, end.getMonth() + 1, end.getFullYear())) {
            throw AppError.badRequest(`Cannot apply leave for locked payroll period (${end.getMonth() + 1}/${end.getFullYear()}).`);
        }

        // 4. Overlapping leave validation
        if (employeeId && typeof this.repo.getOverlappingLeave === 'function') {
            const overlapping = await this.repo.getOverlappingLeave(employeeId, tenantId, data.start_date, data.end_date);
            if (overlapping) {
                throw AppError.conflict('An active or pending leave request already exists for the selected dates.');
            }
        }

        // 5. Leave balance availability check
        const leaveTypeId = Number(data.leave_type_id);
        if (typeof this.repo.getLeaveBalance === 'function') {
            const balances = await this.repo.getLeaveBalance(employeeId || data.userId, tenantId, start.getFullYear());
            if (Array.isArray(balances) && balances.length > 0) {
                const typeBal = balances.find((b: any) => Number(b.leave_type_id) === leaveTypeId);
                if (typeBal && typeBal.available !== undefined) {
                    const available = Number(typeBal.available);
                    const requestedDays = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
                    if (requestedDays > available) {
                        const pendingText = typeBal.pending ? ` (${typeBal.pending} day${typeBal.pending > 1 ? 's' : ''} currently pending approval)` : '';
                        throw AppError.badRequest(`Insufficient leave balance. Available: ${available}, Requested: ${requestedDays}${pendingText}.`);
                    }
                }
            }
        }

        // 6. Insert leave request with canonical employee_id and user_id
        let leave: any;
        if (employeeId && this.repo.applyLeave.length >= 7) {
            leave = await this.repo.applyLeave(
                employeeId,
                data.userId,
                leaveTypeId,
                data.start_date,
                data.end_date,
                data.reason || null,
                tenantId
            );
        } else {
            leave = await (this.repo.applyLeave as any)(
                data.userId,
                leaveTypeId,
                data.start_date,
                data.end_date,
                data.reason || null,
                tenantId
            );
        }

        const { user, leaveType } = await this.repo.getUserAndLeaveTypeName(data.userId, leaveTypeId);
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
