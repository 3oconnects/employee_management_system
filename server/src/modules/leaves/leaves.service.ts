import { LeavesRepository } from './leaves.repository';
import { NotificationService } from '../../services/notificationService';
import { AppError } from '../../core/errors/AppError';

export class LeavesService {
    private repo: LeavesRepository;

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

    async getLeaveRequests(tenantId: string, options: any) {
        return this.repo.getLeaveRequests(tenantId, options);
    }

    async approveLeave(id: string, tenantId: string, action: string, approvedBy: string | number | null) {
        const leaveRow = await this.repo.approveLeave(id, tenantId, action, approvedBy);
        if (!leaveRow) throw AppError.notFound('Leave request not found.');

        const { leaveType } = await this.repo.getUserAndLeaveTypeName(leaveRow.user_id, leaveRow.leave_type_id);
        const leaveTypeName = leaveType?.name || 'Leave';

        if (action === 'approved') {
            NotificationService.onLeaveApproved(tenantId, leaveRow.user_id, leaveTypeName);
        } else if (action === 'rejected') {
            NotificationService.onLeaveRejected(tenantId, leaveRow.user_id, leaveTypeName);
        }

        return leaveRow;
    }

    async updateLeaveRequest(id: string, tenantId: string, data: any) {
        const leaveRow = await this.repo.updateLeaveRequest(id, tenantId, data);
        if (!leaveRow) throw AppError.notFound('Leave request not found or cannot be edited (already processed).');
        return leaveRow;
    }

    async deleteLeaveRequest(id: string, tenantId: string) {
        const leaveRow = await this.repo.deleteLeaveRequest(id, tenantId);
        if (!leaveRow) throw AppError.notFound('Leave request not found or cannot be deleted.');
        return leaveRow;
    }

    async getLeaveBalance(userId: string | number, tenantId: string, year: number) {
        return this.repo.getLeaveBalance(userId, tenantId, year);
    }
}
