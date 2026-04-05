import { Request, Response } from 'express';
import { pool } from '../config/db';
import { NotificationService } from '../services/notificationService';

export const getEmployees = async (req: Request, res: Response) => {
    const { search, page = 1, limit = 10, status, departmentId } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    try {
        let sql = `
            SELECT e.*, d.name as department_name, m.name as manager_name 
            FROM employees e
            LEFT JOIN departments d ON e.department_id = d.id
            LEFT JOIN users m ON e.reporting_manager_id = m.id
            WHERE 1=1
        `;
        let countSql = 'SELECT COUNT(*) FROM employees e WHERE 1=1';
        const params: any[] = [];
        let pIndex = 1;

        if (search) {
            sql += ` AND (e.name ILIKE $${pIndex} OR e.id ILIKE $${pIndex} OR e.department ILIKE $${pIndex} OR e.email ILIKE $${pIndex})`;
            countSql += ` AND (e.name ILIKE $${pIndex} OR e.id ILIKE $${pIndex} OR e.department ILIKE $${pIndex} OR e.email ILIKE $${pIndex})`;
            params.push(`%${search}%`);
            pIndex++;
        }
        
        if (status) {
            sql += ` AND e.status = $${pIndex}`;
            countSql += ` AND e.status = $${pIndex}`;
            params.push(status);
            pIndex++;
        }

        if (departmentId) {
            sql += ` AND e.department_id = $${pIndex}`;
            countSql += ` AND e.department_id = $${pIndex}`;
            params.push(departmentId);
            pIndex++;
        }

        sql += ` ORDER BY e.created_at DESC LIMIT $${pIndex} OFFSET $${pIndex + 1}`;
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
    const { 
        name, email, annualCTC, department, position, joinDate, status,
        phone, dateOfBirth, gender, personalEmail, addressLine1, city, state, pincode,
        employmentType, reportingManagerId, departmentId, probationEndDate
    } = req.body;

    if (!name || annualCTC == null || !joinDate) {
        return res.status(400).json({ 
            success: false, 
            message: 'Missing essential employee details (name, CTC, join date).'
        });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        const countRes = await client.query('SELECT COUNT(*) FROM employees');
        const count = parseInt(countRes.rows[0].count);
        const newId = `EMP${(count + 1).toString().padStart(3, '0')}`;
        
        const empStatus = status || 'onboarding';
        const finalPosition = position || (department ? `${department} Staff` : 'Member');
        
        // 1. Insert into employees
        const empQuery = `
            INSERT INTO employees (
                id, name, email, position, department, join_date, status, 
                phone, date_of_birth, gender, personal_email, address_line1, city, state, pincode,
                employment_type, reporting_manager_id, department_id, probation_end_date,
                tenant_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
            RETURNING *
        `;
        const empParams = [
            newId, name, email, finalPosition, department, joinDate, empStatus,
            phone, dateOfBirth, gender, personalEmail, addressLine1, city, state, pincode,
            employmentType || 'full_time', reportingManagerId || null, departmentId || null, 
            probationEndDate || null, 'tenant_default'
        ];
        
        await client.query(empQuery, empParams);

        // 2. Create User record if email provided
        if (email) {
            await client.query(
                'INSERT INTO users (name, email, password, role, tenant_id) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (email) DO NOTHING',
                [name, email, '$2b$10$dn7zRyaIJrLtiU24ttw4cObBjczJT8TkoTHwscC9jMJMbhh/VDbXC', 'employee', 'tenant_default']
            );
        }

        // 3. Create Payroll Profile
        const monthlyGross = (Number(annualCTC) || 0) / 12;
        const basic = Math.round(monthlyGross * 0.50);
        const hra = Math.round(monthlyGross * 0.20);
        const allowances = Math.round(monthlyGross * 0.25);
        const bonus = Math.round(monthlyGross * 0.05);

        await client.query(
            `INSERT INTO payroll_profiles (
                employee_id, name, department, role, annual_ctc, bank_account, tax_regime, 
                basic_salary, hra, allowances, bonus, overtime, tenant_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
            [
                newId, name, department || 'Unassigned', finalPosition, annualCTC, 
                'PENDING', 'New', basic, hra, allowances, bonus, 0, 'tenant_default'
            ]
        );

        await client.query('COMMIT');
        NotificationService.onEmployeeCreated('tenant_default', name, newId);
        res.status(201).json({ success: true, employeeId: newId });
    } catch (err: any) {
        await client.query('ROLLBACK');
        console.error('CREATE_EMP_ERROR:', err);
        res.status(500).json({ success: false, message: 'Creation failed: ' + err.message });
    } finally {
        client.release();
    }
};

export const updateEmployee = async (req: Request, res: Response) => {
    const { id } = req.params;
    const updates = req.body;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const check = await client.query('SELECT * FROM employees WHERE id = $1', [id]);
        if (check.rows.length === 0) return res.status(404).json({ success: false, message: 'Employee not found.' });

        // Build dynamic update for employees
        const fields = Object.keys(updates).filter(k => ![ 'id', 'created_at', 'updated_at', 'tenant_id' ].includes(k));
        if (fields.length > 0) {
            const setClause = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');
            const params = fields.map(f => updates[f]);
            await client.query(`UPDATE employees SET ${setClause}, updated_at = NOW() WHERE id = $${fields.length + 1}`, [...params, id]);
        }

        // Sync Payroll if major fields changed
        if (updates.name || updates.department || updates.position || updates.annual_ctc) {
            await client.query(
                `UPDATE payroll_profiles 
                 SET name = COALESCE($1, name), 
                     department = COALESCE($2, department),
                     role = COALESCE($3, role),
                     annual_ctc = COALESCE($4, annual_ctc)
                 WHERE employee_id = $5`,
                [updates.name, updates.department, updates.position, updates.annual_ctc, id]
            );
        }

        // Sync User if email changed
        if (updates.email && updates.email !== check.rows[0].email) {
            await client.query('UPDATE users SET email = $1 WHERE email = $2', [updates.email, check.rows[0].email]);
        }

        await client.query('COMMIT');
        res.json({ success: true, message: 'Employee updated successfully.' });
    } catch (err: any) {
        await client.query('ROLLBACK');
        res.status(500).json({ success: false, message: 'Update failed: ' + err.message });
    } finally {
        client.release();
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
        try {
            const { employee_id, name, department, position, join_date, annual_ctc, email } = emp;
            if (!employee_id || !name) { skipped++; continue; }

            const existing = await pool.query('SELECT id FROM employees WHERE id = $1', [employee_id]);
            if (existing.rows.length > 0) { skipped++; continue; }

            await pool.query(
                'INSERT INTO employees (id, name, position, department, join_date, email, tenant_id) VALUES ($1,$2,$3,$4,$5,$6,$7)',
                [employee_id, name, position, department, join_date, email, 'tenant_default']
            );
            inserted++;
        } catch {
            skipped++;
        }
    }
    res.json({ inserted, skipped, success: true });
};

