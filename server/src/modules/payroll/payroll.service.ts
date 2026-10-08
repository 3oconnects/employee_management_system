import { PayrollRepository } from './payroll.repository';
import { NotificationService } from '../../services/notificationService';
import { AppError } from '../../core/errors/AppError';
import { withTransaction } from '../../database/transaction';
import { pool } from '../../config/db';

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
        if (emp.deleted_at || (emp.status && emp.status.toLowerCase() === 'terminated')) {
            throw AppError.badRequest('Cannot update payroll profile for a deleted or terminated employee.');
        }

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

        const dateStr = (day: number): string =>
            `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        const daysInMonth = new Date(year, month, 0).getDate();
        const today = now.getDate();

        const deadline = (day: number): 'urgent' | 'pending' | 'planned' => {
            const daysLeft = day - today;
            if (daysLeft < 0) return 'planned';
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
        // 1. Payroll Locking Guard: Check if cycle is already completed/frozen
        const isLocked = await this.repo.isPeriodLocked(tenantId, month, year);
        if (isLocked) {
            throw AppError.conflict(`Payroll cycle ${month}/${year} has already been completed and locked.`);
        }

        const runId = `RUN-${year}-${month}-${Date.now()}`;

        await withTransaction(async (client) => {
            await this.repo.createPayrollRun(client, runId, month, year, tenantId, 'COMPLETED');

            // 2. Exclude Invalid/Terminated/Deleted Employees
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

                // 3. Attendance Integration & LOP Calculation Pipeline
                const stats = await this.repo.getEmployeeAttendanceStats(
                    p.employee_id,
                    tenantId,
                    Number(month),
                    Number(year)
                );

                let present_days = 0;
                let leave_days = stats.leaveCount;
                let absent_days = 0;
                let lop_days = 0;

                if (stats.hasTenantAttendance) {
                    present_days = stats.presentCount;
                    absent_days = Math.max(0, stats.daysInMonth - present_days - leave_days);
                    lop_days = absent_days;
                } else {
                    present_days = Math.max(0, stats.daysInMonth - leave_days);
                    absent_days = 0;
                    lop_days = 0;
                }

                const perDaySalary = stats.daysInMonth > 0 ? (gross / stats.daysInMonth) : 0;
                const lop_deduction = Math.round(perDaySalary * lop_days);

                const totalDeductions = pf + pt + tds + esi + lop_deduction;
                const net = Math.max(0, gross - totalDeductions);

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
                    tenant_id: tenantId,
                    present_days,
                    absent_days,
                    leave_days,
                    lop_days,
                    lop_deduction
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

    async createPayrollProfile(tenantId: string, data: any) {
        const emp = await this.repo.getEmployeeById(data.employee_id, tenantId);
        if (!emp) throw AppError.notFound('Employee');
        if (emp.deleted_at || (emp.status && emp.status.toLowerCase() === 'terminated')) {
            throw AppError.badRequest('Cannot create payroll profile for a deleted or terminated employee.');
        }

        const annualCTC = Number(data.annualCTC) || 0;
        const monthlyGross = annualCTC / 12;
        const basic = Math.round(monthlyGross * 0.5);
        const hra = Math.round(monthlyGross * 0.2);
        const allowances = Math.round(monthlyGross * 0.3);
        await this.repo.insertPayrollProfile({
            employee_id: data.employee_id,
            name: emp.name,
            department: emp.department || 'General',
            role: emp.position || 'Employee',
            annual_ctc: annualCTC,
            bank_account: data.bank_account || data.bankAccountNumber || null,
            tax_regime: data.taxRegime || 'New',
            basic_salary: basic,
            hra: hra,
            allowances: allowances,
            tenant_id: tenantId
        });
        return { message: 'Payroll profile created successfully.' };
    }

    async getPayslipData(employeeId: string, tenantId: string, month: string, year: string) {
        const emp = await this.repo.getEmployeeById(employeeId, tenantId);
        if (!emp) throw AppError.notFound('Employee not found');

        const profile = await this.repo.getPayrollProfile(employeeId, tenantId);
        const historyRes = await pool.query(
            `SELECT * FROM payroll_history WHERE employee_id = $1 AND tenant_id = $2 AND month = $3 AND year = $4 LIMIT 1`,
            [employeeId, tenantId, month, year]
        );
        const history = historyRes.rows[0];

        // Check if an actual payroll entry exists with attendance & LOP details
        const entryRes = await pool.query(
            `SELECT * FROM payroll_entries WHERE employee_id = $1 AND tenant_id = $2 AND month = $3 AND year = $4 ORDER BY id DESC LIMIT 1`,
            [employeeId, tenantId, month, year]
        );
        const entry = entryRes.rows[0];

        const basic = Number(profile?.basic_salary || Math.round((Number(profile?.annual_ctc) || 300000) / 24) || 25000);
        const hra = Number(profile?.hra || Math.round(basic * 0.4));
        const allowances = Number(profile?.allowances || Math.round(basic * 0.2));
        const bonus = Number(profile?.bonus || 0);
        const gross = entry ? Number(entry.gross_salary) : (basic + hra + allowances + bonus);
        const pf = entry ? Number(entry.pf_employee) : Math.round(basic * 0.12);
        const tds = entry ? Number(entry.tds) : Math.round(gross > 75000 ? gross * 0.1 : 0);
        const pt = entry ? Number(entry.professional_tax) : 200;
        const lop_deduction = entry ? Number(entry.lop_deduction || 0) : 0;
        const totalDeductions = entry ? Number(entry.total_deductions) : (pf + tds + pt + lop_deduction);
        const net = history?.net_salary ? Number(history.net_salary) : (entry ? Number(entry.net_salary) : (gross - totalDeductions));

        return {
            employee: {
                id: emp.id,
                name: emp.name,
                department: emp.department || 'General'
            },
            payroll: {
                month,
                year,
                basic_salary: basic,
                hra,
                allowances,
                bonus,
                tds,
                pf_employee: pf,
                professional_tax: pt,
                gross_salary: gross,
                total_deductions: totalDeductions,
                net_salary: net,
                bank_account: profile?.bank_account || emp.bank_account_number || 'N/A',
                tax_regime: profile?.tax_regime || emp.tax_regime || 'New',
                present_days: entry ? entry.present_days : undefined,
                absent_days: entry ? entry.absent_days : undefined,
                leave_days: entry ? entry.leave_days : undefined,
                lop_days: entry ? entry.lop_days : undefined,
                lop_deduction: entry ? entry.lop_deduction : undefined
            }
        };
    }

    async getBulkPayslipsPDF(tenantId: string, month: string, year: string): Promise<Buffer> {
        const { generateBulkPayslipsPDF } = await import('../../utils/pdfGenerator.js');
        const profiles = await this.repo.getAllPayrollProfiles(tenantId);
        const items = await Promise.all(
            profiles.map(async (p: any) => {
                const data = await this.getPayslipData(p.employee_id, tenantId, month, year);
                return data;
            })
        );
        return generateBulkPayslipsPDF(items);
    }
}
