import { AttendanceRepository } from './attendance.repository';
import { PayrollRepository } from '../payroll/payroll.repository';
import { AppError } from '../../core/errors/AppError';
import { randomUUID } from 'crypto';

export class AttendanceService {
    private repo: AttendanceRepository;
    private payrollRepo: PayrollRepository;

    constructor() {
        this.repo = new AttendanceRepository();
        this.payrollRepo = new PayrollRepository();
    }

    async getTodayStatus(userId: string | number, tenantId: string) {
        const empId = await this.repo.resolveEmployeeId(userId, tenantId);
        if (!empId) {
            return { status: 'OUT', checkIn: null, sessions_today: 0, total_hours_today: '0.00' };
        }

        const open = await this.repo.getOpenSession(empId, tenantId);
        const stats = await this.repo.getTodayStats(empId, tenantId);

        const sessionsToday = parseInt(stats.sessions_count) || 0;
        const closedHours = parseFloat(stats.closed_hours) || 0;

        if (!open) {
            return {
                status: 'OUT',
                checkIn: null,
                sessions_today: sessionsToday,
                total_hours_today: closedHours.toFixed(2),
            };
        }

        const elapsedHours = (Date.now() - new Date(open.check_in_time).getTime()) / 3600000;

        return {
            status: 'IN',
            checkIn: open.check_in_time,
            sessions_today: sessionsToday,
            total_hours_today: (closedHours + elapsedHours).toFixed(2),
        };
    }

    async checkIn(userId: string | number, tenantId: string) {
        const now = new Date();
        const isLocked = await this.payrollRepo.isPeriodLocked(tenantId, now.getMonth() + 1, now.getFullYear());
        if (isLocked) {
            throw AppError.badRequest(`Attendance for ${now.getMonth() + 1}/${now.getFullYear()} is frozen as the payroll run has been completed.`);
        }

        const empId = await this.repo.resolveEmployeeId(userId, tenantId);
        if (!empId) throw AppError.notFound('No employee record found for this user.');

        const open = await this.repo.getOpenSession(empId, tenantId);
        if (open) throw AppError.badRequest('You are already checked in. Please check out first.');

        const row = await this.repo.checkIn(empId, tenantId);
        
        return {
            status: 'IN',
            checkIn: row.check_in_time,
            employee_id: empId,
            message: 'Checked in successfully.',
        };
    }

    async checkOut(userId: string | number, tenantId: string) {
        const now = new Date();
        const isLocked = await this.payrollRepo.isPeriodLocked(tenantId, now.getMonth() + 1, now.getFullYear());
        if (isLocked) {
            throw AppError.badRequest(`Attendance for ${now.getMonth() + 1}/${now.getFullYear()} is frozen as the payroll run has been completed.`);
        }

        const empId = await this.repo.resolveEmployeeId(userId, tenantId);
        if (!empId) throw AppError.notFound('No employee record found for this user.');

        const row = await this.repo.checkOut(empId, tenantId);
        if (!row) throw AppError.notFound('No active check-in found. Please check in first.');

        const hoursMs = new Date().getTime() - new Date(row.check_in_time).getTime();
        const hours = (hoursMs / 3600000).toFixed(2);

        return {
            status: 'COMPLETED',
            checkIn: null,
            total_hours: hours,
            message: `Checked out successfully. Total: ${hours}h`,
        };
    }

    async getHistory(userId: string | number, tenantId: string, month: number, year: number) {
        const empId = await this.repo.resolveEmployeeId(userId, tenantId);
        if (!empId) return { items: [], total: 0 };
        return this.repo.getHistory(empId, tenantId, month, year);
    }

    async getWeeklyHours(userId: string | number, tenantId: string, weekStart: string, weekEnd: string) {
        const empId = await this.repo.resolveEmployeeId(userId, tenantId);
        if (!empId) return { days: {} };

        const rows = await this.repo.getWeeklyHours(empId, tenantId, weekStart, weekEnd);
        const map: Record<string, number> = {};
        rows.forEach((r: any) => { map[r.day] = parseFloat(r.hours) || 0; });
        return { days: map };
    }

    async getSummary(userId: string | number, tenantId: string, month: number, year: number) {
        const empId = await this.repo.resolveEmployeeId(userId, tenantId);
        if (!empId) return { present_days: 0, half_days: 0, avg_hours: 0, userId };

        const stats = await this.repo.getSummary(empId, tenantId, month, year);
        return { userId, ...stats };
    }

    /**
     * Files a regularization REQUEST. It is pending until an authorised approver (not the requester)
     * approves it in the approvals inbox; only then is an attendance record written.
     */
    async requestRegularization(
        actor: { userId: number; email: string; tenantId: string },
        date: string, checkInTime: string, checkOutTime: string | null, reason?: string,
    ) {
        const timePattern = /^\d{2}:\d{2}(:\d{2})?$/;
        const day = /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(`${date}T00:00:00Z`) : null;
        if (!day || Number.isNaN(day.getTime()) || day.toISOString().slice(0, 10) !== date) {
            throw AppError.badRequest('A valid date (YYYY-MM-DD) is required.');
        }
        if (date > new Date().toISOString().slice(0, 10)) throw AppError.badRequest('You cannot regularize a future date.');
        if (!timePattern.test(checkInTime) || (checkOutTime && !timePattern.test(checkOutTime))) {
            throw AppError.badRequest('Times must be in HH:MM format.');
        }
        if (checkOutTime && checkOutTime <= checkInTime) throw AppError.badRequest('Check-out must be after check-in.');

        const isLocked = await this.payrollRepo.isPeriodLocked(actor.tenantId, day.getUTCMonth() + 1, day.getUTCFullYear());
        if (isLocked) {
            throw AppError.badRequest(`Attendance for ${day.getUTCMonth() + 1}/${day.getUTCFullYear()} cannot be regularized because the payroll period is completed and frozen.`);
        }

        const empId = await this.repo.resolveEmployeeId(actor.userId, actor.tenantId);
        if (!empId) throw AppError.notFound('Employee not found.');
        if (await this.repo.hasPendingRegularization(empId, actor.tenantId, date)) {
            throw AppError.conflict('A regularization request for this date is already waiting for approval.');
        }

        const id = `REG-${randomUUID()}`;
        await this.repo.createRegularizationRequest({
            id, employeeId: empId, tenantId: actor.tenantId, requestedBy: actor.email,
            metadata: { date, check_in_time: checkInTime, check_out_time: checkOutTime, reason: reason?.trim() || null, user_id: actor.userId },
        });
        return { id, status: 'pending', message: 'Regularization request submitted for approval.' };
    }
}
