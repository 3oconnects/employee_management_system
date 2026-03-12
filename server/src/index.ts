import dotenv from 'dotenv';
// Load .env FIRST before any other imports that may consume env vars
dotenv.config();

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import AdmZip from 'adm-zip';
import PDFDocument from 'pdfkit';
import multer from 'multer';
import { parse } from 'csv-parse';
import { pool } from './db';
import { initDb } from './initDb';

// Multer: store CSV in memory (never touches disk)
const upload = multer({ storage: multer.memoryStorage() });

const app = express();
const port = process.env.PORT || 4000;

// --- Middleware ---
app.use(cors({
    origin: [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:3000',
        'http://127.0.0.1:3000',
    ],
    credentials: true
}));
app.use(express.json());

// --- Authentication Routes ---
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    try {
        // Find user by email and join with employees to get employee_id and name
        const result = await pool.query(`
            SELECT 
                u.id, 
                u.email, 
                u.role, 
                e.id AS employee_id, 
                e.name
            FROM users u
            LEFT JOIN employees e ON e.email = u.email
            WHERE u.email = $1 AND u.password = $2
        `, [email, password]);
        
        const user = result.rows[0];

        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid email or password.' });
        }

        return res.json({
            success: true,
            user: {
                ...user,
                permissions: user.role === 'admin' ? ['*'] : ['payroll:view']
            },
            token: `mock-jwt-token-${Date.now()}`
        });
    } catch (err: any) {
        console.error('Login error:', err.message);
        return res.status(500).json({ success: false, message: 'Login failed due to a server error. Please try again.' });
    }
});

// --- Dashboard Summary ---
app.get('/api/dashboard', async (req, res) => {
    try {
        const [empCount, payrollCost, pendingApprovals] = await Promise.all([
            pool.query('SELECT COUNT(*) FROM employees'),
            pool.query('SELECT COALESCE(SUM(annual_ctc), 0) AS total, COALESCE(AVG(annual_ctc), 0) AS average FROM payroll_profiles'),
            pool.query("SELECT COUNT(*) FROM approvals WHERE status = 'pending'")
        ]);

        const totalEmployees = parseInt(empCount.rows[0].count);
        const totalAnnualCTC = parseFloat(payrollCost.rows[0].total);
        const averageAnnualSalary = parseFloat(payrollCost.rows[0].average);
        const pendingApprovalsCount = parseInt(pendingApprovals.rows[0].count);

        res.json({
            totalEmployees,
            totalPayrollCost: Math.round(totalAnnualCTC / 12),      // monthly cost
            totalAnnualCTC: Math.round(totalAnnualCTC),
            averageSalary: Math.round(averageAnnualSalary / 12),     // monthly average
            averageAnnualSalary: Math.round(averageAnnualSalary),
            pendingApprovals: pendingApprovalsCount
        });
    } catch (err: any) {
        console.error('Dashboard endpoint error:', err.message);
        res.status(500).json({ success: false, message: 'Failed to load dashboard data: ' + err.message });
    }
});

