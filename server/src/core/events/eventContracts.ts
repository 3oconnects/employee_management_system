import { DomainEventType } from './eventTypes';

export interface BaseDomainEvent<T> {
    eventId: string;
    eventName: DomainEventType;
    tenantId: string;
    actorId?: string | number;
    occurredAt: Date;
    payload: T;
}

export interface UserCreatedPayload {
    userId: number;
    email: string;
    role: string;
}

export interface UserUpdatedPayload {
    userId: number;
    changes: Record<string, any>;
}

export interface PerformanceReviewCreatedPayload {
    reviewId: string;
    employeeId: string;
    reviewerId: number;
}

export interface GovernanceSyncCompletedPayload {
    syncedNodesCount?: number;
}

export interface NotificationCreatedPayload {
    notificationId?: string;
    userId: number;
    title: string;
    message: string;
    type: string;
}

export interface AuditLogRequestedPayload {
    action: string;
    entityType: string;
    entityId: string;
    details: any;
}

export interface RealtimeBroadcastRequestedPayload {
    userId: number;
    email: string;
    status: string;
}
