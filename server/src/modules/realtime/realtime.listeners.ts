import { eventBus } from '../../core/events/eventBus';
import { DomainEventType } from '../../core/events/eventTypes';
import { BaseDomainEvent, RealtimeBroadcastRequestedPayload } from '../../core/events/eventContracts';
import { RealtimeService } from './index';

export function registerRealtimeListeners() {
    eventBus.on(DomainEventType.REALTIME_BROADCAST_REQUESTED, (event: BaseDomainEvent<RealtimeBroadcastRequestedPayload>) => {
        try {
            RealtimeService.broadcastStatusUpdate(
                event.tenantId,
                event.payload.userId,
                event.payload.email,
                event.payload.status
            );
        } catch (error) {
            console.error(`[Realtime Listener Error] Failed to process ${event.eventName}:`, error);
        }
    });
}