// --- Employee Directory ---
app.get('/api/employees', async (req, res) => {
    const { search, page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    try {
        let sql = 'SELECT * FROM employees';
        let countSql = 'SELECT COUNT(*) FROM employees';
        const params: any[] = [];

        if (search) {
            sql += ' WHERE name ILIKE $1 OR id ILIKE $1 OR department ILIKE $1';
            countSql += ' WHERE name ILIKE $1 OR id ILIKE $1 OR department ILIKE $1';
            params.push(`%${search}%`);
        }

        sql += ` ORDER BY id LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        const finalParams = [...params, Number(limit), offset];

        const result = await pool.query(sql, finalParams);
        const countResult = await pool.query(countSql, params);

        const total = parseInt(countResult.rows[0].count);

        res.json({
            items: result.rows,
            totalItems: total,
            totalPages: Math.ceil(total / Number(limit))
        });
    } catch (err: any) {
        res.status(500).json({ success: false, message: 'Database error: ' + err.message });
    }
});

// --- Payroll Management ---
app.get('/api/payroll/employees', async (req, res) => {
    try {
        // Pure read-only query — LEFT JOIN returns employees with or without a profile.
        // No INSERT or side-effects of any kind inside a GET endpoint.
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

            const basic    = Number(row.basic_salary || 0);
            const hra      = Number(row.hra          || 0);
            const allowance = Number(row.allowances  || 0);
            const bonus    = Number(row.bonus        || 0);
            const overtime = Number(row.overtime     || 0);

            const gross = basic + hra + allowance + bonus + overtime;
            const pf    = Math.round(basic * 0.12);
            const pt    = Number(row.annual_ctc) > 180000 ? 200 : 0;
            const tds   = 0;
            const net   = gross - (pf + pt + tds);

            return {
                id:                 row.id,
                name:               row.name,
                department:         row.department,
                role:               row.role || row.position,
                hasProfile,
                annualCTC:          row.annual_ctc,
                annual_ctc:         row.annual_ctc,
                bank_account_number: row.bank_account,
                tax_regime:         row.tax_regime,
                grossSalary:        gross,
                netSalary:          net,
                salary_structure: {
                    basic_salary: basic,
                    hra,
                    allowances:   allowance,
                    bonus,
                    overtime
                }
            };
        });

        res.json(profiles);
    } catch (err: any) {
        res.status(500).json({ success: false, message: 'Database error: ' + err.message });
    }
});

// --- Create (or repair) payroll profile for an existing employee ---
// Uses UPSERT so it works whether the profile row is missing entirely
// OR was previously left as an empty shell by the old buggy GET handler.
app.post('/api/payroll/profiles', async (req, res) => {
    const { employeeId, annualCTC, basicSalary, hra, allowances, bankAccountNumber, taxRegime } = req.body;

    if (!employeeId || !annualCTC) {
        return res.status(400).json({ success: false, message: 'employeeId and annualCTC are required.' });
    }

    try {
        // Verify the employee exists in the employees table
        const empRes = await pool.query('SELECT * FROM employees WHERE id = $1', [employeeId]);
        if (empRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: `Employee ${employeeId} not found.` });
        }

        const emp = empRes.rows[0];
        const ctc = Number(annualCTC);
        const monthlyGross = ctc / 12;

        // Use provided values or derive sensible defaults from CTC
        const basic    = Number(basicSalary) || Math.round(monthlyGross * 0.50);
        const hraVal   = Number(hra)          || Math.round(monthlyGross * 0.20);
        const allowVal = Number(allowances)   || Math.round(monthlyGross * 0.20);
        const bonus    = Math.round(monthlyGross * 0.05);
        const bank     = bankAccountNumber || 'Not Linked';
        const regime   = taxRegime || 'New';

        // UPSERT: insert if no row exists, update if a shell row was left behind
        await pool.query(
            `INSERT INTO payroll_profiles
             (employee_id, name, department, role, annual_ctc, bank_account, tax_regime,
              basic_salary, hra, allowances, bonus, overtime)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
             ON CONFLICT (employee_id) DO UPDATE SET
               annual_ctc   = EXCLUDED.annual_ctc,
               bank_account = EXCLUDED.bank_account,
               tax_regime   = EXCLUDED.tax_regime,
               basic_salary = EXCLUDED.basic_salary,
               hra          = EXCLUDED.hra,
               allowances   = EXCLUDED.allowances,
               bonus        = EXCLUDED.bonus,
               overtime     = EXCLUDED.overtime,
               name         = EXCLUDED.name,
               department   = EXCLUDED.department,
               role         = EXCLUDED.role`,
            [employeeId, emp.name, emp.department, emp.position, ctc, bank, regime,
             basic, hraVal, allowVal, bonus, 0]
        );

        res.status(201).json({ success: true, message: 'Payroll profile saved successfully.' });
    } catch (err: any) {
        console.error('Create/update profile error:', err.message);
        res.status(500).json({ success: false, message: 'Database error: ' + err.message });
    }
});



app.post('/api/payroll/employees', async (req, res) => {

    const { name, email, annualCTC, department, taxRegime, bankAccountNumber, joinDate } = req.body;

    if (!name || !annualCTC || !department || !taxRegime || !bankAccountNumber || !joinDate) {
        return res.status(400).json({ success: false, message: 'Missing required configuration fields.' });
    }

    try {
        const countRes = await pool.query('SELECT COUNT(*) FROM employees');
        const count = parseInt(countRes.rows[0].count);
        const newId = `EMP${(count + 1).toString().padStart(3, '0')}`;
        const monthlyGross = annualCTC / 12;

        const basic = monthlyGross * 0.5;
        const hra = monthlyGross * 0.2;
        const allowance = monthlyGross * 0.2;
        const bonus = monthlyGross * 0.05;

        await pool.query(
            'INSERT INTO employees (id, name, position, department, join_date, email) VALUES ($1, $2, $3, $4, $5, $6)',
            [newId, name, department + ' Staff', department, joinDate, email]
        );

        // Create user record for the new employee
        if (email) {
            await pool.query(
                'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING',
                [name, email, 'password123', 'employee']
            );
        }

        await pool.query(
            'INSERT INTO payroll_profiles (employee_id, name, department, role, annual_ctc, bank_account, tax_regime, basic_salary, hra, allowances, bonus, overtime) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)',
            [newId, name, department, department + ' Staff', annualCTC, bankAccountNumber, taxRegime, basic, hra, allowance, bonus, 0]
        );

        res.status(201).json({ success: true, employeeId: newId });
    } catch (err: any) {
        res.status(500).json({ success: false, message: 'Database error: ' + err.message });
    }
});

// --- Bulk Employee Upload via CSV file (multipart/form-data) ---
// Accepts: POST /api/employees/bulk-upload  with field name "file"
// CSV columns: employee_id,name,department,position,join_date,annual_ctc
// Returns:  { inserted: number, skipped: number }
app.post('/api/employees/bulk-upload', upload.single('file'), async (req, res) => {
    // Support both multipart CSV upload AND legacy JSON body (for backwards compat)
    if (req.file) {
        // --- Multipart CSV path ---
        const csvText = req.file.buffer.toString('utf-8');
        let records: any[];
        try {
            records = await new Promise((resolve, reject) => {
                parse(csvText, { columns: true, skip_empty_lines: true, trim: true }, (err, data) => {
                    if (err) reject(err); else resolve(data);
                });
            });
        } catch {
            return res.status(400).json({ success: false, message: 'Invalid CSV format.' });
        }

        let inserted = 0;
        let skipped = 0;
        for (const row of records) {
            const employee_id = row.employee_id;
            const name       = row.name;
            const email      = row.email;
            const department = row.department;
            const position   = row.position;
            const join_date  = row.join_date  || null;
            const annual_ctc = Number(row.annual_ctc) || 0;

            if (!employee_id || !name) { skipped++; continue; }

            const existing = await pool.query('SELECT id FROM employees WHERE id = $1', [employee_id]);
            if (existing.rows.length > 0) { skipped++; continue; }

            const monthlyGross = annual_ctc / 12;
            const basic      = Math.round(monthlyGross * 0.50);
            const hra        = Math.round(monthlyGross * 0.20);
            const allowances = Math.round(monthlyGross * 0.20);
            const bonus      = Math.round(monthlyGross * 0.05);

            try {
                await pool.query(
                    'INSERT INTO employees (id, name, position, department, join_date, email) VALUES ($1,$2,$3,$4,$5,$6)',
                    [employee_id, name, position || department + ' Staff', department, join_date, email]
                );
                
                // Create user record so they can login
                if (email) {
                    await pool.query(
                        'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING',
                        [name, email, 'password123', 'employee']
                    );
                }
                await pool.query(
                    `INSERT INTO payroll_profiles
                     (employee_id, name, department, role, annual_ctc, bank_account, tax_regime,
                      basic_salary, hra, allowances, bonus, overtime)
                     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
                     ON CONFLICT (employee_id) DO NOTHING`,
                    [employee_id, name, department, position || department + ' Staff',
                     annual_ctc, 'Not Linked', 'New', basic, hra, allowances, bonus, 0]
                );
                inserted++;
            } catch (insertErr: any) {
                console.error('Row insert error:', insertErr.message);
                skipped++;
            }
        }

        return res.json({ inserted, skipped });
    }

    // --- Legacy JSON body path (used by old frontend) ---
    const { employees } = req.body;
    if (!employees || !Array.isArray(employees)) {
        return res.status(400).json({ success: false, message: 'Send a CSV file (multipart) or JSON body { employees: [] }.' });
    }

    let inserted = 0;
    let skipped  = 0;
    for (const emp of employees) {
        const { employee_id, name, department, position, join_date, annual_ctc } = emp;
        if (!employee_id || !name) { skipped++; continue; }

        const existing = await pool.query('SELECT id FROM employees WHERE id = $1', [employee_id]);
        if (existing.rows.length > 0) { skipped++; continue; }

        const monthlyGross = (Number(annual_ctc) || 0) / 12;
        const basic      = Math.round(monthlyGross * 0.50);
        const hra        = Math.round(monthlyGross * 0.20);
        const allowances = Math.round(monthlyGross * 0.20);
        const bonus      = Math.round(monthlyGross * 0.05);

        try {
            await pool.query(
                'INSERT INTO employees (id, name, position, department, join_date) VALUES ($1,$2,$3,$4,$5)',
                [employee_id, name, position, department, join_date]
            );
            await pool.query(
                `INSERT INTO payroll_profiles
                 (employee_id, name, department, role, annual_ctc, bank_account, tax_regime,
                  basic_salary, hra, allowances, bonus, overtime)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
                 ON CONFLICT (employee_id) DO NOTHING`,
                [employee_id, name, department, position, annual_ctc,
                 'Not Linked', 'New', basic, hra, allowances, bonus, 0]
            );
            inserted++;
        } catch {
            skipped++;
        }
    }
    res.json({ inserted, skipped });
});

app.put('/api/payroll/employees/:id', async (req, res) => {
    const { id } = req.params;
    const updates = req.body;

    try {
        const empRes = await pool.query('SELECT * FROM employees WHERE id = $1', [id]);
        if (empRes.rows.length === 0) return res.status(404).json({ success: false, message: 'Employee record not found.' });

        const basic = Number(updates.basicSalary || updates.salary_structure?.basic_salary || updates.basic || 0);
        const hra = Number(updates.hra || updates.salary_structure?.hra || 0);
        const allowances = Number(updates.specialAllowance || updates.salary_structure?.special_allowance || updates.allowances || updates.special || 0);
        const annual_ctc = updates.annualCTC || updates.annual_ctc || 0;
        const bank_account = updates.bankAccountNumber || updates.bank_account_number || 'Not Linked';
        const tax_regime = updates.taxRegime || updates.tax_regime || 'New';

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
});

app.get('/api/payroll/profiles', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM payroll_profiles');
        res.json({ employee_profiles: result.rows });
    } catch (err: any) {
        res.status(500).json({ success: false, message: 'Database error: ' + err.message });
    }
});

app.get('/api/payroll/runs', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM payroll_runs ORDER BY processed_at DESC');
        const formatted = result.rows.map(r => ({
            ...r,
            payrollCycle: `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][parseInt(r.month) - 1]} ${r.year}`,
            runDate: r.processed_at
        }));
        res.json(formatted);
    } catch (err: any) {
        res.status(500).json({ success: false, message: 'Database error: ' + err.message });
    }
});

app.get('/api/payroll/live-summary', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                SUM(annual_ctc)/12 AS total_gross,
                SUM((annual_ctc * 0.12)/12) AS pf,
                SUM((annual_ctc * 0.10)/12) AS estimated_tds
            FROM payroll_profiles
        `);
        const row = result.rows[0];
        const totalGross = Number(row.total_gross || 0);
        const pf = Number(row.pf || 0);
        const estimatedTds = Number(row.estimated_tds || 0);
        
        const totalDeductions = pf + estimatedTds;
        const netOutflow = totalGross - totalDeductions;
        const govtPayables = pf + estimatedTds;

        res.json({
            totalGross,
            totalDeductions,
            netOutflow,
            govtPayables
        });
    } catch (err: any) {
        res.status(500).json({ success: false, message: 'Database error: ' + err.message });
    }
});

