import { ApprovalsRepository } from './approvals.repository';
import { withTransaction } from '../../database/transaction';
import { AppError } from '../../core/errors/AppError';
import { randomUUID } from 'crypto';
import { resolveEmployeeIdForUser } from '../../core/security/identity';
import { hasAccess, isSuperAdminIdentity, hasDashboardAdminBypass } from '../../core/security/authorize';
import {
    ApprovalKind, TYPE_OF_KIND, RESERVED_TYPES, PENDING_STATUSES, parseApprovalId, permissionsForType,
    decisionStatus, isOwnRequest, SELF_SERVICE_FIELDS, MANAGER_ROUTED_TYPES,
} from './approvals.policy';
import { sendEmployeeActionNotification, sendOnboardingCredentialsEmail } from '../../services/emailService';
import { PasswordService } from '../../core/security/password.service';
import { pool } from '../../config/db';

export class ApprovalsService {
    private repo: ApprovalsRepository;

    constructor() {
        this.repo = new ApprovalsRepository();
    }

    /**
     * Each row is tagged for the viewer: `is_mine` (they raised it or it is about them) and
     * `can_act` (they hold the permission or executive authority for this type and it is not their own request).
     * The client uses these to default to "My Requests" and show Approve/Reject only where allowed.
     */
    async getApprovals(
        actor: { userId: number; email: string; role?: string; dashboard_type?: string; permissions?: string[]; tenantId: string },
        status: string,
    ) {
        const currentEmployeeId = await resolveEmployeeIdForUser(actor.tenantId, actor.userId, actor.email);
        const isHistory = status === 'history' || status === 'completed';
        const me = { userId: actor.userId, email: actor.email, employeeId: currentEmployeeId };
        const rows = await this.repo.getApprovals(actor.tenantId, me, actor.role ?? '', isHistory);
        const regIds = rows.filter((r: any) => MANAGER_ROUTED_TYPES.has(r.type)).map((r: any) => String(r.employee_id));
        const mgrOf = await this.repo.getReportingManagerUserIds(regIds, actor.tenantId);

        const isTopLevelApprover = isSuperAdminIdentity(actor) ||
                                   hasDashboardAdminBypass(actor) ||
                                   actor.role === 'admin' ||
                                   actor.role === 'super_admin';

        return rows.map((row: any) => {
            const parsed = parseApprovalId(String(row.id));
            const kind = parsed?.kind ?? 'std';
            const type = kind === 'std' ? String(row.type ?? '') : TYPE_OF_KIND[kind];
            const is_mine = isOwnRequest(kind, { ...row, id: row.employee_id, user_id: null }, me);
            let can_act = !is_mine;
            if (can_act) {
                if (isTopLevelApprover) {
                    can_act = true; // CEO / Super Admin / System Admin master override
                } else if (MANAGER_ROUTED_TYPES.has(type)) {
                    const isMgr = this.isRegularizationApprover(actor, mgrOf.get(String(row.employee_id)) ?? null);
                    can_act = type in SELF_SERVICE_FIELDS
                        ? isMgr || hasAccess(actor, permissionsForType(type))   // manager, or a general approver
                        : isMgr && hasAccess(actor, permissionsForType(type));
                } else {
                    can_act = hasAccess(actor, permissionsForType(type));
                }
            }
            return { ...row, is_mine, can_act };
        });
    }

    /**
     * Decided by the requester's reporting manager. If the employee has no manager assigned (or for top-level admin/CEO),
     * executive management has complete fallback authority to decide it.
     */
    private isRegularizationApprover(actor: { userId: number; role?: string; dashboard_type?: string }, managerUserId: number | null): boolean {
        if (isSuperAdminIdentity(actor) || hasDashboardAdminBypass(actor) || actor.role === 'admin' || actor.role === 'super_admin') {
            return true;
        }
        if (managerUserId != null) return Number(actor.userId) === managerUserId;
        return false;
    }

