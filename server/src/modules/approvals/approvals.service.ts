import { ApprovalsRepository } from './approvals.repository';
import { withTransaction } from '../../database/transaction';
import { AppError } from '../../core/errors/AppError';
import { randomUUID } from 'crypto';
import { hasAccess } from '../../core/security/authorize';
import {
    ApprovalKind, TYPE_OF_KIND, RESERVED_TYPES, PENDING_STATUSES, parseApprovalId, permissionsForType,
    decisionStatus, isOwnRequest,
} from './approvals.policy';
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

    /**
     * POST /approvals. Creates a plain `approvals` row for the caller's tenant. The status is always
     * 'pending' and types that have their own workflow (including password_reset) cannot be created here.
     */
    async createApprovalRequest(tenantId: string, data: { employeeId: string | number; type: string }) {
        if (RESERVED_TYPES.has(data.type)) {
            throw AppError.badRequest('This request type cannot be created here.');
        }
        if (!(await this.repo.employeeExistsInTenant(data.employeeId, tenantId))) {
            throw AppError.notFound('Employee');
        }
        const id = `APP-${randomUUID()}`;
        await this.repo.createApprovalRequest(id, data.employeeId, data.type, 'pending', tenantId);
        return { id };
    }

    /**
     * Approve or reject one request (HF-4). Identity, tenant and permissions come from the verified
     * token, never from the request body. The record is found by id inside the actor's tenant and
     * locked, so the decision is atomic: a second concurrent decision sees a non-pending status.
     */
    async updateApprovalAction(
        actor: { userId: number; email: string; role?: string; dashboard_type?: string; permissions?: string[]; tenantId: string },
        idParam: string,
        action: 'approve' | 'reject',
        claimedType: string,
        options: { recordApprover?: boolean; remarks?: string | null } = {},
    ) {
        const parsed = parseApprovalId(idParam);
        if (!parsed) throw AppError.badRequest('Invalid approval id.');
        const { kind, id } = parsed;
        const tenantId = actor.tenantId;

        const mustHold = (type: string) => {
            if (!hasAccess(actor, permissionsForType(type))) {
                throw AppError.forbidden('Access denied: you do not have permission to decide this kind of request.');
            }
        };

        // Kinds backed by their own table have an implied type: check before touching the database.
        if (kind !== 'std') {
            if (claimedType !== TYPE_OF_KIND[kind]) throw AppError.badRequest('The request type does not match this approval.');
            mustHold(TYPE_OF_KIND[kind]);
        }

        let emailAfterCommit: (() => void) | undefined;
        const result = await withTransaction(async (client) => {
            const row = await this.repo.lockApproval(client, kind, id, tenantId);
            if (!row) throw AppError.notFound('Approval');

            const actualType = kind === 'std' ? String(row.type ?? '') : TYPE_OF_KIND[kind];
            if (claimedType !== actualType) throw AppError.badRequest('The request type does not match this approval.');
            if (kind === 'std') mustHold(actualType);

            const employeeId = await this.repo.resolveActorEmployeeId(client, tenantId, actor.userId, actor.email);
            if (isOwnRequest(kind, row, { userId: actor.userId, email: actor.email, employeeId })) {
                throw AppError.forbidden('You cannot approve or reject your own request.');
            }

            if (!PENDING_STATUSES[kind].includes(String(row.status ?? '').toLowerCase())) {
                throw AppError.conflict('This request has already been decided.');
            }

            const status = decisionStatus(kind, action);
            if (kind === 'std' && action === 'approve' && (actualType === 'department_creation' || actualType === 'team_creation')) {
                const meta = row.metadata;
                if (!meta) throw AppError.notFound(`${actualType === 'department_creation' ? 'Department' : 'Team'} creation approval metadata`);
                if (actualType === 'department_creation') await this.repo.executeDepartmentCreation(id, meta, status, tenantId, client);
                else await this.repo.executeTeamCreation(id, meta, status, tenantId, client);
            } else if (kind === 'std' && action === 'approve' && actualType === 'attendance_regularization') {
                await this.repo.applyAttendanceRegularization(client, row, tenantId);
                await this.repo.setDecision(client, kind, id, status, tenantId);
            } else {
                await this.repo.setDecision(client, kind, id, status, tenantId,
                    options.recordApprover ? { approvedBy: actor.userId, remarks: options.remarks ?? null } : undefined);
            }

            if (kind === 'onboarding' && action === 'approve') {
                emailAfterCommit = () => {
                    sendEmployeeActionNotification({
                        employeeId: row.id,
                        name: row.name,
                        email: row.email,
                        personalEmail: row.personal_email,
                        changes: [{ field: 'status', label: 'Employment Status', from: 'Onboarding', to: 'Active & Confirmed', isPromotion: true }],
                        newPosition: row.position,
                        newDepartment: row.department,
                        newStatus: 'active',
                        tenantId,
                    }, tenantId).catch(err => console.error('[ApprovalsService] Failed to send onboarding approval email:', err));
                };
            }

            return {
                id: idParam, kind: kind as ApprovalKind, type: actualType, decision: status,
                subjectEmployeeId: row.employee_id ?? row.id ?? null,
                row: { ...row, status } as Record<string, any>,
            };
        });

        emailAfterCommit?.();
        return result;
    }
}