app.get('/api/payroll/pending-approvals', async (req, res) => {
    try {
        const result = await pool.query("SELECT COUNT(*)::int AS pending FROM approvals WHERE status = 'pending'");
        res.json({ pending: result.rows[0].pending });
    } catch (err: any) {
        res.status(500).json({ success: false, message: 'Database error: ' + err.message });
    }
});

app.get('/api/payroll/summary/:month/:year', async (req, res) => {
    const { month, year } = req.params;
    try {
        const result = await pool.query(
            `SELECT 
                COALESCE(SUM(gross_salary), 0) AS total_gross,
                COALESCE(SUM(total_deductions), 0) AS total_deductions,
                COALESCE(SUM(net_salary), 0) AS net_outflow,
                COALESCE(SUM(tds + pf_employee + esi_employee + professional_tax), 0) AS govt_payables
             FROM payroll_entries 
             WHERE month = $1 AND year = $2`,
            [month, year]
        );
        const totals = result.rows[0];
        res.json({
            totalGross: Number(totals.total_gross),
            totalDeductions: Number(totals.total_deductions),
            netOutflow: Number(totals.net_outflow),
            govtPayables: Number(totals.govt_payables)
        });
    } catch (err: any) {
        res.status(500).json({ success: false, message: 'Database error: ' + err.message });
    }
});

