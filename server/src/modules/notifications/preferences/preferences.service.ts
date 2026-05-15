export class NotificationPreferencesService {
    async getUserPreferences(tenantId: string, userId: number) {
        return { email_enabled: true, push_enabled: true, sms_enabled: false };
    }
}
