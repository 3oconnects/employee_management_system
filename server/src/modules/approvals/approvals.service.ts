import { ApprovalsRepository } from './approvals.repository';
import { withTransaction } from '../../database/transaction';
import { AppError } from '../../core/errors/AppError';

export class ApprovalsService {
    private repo: ApprovalsRepository;

    constructor() {
        this.repo = new ApprovalsRepository();
    }

    async getApprovals(userId: string | number, role: string, tenantId: string, status: string) {
        const currentEmployeeId = await this.repo.getEmployeeIdByUserId(userId);
        const isHistory = status === 'history' || status === 'completed';
        return this.repo.getApprovals(tenantId, currentEmployeeId, role, isHistory);
    }

    async createApprovalRequest(tenantId: string, data: any) {
        const id = `APP-${Date.now()}`;
        await this.repo.createApprovalRequest(id, data.employeeId, data.type, data.status || 'pending', tenantId);
    }

    async updateApprovalAction(idParam: string, action: string, type: string, tenantId: string) {
        const id = idParam.replace(/^(std|leave|onb|ts|claim)-/, '');
        const status = action === 'approve' ? 'approved' : 'rejected';

        if (type === 'leave') {
            await this.repo.updateLeaveStatus(id, status, tenantId);
        } else if (type === 'onboarding') {
            const empStatus = action === 'approve' ? 'active' : 'rejected';
            await this.repo.updateEmployeeStatus(id, empStatus, tenantId);
        } else if (type === 'timesheet') {
            await this.repo.updateTimesheetStatus(id, status, tenantId);
        } else if (type === 'claim') {
            await this.repo.updateClaimStatus(id, status, tenantId);
        } else if (type === 'department_creation' && action === 'approve') {
            const meta = await this.repo.getApprovalMetadata(id, tenantId);
            if (!meta) throw AppError.notFound('Approval not found');

            await withTransaction(async (client) => {
                await this.repo.executeDepartmentCreation(id, meta, status, tenantId, client);
            });
        } else if (type === 'team_creation' && action === 'approve') {
            const meta = await this.repo.getApprovalMetadata(id, tenantId);
            if (!meta) throw AppError.notFound('Approval not found');

            await withTransaction(async (client) => {
                await this.repo.executeTeamCreation(id, meta, status, tenantId, client);
            });
        } else {
            await this.repo.updateApprovalStatus(id, status, tenantId);
        }
    }
}