app.get('/api/payroll/activity', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, month, year, processed_at 
            FROM payroll_runs 
            ORDER BY processed_at DESC 
            LIMIT 5
        `);
        const formatted = result.rows.map(r => ({
            ...r,
            payrollcycle: `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][parseInt(r.month) - 1]} ${r.year}`,
            processed_at: r.processed_at
        }));
        res.json(formatted);
    } catch (err: any) {
        res.status(500).json({ success: false, message: 'Database error: ' + err.message });
    }
});

app.get(['/api/payroll/history', '/api/payroll/history/:employeeId'], async (req, res) => {
    const employeeId = req.params.employeeId || req.query.employeeId;
    try {
        let sql = 'SELECT pe.*, e.name as employee FROM payroll_entries pe JOIN employees e ON pe.employee_id = e.id';
        const params: any[] = [];
        if (employeeId) {
            sql += ' WHERE pe.employee_id = $1';
            params.push(employeeId);
        }
        const result = await pool.query(sql, params);
        res.json({ payroll_history: result.rows });
    } catch (err: any) {
        res.status(500).json({ success: false, message: 'Database error: ' + err.message });
    }
});

app.get('/api/reports/analytics', async (req, res) => {
    try {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30));

        // 1. Operational Efficiency
        const [empCount, attendanceCount, leaveCount, timesheetCount] = await Promise.all([
            pool.query('SELECT COUNT(*)::int FROM employees'),
            pool.query('SELECT COUNT(DISTINCT employee_id)::int FROM attendance WHERE date >= CURRENT_DATE'),
            pool.query("SELECT COUNT(DISTINCT employee_id)::int FROM leaves WHERE status = 'approved' AND CURRENT_DATE BETWEEN start_date AND end_date"),
            pool.query('SELECT COUNT(DISTINCT employee_id)::int FROM timesheets WHERE date >= CURRENT_DATE - INTERVAL \'7 days\'')
        ]);

        const totalEmployees = empCount.rows[0].count || 1;
        const attendanceCompliance = ((attendanceCount.rows[0].count / totalEmployees) * 100).toFixed(1) + '%';
        const leaveUtilization = ((leaveCount.rows[0].count / totalEmployees) * 100).toFixed(1) + '%';
        const timesheetRate = ((timesheetCount.rows[0].count / totalEmployees) * 100).toFixed(1) + '%';

        // 2. Financial Integrity
        const [payrollSummary, deptOvertime] = await Promise.all([
            pool.query('SELECT SUM(annual_ctc)/12 AS monthly_cost FROM payroll_profiles'),
            pool.query(`
                SELECT e.department, SUM(p.overtime) as ot_cost
                FROM employees e
                JOIN payroll_profiles p ON e.id = p.employee_id
                WHERE p.overtime > 0
                GROUP BY e.department
                ORDER BY ot_cost DESC
                LIMIT 2
            `)
        ]);

        const monthlyCost = Number(payrollSummary.rows[0].monthly_cost || 0);
        const formattedCost = (monthlyCost / 1000000).toFixed(2) + 'M';

        const overtimeImpact = deptOvertime.rows.map(row => ({
            label: row.department,
            cost: Number(row.ot_cost),
            pct: monthlyCost > 0 ? Math.round((Number(row.ot_cost) / (monthlyCost / totalEmployees)) * 100) : 0
        }));

        // 3. Strategic Performance
        const [recentHires, totalHires] = await Promise.all([
            pool.query('SELECT COUNT(*)::int FROM employees WHERE join_date >= CURRENT_DATE - INTERVAL \'90 days\''),
            pool.query('SELECT COUNT(*)::int FROM employees')
        ]);

        const growthRate = ((recentHires.rows[0].count / (totalHires.rows[0].count || 1)) * 100).toFixed(1) + '%';

        res.json({
            operational: {
                attendance: { val: attendanceCompliance, desc: 'Daily presence across all hubs' },
                leave: { val: leaveUtilization, desc: 'Percentage of total PTO consumed' },
                timesheet: { val: timesheetRate, desc: 'Weekly accountability rate' }
            },
            financial: {
                monthlyCost: formattedCost,
                overtime: overtimeImpact
            },
            strategic: {
                growth: growthRate,
                attrition: '2.1%', // Placeholder for now
                productivity: '8.4/10',
                health: 'P-99'
            }
        });
    } catch (err: any) {
        res.status(500).json({ success: false, message: 'Analytics error: ' + err.message });
    }
});

const calculateIndPayroll = (structure: any, lopDays: number = 0, annual_ctc?: number) => {
    const basic = Number(structure.basic_salary || 0);
    const hra = Number(structure.hra || 0);
    const allowances = Number(structure.allowances || 0);
    const bonus = Number(structure.bonus || 0);
    const overtime = Number(structure.overtime || 0);

    const perDaySalary = (basic + hra + allowances) / 30;
    const lop_deduction = Math.round(lopDays * perDaySalary);
    const gross_without_bonus = basic + hra + allowances + overtime - lop_deduction;
    const gross_salary = gross_without_bonus + bonus;

    const pf_employee = Math.round(basic * 0.12);
    const esi_employee = gross_salary < 21000 ? Math.round(gross_salary * 0.0075) : 0;
    const professional_tax = 200;

    const taxBase = annual_ctc || (gross_salary * 12);
    let annualTDS = 0;
    if (taxBase > 1500000) annualTDS = 150000 + (taxBase - 1500000) * 0.30;
    else if (taxBase > 1200000) annualTDS = 90000 + (taxBase - 1200000) * 0.20;
    else if (taxBase > 900000) annualTDS = 45000 + (taxBase - 900000) * 0.15;
    else if (taxBase > 600000) annualTDS = 15000 + (taxBase - 600000) * 0.10;
    else if (taxBase > 300000) annualTDS = (taxBase - 300000) * 0.05;

    const tds = Math.round(annualTDS / 12);
    const total_deductions = pf_employee + esi_employee + professional_tax + tds;
    const net_salary = gross_salary - total_deductions;

    return {
        gross_salary, lop_deduction, net_salary,
        deductions: { tds, pf_employee, esi_employee, professional_tax, total: total_deductions }
    };
};

app.post('/api/payroll/run', async (req, res) => {
    const { month, year } = req.body;
    try {
        const runId = `RUN-${Date.now()}`;
        await pool.query('INSERT INTO payroll_runs (id, month, year) VALUES ($1, $2, $3)', [runId, month, year]);
        res.json({ success: true, runId });
    } catch (err: any) {
        res.status(500).json({ success: false, message: 'Database error: ' + err.message });
    }
});

// --- Approvals ---
app.get('/api/approvals/pending', async (req, res) => {
    try {
        const result = await pool.query('SELECT a.*, e.name as employee_name FROM approvals a JOIN employees e ON a.employee_id = e.id WHERE a.status = $1', ['pending']);
        res.json(result.rows);
    } catch (err: any) {
        res.status(500).json({ success: false, message: 'Database error: ' + err.message });
    }
});

app.post('/api/approvals', async (req, res) => {
    const { employeeId, type, status = 'pending' } = req.body;
    try {
        const id = `APP-${Date.now()}`;
        await pool.query('INSERT INTO approvals (id, employee_id, type, status) VALUES ($1, $2, $3, $4)', [id, employeeId, type, status]);
        res.status(201).json({ success: true });
    } catch (err: any) {
        res.status(500).json({ success: false, message: 'Database error: ' + err.message });
    }
});

app.put('/api/approvals/:id/:action', async (req, res) => {
    const { id, action } = req.params;
    const status = action === 'approve' ? 'approved' : 'rejected';
    try {
        await pool.query('UPDATE approvals SET status = $1 WHERE id = $2', [status, id]);
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ success: false, message: 'Database error: ' + err.message });
    }
});
// --- Claims ---
app.post('/api/claims', async (req, res) => {
    const { employee_id, amount, category, description } = req.body;
    try {
        const id = `CLM-${Date.now()}`;
        await pool.query(
            'INSERT INTO claims (id, employee_id, amount, category, description, status) VALUES ($1, $2, $3, $4, $5, $6)',
            [id, employee_id, amount, category, description, 'pending']
        );
        res.status(201).json({ success: true, claimId: id });
    } catch (err: any) {
        res.status(500).json({ success: false, message: 'Database error: ' + err.message });
    }
});

app.get('/api/claims/employee/:employeeId', async (req, res) => {
    const { employeeId } = req.params;
    try {
        const result = await pool.query('SELECT * FROM claims WHERE employee_id = $1 ORDER BY created_at DESC', [employeeId]);
        res.json(result.rows);
    } catch (err: any) {
        res.status(500).json({ success: false, message: 'Database error: ' + err.message });
    }
});

app.get('/api/claims/admin', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT c.*, e.name as employee_name FROM claims c JOIN employees e ON c.employee_id = e.id ORDER BY c.created_at DESC'
        );
        res.json(result.rows);
    } catch (err: any) {
        res.status(500).json({ success: false, message: 'Database error: ' + err.message });
    }
});

app.put('/api/claims/:id/approve', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('UPDATE claims SET status = $1 WHERE id = $2', ['approved', id]);
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ success: false, message: 'Database error: ' + err.message });
    }
});

app.put('/api/claims/:id/reject', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('UPDATE claims SET status = $1 WHERE id = $2', ['rejected', id]);
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ success: false, message: 'Database error: ' + err.message });
    }
});

// --- Tax Slabs ---
app.get('/api/tax/slabs', (req, res) => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const filePath = path.join(__dirname, '../public/tax_slabs_FY2025_26.pdf');
    res.download(filePath, 'tax_slabs_FY2025_26.pdf');
});


// --- Documents / Payslips ---
// GET /api/payroll/payslip/:id  — JSON for use by the in-browser print dialog
app.get('/api/payroll/payslip/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(
            `SELECT pe.*, p.department, e.name as employee
             FROM payroll_entries pe
             JOIN employees e ON pe.employee_id = e.id
             LEFT JOIN payroll_profiles p ON pe.employee_id = p.employee_id
             WHERE pe.id = $1`,
            [id]
        );
        if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Not found' });
        res.json(result.rows[0]);
    } catch (err: any) {
        res.status(500).json({ success: false, message: 'Database error' });
    }
});

// Helper: build a polished PDF payslip buffer
const buildPayslipPDF = async (entry: any, employeeName: string): Promise<Buffer> => {
    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const monthLabel = MONTHS[(parseInt(entry.month) - 1)] || entry.month;

    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const buffers: Buffer[] = [];
        doc.on('data', (b: Buffer) => buffers.push(b));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        // --- Header ---
        doc.fontSize(22).font('Helvetica-Bold').text('ANTIGRAVITY HCM', { align: 'center' });
        doc.fontSize(10).font('Helvetica').fillColor('#64748b').text('Payroll Statement', { align: 'center' });
        doc.moveDown(0.5);
        doc.fontSize(12).fillColor('#2563eb').font('Helvetica-Bold')
           .text(`${monthLabel} ${entry.year}`, { align: 'center' });
        doc.moveDown();

        // Separator
        doc.strokeColor('#e2e8f0').lineWidth(1)
           .moveTo(50, doc.y).lineTo(545, doc.y).stroke();
        doc.moveDown();

        // --- Employee Info ---
        doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(10).text('EMPLOYEE DETAILS');
        doc.moveDown(0.3);
        doc.font('Helvetica').fontSize(10).fillColor('#374151');
        doc.text(`Name        : ${employeeName}`);
        doc.text(`Employee ID : ${entry.employee_id}`);
        doc.text(`Department  : ${entry.department || 'N/A'}`);
        doc.text(`Pay Period  : ${monthLabel} ${entry.year}`);
        doc.moveDown();

        doc.strokeColor('#e2e8f0').lineWidth(0.5)
           .moveTo(50, doc.y).lineTo(545, doc.y).stroke();
        doc.moveDown();

        // --- Earnings ---
        const gross = Number(entry.gross_salary) || 0;
        const basic = Math.round(gross * 0.50);
        const hra   = Math.round(gross * 0.20);
        const allowance = Math.round(gross * 0.20);
        const bonus = gross - basic - hra - allowance;

        doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(10).text('EARNINGS');
        doc.moveDown(0.3);
        doc.font('Helvetica').fontSize(10).fillColor('#374151');
        const earningLines = [
            ['Basic Salary',          basic],
            ['House Rent Allowance',  hra],
            ['Special Allowance',     allowance],
            ['Bonus',                 bonus],
        ];
        earningLines.forEach(([label, val]) => {
            doc.text(`${label}`, 60, doc.y, { continued: true, width: 300 });
            doc.text(`INR ${Number(val).toLocaleString()}`, { align: 'right' });
        });
        doc.font('Helvetica-Bold')
           .text('Gross Earnings', 60, doc.y, { continued: true, width: 300 })
           .text(`INR ${gross.toLocaleString()}`, { align: 'right' });
        doc.moveDown();

        // --- Deductions ---
        doc.strokeColor('#e2e8f0').lineWidth(0.5)
           .moveTo(50, doc.y).lineTo(545, doc.y).stroke();
        doc.moveDown(0.5);
        doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(10).text('DEDUCTIONS');
        doc.moveDown(0.3);
        doc.font('Helvetica').fontSize(10).fillColor('#374151');
        const tds = Number(entry.tds) || 0;
        const pf  = Number(entry.pf_employee) || 0;
        const esi = Number(entry.esi_employee) || 0;
        const pt  = Number(entry.professional_tax) || 0;
        const totalDed = tds + pf + esi + pt;
        const dedLines = [
            ['Income Tax (TDS)',   tds],
            ['Provident Fund',     pf],
            ['ESI',                esi],
            ['Professional Tax',  pt],
        ];
        dedLines.forEach(([label, val]) => {
            doc.text(`${label}`, 60, doc.y, { continued: true, width: 300 });
            doc.text(`INR ${Number(val).toLocaleString()}`, { align: 'right' });
        });
        doc.font('Helvetica-Bold')
           .text('Total Deductions', 60, doc.y, { continued: true, width: 300 })
           .text(`INR ${totalDed.toLocaleString()}`, { align: 'right' });
        doc.moveDown();

        // --- Net Pay ---
        doc.strokeColor('#2563eb').lineWidth(1)
           .moveTo(50, doc.y).lineTo(545, doc.y).stroke();
        doc.moveDown(0.5);
        const net = Number(entry.net_salary) || 0;
        doc.fillColor('#2563eb').font('Helvetica-Bold').fontSize(14)
           .text('NET PAYABLE', 60, doc.y, { continued: true, width: 300 })
           .text(`INR ${net.toLocaleString()}`, { align: 'right' });
        doc.moveDown(2);

        // --- Footer ---
        doc.fontSize(8).fillColor('#94a3b8').font('Helvetica')
           .text('This is a computer-generated payslip and does not require a physical signature.', { align: 'center' });

        doc.end();
    });
};

// GET /api/payroll/payslip/:employeeId/monthly?month=&year=  — PDF download
app.get('/api/payroll/payslip/:employeeId/monthly', async (req, res) => {
    const { employeeId } = req.params;
    const { month, year } = req.query as { month: string; year: string };

    if (!month || !year) {
        return res.status(400).json({ success: false, message: 'month and year are required query params.' });
    }

    try {
        const entryRes = await pool.query(
            `SELECT pe.*, e.name as employee_name, p.department
             FROM payroll_entries pe
             JOIN employees e ON pe.employee_id = e.id
             LEFT JOIN payroll_profiles p ON pe.employee_id = p.employee_id
             WHERE pe.employee_id = $1 AND pe.month = $2 AND pe.year = $3
             LIMIT 1`,
            [employeeId, month, year]
        );

        if (entryRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: `No payroll entry found for ${employeeId} in ${month}/${year}. Run payroll first.` });
        }

        const entry = entryRes.rows[0];
        const employeeName = entry.employee_name;
        const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const monthLabel = MONTHS[(parseInt(month) - 1)] || month;

        const pdfBuffer = await buildPayslipPDF(entry, employeeName);

        const safeName = employeeName.replace(/[^a-zA-Z0-9]/g, '_');
        const filename = `${safeName}_${monthLabel}_${year}_Payslip.pdf`;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(pdfBuffer);
    } catch (err: any) {
        console.error('Monthly payslip error:', err);
        res.status(500).json({ success: false, message: 'PDF generation failed: ' + err.message });
    }
});

// GET /api/payroll/payslip/:employeeId/yearly?year=  — ZIP of all monthly payslips
app.get('/api/payroll/payslip/:employeeId/yearly', async (req, res) => {
    const { employeeId } = req.params;
    const { year } = req.query as { year: string };

    if (!year) {
        return res.status(400).json({ success: false, message: 'year is a required query parameter.' });
    }

    try {
        const entriesRes = await pool.query(
            `SELECT pe.*, e.name as employee_name, p.department
             FROM payroll_entries pe
             JOIN employees e ON pe.employee_id = e.id
             LEFT JOIN payroll_profiles p ON pe.employee_id = p.employee_id
             WHERE pe.employee_id = $1 AND pe.year = $2
             ORDER BY pe.month::int`,
            [employeeId, year]
        );

        if (entriesRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: `No payroll entries found for ${employeeId} in FY ${year}.` });
        }

        const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const zip = new AdmZip();
        const employeeName = entriesRes.rows[0].employee_name;
        const safeName = employeeName.replace(/[^a-zA-Z0-9]/g, '_');

        for (const entry of entriesRes.rows) {
            const monthLabel = MONTHS[(parseInt(entry.month) - 1)] || entry.month;
            const pdfBuffer = await buildPayslipPDF(entry, employeeName);
            zip.addFile(`${safeName}_${monthLabel}_${year}_Payslip.pdf`, pdfBuffer);
        }

        const zipBuffer = zip.toBuffer();
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${safeName}_FY${year}_Payslips.zip"`);
        res.send(zipBuffer);
    } catch (err: any) {
        console.error('Yearly payslip error:', err);
        res.status(500).json({ success: false, message: 'ZIP generation failed: ' + err.message });
    }
});

