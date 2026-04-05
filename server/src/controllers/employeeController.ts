import { Request, Response } from 'express';
import { pool } from '../config/db';

export const getEmployees = async (req: Request, res: Response) => {
    const { search, page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    try {
        let sql = 'SELECT * FROM employees WHERE 1=1';
        let countSql = 'SELECT COUNT(*) FROM employees WHERE 1=1';
        const params: any[] = [];
        let pIndex = 1;

        if (search) {
            sql += ` AND (name ILIKE $${pIndex} OR id ILIKE $${pIndex} OR department ILIKE $${pIndex})`;
            countSql += ` AND (name ILIKE $${pIndex} OR id ILIKE $${pIndex} OR department ILIKE $${pIndex})`;
            params.push(`%${search}%`);
            pIndex++;
        }
        
        if (req.query.status) {
            sql += ` AND status = $${pIndex}`;
            countSql += ` AND status = $${pIndex}`;
            params.push(req.query.status);
            pIndex++;
        }

        sql += ` ORDER BY id LIMIT $${pIndex} OFFSET $${pIndex + 1}`;
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
    const { name, email, annualCTC, department, taxRegime, bankAccountNumber, joinDate, status } = req.body;

    console.log('CREATE EMPLOYEE PAYLOAD:', req.body);
    if (!name || annualCTC == null || !department || !taxRegime || !bankAccountNumber || !joinDate) {
        return res.status(400).json({ 
            success: false, 
            message: 'Missing required configuration fields.', 
            debugPayload: req.body,
            missing: { name: !!name, ctc: annualCTC != null, dept: !!department, tax: !!taxRegime, bank: !!bankAccountNumber, join: !!joinDate }
        });
    }

    const empStatus = status || 'active';

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
            'INSERT INTO employees (id, name, position, department, join_date, email, status) VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [newId, name, department + ' Staff', department, joinDate, email, empStatus]
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

export const updateEmployee = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, email, department, position, status, join_date } = req.body;

    try {
        const check = await pool.query('SELECT * FROM employees WHERE id = $1', [id]);
        if (check.rows.length === 0) return res.status(404).json({ success: false, message: 'Employee not found.' });

        await pool.query('BEGIN');

        // 1. Update employees table
        await pool.query(
            `UPDATE employees 
             SET name = COALESCE($1, name), 
                 email = COALESCE($2, email), 
                 department = COALESCE($3, department), 
                 position = COALESCE($4, position), 
                 status = COALESCE($5, status), 
                 join_date = COALESCE($6, join_date)
             WHERE id = $7`,
            [name, email, department, position, status, join_date, id]
        );

        // 2. Sync with payroll_profiles (name and department)
        await pool.query(
            `UPDATE payroll_profiles 
             SET name = COALESCE($1, name), 
                 department = COALESCE($2, department),
                 role = COALESCE($3, role)
             WHERE employee_id = $4`,
            [name, department, position, id]
        );

        // 3. Sync with users (if email exists and is changing)
        if (email && email !== check.rows[0].email) {
            await pool.query('UPDATE users SET email = $1, name = $2 WHERE email = $3', [email, name || check.rows[0].name, check.rows[0].email]);
        } else if (name && name !== check.rows[0].name) {
             await pool.query('UPDATE users SET name = $1 WHERE email = $2', [name, check.rows[0].email || email]);
        }

        await pool.query('COMMIT');
        res.json({ success: true, message: 'Employee updated successfully.' });
    } catch (err: any) {
        await pool.query('ROLLBACK');
        res.status(500).json({ success: false, message: 'Update failed: ' + err.message });
    }
};
