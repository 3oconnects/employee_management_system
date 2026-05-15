import { pool } from '../../config/db';

export class EmployeesRepository {
    async findMany(tenantId: string, options: any) {
        const { search, limit, offset, status, departmentId, teamId } = options;
        
        let sql = `
            SELECT e.*, d.name as department_name, m.name as manager_name, 
                   u.availability_status,
                   CASE WHEN a.id IS NOT NULL THEN true ELSE false END as is_checked_in
            FROM employees e
            LEFT JOIN departments d ON e.department_id = d.id
            LEFT JOIN users m ON e.reporting_manager_id = m.id
            LEFT JOIN users u ON e.email = u.email AND e.tenant_id = u.tenant_id
            LEFT JOIN attendance a ON u.id = a.user_id AND a.check_in::date = CURRENT_DATE
            WHERE e.tenant_id = $1
        `;
        let countSql = 'SELECT COUNT(*) FROM employees e WHERE e.tenant_id = $1';
        const params: any[] = [tenantId];
        let pIndex = 2;

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
        if (teamId) {
            sql += ` AND e.team_id = $${pIndex}`;
            countSql += ` AND e.team_id = $${pIndex}`;
            params.push(teamId);
            pIndex++;
        }

        sql += ` ORDER BY e.created_at DESC LIMIT $${pIndex} OFFSET $${pIndex + 1}`;
        const finalParams = [...params, limit, offset];

        const [result, countResult] = await Promise.all([
            pool.query(sql, finalParams),
            pool.query(countSql, params)
        ]);

        return { items: result.rows, total: parseInt(countResult.rows[0].count) };
    }

    async countTotalEmployees(client: any = pool) {
        const countRes = await client.query('SELECT COUNT(*) FROM employees');
        return parseInt(countRes.rows[0].count);
    }

    async createEmployee(client: any, empData: any[]) {
        const empQuery = `
            INSERT INTO employees (
                id, name, email, position, department, join_date, status,
                phone, date_of_birth, gender, personal_email, address_line1, city, state, pincode,
                employment_type, reporting_manager_id, department_id, team_id, probation_end_date,
                highest_degree, field_of_study, institution, graduation_year,
                education_history, experience_history,
                internship_start_date, internship_end_date, internship_stipend,
                internship_supervisor, internship_college,
                tenant_id
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32)
            RETURNING *
        `;
        const res = await client.query(empQuery, empData);
        return res.rows[0];
    }

    async createUserAccount(client: any, name: string, email: string, hashedPassword: string, role: string, tenantId: string) {
        await client.query(
            'INSERT INTO users (name, email, password, role, tenant_id) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (email) DO NOTHING',
            [name, email, hashedPassword, role, tenantId]
        );
    }

    async createPayrollProfile(client: any, profileData: any[]) {
        await client.query(
            `INSERT INTO payroll_profiles (
                employee_id, name, department, role, annual_ctc, bank_account, tax_regime, 
                basic_salary, hra, allowances, bonus, overtime, tenant_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
            profileData
        );
    }

    async findById(id: string, tenantId: string) {
        const res = await pool.query('SELECT * FROM employees WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
        return res.rows[0];
    }

    async update(client: any, id: string, tenantId: string, setClause: string, params: any[]) {
        await client.query(`UPDATE employees SET ${setClause}, updated_at = NOW() WHERE id = $${params.length - 1} AND tenant_id = $${params.length}`, params);
    }

    async updatePayrollProfile(client: any, employeeId: string, tenantId: string, updates: any[]) {
        await client.query(
            `UPDATE payroll_profiles 
             SET name = COALESCE($1, name), 
                 department = COALESCE($2, department),
                 role = COALESCE($3, role),
                 annual_ctc = COALESCE($4, annual_ctc),
                 department_id = COALESCE($5, department_id),
                 team_id = COALESCE($6, team_id)
             WHERE employee_id = $7 AND tenant_id = $8`,
            updates
        );
    }

    async updateUserEmail(client: any, newEmail: string, oldEmail: string, tenantId: string) {
        await client.query('UPDATE users SET email = $1 WHERE email = $2 AND tenant_id = $3', [newEmail, oldEmail, tenantId]);
    }
}
