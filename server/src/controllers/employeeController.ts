import { Request, Response } from 'express';
import { pool } from '../config/db';

export const getEmployees = async (req: Request, res: Response) => {
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
};

export const createEmployee = async (req: Request, res: Response) => {
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

        if (email) {
            await pool.query(
                'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING',
                [name, email, '$2b$10$dn7zRyaIJrLtiU24ttw4cObBjczJT8TkoTHwscC9jMJMbhh/VDbXC', 'employee'] // 'password' hashed
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
};

export const bulkUpload = async (req: Request, res: Response) => {
    const { employees } = req.body;
    if (!employees || !Array.isArray(employees)) {
        return res.status(400).json({ success: false, message: 'Send a JSON body { employees: [] }.' });
    }

    let inserted = 0;
    let skipped = 0;
    for (const emp of employees) {
        const { employee_id, name, department, position, join_date, annual_ctc } = emp;
        if (!employee_id || !name) { skipped++; continue; }

        const existing = await pool.query('SELECT id FROM employees WHERE id = $1', [employee_id]);
        if (existing.rows.length > 0) { skipped++; continue; }

        const monthlyGross = (Number(annual_ctc) || 0) / 12;
        const basic = Math.round(monthlyGross * 0.50);
        const hra = Math.round(monthlyGross * 0.20);
        const allowances = Math.round(monthlyGross * 0.20);
        const bonus = Math.round(monthlyGross * 0.05);

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
};
