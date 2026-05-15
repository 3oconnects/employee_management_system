import { AttendanceRepository } from './attendance.repository';
import { AppError } from '../../core/errors/AppError';

export class AttendanceService {
    private repo: AttendanceRepository;

    constructor() {
        this.repo = new AttendanceRepository();
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

    async regularize(userId: string | number, tenantId: string, date: string, checkInTime: string, checkOutTime: string | null) {
        const empId = await this.repo.resolveEmployeeId(userId, tenantId);
        if (!empId) throw AppError.notFound('Employee not found.');

        const row = await this.repo.regularize(empId, tenantId, date, checkInTime, checkOutTime);
        return { ...row, message: 'Regularization submitted.' };
    }
}
