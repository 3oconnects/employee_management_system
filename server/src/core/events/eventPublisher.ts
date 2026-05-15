import { randomUUID } from 'crypto';
import { eventBus } from './eventBus';
import { BaseDomainEvent } from './eventContracts';
import { DomainEventType } from './eventTypes';

export class EventPublisher {
    static publish<T>(
        eventName: DomainEventType,
        tenantId: string,
        payload: T,
        actorId?: string | number
    ): void {
        const event: BaseDomainEvent<T> = {
            eventId: randomUUID(),
            eventName,
            tenantId,
            actorId,
            occurredAt: new Date(),
            payload
        };

        eventBus.emit(eventName, event);
    }
}
