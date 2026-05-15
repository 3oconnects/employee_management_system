import { NotificationChannelsService } from '../channels/channels.service';

export class NotificationTemplatesService {
    static async onLeaveApplied(tenantId: string, applicantName: string, leaveType: string): Promise<void> {
        await NotificationChannelsService.notifyByRole(tenantId, ['admin', 'hr', 'manager'], {
            title: 'New Leave Request',
            message: `${applicantName} applied for ${leaveType}.`,
            type: 'info',
            link: '/leave',
        });
    }

    static async onLeaveApproved(tenantId: string, userId: number, leaveType: string): Promise<void> {
        await NotificationChannelsService.notify({
            tenantId,
            userId,
            title: 'Leave Approved ✅',
            message: `Your ${leaveType} request has been approved.`,
            type: 'success',
            link: '/leave',
        });
    }

    static async onLeaveRejected(tenantId: string, userId: number, leaveType: string): Promise<void> {
        await NotificationChannelsService.notify({
            tenantId,
            userId,
            title: 'Leave Rejected',
            message: `Your ${leaveType} request was rejected.`,
            type: 'warning',
            link: '/leave',
        });
    }

    static async onPayrollProcessed(tenantId: string, month: string, year: string): Promise<void> {
        await NotificationChannelsService.notifyByRole(tenantId, ['employee', 'manager'], {
            title: 'Payslip Available 💰',
            message: `Your payslip for ${month}/${year} is now available.`,
            type: 'success',
            link: '/payroll',
        });
        await NotificationChannelsService.notifyByRole(tenantId, ['admin', 'hr'], {
            title: 'Payroll Run Complete',
            message: `Payroll cycle ${month}/${year} processed successfully.`,
            type: 'success',
            link: '/payroll',
        });
    }

    static async onEmployeeCreated(tenantId: string, employeeName: string, empId: string): Promise<void> {
        await NotificationChannelsService.notifyByRole(tenantId, ['admin', 'hr'], {
            title: 'New Employee Added',
            message: `${employeeName} (${empId}) has been added to the organization.`,
            type: 'info',
            link: '/employees',
        });
    }

    static async onTimesheetSubmitted(tenantId: string, userName: string): Promise<void> {
        await NotificationChannelsService.notifyByRole(tenantId, ['admin', 'hr', 'manager'], {
            title: 'Timesheet Submitted',
            message: `${userName} submitted their timesheet for review.`,
            type: 'info',
            link: '/timesheet',
        });
    }

    static async onTimesheetApproved(tenantId: string, userId: number): Promise<void> {
        await NotificationChannelsService.notify({
            tenantId,
            userId,
            title: 'Timesheet Approved ✅',
            message: 'Your timesheet has been approved.',
            type: 'success',
            link: '/timesheet',
        });
    }

    static async onRoleUpdated(tenantId: string, userId: number, newRole: string): Promise<void> {
        await NotificationChannelsService.notify({
            tenantId,
            userId,
            title: 'Role Updated 🔑',
            message: `Your access level has been updated to: ${newRole}.`,
            type: 'success',
            link: '/profile',
        });
    }

    static async onAccountCreated(tenantId: string, userId: number, name: string): Promise<void> {
        await NotificationChannelsService.notify({
            tenantId,
            userId,
            title: 'Welcome to AURA 🚀',
            message: `Hello ${name}! Your account has been provisioned. Welcome aboard.`,
            type: 'success',
            link: '/dashboard',
        });
    }
}
