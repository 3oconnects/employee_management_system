import { pool } from '../../config/db';

export class EmployeesRepository {
    async findMany(tenantId: string, options: any) {
        const { search, limit, offset, status, departmentId, teamId } = options;
        
        let sql = `
            SELECT e.*, 
                   COALESCE(e.avatar_url, u.avatar_url) as avatar_url,
                   COALESCE(e.user_id, u.id) as user_id,
                   d.name as department_name, m.name as manager_name, 
                   u.availability_status,
                   COALESCE(r.name, u.role, 'employee') as role,
                   u.role_id,
                   CASE WHEN a.id IS NOT NULL THEN true ELSE false END as is_checked_in
            FROM employees e
            LEFT JOIN departments d ON e.department_id = d.id
            LEFT JOIN users m ON e.reporting_manager_id = m.id
            LEFT JOIN users u ON e.email = u.email AND (e.tenant_id = u.tenant_id OR u.tenant_id = 'tenant_default' OR u.tenant_id = 'default')
            LEFT JOIN roles r ON u.role_id = r.id
            LEFT JOIN attendance a ON u.id = a.user_id AND a.check_in::date = CURRENT_DATE
            WHERE e.tenant_id = $1 AND e.deleted_at IS NULL
        `;
        let countSql = 'SELECT COUNT(*) FROM employees e WHERE e.tenant_id = $1 AND e.deleted_at IS NULL';
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

    /**
     * Creates a login account. An existing account is NEVER touched (HF-10): on an e-mail collision nothing is
     * written and false is returned, whichever tenant the existing account belongs to.
     */
    async createUserAccount(client: any, name: string, email: string, hashedPassword: string, role: string, tenantId: string, isPasswordTemp: boolean = true, roleId: number): Promise<boolean> {
        const res = await client.query(
            `INSERT INTO users (name, email, password, role, tenant_id, is_password_temp, is_active, role_id)
             VALUES ($1, $2, $3, $4, $5, $6, true, $7)
             ON CONFLICT (email) DO NOTHING`,
            [name, email, hashedPassword, role, tenantId, isPasswordTemp, roleId]
        );
        return (res.rowCount ?? 0) > 0;
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
        const res = await pool.query(`
            SELECT e.*, 
                   COALESCE(r.name, u.role, 'employee') as role,
                   u.role_id
            FROM employees e
            LEFT JOIN users u ON e.email = u.email AND (e.tenant_id = u.tenant_id OR u.tenant_id = 'tenant_default' OR u.tenant_id = 'default')
            LEFT JOIN roles r ON u.role_id = r.id
            WHERE e.id = $1 AND (e.tenant_id = $2 OR e.tenant_id = 'tenant_default' OR e.tenant_id = 'default')
        `, [id, tenantId]);
        return res.rows[0];
    }

    async update(client: any, id: string, tenantId: string, setClause: string, params: any[]) {
        await client.query(`UPDATE employees SET ${setClause}, updated_at = NOW() WHERE id = $${params.length - 1} AND (tenant_id = $${params.length} OR tenant_id = 'tenant_default' OR tenant_id = 'default')`, params);
    }

    async updateEmployeeProfile(client: any, id: string, tenantId: string, fields: Record<string, any>) {
        const keys = Object.keys(fields);
        if (keys.length === 0) return;
        const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
        const params = keys.map(k => fields[k]);
        params.push(id, tenantId);
        await client.query(
            `UPDATE employees SET ${setClause}, updated_at = NOW() WHERE id = $${params.length - 1} AND (tenant_id = $${params.length} OR tenant_id = 'tenant_default' OR tenant_id = 'default')`,
            params
        );
    }

    async updateUserRole(client: any, email: string, roleName: string, roleId: number, tenantId: string) {
        await client.query(
            `UPDATE users 
             SET role = $1, role_id = $2, updated_at = NOW() 
             WHERE LOWER(email) = LOWER($3) AND (tenant_id = $4 OR tenant_id = 'tenant_default' OR tenant_id = 'default')`,
            [roleName, roleId, email.trim(), tenantId]
        );
    }

    async updateUserAvatar(client: any, email: string, avatarUrl: string, tenantId: string) {
        await client.query(
            `UPDATE users SET avatar_url = $1, updated_at = NOW() WHERE LOWER(email) = LOWER($2) AND (tenant_id = $3 OR tenant_id = 'tenant_default' OR tenant_id = 'default')`,
            [avatarUrl, email.trim(), tenantId]
        );
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
             WHERE employee_id = $7 AND (tenant_id = $8 OR tenant_id = 'tenant_default' OR tenant_id = 'default')`,
            updates
        );
    }

    async updateUserEmail(client: any, newEmail: string, oldEmail: string, tenantId: string) {
        await client.query(
            `UPDATE users SET email = $1, updated_at = NOW() WHERE LOWER(email) = LOWER($2) AND (tenant_id = $3 OR tenant_id = 'tenant_default' OR tenant_id = 'default')`,
            [newEmail.trim(), oldEmail.trim(), tenantId]
        );
    }

    /** True only when the employee belongs to this tenant; every sub-record read/write starts here (HF-6). */
    async existsInTenant(employeeId: string, tenantId: string): Promise<boolean> {
        const res = await pool.query('SELECT 1 FROM employees WHERE id = $1 AND tenant_id = $2', [employeeId, tenantId]);
        return res.rows.length > 0;
    }

    async findEducation(employeeId: string, tenantId: string) {
        const res = await pool.query(
            `SELECT x.* FROM employee_education x
             WHERE x.employee_id = $1 AND EXISTS (SELECT 1 FROM employees e WHERE e.id = x.employee_id AND e.tenant_id = $2)
             ORDER BY x.year DESC, x.id DESC`,
            [employeeId, tenantId]
        );
        if (res.rows.length > 0) return res.rows;
        const emp = await pool.query('SELECT education_history FROM employees WHERE id = $1 AND tenant_id = $2', [employeeId, tenantId]);
        return emp.rows[0]?.education_history || [];
    }

    async replaceEducation(client: any, employeeId: string, tenantId: string, entries: any[]) {
        await client.query(
            `DELETE FROM employee_education WHERE employee_id = $1
             AND EXISTS (SELECT 1 FROM employees e WHERE e.id = $1 AND e.tenant_id = $2)`, [employeeId, tenantId]);
        for (const e of entries) {
            await client.query(
                `INSERT INTO employee_education (employee_id, degree, field, institution, year, grade)
                 SELECT $1, $2, $3, $4, $5, $6 WHERE EXISTS (SELECT 1 FROM employees e WHERE e.id = $1 AND e.tenant_id = $7)`,
                [employeeId, e.degree || '', e.field || '', e.institution || '', e.year ? String(e.year) : '', e.grade || '', tenantId]
            );
        }
        const latest = entries[0];
        await client.query(
            `UPDATE employees 
             SET education_history = $1,
                 highest_degree = COALESCE($2, highest_degree),
                 field_of_study = COALESCE($3, field_of_study),
                 institution = COALESCE($4, institution),
                 graduation_year = COALESCE($5, graduation_year)
             WHERE id = $6 AND tenant_id = $7`,
            [
                JSON.stringify(entries),
                latest?.degree || null,
                latest?.field || null,
                latest?.institution || null,
                latest?.year ? String(latest.year) : null,
                employeeId,
                tenantId
            ]
        );
        return entries;
    }

    async findExperience(employeeId: string, tenantId: string) {
        const res = await pool.query(
            `SELECT x.* FROM employee_experience x
             WHERE x.employee_id = $1 AND EXISTS (SELECT 1 FROM employees e WHERE e.id = x.employee_id AND e.tenant_id = $2)
             ORDER BY x.start_date DESC NULLS LAST, x.id DESC`,
            [employeeId, tenantId]
        );
        if (res.rows.length > 0) return res.rows;
        const emp = await pool.query('SELECT experience_history FROM employees WHERE id = $1 AND tenant_id = $2', [employeeId, tenantId]);
        return emp.rows[0]?.experience_history || [];
    }

    async replaceExperience(client: any, employeeId: string, tenantId: string, entries: any[]) {
        await client.query(
            `DELETE FROM employee_experience WHERE employee_id = $1
             AND EXISTS (SELECT 1 FROM employees e WHERE e.id = $1 AND e.tenant_id = $2)`, [employeeId, tenantId]);
        for (const e of entries) {
            await client.query(
                `INSERT INTO employee_experience (employee_id, job_title, company, start_date, end_date, is_current, description)
                 SELECT $1, $2, $3, $4, $5, $6, $7 WHERE EXISTS (SELECT 1 FROM employees e WHERE e.id = $1 AND e.tenant_id = $8)`,
                [
                    employeeId,
                    e.jobTitle || e.job_title || '',
                    e.company || '',
                    e.startDate || e.start_date || null,
                    e.endDate || e.end_date || null,
                    Boolean(e.current || e.is_current),
                    e.description || '',
                    tenantId
                ]
            );
        }
        await client.query(
            `UPDATE employees SET experience_history = $1 WHERE id = $2 AND tenant_id = $3`,
            [JSON.stringify(entries), employeeId, tenantId]
        );
        return entries;
    }

    async findEmergencyContacts(employeeId: string, tenantId: string) {
        const res = await pool.query(
            `SELECT c.* FROM employee_emergency_contacts c
             WHERE c.employee_id = $1 AND EXISTS (SELECT 1 FROM employees e WHERE e.id = c.employee_id AND e.tenant_id = $2)
             ORDER BY c.is_primary DESC, c.id ASC`,
            [employeeId, tenantId]
        );
        return res.rows;
    }

    async replaceEmergencyContacts(client: any, employeeId: string, tenantId: string, contacts: any[]) {
        await client.query(
            `DELETE FROM employee_emergency_contacts WHERE employee_id = $1
             AND EXISTS (SELECT 1 FROM employees e WHERE e.id = $1 AND e.tenant_id = $2)`, [employeeId, tenantId]);
        for (const c of contacts) {
            await client.query(
                `INSERT INTO employee_emergency_contacts (tenant_id, employee_id, name, relationship, phone, email, address, is_primary)
                 SELECT $1, $2, $3, $4, $5, $6, $7, $8 WHERE EXISTS (SELECT 1 FROM employees e WHERE e.id = $2 AND e.tenant_id = $1)`,
                [tenantId, employeeId, c.name, c.relationship, c.phone, c.email || null, c.address || null, Boolean(c.is_primary)]
            );
        }
        return contacts;
    }

    async findByEmail(email: string, tenantId: string) {
        const res = await pool.query(
            'SELECT id, name, email FROM employees WHERE LOWER(email) = LOWER($1) AND tenant_id = $2 LIMIT 1',
            [email, tenantId]
        );
        return res.rows[0] || null;
    }

    async findByAnyEmail(email: string, tenantId: string) {
        const res = await pool.query(
            `SELECT id, name, email, personal_email,
                    CASE WHEN LOWER(email) = LOWER($1) THEN 'work' ELSE 'personal' END as matched_type
             FROM employees 
             WHERE (LOWER(email) = LOWER($1) OR LOWER(COALESCE(personal_email, '')) = LOWER($1)) AND tenant_id = $2 AND deleted_at IS NULL
             LIMIT 1`,
            [email, tenantId]
        );
        return res.rows[0] || null;
    }

    /** A user of THIS tenant (identity may be shown), or a user elsewhere (existence only: login e-mails are globally unique). */
    async findUserByEmail(email: string, tenantId: string) {
        const res = await pool.query(
            'SELECT id, name, email, (tenant_id = $2) AS same_tenant FROM users WHERE LOWER(email) = LOWER($1) AND deleted_at IS NULL AND is_active = true LIMIT 1',
            [email, tenantId]
        );
        return (res.rows[0] || null) as { id: number; name: string; email: string; same_tenant: boolean } | null;
    }

    /**
     * Terminate an employee: keep their records intact on the Terminated list,
     * but deactivate their system login so they cannot access the platform.
     */
    async terminate(id: string, tenantId: string) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const empRes = await client.query(
                "UPDATE employees SET status = 'terminated', updated_at = NOW() WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL RETURNING email, user_id",
                [id, tenantId]
            );
            if (empRes.rowCount === 0) {
                await client.query('ROLLBACK');
                return false;
            }
            const empEmail = empRes.rows[0].email;
            const empUserId = empRes.rows[0].user_id;
            if (empEmail && empEmail !== 'admin@company.com') {
                await client.query(
                    'UPDATE users SET is_active = false, updated_at = NOW() WHERE (email = $1 OR ($2::int IS NOT NULL AND id = $2::int)) AND tenant_id = $3',
                    [empEmail, empUserId, tenantId]
                );
            }
            await client.query('COMMIT');
            return true;
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }

    /**
     * Hard delete an employee and all their child records, freeing their email.
     */
    async delete(id: string, tenantId: string) {
        const client = await pool.connect();
        let empEmail = '';
        let deletedUserId: number | null = null;
        try {
            await client.query('BEGIN');

            // ── STEP 1: Verify tenant ownership before any mutation ───────────
            const ownerCheck = await client.query(
                'SELECT id, email, user_id, manager_id, reporting_manager_id FROM employees WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL FOR UPDATE',
                [id, tenantId]
            );
            if (ownerCheck.rowCount === 0) {
                await client.query('ROLLBACK');
                return false;
            }
            const empRow = ownerCheck.rows[0];
            empEmail = empRow.email || '';
            deletedUserId = empRow.user_id ?? null;
            if (!deletedUserId && empEmail) {
                const uRes = await client.query(
                    'SELECT id FROM users WHERE email = $1 AND tenant_id = $2 LIMIT 1',
                    [empEmail, tenantId]
                );
                deletedUserId = uRes.rows[0]?.id ?? null;
            }

            // ── STEP 2: Clean up child tables ────────────────────────────────
            await client.query('DELETE FROM employee_education WHERE employee_id = $1', [id]);
            await client.query('DELETE FROM employee_experience WHERE employee_id = $1', [id]);
            await client.query('DELETE FROM employee_emergency_contacts WHERE employee_id = $1', [id]);
            await client.query('DELETE FROM employee_documents WHERE employee_id = $1', [id]);
            await client.query('DELETE FROM employee_roles WHERE employee_id = $1', [id]);
            await client.query('DELETE FROM performance_reviews WHERE employee_id = $1', [id]);
            await client.query('DELETE FROM timesheets WHERE employee_id = $1', [id]);
            await client.query('DELETE FROM leave_requests WHERE employee_id = $1', [id]);
            await client.query('DELETE FROM approvals WHERE employee_id = $1', [id]);
            await client.query('DELETE FROM payroll_profiles WHERE employee_id = $1', [id]);
            await client.query('DELETE FROM payroll_entries WHERE employee_id = $1', [id]);
            await client.query('DELETE FROM payroll_history WHERE employee_id = $1', [id]).catch(() => {});
            await client.query('DELETE FROM reimbursement_claims WHERE employee_id = $1', [id]);
            await client.query('DELETE FROM claims WHERE employee_id = $1', [id]);
            await client.query(
                'DELETE FROM attendance WHERE employee_id = $1 OR ($2::int IS NOT NULL AND user_id = $2::int)',
                [id, deletedUserId]
            );
            await client.query('DELETE FROM loans WHERE employee_id = $1', [id]);

            // ── STEP 3: Resolve reporting chain before removing the employee ─
            const upperManagerId = empRow.manager_id ?? null;
            let upperReportingId = empRow.reporting_manager_id ?? null;
            if (!upperReportingId) {
                const ceoRes = await client.query(
                    `SELECT COALESCE(e.user_id, u.id) AS uid FROM employees e
                     LEFT JOIN users u ON LOWER(u.email) = LOWER(e.email) AND u.tenant_id = e.tenant_id
                     WHERE e.tenant_id = $1 AND e.id <> $2 AND e.deleted_at IS NULL
                       AND e.position ~* '(^|[^a-z])(ceo|chief executive)([^a-z]|$)' LIMIT 1`,
                    [tenantId, id]
                );
                upperReportingId = ceoRes.rows[0]?.uid ?? null;
            }

            // Hand direct reports up to the deleted person's manager (tenant-scoped)
            await client.query(
                'UPDATE employees SET manager_id = $2 WHERE manager_id = $1 AND tenant_id = $3',
                [id, upperManagerId, tenantId]
            );
            if (deletedUserId) {
                await client.query(
                    'UPDATE employees SET reporting_manager_id = $3 WHERE reporting_manager_id = $1 AND tenant_id = $2',
                    [deletedUserId, tenantId, upperReportingId]
                );
            }

            // ── STEP 4: Delete the employee row ──────────────────────────────
            const res = await client.query(
                'DELETE FROM employees WHERE id = $1 AND tenant_id = $2 RETURNING id',
                [id, tenantId]
            );

            // ── STEP 5: Delete associated user account so email is freed ──────
            if (empEmail && empEmail !== 'admin@company.com') {
                await client.query(
                    'DELETE FROM users WHERE (email = $1 OR ($2::int IS NOT NULL AND id = $2::int)) AND tenant_id = $3',
                    [empEmail, deletedUserId, tenantId]
                );
            }

            await client.query('COMMIT');
            return (res.rowCount ?? 0) > 0;
        } catch (err) {
            await client.query('ROLLBACK');
            console.error('[EmployeesRepository.delete] Hard delete failed, falling back to soft delete with email release:', err);
            // Fallback to soft delete — always release email so it does not collide with future onboards
            const softRes = await pool.query(
                "UPDATE employees SET deleted_at = NOW(), status = 'terminated', email = 'deleted_' || id || '_' || email, personal_email = NULL WHERE id = $1 AND tenant_id = $2 RETURNING id",
                [id, tenantId]
            );
            if (empEmail && empEmail !== 'admin@company.com') {
                await pool.query(
                    "UPDATE users SET is_active = false, deleted_at = NOW(), email = 'deleted_' || id || '_' || email WHERE (email = $1 OR ($2::int IS NOT NULL AND id = $2::int)) AND tenant_id = $3",
                    [empEmail, deletedUserId, tenantId]
                ).catch(() => {});
            }
            return ((softRes.rowCount ?? 0) > 0);
        } finally {
            client.release();
        }
    }
}