// --- Tax & Statutory Summary ---
// If payroll has been run for the period, aggregate from payroll_entries.
// Otherwise fall back to calculating from payroll_profiles so the dashboard
// is never empty even before the first payroll run.
app.get('/api/payroll/tax-statutory/summary', async (req, res) => {
    const { month, year } = req.query as { month: string; year: string };
    try {
        if (month && year) {
            const entryRes = await pool.query(
                `SELECT
                     COALESCE(SUM(tds),0)              AS tds_total,
                     COALESCE(SUM(pf_employee),0)      AS pf_total,
                     COALESCE(SUM(esi_employee),0)     AS esi_total,
                     COALESCE(SUM(professional_tax),0) AS pt_total
                 FROM payroll_entries
                 WHERE month = $1 AND year = $2`,
                [month, year]
            );
            const t = entryRes.rows[0];

            // If we got real data from a completed payroll run, return it directly
            const hasData = Number(t.tds_total) + Number(t.pf_total) + Number(t.esi_total) + Number(t.pt_total) > 0;
            if (hasData) {
                return res.json({
                    tds: Number(t.tds_total),
                    pf:  Number(t.pf_total),
                    esi: Number(t.esi_total),
                    professionalTax: Number(t.pt_total),
                    source: 'payroll_entries'
                });
            }
        }

        // --- Fallback: derive from payroll_profiles ---
        const profilesRes = await pool.query('SELECT * FROM payroll_profiles WHERE annual_ctc IS NOT NULL AND annual_ctc > 0');
        let tds = 0, pf = 0, esi = 0, pt = 0;

        for (const p of profilesRes.rows) {
            const calcs = calculateIndPayroll(p, 0, p.annual_ctc);
            tds += calcs.deductions.tds;
            pf  += calcs.deductions.pf_employee;
            esi += calcs.deductions.esi_employee;
            pt  += calcs.deductions.professional_tax;
        }

        res.json({
            tds:   Math.round(tds),
            pf:    Math.round(pf),
            esi:   Math.round(esi),
            professionalTax: Math.round(pt),
            source: 'payroll_profiles'
        });
    } catch (err: any) {
        res.status(500).json({ success: false, message: 'Database error: ' + err.message });
    }
});

