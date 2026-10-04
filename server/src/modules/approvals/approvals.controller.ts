import { Response } from 'express';
import { ApprovalsService } from './approvals.service';
import { AuthenticatedRequest, AuditAction } from '../../types';
import { EventPublisher } from '../../core/events/eventPublisher';
import { DomainEventType } from '../../core/events/eventTypes';

const service = new ApprovalsService();

export const getApprovals = async (req: AuthenticatedRequest, res: Response) => {
    const { userId, role, tenantId } = req.user!;
    const status = (req.query.status as string) || 'pending';
    const data = await service.getApprovals(userId, role, tenantId, status);
    res.json({ success: true, data });
};

export const createApprovalRequest = async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.user!.tenantId;
    await service.createApprovalRequest(tenantId, req.body);
    res.status(201).json({ success: true });
};

export const updateApprovalAction = async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const { action, type } = req.body;
    // Who decided is always the authenticated user; nothing identity-like is read from the body.
    const result = await service.updateApprovalAction(user, req.params.id, action, type);

    EventPublisher.publish(DomainEventType.AUDIT_LOG_REQUESTED, user.tenantId, {
        action: action === 'approve' ? AuditAction.APPROVAL_APPROVE : AuditAction.APPROVAL_REJECT,
        entityType: 'approval',
        entityId: result.id,
        newValues: {
            approvalType: result.type,
            decision: result.decision,
            subjectEmployeeId: result.subjectEmployeeId,
            decidedBy: user.userId,
        },
        details: {
            ipAddress: req.ip || '',
            userAgent: req.headers['user-agent'] || '',
        },
    }, user.userId);

    res.json({ success: true });
};
