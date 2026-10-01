import { ApprovalsRepository } from './approvals.repository';
import { withTransaction } from '../../database/transaction';
import { AppError } from '../../core/errors/AppError';
import { pool } from '../../config/db';
import { sendEmployeeActionNotification } from '../../services/emailService';

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
            
            if (action === 'approve') {
                const empRes = await pool.query(
                    'SELECT id, name, email, personal_email, position, department FROM employees WHERE id = $1',
                    [id]
                );
                if (empRes.rows.length > 0) {
                    const emp = empRes.rows[0];
                    sendEmployeeActionNotification({
                        employeeId: emp.id,
                        name: emp.name,
                        email: emp.email,
                        personalEmail: emp.personal_email,
                        changes: [{
                            field: 'status',
                            label: 'Employment Status',
                            from: 'Onboarding',
                            to: 'Active & Confirmed',
                            isPromotion: true,
                        }],
                        newPosition: emp.position,
                        newDepartment: emp.department,
                        newStatus: 'active',
                        tenantId,
                    }, tenantId).catch(err => console.error('[ApprovalsService] Failed to send onboarding approval email:', err));
                }
            }
        } else if (type === 'timesheet') {
            await this.repo.updateTimesheetStatus(id, status, tenantId);
        } else if (type === 'claim') {
            await this.repo.updateClaimStatus(id, status, tenantId);
        } else if (type === 'department_creation') {
            if (action === 'approve') {
                const meta = await this.repo.getApprovalMetadata(id, tenantId);
                if (!meta) throw AppError.notFound('Department creation approval not found or missing metadata');

                await withTransaction(async (client) => {
                    await this.repo.executeDepartmentCreation(id, meta, status, tenantId, client);
                });
            } else {
                // Reject: just mark as rejected, no department gets created
                await this.repo.updateApprovalStatus(id, status, tenantId);
            }
        } else if (type === 'team_creation') {
            if (action === 'approve') {
                const meta = await this.repo.getApprovalMetadata(id, tenantId);
                if (!meta) throw AppError.notFound('Team creation approval not found or missing metadata');

                await withTransaction(async (client) => {
                    await this.repo.executeTeamCreation(id, meta, status, tenantId, client);
                });
            } else {
                // Reject: just mark as rejected, no team gets created
                await this.repo.updateApprovalStatus(id, status, tenantId);
            }
        } else {
            await this.repo.updateApprovalStatus(id, status, tenantId);
        }
    }
}
