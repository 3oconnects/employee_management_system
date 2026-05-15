import { Router } from 'express';
import coreRoutes from './core/core.routes';
import { NotificationChannelsService } from './channels/channels.service';
import { NotificationTemplatesService } from './templates/templates.service';
import { NotificationsCoreService } from './core/core.service';

const coreService = new NotificationsCoreService();

const router = Router();
router.use('/', coreRoutes);

export const NotificationService = {
    notify: NotificationChannelsService.notify.bind(NotificationChannelsService),
    notifyByRole: NotificationChannelsService.notifyByRole.bind(NotificationChannelsService),
    getNotifications: coreService.getNotifications.bind(coreService),
    markAsRead: coreService.markAsRead.bind(coreService),
    markAllAsRead: coreService.markAllAsRead.bind(coreService),
    onLeaveApplied: NotificationTemplatesService.onLeaveApplied.bind(NotificationTemplatesService),
    onLeaveApproved: NotificationTemplatesService.onLeaveApproved.bind(NotificationTemplatesService),
    onLeaveRejected: NotificationTemplatesService.onLeaveRejected.bind(NotificationTemplatesService),
    onPayrollProcessed: NotificationTemplatesService.onPayrollProcessed.bind(NotificationTemplatesService),
    onEmployeeCreated: NotificationTemplatesService.onEmployeeCreated.bind(NotificationTemplatesService),
    onTimesheetSubmitted: NotificationTemplatesService.onTimesheetSubmitted.bind(NotificationTemplatesService),
    onTimesheetApproved: NotificationTemplatesService.onTimesheetApproved.bind(NotificationTemplatesService),
    onRoleUpdated: NotificationTemplatesService.onRoleUpdated.bind(NotificationTemplatesService),
    onAccountCreated: NotificationTemplatesService.onAccountCreated.bind(NotificationTemplatesService),
};

export default router;
