import { TimesheetsRepository } from './timesheets.repository';
import { AppError } from '../../core/errors/AppError';
import { withTransaction } from '../../database/transaction';
import { ApprovalsService } from '../approvals/approvals.service';

export class TimesheetsService {
    private repo: TimesheetsRepository;

    private approvals = new ApprovalsService();

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

    /** Only the owner may edit, and only while the sheet is a draft or was sent back (HF-5). */
    async saveTimesheetEntries(id: string, tenantId: string, userId: number, entries: any[]) {
        const sheet = await this.repo.getOwnTimesheet(id, tenantId, userId);
        if (!sheet) throw AppError.notFound('Timesheet not found.');
        if (!['draft', 'rejected'].includes(String(sheet.status).toLowerCase())) {
            throw AppError.conflict('This timesheet has been submitted and can no longer be edited.');
        }
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

    async submitTimesheet(id: string, tenantId: string, userId: number) {
        const result = await this.repo.submitTimesheet(id, tenantId, userId);
        if (result) return result;
        if (await this.repo.getOwnTimesheet(id, tenantId, userId)) {
            throw AppError.conflict('This timesheet cannot be submitted in its current state.');
        }
        throw AppError.notFound('Timesheet not found.');
    }

    /** Decided by the one central approval path (HF-4); the approver is recorded from the token. */
    async approveTimesheet(actor: any, id: string, action: 'approved' | 'rejected', remarks: string | null) {
        const decision = await this.approvals.updateApprovalAction(
            actor, `ts-${id}`, action === 'approved' ? 'approve' : 'reject', 'timesheet', { recordApprover: true, remarks });
        return { row: decision.row, decision };
    }

    async getTimesheetHistory(userId: string | number, tenantId: string) {
        return this.repo.getTimesheetHistory(userId, tenantId);
    }

    async getPendingTimesheets(tenantId: string) {
        return this.repo.getPendingTimesheets(tenantId);
    }
}
