import { eventBus } from '../../core/events/eventBus';
import { DomainEventType } from '../../core/events/eventTypes';
import { BaseDomainEvent, NotificationCreatedPayload } from '../../core/events/eventContracts';

export function registerNotificationListeners() {
    eventBus.on(DomainEventType.NOTIFICATION_CREATED, async (event: BaseDomainEvent<NotificationCreatedPayload>) => {
        try {
            console.log(`[Notification Listener] Processed ${event.eventName} for user ${event.payload.userId}`);
        } catch (error) {
            console.error(`[Notification Listener Error] Failed to process ${event.eventName}:`, error);
        }
    });
}
