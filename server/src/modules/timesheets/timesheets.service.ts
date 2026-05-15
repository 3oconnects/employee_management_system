import { TimesheetsRepository } from './timesheets.repository';
import { AppError } from '../../core/errors/AppError';
import { withTransaction } from '../../database/transaction';

export class TimesheetsService {
    private repo: TimesheetsRepository;

    constructor() {
        this.repo = new TimesheetsRepository();
    }

    async getTimesheetByWeek(userId: string | number, weekStart: string, tenantId: string) {
        const start = new Date(weekStart);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        const weekEnd = end.toISOString().slice(0, 10);

        let timesheet = await this.repo.getTimesheet(userId, weekStart, tenantId);

        if (!timesheet) {
            timesheet = await this.repo.createTimesheet(userId, weekStart, weekEnd, tenantId);
            return { ...timesheet, entries: [] };
        }

        return timesheet;
    }

    async saveTimesheetEntries(id: string, entries: any[]) {
        return withTransaction(async (client) => {
            await this.repo.clearEntries(id);

            let totalHours = 0;
            for (const e of entries) {
                const dayHours = [e.mon_hours, e.tue_hours, e.wed_hours, e.thu_hours, e.fri_hours, e.sat_hours, e.sun_hours]
                    .map(h => parseFloat(h) || 0);
                const rowTotal = dayHours.reduce((a, b) => a + b, 0);
                totalHours += rowTotal;
                await this.repo.insertEntry(id, e, dayHours);
            }

            const updated = await this.repo.updateTimesheetHours(id, totalHours);
            return updated;
        });
    }

    async submitTimesheet(id: string, tenantId: string) {
        const result = await this.repo.submitTimesheet(id, tenantId);
        if (!result) throw AppError.notFound('Timesheet not found or cannot be submitted.');
        return result;
    }

    async approveTimesheet(id: string, tenantId: string, action: string, approvedBy: string | number | null, remarks: string | null) {
        const result = await this.repo.approveTimesheet(id, tenantId, action, approvedBy, remarks);
        if (!result) throw AppError.notFound('Timesheet not found.');
        return result;
    }

    async getTimesheetHistory(userId: string | number, tenantId: string) {
        return this.repo.getTimesheetHistory(userId, tenantId);
    }

    async getPendingTimesheets(tenantId: string) {
        return this.repo.getPendingTimesheets(tenantId);
    }
}
