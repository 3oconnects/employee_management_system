import { PayrollRepository } from './payroll.repository';
import { NotificationService } from '../../services/notificationService';
import { AppError } from '../../core/errors/AppError';
import { withTransaction } from '../../database/transaction';

export class PayrollService {
    private repo: PayrollRepository;

    constructor() {
        this.repo = new PayrollRepository();
    }

    async getPayrollEmployees(tenantId: string) {
        const rows = await this.repo.getPayrollEmployees(tenantId);
        return rows.map((row: any) => {
            const hasProfile = !!row.annual_ctc;
            const basic = Number(row.basic_salary || 0);
            const hra = Number(row.hra || 0);
            const allowance = Number(row.allowances || 0);
            const bonus = Number(row.bonus || 0);
            const overtime = Number(row.overtime || 0);

            const gross = basic + hra + allowance + bonus + overtime;
            const pf = Math.round(basic * 0.12);
            const pt = Number(row.annual_ctc) > 180000 ? 200 : 0;
            const net = gross - (pf + pt);

            return {
                id: row.id,
                name: row.name,
                department: row.department,
                role: row.role || row.position,
                hasProfile,
                annualCTC: row.annual_ctc,
                bank_account_number: row.bank_account,
                tax_regime: row.tax_regime,
                grossSalary: gross,
                netSalary: net,
                salary_structure: {
                    basic_salary: basic,
                    hra,
                    allowances: allowance,
                    bonus,
                    overtime
                }
            };
        });
    }

    async updatePayrollProfile(employeeId: string, tenantId: string, updates: any) {
        const emp = await this.repo.getEmployeeById(employeeId, tenantId);
        if (!emp) throw AppError.notFound('Employee record not found.');

        const basic = Number(updates.basicSalary || updates.salary_structure?.basic_salary || 0);
        const hra = Number(updates.hra || updates.salary_structure?.hra || 0);
        const allowances = Number(updates.allowances || updates.salary_structure?.allowances || 0);
        const annual_ctc = Number(updates.annualCTC || 0);
        const bank_account = updates.bankAccountNumber || 'Not Linked';
        const tax_regime = updates.taxRegime || 'New';

        const existingProfile = await this.repo.getPayrollProfile(employeeId, tenantId);

        if (!existingProfile) {
            await this.repo.insertPayrollProfile({
                employee_id: employeeId,
                name: emp.name,
                department: emp.department,
                role: emp.position,
                annual_ctc,
                bank_account,
                tax_regime,
                basic_salary: basic,
                hra,
                allowances,
                tenant_id: tenantId
            });
        } else {
            await this.repo.updatePayrollProfile(employeeId, tenantId, {
                basic_salary: basic,
                hra,
                allowances,
                bank_account,
                tax_regime,
                annual_ctc
            });
        }
    }

    async getPayrollRuns(tenantId: string) {
        return this.repo.getPayrollRuns(tenantId);
    }

    async getPayrollActivity(tenantId: string) {
        return this.repo.getPayrollRuns(tenantId, 5);
    }

    async getPendingApprovals(tenantId: string) {
        const pending = await this.repo.countPendingClaims(tenantId);
        return { pending };
    }

    async getLiveSummary(tenantId: string) {
        const profiles = await this.repo.getAllPayrollProfiles(tenantId);
        let totalGross = 0;
        let totalDeductions = 0;
        let netOutflow = 0;
        let govtPayables = 0;

        profiles.forEach((p: any) => {
            const annual_ctc = Number(p.annual_ctc) || 0;
            const basic = Number(p.basic_salary) || 0;
            const hra = Number(p.hra) || 0;
            const allowance = Number(p.allowances) || 0;
            const bonus = Number(p.bonus) || 0;
            const overtime = Number(p.overtime) || 0;

            const gross = basic + hra + allowance + bonus + overtime;
            const pf = Math.round(basic * 0.12);
            const pt = annual_ctc > 180000 ? 200 : 0;
            const tds = annual_ctc > 1000000 ? (gross * 0.15) : (annual_ctc > 500000 ? gross * 0.05 : 0);

            const totalDeduction = pf + pt + tds;

            totalGross += isNaN(gross) ? 0 : gross;
            totalDeductions += isNaN(totalDeduction) ? 0 : totalDeduction;
            netOutflow += isNaN(gross - totalDeduction) ? 0 : (gross - totalDeduction);
            govtPayables += isNaN(totalDeduction) ? 0 : totalDeduction;
        });

        return { totalGross, totalDeductions, netOutflow, govtPayables };
    }

