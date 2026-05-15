import { eventBus } from '../../core/events/eventBus';
import { DomainEventType } from '../../core/events/eventTypes';
import { BaseDomainEvent } from '../../core/events/eventContracts';
import { AuditWriteService } from './write/write.service';

export function registerAuditListeners() {
    eventBus.on(DomainEventType.AUDIT_LOG_REQUESTED, async (event: BaseDomainEvent<any>) => {
        try {
            await AuditWriteService.log({
                tenantId: event.tenantId,
                userId: event.actorId || event.payload.userId,
                action: event.payload.action,
                entityType: event.payload.entityType,
                entityId: event.payload.entityId,
                oldValues: event.payload.oldValues,
                newValues: event.payload.newValues,
                ipAddress: event.payload.details?.ipAddress || event.payload.ipAddress,
                userAgent: event.payload.details?.userAgent || event.payload.userAgent,
            });
        } catch (error) {
            console.error('Failed to write audit log from event:', error);
        }
    });
}