app.get('/api/payroll/documents/bulk-payslips', async (req, res) => {
    const { month, year } = req.query;
    try {
        const sql = `
            SELECT pe.*, e.name
            FROM payroll_entries pe
            JOIN employees e ON pe.employee_id = e.id
            WHERE pe.month = $1 AND pe.year = $2
        `;
        const result = await pool.query(sql, [month, year]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'No payroll entries found for this period.' });
        }

        const zip = new AdmZip();

        for (const entry of result.rows) {
            const doc = new PDFDocument();
            const buffers: any[] = [];
            doc.on('data', buffers.push.bind(buffers));

            const pdfPromise = new Promise<Buffer>((resolve) => {
                doc.on('end', () => {
                    resolve(Buffer.concat(buffers));
                });
            });

            doc.fontSize(20).text('Salary Slip', { align: 'center' });
            doc.moveDown();
            doc.fontSize(12).text(`Employee Name: ${entry.name}`);
            doc.text(`Employee ID: ${entry.employee_id}`);
            doc.text(`Cycle: ${month}/${year}`);
            doc.moveDown();
            doc.text(`Gross Salary: INR ${entry.gross_salary}`);
            doc.text(`TDS: INR ${entry.tds}`);
            doc.text(`PF: INR ${entry.pf_employee}`);
            doc.text(`ESI: INR ${entry.esi_employee}`);
            doc.text(`Professional Tax: INR ${entry.professional_tax}`);
            doc.moveDown();
            doc.font('Helvetica-Bold').fontSize(14).text(`Net Salary: INR ${entry.net_salary}`);
            doc.font('Helvetica');
            doc.end();

            const pdfBuffer = await pdfPromise;
            zip.addFile(`payslip_${entry.employee_id}.pdf`, pdfBuffer);
        }

        const zipBuffer = zip.toBuffer();
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename=payslips_${month}_${year}.zip`);
        res.send(zipBuffer);
    } catch (err: any) {
        console.error('Bulk generation error:', err);
        res.status(500).json({ success: false, message: 'Generation failed' });
    }
});

// --- Deadlines & Loans ---
app.get('/api/payroll/deadlines/latest', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM investment_deadlines ORDER BY created_at DESC LIMIT 1');
        res.json(result.rows[0] || null);
    } catch (err: any) {
        res.status(500).json({ success: false, message: 'Database error' });
    }
});

app.post('/api/payroll/deadlines', async (req, res) => {
    const { deadlineDate } = req.body;
    try {
        const id = `DL-${Date.now()}`;
        await pool.query('INSERT INTO investment_deadlines (id, deadline_date) VALUES ($1, $2)', [id, deadlineDate]);
        res.status(201).json({ success: true });
    } catch (err: any) {
        res.status(500).json({ success: false, message: 'Database error' });
    }
});

app.get('/api/payroll/loans', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM loans');
        res.json({ loans: result.rows });
    } catch (err: any) {
        res.status(500).json({ success: false, message: 'Database error' });
    }
});

// --- Payroll Profiles (spec alias for /api/payroll/profiles) ---
app.get('/api/payroll-profiles', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM payroll_profiles');
        res.json({ employee_profiles: result.rows });
    } catch (err: any) {
        res.status(500).json({ success: false, message: 'Database error: ' + err.message });
    }
});

// --- Attendance ---
app.get('/api/attendance/today', async (req, res) => {
    // Derive employee_id from the Authorization token (mock token carries timestamp only,
    // so we use the authenticated user's email as a stable identifier via query param or
    // fallback to a session-level lookup by using the request IP as a key for demo purposes).
    // For a production system this would decode the JWT.
    const employeeId = (req.query.employeeId as string) || 'admin';
    try {
        const result = await pool.query(
            `SELECT * FROM attendance
             WHERE employee_id = $1 AND date = CURRENT_DATE
             ORDER BY id DESC LIMIT 1`,
            [employeeId]
        );
        if (result.rows.length === 0) {
            return res.json({ status: 'OUT' });
        }
        const record = result.rows[0];
        const status = record.check_out_time ? 'COMPLETED' : (record.check_in_time ? 'IN' : 'OUT');
        res.json({
            status,
            checkInTime: record.check_in_time,
            checkOutTime: record.check_out_time
        });
    } catch (err: any) {
        res.status(500).json({ success: false, message: 'Database error: ' + err.message });
    }
});

app.post('/api/attendance/check-in', async (req, res) => {
    const employeeId = (req.body.employeeId as string) || 'admin';
    try {
        // Prevent duplicate check-in on same day
        const existing = await pool.query(
            'SELECT * FROM attendance WHERE employee_id = $1 AND date = CURRENT_DATE',
            [employeeId]
        );
        if (existing.rows.length > 0 && existing.rows[0].check_in_time) {
            return res.json({ status: 'IN', checkInTime: existing.rows[0].check_in_time });
        }
        await pool.query(
            'INSERT INTO attendance (employee_id, check_in_time, status, date) VALUES ($1, NOW(), $2, CURRENT_DATE)',
            [employeeId, 'IN']
        );
        const record = await pool.query(
            'SELECT * FROM attendance WHERE employee_id = $1 AND date = CURRENT_DATE ORDER BY id DESC LIMIT 1',
            [employeeId]
        );
        res.json({ status: 'IN', checkInTime: record.rows[0].check_in_time });
    } catch (err: any) {
        res.status(500).json({ success: false, message: 'Check-in failed: ' + err.message });
    }
});

app.post('/api/attendance/check-out', async (req, res) => {
    const employeeId = (req.body.employeeId as string) || 'admin';
    try {
        await pool.query(
            `UPDATE attendance SET check_out_time = NOW(), status = 'COMPLETED'
             WHERE employee_id = $1 AND date = CURRENT_DATE AND check_out_time IS NULL`,
            [employeeId]
        );
        const record = await pool.query(
            'SELECT * FROM attendance WHERE employee_id = $1 AND date = CURRENT_DATE ORDER BY id DESC LIMIT 1',
            [employeeId]
        );
        const row = record.rows[0];
        res.json({ status: 'COMPLETED', checkInTime: row?.check_in_time, checkOutTime: row?.check_out_time });
    } catch (err: any) {
        res.status(500).json({ success: false, message: 'Check-out failed: ' + err.message });
    }
});

const startServer = (portToTry: number | string) => {
    const server = app.listen(portToTry)
        .on('listening', () => {
            console.log(`✅ Server running at http://localhost:${portToTry}`);
        })
        .on('error', (err: any) => {
            if (err.code === 'EADDRINUSE') {
                console.log(`Port ${portToTry} is busy, trying ${Number(portToTry) + 1}...`);
                startServer(Number(portToTry) + 1);
            } else {
                console.error('❌ Server error:', err);
            }
        });
};

// --- Database Connection Test + Server Startup ---
(async () => {
    // Test database connectivity before accepting requests
    try {
        const result = await pool.query('SELECT NOW()');
        console.log(`✅ Database connected successfully. Server time: ${result.rows[0].now}`);
    } catch (err: any) {
        console.error('❌ Database connection failed:', err.message);
        console.error('   Check that PostgreSQL is running and DATABASE_URL in .env is correct.');
        console.error(`   DATABASE_URL: ${process.env.DATABASE_URL ?? '(not set)'}`);
        // Continue starting the server so API error messages are still returned
    }

    // Initialize DB schema
    await initDb();

    // Start listening
    startServer(port);
})();
