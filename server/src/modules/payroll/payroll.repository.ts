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
              AND e.deleted_at IS NULL
              AND (e.status IS NULL OR LOWER(e.status) != 'terminated')
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
        try {
            const query = limit
                ? 'SELECT * FROM payroll_runs WHERE tenant_id = $1 ORDER BY COALESCE(completed_at, created_at, processed_at) DESC LIMIT $2'
                : 'SELECT * FROM payroll_runs WHERE tenant_id = $1 ORDER BY COALESCE(completed_at, created_at, processed_at) DESC';
            const params = limit ? [tenantId, limit] : [tenantId];
            const result = await pool.query(query, params);
            return result.rows;
        } catch (err: any) {
            if (err?.code === '42703' || err?.message?.includes('does not exist')) {
                const query = limit
                    ? 'SELECT * FROM payroll_runs WHERE tenant_id = $1 ORDER BY processed_at DESC LIMIT $2'
                    : 'SELECT * FROM payroll_runs WHERE tenant_id = $1 ORDER BY processed_at DESC';
                const params = limit ? [tenantId, limit] : [tenantId];
                const result = await pool.query(query, params);
                return result.rows;
            }
            throw err;
        }
    }

    async getPayrollRun(tenantId: string, month: string | number, year: string | number) {
        const res = await pool.query(
            'SELECT * FROM payroll_runs WHERE tenant_id = $1 AND month = $2 AND year = $3',
            [tenantId, String(month), String(year)]
        );
        return res.rows[0] || null;
    }

    async isPeriodLocked(tenantId: string, month: string | number, year: string | number): Promise<boolean> {
        try {
            const res = await pool.query(
                "SELECT id, status FROM payroll_runs WHERE tenant_id = $1 AND month = $2 AND year = $3 AND UPPER(status) IN ('COMPLETED', 'LOCKED')",
                [tenantId, String(month), String(year)]
            );
            return res.rows.some((r: any) => r.status && ['COMPLETED', 'LOCKED'].includes(String(r.status).toUpperCase()));
        } catch (err: any) {
            // Self-healing & backward-compatibility: if column "status" does not exist in active database
            if (err?.code === '42703' || err?.message?.includes('status')) {
                // Proactively attempt to add missing column in background
                pool.query("ALTER TABLE payroll_runs ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'COMPLETED'").catch(() => {});
                
                try {
                    // Fallback to checking if period was completed by existence of payroll run
                    const fallback = await pool.query(
                        'SELECT id FROM payroll_runs WHERE tenant_id = $1 AND month = $2 AND year = $3',
                        [tenantId, String(month), String(year)]
                    );
                    return fallback.rows.length > 0;
                } catch {
                    return false;
                }
            }
            throw err;
        }
    }

    async getEmployeeAttendanceStats(employeeId: string, tenantId: string, month: number, year: number) {
        const attendanceRes = await pool.query(`
            SELECT COUNT(DISTINCT date)::int AS present_count
            FROM attendance
            WHERE employee_id = $1
              AND tenant_id = $2
              AND EXTRACT(MONTH FROM date) = $3
              AND EXTRACT(YEAR FROM date) = $4
              AND deleted_at IS NULL
              AND status IN ('IN', 'OUT', 'PRESENT')
        `, [employeeId, tenantId, month, year]);

        const tenantAttendanceRes = await pool.query(`
            SELECT COUNT(*)::int AS total_logs
            FROM attendance
            WHERE tenant_id = $1
              AND EXTRACT(MONTH FROM date) = $2
              AND EXTRACT(YEAR FROM date) = $3
              AND deleted_at IS NULL
        `, [tenantId, month, year]);

        const daysInMonth = new Date(year, month, 0).getDate();
        const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
        const monthEnd = `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

        const leaveRes = await pool.query(`
            SELECT COALESCE(SUM(
                LEAST(end_date, $4::date) - GREATEST(start_date, $3::date) + 1
            ), 0)::int AS leave_count
            FROM leave_requests
            WHERE employee_id = $1
              AND tenant_id = $2
              AND status = 'approved'
              AND deleted_at IS NULL
              AND start_date <= $4::date
              AND end_date >= $3::date
        `, [employeeId, tenantId, monthStart, monthEnd]);

        return {
            presentCount: attendanceRes.rows[0]?.present_count ?? 0,
            hasTenantAttendance: (tenantAttendanceRes.rows[0]?.total_logs ?? 0) > 0,
            leaveCount: leaveRes.rows[0]?.leave_count ?? 0,
            daysInMonth
        };
    }

    async countPendingClaims(tenantId: string) {
        const claims = await pool.query('SELECT COUNT(*) FROM reimbursement_claims WHERE status = \'pending\' AND tenant_id = $1', [tenantId]);
        return parseInt(claims.rows[0].count) || 0;
    }

    async getAllPayrollProfiles(tenantId: string) {
        // Enforce: Exclude deleted or terminated employees
        const result = await pool.query(`
            SELECT p.*, e.name as employee_name, e.department as employee_department
            FROM payroll_profiles p
            JOIN employees e ON p.employee_id = e.id AND e.tenant_id = p.tenant_id
            WHERE p.tenant_id = $1
              AND e.deleted_at IS NULL
              AND (e.status IS NULL OR LOWER(e.status) != 'terminated')
            ORDER BY e.id
        `, [tenantId]);
        return result.rows;
    }

    async createPayrollRun(client: any, id: string, month: string, year: string, tenantId: string, status: string = 'COMPLETED') {
        try {
            await client.query(
                `INSERT INTO payroll_runs (id, month, year, tenant_id, status, created_at, completed_at)
                 VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
                [id, String(month), String(year), tenantId, status]
            );
        } catch (err: any) {
            if (err?.code === '42703' || err?.message?.includes('does not exist')) {
                await client.query(
                    `INSERT INTO payroll_runs (id, month, year, tenant_id)
                     VALUES ($1, $2, $3, $4)`,
                    [id, String(month), String(year), tenantId]
                );
                return;
            }
            throw err;
        }
    }

    async insertPayrollEntry(client: any, data: any) {
        await client.query(
            `INSERT INTO payroll_entries 
             (payroll_run_id, employee_id, month, year, gross_salary, pf_employee, esi_employee, professional_tax, tds, total_deductions, net_salary, tenant_id, present_days, absent_days, leave_days, lop_days, lop_deduction)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
            [
                data.payroll_run_id,
                data.employee_id,
                data.month,
                data.year,
                data.gross_salary,
                data.pf_employee,
                data.esi_employee,
                data.professional_tax,
                data.tds,
                data.total_deductions,
                data.net_salary,
                data.tenant_id,
                data.present_days || 0,
                data.absent_days || 0,
                data.leave_days || 0,
                data.lop_days || 0,
                data.lop_deduction || 0
            ]
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