    /**
     * Returns upcoming payroll compliance deadlines dynamically based on
     * the current calendar month. Previously these were hardcoded to March 2026.
     * Response shape is identical so the frontend requires no changes.
     */
    async getPayrollDeadlines() {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1; // 1-indexed

        // Helper: build an ISO date string for day D of the current month
        const dateStr = (day: number): string =>
            `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        // PF contribution is due by the 15th of each month.
        // Professional Tax filing is due by the 20th.
        // IT Return Sync is due on the last day of the month.
        const daysInMonth = new Date(year, month, 0).getDate();

        const today = now.getDate();

        const deadline = (day: number): 'urgent' | 'pending' | 'planned' => {
            const daysLeft = day - today;
            if (daysLeft < 0) return 'planned';   // already passed this month → next cycle
            if (daysLeft <= 3) return 'urgent';
            return 'pending';
        };

        return [
            {
                id: 1,
                title: 'PF Contribution Due',
                date: dateStr(15),
                status: deadline(15),
            },
            {
                id: 2,
                title: 'Professional Tax Filing',
                date: dateStr(20),
                status: deadline(20),
            },
            {
                id: 3,
                title: 'IT Return Sync',
                date: dateStr(daysInMonth),
                status: deadline(daysInMonth),
            },
        ];
    }

    async getTaxSummary(tenantId: string) {
        const profiles = await this.repo.getAllPayrollProfiles(tenantId);
        let tds = 0;
        let pf = 0;
        let pt = 0;
        let esi = 0;

        profiles.forEach((p: any) => {
            const basic = Number(p.basic_salary || 0);
            pf += Math.round(basic * 0.12);
            pt += Number(p.annual_ctc) > 180000 ? 200 : 0;
            tds += Number(p.annual_ctc) > 1000000 ? (basic * 0.15) : 0;
        });

        return { tds, pf, pt, esi, total: tds + pf + pt + esi };
    }

    async processPayroll(tenantId: string, month: string, year: string) {
        const runId = `RUN-${year}-${month}-${Date.now()}`;

        await withTransaction(async (client) => {
            await this.repo.createPayrollRun(client, runId, month, year, tenantId);

            const profiles = await this.repo.getAllPayrollProfiles(tenantId);

            for (const p of profiles) {
                const basic = Number(p.basic_salary || 0);
                const hra = Number(p.hra || 0);
                const allowance = Number(p.allowances || 0);
                const bonus = Number(p.bonus || 0);
                const overtime = Number(p.overtime || 0);
                const annual_ctc = Number(p.annual_ctc || 0);

                const gross = basic + hra + allowance + bonus + overtime;
                const pf = Math.round(basic * 0.12);
                const pt = annual_ctc > 180000 ? 200 : 0;
                const tds = annual_ctc > 1000000 ? (gross * 0.15) : (annual_ctc > 500000 ? gross * 0.05 : 0);
                const esi = annual_ctc < 252000 ? Math.round(gross * 0.0075) : 0;

                const totalDeductions = pf + pt + tds + esi;
                const net = gross - totalDeductions;

                await this.repo.insertPayrollEntry(client, {
                    payroll_run_id: runId,
                    employee_id: p.employee_id,
                    month: String(month),
                    year: String(year),
                    gross_salary: gross,
                    pf_employee: pf,
                    esi_employee: esi,
                    professional_tax: pt,
                    tds,
                    total_deductions: totalDeductions,
                    net_salary: net,
                    tenant_id: tenantId
                });

                await this.repo.upsertPayrollHistory(client, {
                    employee_id: p.employee_id,
                    name: p.name,
                    month: String(month),
                    year: String(year),
                    net_salary: net,
                    tenant_id: tenantId
                });
            }
        });

        NotificationService.onPayrollProcessed(tenantId, String(month), String(year));

        return { message: `Payroll cycle ${month}/${year} processed successfully.`, runId };
    }
}
