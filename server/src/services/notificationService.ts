// ============================================================================
// EMS BACKEND — NOTIFICATION SERVICE
// ============================================================================
// Centralized service for creating in-app notifications.
// Called by controllers/services when key events happen:
//   • Leave applied/approved/rejected
//   • Payroll processed
//   • Employee created
//   • Timesheet submitted/approved
// ============================================================================

import { query } from '../db/connection';

interface NotificationParams {
    tenantId: string;
    userId: number;
    title: string;
    message: string;
    type?: 'info' | 'success' | 'warning' | 'error';
    link?: string;
}

export class NotificationService {

    /**
     * Create a single notification for a specific user.
     * Fire-and-forget — errors are logged but don't break the caller.
     */
    static async notify(params: NotificationParams): Promise<void> {
        try {
            await query(
                `INSERT INTO notifications (tenant_id, user_id, title, message, type, link)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [
                    params.tenantId,
                    params.userId,
                    params.title,
                    params.message,
                    params.type || 'info',
                    params.link || null,
                ]
            );
        } catch (err) {
            console.error('⚠️ Notification write failed (non-blocking):', err);
        }
    }

    /**
     * Notify multiple users (e.g., all admins when an employee applies for leave).
     */
    static async notifyMany(
        tenantId: string,
        userIds: number[],
        params: Omit<NotificationParams, 'tenantId' | 'userId'>
    ): Promise<void> {
        for (const userId of userIds) {
            await NotificationService.notify({ tenantId, userId, ...params });
        }
    }

    /**
     * Notify all users with a specific role in a tenant.
     */
    static async notifyByRole(
        tenantId: string,
        roles: string[],
        params: Omit<NotificationParams, 'tenantId' | 'userId'>
    ): Promise<void> {
        try {
            const result = await query(
                `SELECT id FROM users WHERE tenant_id = $1 AND role = ANY($2) AND is_active = true AND deleted_at IS NULL`,
                [tenantId, roles]
            );
            const userIds = result.rows.map((r: any) => r.id);
            await NotificationService.notifyMany(tenantId, userIds, params);
        } catch (err) {
            console.error('⚠️ Bulk notification failed (non-blocking):', err);
        }
    }

    // ─── EVENT-SPECIFIC HELPERS ─────────────────────────────────────────

    static async onLeaveApplied(tenantId: string, applicantName: string, leaveType: string): Promise<void> {
        await NotificationService.notifyByRole(tenantId, ['admin', 'hr', 'manager'], {
            title: 'New Leave Request',
            message: `${applicantName} applied for ${leaveType}.`,
            type: 'info',
            link: '/leave',
        });
    }

    static async onLeaveApproved(tenantId: string, userId: number, leaveType: string): Promise<void> {
        await NotificationService.notify({
            tenantId,
            userId,
            title: 'Leave Approved ✅',
            message: `Your ${leaveType} request has been approved.`,
            type: 'success',
            link: '/leave',
        });
    }

    static async onLeaveRejected(tenantId: string, userId: number, leaveType: string): Promise<void> {
        await NotificationService.notify({
            tenantId,
            userId,
            title: 'Leave Rejected',
            message: `Your ${leaveType} request was rejected.`,
            type: 'warning',
            link: '/leave',
        });
    }

    static async onPayrollProcessed(tenantId: string, month: string, year: string): Promise<void> {
        // Notify all employees
        await NotificationService.notifyByRole(tenantId, ['employee', 'manager'], {
            title: 'Payslip Available 💰',
            message: `Your payslip for ${month}/${year} is now available.`,
            type: 'success',
            link: '/payroll',
        });
        // Notify admins
        await NotificationService.notifyByRole(tenantId, ['admin', 'hr'], {
            title: 'Payroll Run Complete',
            message: `Payroll cycle ${month}/${year} processed successfully.`,
            type: 'success',
            link: '/payroll',
        });
    }

    static async onEmployeeCreated(tenantId: string, employeeName: string, empId: string): Promise<void> {
        await NotificationService.notifyByRole(tenantId, ['admin', 'hr'], {
            title: 'New Employee Added',
            message: `${employeeName} (${empId}) has been added to the organization.`,
            type: 'info',
            link: '/employees',
        });
    }

    static async onTimesheetSubmitted(tenantId: string, userName: string): Promise<void> {
        await NotificationService.notifyByRole(tenantId, ['admin', 'hr', 'manager'], {
            title: 'Timesheet Submitted',
            message: `${userName} submitted their timesheet for review.`,
            type: 'info',
            link: '/timesheet',
        });
    }

    static async onTimesheetApproved(tenantId: string, userId: number): Promise<void> {
        await NotificationService.notify({
            tenantId,
            userId,
            title: 'Timesheet Approved ✅',
            message: 'Your timesheet has been approved.',
            type: 'success',
            link: '/timesheet',
        });
    }

    static async onRoleUpdated(tenantId: string, userId: number, newRole: string): Promise<void> {
        await NotificationService.notify({
            tenantId,
            userId,
            title: 'Role Updated 🔑',
            message: `Your access level has been updated to: ${newRole}.`,
            type: 'success',
            link: '/profile',
        });
    }

    static async onAccountCreated(tenantId: string, userId: number, name: string): Promise<void> {
        await NotificationService.notify({
            tenantId,
            userId,
            title: 'Welcome to AURA 🚀',
            message: `Hello ${name}! Your account has been provisioned. Welcome aboard.`,
            type: 'success',
            link: '/dashboard',
        });
    }

    /**
     * Get unread count for a user.
     */
    static async getUnreadCount(tenantId: string, userId: number): Promise<number> {
        const result = await query(
            'SELECT COUNT(*) FROM notifications WHERE tenant_id = $1 AND user_id = $2 AND is_read = false',
            [tenantId, userId]
        );
        return parseInt(result.rows[0].count);
    }
}
