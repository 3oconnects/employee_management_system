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
        employmentType, reportingManagerId, departmentId, probationEndDate,
        // Education
        highestDegree, fieldOfStudy, institution, graduationYear,
        educationHistory, experienceHistory,
        // Internship
        internshipStartDate, internshipEndDate, internshipStipend,
        internshipSupervisor, internshipCollege,
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
                highest_degree, field_of_study, institution, graduation_year,
                education_history, experience_history,
                internship_start_date, internship_end_date, internship_stipend,
                internship_supervisor, internship_college,
                tenant_id
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31)
            RETURNING *
        `;
        const empParams = [
            newId, name, email, finalPosition, department, joinDate, empStatus,
            phone, dateOfBirth, gender, personalEmail, addressLine1, city, state, pincode,
            employmentType || 'full_time', reportingManagerId || null, departmentId || null,
            probationEndDate || null,
            highestDegree || null, fieldOfStudy || null, institution || null, graduationYear || null,
            JSON.stringify(educationHistory || []),
            JSON.stringify(experienceHistory || []),
            internshipStartDate || null, internshipEndDate || null,
            internshipStipend ? Number(internshipStipend) : null,
            internshipSupervisor || null, internshipCollege || null,
            'tenant_default'
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

        // Build dynamic update for employees — map camelCase → snake_case
        const FIELD_MAP: Record<string,string> = {
            personalEmail:      'personal_email',
            dateOfBirth:        'date_of_birth',
            addressLine1:       'address_line1',
            joinDate:           'join_date',
            employmentType:     'employment_type',
            bloodGroup:         'blood_group',
            maritalStatus:      'marital_status',
            educationHistory:   'education_history',
            experienceHistory:  'experience_history',
            reportingManagerId: 'reporting_manager_id',
            annualCTC:          'annual_ctc',
            taxRegime:          'tax_regime',
            bankAccountNumber:  'bank_account_number',
            highestDegree:      'highest_degree',
            fieldOfStudy:       'field_of_study',
            institution:        'institution',
            graduationYear:     'graduation_year',
            internshipStartDate: 'internship_start_date',
            internshipEndDate:   'internship_end_date',
            internshipStipend:   'internship_stipend',
            internshipSupervisor: 'internship_supervisor',
            internshipCollege:    'internship_college',
        };
        const BLOCKED = new Set(['id','created_at','updated_at','tenant_id', 'reportingManagerName']);
        const mapped: Record<string,any> = {};
        for (const [k,v] of Object.entries(updates)) {
            if (BLOCKED.has(k)) continue;
            // Sanitize empty strings to null (Postgres doesn't like "" for dates/integers)
            mapped[FIELD_MAP[k] || k] = (v === "" ? null : v);
        }
        const fields = Object.keys(mapped);
        if (fields.length > 0) {
            const setClause = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');
            const params = fields.map(f => mapped[f]);
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
                [updates.name, updates.department, updates.position, updates.annualCTC || updates.annual_ctc, id]
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
    if (!employees || !Array.isArray(employees) || employees.length === 0) {
        return res.status(400).json({ success: false, message: 'Send { employees: [] } with at least one row.' });
    }
    if (employees.length > 500) {
        return res.status(400).json({ success: false, message: 'Maximum 500 employees per bulk upload.' });
    }

    const results: { row: number; name: string; status: 'inserted' | 'skipped'; reason?: string }[] = [];
    let inserted = 0;
    let skipped  = 0;

    const normalizeDate = (val: string | null | undefined): string | null => {
        if (!val || typeof val !== 'string') return null;
        const d = val.trim();
        if (!d) return null;
        // If DD-MM-YYYY or DD/MM/YYYY, flip it to YYYY-MM-DD
        const parts = d.split(/[-/]/);
        if (parts.length === 3 && parts[0].length <= 2 && parts[2].length === 4) {
            return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
        return d;
    };

    for (let i = 0; i < employees.length; i++) {
        const emp    = employees[i];
        const rowNum = i + 2; // row 1 = header

        try {
            const { name, email, phone, dateOfBirth, gender, personalEmail,
                    department, position, joinDate, employmentType, status,
                    addressLine1, city, state, pincode, annualCTC, taxRegime } = emp;

            if (!name?.trim()) {
                results.push({ row: rowNum, name: name || '(blank)', status: 'skipped', reason: 'Name is required' });
                skipped++; continue;
            }
            if (!department?.trim()) {
                results.push({ row: rowNum, name, status: 'skipped', reason: 'Department is required' });
                skipped++; continue;
            }
            if (!joinDate) {
                results.push({ row: rowNum, name, status: 'skipped', reason: 'Join Date is required' });
                skipped++; continue;
            }

            // Duplicate email check
            if (email?.trim()) {
                const dup = await pool.query('SELECT id FROM employees WHERE email = $1', [email.trim()]);
                if (dup.rows.length > 0) {
                    results.push({ row: rowNum, name, status: 'skipped', reason: `Email ${email} already exists` });
                    skipped++; continue;
                }
            }

            // Generate ID using same format as createEmployee
            const countRes = await pool.query('SELECT COUNT(*) FROM employees');
            const count    = parseInt(countRes.rows[0].count);
            const newId    = `EMP${(count + 1).toString().padStart(3, '0')}`;

            const finalPosition = position?.trim() || `${department.trim()} Staff`;
            const empStatus     = status || 'onboarding';
            const empType       = employmentType || 'full_time';

            const normJoinDate  = normalizeDate(joinDate);
            const normDOB       = normalizeDate(dateOfBirth);

            await pool.query(`
                INSERT INTO employees (
                    id, name, email, phone, date_of_birth, gender, personal_email,
                    department, position, join_date, employment_type, status,
                    address_line1, city, state, pincode,
                    tenant_id
                ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
            `, [
                newId,
                name.trim(),
                email?.trim()        || null,
                phone?.trim()        || null,
                normDOB,
                gender               || null,
                personalEmail?.trim()|| null,
                department.trim(),
                finalPosition,
                normJoinDate,
                empType,
                empStatus,
                addressLine1         || null,
                city                 || null,
                state                || null,
                pincode              || null,
                'tenant_default'
            ]);

            // Create payroll profile if CTC provided
            if (annualCTC && Number(annualCTC) > 0) {
                const ctc    = Number(annualCTC);
                const gross  = ctc / 12;
                const basic  = Math.round(gross * 0.50);
                const hra    = Math.round(gross * 0.20);
                const allow  = Math.round(gross * 0.25);
                const bonus  = Math.round(gross * 0.05);
                await pool.query(
                    `INSERT INTO payroll_profiles (employee_id, name, department, role, annual_ctc, bank_account, tax_regime, basic_salary, hra, allowances, bonus, overtime, tenant_id)
                     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) ON CONFLICT (employee_id) DO NOTHING`,
                    [newId, name.trim(), department.trim(), finalPosition, ctc, 'PENDING', taxRegime || 'New', basic, hra, allow, bonus, 0, 'tenant_default']
                );
            }

            results.push({ row: rowNum, name, status: 'inserted' });
            inserted++;
        } catch (err: any) {
            results.push({ row: rowNum, name: emp?.name || '(unknown)', status: 'skipped', reason: err.message });
            skipped++;
        }
    }

    res.json({ success: true, inserted, skipped, total: employees.length, results });
};
