import { AuthenticatedRequest, AuditAction } from '../../types';
import { EventPublisher } from '../../core/events/eventPublisher';
import { DomainEventType } from '../../core/events/eventTypes';

/** One audit event per decision. Actor and tenant come from the verified token only. */
export function publishDecisionAudit(
    req: AuthenticatedRequest,
    result: { id: string; type: string; decision: string; subjectEmployeeId: unknown },
    action: 'approve' | 'reject',
): void {
    const user = req.user!;
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
}
