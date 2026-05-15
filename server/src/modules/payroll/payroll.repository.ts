import { pool } from '../../config/db';

export class PayrollRepository {
    async getPayrollEmployees(tenantId: string) {
        const result = await pool.query(`
            SELECT
                e.id,
                e.name,
                e.department,
                e.position,
                p.role,
                p.annual_ctc,
                p.bank_account,
                p.tax_regime,
                p.basic_salary,
                p.hra,
                p.allowances,
                p.bonus,
                p.overtime
            FROM employees e
            LEFT JOIN payroll_profiles p ON e.id = p.employee_id AND p.tenant_id = e.tenant_id
            WHERE e.tenant_id = $1
            ORDER BY e.id
        `, [tenantId]);
        return result.rows;
    }

    async getEmployeeById(id: string, tenantId: string) {
        const res = await pool.query('SELECT * FROM employees WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
        return res.rows[0];
    }

    async getPayrollProfile(employeeId: string, tenantId: string) {
        const res = await pool.query('SELECT * FROM payroll_profiles WHERE employee_id = $1 AND tenant_id = $2', [employeeId, tenantId]);
        return res.rows[0];
    }

    async insertPayrollProfile(data: any) {
        await pool.query(
            'INSERT INTO payroll_profiles (employee_id, name, department, role, annual_ctc, bank_account, tax_regime, basic_salary, hra, allowances, tenant_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)',
            [data.employee_id, data.name, data.department, data.role, data.annual_ctc, data.bank_account, data.tax_regime, data.basic_salary, data.hra, data.allowances, data.tenant_id]
        );
    }

    async updatePayrollProfile(employeeId: string, tenantId: string, data: any) {
        await pool.query(
            'UPDATE payroll_profiles SET basic_salary = $1, hra = $2, allowances = $3, bank_account = $4, tax_regime = $5, annual_ctc = $6 WHERE employee_id = $7 AND tenant_id = $8',
            [data.basic_salary, data.hra, data.allowances, data.bank_account, data.tax_regime, data.annual_ctc, employeeId, tenantId]
        );
    }

    async getPayrollRuns(tenantId: string, limit?: number) {
        const query = limit
            ? 'SELECT * FROM payroll_runs WHERE tenant_id = $1 ORDER BY processed_at DESC LIMIT $2'
            : 'SELECT * FROM payroll_runs WHERE tenant_id = $1 ORDER BY processed_at DESC';
        const params = limit ? [tenantId, limit] : [tenantId];
        const result = await pool.query(query, params);
        return result.rows;
    }

    async countPendingClaims(tenantId: string) {
        const claims = await pool.query('SELECT COUNT(*) FROM reimbursement_claims WHERE status = \'pending\' AND tenant_id = $1', [tenantId]);
        return parseInt(claims.rows[0].count) || 0;
    }

    async getAllPayrollProfiles(tenantId: string) {
        const result = await pool.query('SELECT * FROM payroll_profiles WHERE tenant_id = $1', [tenantId]);
        return result.rows;
    }

    async createPayrollRun(client: any, id: string, month: string, year: string, tenantId: string) {
        await client.query(
            'INSERT INTO payroll_runs (id, month, year, tenant_id) VALUES ($1, $2, $3, $4)',
            [id, month, year, tenantId]
        );
    }

    async insertPayrollEntry(client: any, data: any) {
        await client.query(
            `INSERT INTO payroll_entries 
             (payroll_run_id, employee_id, month, year, gross_salary, pf_employee, esi_employee, professional_tax, tds, total_deductions, net_salary, tenant_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
            [data.payroll_run_id, data.employee_id, data.month, data.year, data.gross_salary, data.pf_employee, data.esi_employee, data.professional_tax, data.tds, data.total_deductions, data.net_salary, data.tenant_id]
        );
    }

    async upsertPayrollHistory(client: any, data: any) {
        // FIXED (Phase 2): conflict target now includes tenant_id so that two different
        // tenants whose employees share an employee_id string cannot clobber each other's
        // payroll history rows. Requires the unique constraint added by migration
        // phase2_migrations.ts: UNIQUE (employee_id, month, year, tenant_id).
        await client.query(
            `INSERT INTO payroll_history (employee_id, name, month, year, net_salary, status, tenant_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (employee_id, month, year, tenant_id) DO UPDATE
             SET net_salary = EXCLUDED.net_salary, status = 'paid'`,
            [data.employee_id, data.name, data.month, data.year, data.net_salary, 'paid', data.tenant_id]
        );
    }
}
