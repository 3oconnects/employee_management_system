import { Request, Response } from 'express';
import { pool } from '../config/db';

export const getPayrollEmployees = async (req: Request, res: Response) => {
    try {
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
            LEFT JOIN payroll_profiles p ON e.id = p.employee_id
            ORDER BY e.id
        `);

        const profiles = result.rows.map(row => {
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

        res.json(profiles);
    } catch (err: any) {
        res.status(500).json({ success: false, message: 'Database error: ' + err.message });
    }
};

export const updatePayrollProfile = async (req: Request, res: Response) => {
    const { id } = req.params;
    const updates = req.body;
    try {
        const empRes = await pool.query('SELECT * FROM employees WHERE id = $1', [id]);
        if (empRes.rows.length === 0) return res.status(404).json({ success: false, message: 'Employee record not found.' });

        const basic = Number(updates.basicSalary || updates.salary_structure?.basic_salary || 0);
        const hra = Number(updates.hra || updates.salary_structure?.hra || 0);
        const allowances = Number(updates.allowances || updates.salary_structure?.allowances || 0);
        const annual_ctc = Number(updates.annualCTC || 0);
        const bank_account = updates.bankAccountNumber || 'Not Linked';
        const tax_regime = updates.taxRegime || 'New';

        const profRes = await pool.query('SELECT * FROM payroll_profiles WHERE employee_id = $1', [id]);
        if (profRes.rows.length === 0) {
            await pool.query(
                'INSERT INTO payroll_profiles (employee_id, name, department, role, annual_ctc, bank_account, tax_regime, basic_salary, hra, allowances) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
                [id, empRes.rows[0].name, empRes.rows[0].department, empRes.rows[0].position, annual_ctc, bank_account, tax_regime, basic, hra, allowances]
            );
        } else {
            await pool.query(
                'UPDATE payroll_profiles SET basic_salary = $1, hra = $2, allowances = $3, bank_account = $4, tax_regime = $5, annual_ctc = $6 WHERE employee_id = $7',
                [basic, hra, allowances, bank_account, tax_regime, annual_ctc, id]
            );
        }


        res.json({ success: true, message: 'Salary structure updated.' });
    } catch (err: any) {
        res.status(500).json({ success: false, message: 'Update failed: ' + err.message });
    }
};


export const getPayrollRuns = async (req: Request, res: Response) => {
    try {
        const result = await pool.query('SELECT * FROM payroll_runs ORDER BY processed_at DESC');
        res.json(result.rows);
    } catch (err: any) {
        res.status(500).json({ success: false, message: 'Database error: ' + err.message });
    }
};

export const getPayrollActivity = async (req: Request, res: Response) => {
    try {
        const result = await pool.query('SELECT * FROM payroll_runs ORDER BY processed_at DESC LIMIT 5');
        res.json(result.rows);
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const getPendingApprovals = async (req: Request, res: Response) => {
    try {
        // Mock pending counts from claims or other modules
        const claims = await pool.query('SELECT COUNT(*) FROM reimbursement_claims WHERE status = \'pending\'');
        res.json({ pending: parseInt(claims.rows[0].count) || 0 });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const getLiveSummary = async (req: Request, res: Response) => {
    try {
        const result = await pool.query('SELECT * FROM payroll_profiles');
        let totalGross = 0;
        let totalDeductions = 0;
        let netOutflow = 0;
        let govtPayables = 0;

        result.rows.forEach(p => {
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


        res.json({
            totalGross,
            totalDeductions,
            netOutflow,
            govtPayables
        });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const getPayrollDeadlines = async (req: Request, res: Response) => {
    // Return mock upcoming deadlines
    res.json([
        { id: 1, title: 'PF Contribution Due', date: '2026-03-15', status: 'urgent' },
        { id: 2, title: 'Professional Tax Filing', date: '2026-03-20', status: 'pending' },
        { id: 3, title: 'IT Return Sync', date: '2026-03-31', status: 'planned' }
    ]);
};

export const getTaxSummary = async (req: Request, res: Response) => {
    try {
        const profiles = await pool.query('SELECT * FROM payroll_profiles');
        let tds = 0;
        let pf = 0;
        let pt = 0;
        let esi = 0;

        profiles.rows.forEach(p => {
            const basic = Number(p.basic_salary || 0);
            pf += Math.round(basic * 0.12);
            pt += Number(p.annual_ctc) > 180000 ? 200 : 0;
            tds += Number(p.annual_ctc) > 1000000 ? (basic * 0.15) : 0; // Simplified
        });

        res.json({
            tds,
            pf,
            pt,
            esi,
            total: tds + pf + pt + esi
        });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const processPayroll = async (req: Request, res: Response) => {
    const { month, year } = req.body;
    const runId = `RUN-${year}-${month}-${Date.now()}`;
    
    try {
        await pool.query('BEGIN');

        // 1. Create a payroll run record
        await pool.query(
            'INSERT INTO payroll_runs (id, month, year) VALUES ($1, $2, $3)',
            [runId, String(month), String(year)]
        );

        // 2. Fetch all profiles to process
        const profiles = await pool.query('SELECT * FROM payroll_profiles');
        
        for (const p of profiles.rows) {
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

            // Insert into payroll_entries
            await pool.query(
                `INSERT INTO payroll_entries 
                 (payroll_run_id, employee_id, month, year, gross_salary, pf_employee, esi_employee, professional_tax, tds, total_deductions, net_salary)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
                [runId, p.employee_id, String(month), String(year), gross, pf, esi, pt, tds, totalDeductions, net]
            );

            // Sync with payroll_history for employee portal
            await pool.query(
                `INSERT INTO payroll_history (employee_id, name, month, year, net_salary, status)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 ON CONFLICT (employee_id, month, year) DO UPDATE 
                 SET net_salary = EXCLUDED.net_salary, status = 'paid'`,
                [p.employee_id, p.name, String(month), String(year), net, 'paid']
            );
        }

        await pool.query('COMMIT');
        res.json({ success: true, message: `Payroll cycle ${month}/${year} processed successfully.`, runId });
    } catch (err: any) {
        await pool.query('ROLLBACK');
        console.error('Payroll processing error:', err);
        res.status(500).json({ success: false, message: 'Processing failed: ' + err.message });
    }
};