    /**
     * A role change really changes what the person can do, so a reporting manager cannot grant it:
     * only an administrator can, and only a super admin can hand out the admin roles.
     */
    private async assertMayGrantRole(actor: { role?: string }, row: Record<string, any>, tenantId: string) {
        const meta = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : (row.metadata || {});
        if (!meta.requested_role_id) return;
        if (actor.role !== 'admin' && actor.role !== 'super_admin') {
            throw AppError.forbidden('Only an administrator can approve a role change.');
        }
        const name = await this.repo.getRoleName(Number(meta.requested_role_id), tenantId);
        if (!name) throw AppError.badRequest('The requested role no longer exists.');
        if ((name === 'admin' || name === 'super_admin') && actor.role !== 'super_admin') {
            throw AppError.forbidden('Only a super admin can grant an administrator role.');
        }
    }

    /**
     * POST /approvals/request. An employee raises a request for themselves (role change, promotion,
     * team change). It is always filed for the caller and routed to their reporting manager.
     */
    async createSelfServiceRequest(
        actor: { userId: number; email: string; tenantId: string },
        type: string,
        details: Record<string, unknown>,
    ) {
        const allowed = SELF_SERVICE_FIELDS[type];
        if (!allowed) throw AppError.badRequest('This request type cannot be raised here.');
        const metadata: Record<string, string> = {};
        for (const key of allowed) {
            const v = typeof details?.[key] === 'string' ? String(details[key]).trim().slice(0, 500) : '';
            if (v) metadata[key] = v;
        }
        if (!Object.keys(metadata).length) throw AppError.badRequest('Please fill in the request details.');
        const employeeId = await resolveEmployeeIdForUser(actor.tenantId, actor.userId, actor.email);
        if (!employeeId) throw AppError.notFound('Employee');
        const id = `REQ-${randomUUID()}`;
        await this.repo.createSelfServiceRequest(id, employeeId, type, metadata, actor.email, actor.tenantId);
        return { id };
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

        const isTopLevelApprover = isSuperAdminIdentity(actor) ||
                                   hasDashboardAdminBypass(actor) ||
                                   actor.role === 'admin' ||
                                   actor.role === 'super_admin';

        const mustHold = (type: string) => {
            if (isTopLevelApprover) return; // CEO / Super Admin master approval authority
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
            let managerOk = false;
            if (kind === 'std' && MANAGER_ROUTED_TYPES.has(actualType)) {
                const mgr = (await this.repo.getReportingManagerUserIds([String(row.employee_id)], tenantId, client)).get(String(row.employee_id)) ?? null;
                managerOk = isTopLevelApprover || this.isRegularizationApprover(actor, mgr);
            }
            // Self-service requests: the reporting manager OR a general approver/CEO. Everything else needs its permission.
            if (kind === 'std' && !(managerOk && actualType in SELF_SERVICE_FIELDS)) mustHold(actualType);
            if (kind === 'std' && MANAGER_ROUTED_TYPES.has(actualType) && !(actualType in SELF_SERVICE_FIELDS)) {
                if (!managerOk) {
                    throw AppError.forbidden('Only the reporting manager of the requester or executive administration can decide this request.');
                }
            }

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
            } else if (kind === 'std' && action === 'approve' && actualType in SELF_SERVICE_FIELDS) {
                if (actualType === 'role_change') await this.assertMayGrantRole(actor, row, tenantId);
                await this.repo.applySelfServiceChange(client, row, tenantId);
                await this.repo.setDecision(client, kind, id, status, tenantId);
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

                    // Dispatch official Employee Portal Credentials & Onboarding Welcome email
                    (async () => {
                        try {
                            const tempPassword = Math.random().toString(36).slice(-10).toUpperCase();
                            const hashedPassword = await PasswordService.hash(tempPassword);

                            await pool.query(
                                `UPDATE users SET password = $1, is_password_temp = true, is_active = true WHERE email = $2 AND tenant_id = $3`,
                                [hashedPassword, row.email, tenantId]
                            );

                            if (typeof sendOnboardingCredentialsEmail === 'function') {
                                await sendOnboardingCredentialsEmail({
                                    employeeId: row.id,
                                    name: row.name,
                                    email: row.email,
                                    personalEmail: row.personal_email,
                                    tempPassword,
                                    position: row.position,
                                    department: row.department,
                                    tenantId,
                                });
                            }
                        } catch (err: any) {
                            console.error('[ApprovalsService] Failed to send onboarding credentials email:', err);
                        }
                    })();
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
