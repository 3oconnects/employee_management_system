import { registerAuditListeners } from '../../modules/audit/audit.listeners';
import { registerNotificationListeners } from '../../modules/notifications/notifications.listeners';
import { registerRealtimeListeners } from '../../modules/realtime/realtime.listeners';

export function registerDomainEvents() {
    registerAuditListeners();
    registerNotificationListeners();
    registerRealtimeListeners();
    console.log('✅ Domain Event Listeners Registered.');
}
