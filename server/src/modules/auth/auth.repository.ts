import { pool } from '../../config/db';

export class AuthRepository {
    async findUserByEmail(email: string) {
        const result = await pool.query(
            `SELECT u.*, e.id as employee_id, e.department_id,
                    COALESCE(u.role_id, r.id, 4) as role_id,
                    r.id as role_record_id, r.name as role_name, r.dashboard_type
             FROM users u
             LEFT JOIN employees e ON LOWER(u.email) = LOWER(e.email) AND u.tenant_id = e.tenant_id
             LEFT JOIN roles r ON COALESCE(u.role_id, 4) = r.id
             WHERE (LOWER(u.email) = LOWER($1) OR (e.personal_email IS NOT NULL AND LOWER(e.personal_email) = LOWER($1)))
               AND u.is_active = true AND u.deleted_at IS NULL
             LIMIT 1`,
            [email.trim()]
        );
        const row = result.rows[0];
        if (!row) return row;
        // Prefer the role name from the roles table (custom role name) over the
        // legacy string stored in users.role.  This ensures custom roles like
        // "trainees" are reflected accurately in the JWT.
        if (row.role_name) row.role = row.role_name;
        // dashboard_type comes from the assigned role record
        if (row.dashboard_type === undefined || row.dashboard_type === null) {
            row.dashboard_type = 'employee';
        }
        return row;
    }

    async findUserById(id: number) {
        const result = await pool.query(
            `SELECT u.*, COALESCE(u.role_id, 4) as role_id, r.id as role_record_id, r.name as role_name, r.dashboard_type 
             FROM users u 
             LEFT JOIN roles r ON COALESCE(u.role_id, 4) = r.id 
             WHERE u.id = $1 AND u.is_active = true AND u.deleted_at IS NULL`,
            [id]
        );
        const row = result.rows[0];
        if (!row) return row;
        if (row.role_name) row.role = row.role_name;
        if (row.dashboard_type === undefined || row.dashboard_type === null) {
            row.dashboard_type = 'employee';
        }
        return row;
    }

    async findUserProfile(id: number) {
        const result = await pool.query(
            `SELECT u.id, u.name, u.email, u.role, u.phone, u.address, u.emergency,
                    COALESCE(u.avatar_url, e.avatar_url) as avatar_url,
                    u.tenant_id, u.created_at, u.preferences, u.availability_status, 
                    e.id as employee_id, r.dashboard_type
             FROM users u
             LEFT JOIN employees e ON u.email = e.email AND u.tenant_id = e.tenant_id
             LEFT JOIN roles r ON u.role_id = r.id
             WHERE u.id = $1 AND u.deleted_at IS NULL`,
            [id]
        );
        return result.rows[0];
    }

    async findRolePermissions(roleId: number) {
        const result = await pool.query(
            `SELECT p.module, p.action
             FROM role_permissions rp
             JOIN permissions p ON p.id = rp.permission_id
             WHERE rp.role_id = $1`,
            [roleId]
        );
        return result.rows.map(p => `${p.module}:${p.action}`);
    }

    async updateRefreshToken(id: number, token: string | null) {
        await pool.query(
            'UPDATE users SET refresh_token = $1, last_login = CASE WHEN $1::text IS NOT NULL THEN NOW() ELSE last_login END WHERE id = $2',
            [token, id]
        );
    }

    async updateProfile(id: number, data: any) {
        const result = await pool.query(
            `UPDATE users
             SET name = COALESCE($1, name),
                 phone = COALESCE($2, phone),
                 address = COALESCE($3, address),
                 emergency = COALESCE($4, emergency),
                 preferences = COALESCE($5, preferences),
                 avatar_url = COALESCE($6, avatar_url),
                 updated_at = NOW()
             WHERE id = $7
             RETURNING id, name, email, role, phone, address, emergency, preferences, avatar_url`,
            [data.name, data.phone || null, data.address || null, data.emergency || null, data.preferences || null, data.avatar_url || data.avatarUrl || null, id]
        );
        if (data.avatar_url || data.avatarUrl) {
            const av = data.avatar_url || data.avatarUrl;
            await pool.query('UPDATE employees SET avatar_url = $1 WHERE user_id = $2 OR LOWER(email) = (SELECT LOWER(email) FROM users WHERE id = $2)', [av, id]);
        }
        return result.rows[0];
    }

    async updatePreferences(id: number, preferences: any) {
        await pool.query('UPDATE users SET preferences = $1 WHERE id = $2', [JSON.stringify(preferences), id]);
    }

    async updateStatus(id: number, status: string) {
        await pool.query('UPDATE users SET availability_status = $1 WHERE id = $2', [status, id]);
    }

    async updatePassword(id: number, hashed: string) {
        await pool.query(
            'UPDATE users SET password = $1, temp_password = NULL, is_password_temp = false WHERE id = $2',
            [hashed, id]
        );
    }

    async getPassword(id: number) {
        const user = await pool.query('SELECT password FROM users WHERE id = $1', [id]);
        return user.rows[0]?.password;
    }

    async findUserWithEmployee(email: string) {
        const res = await pool.query(
            `SELECT u.id, u.name, u.email, u.tenant_id, e.id as employee_id, 
                    COALESCE(e.department, d.name, 'General') as department
             FROM users u
             LEFT JOIN employees e ON LOWER(u.email) = LOWER(e.email) AND u.tenant_id = e.tenant_id
             LEFT JOIN departments d ON e.department_id = d.id
             WHERE LOWER(u.email) = LOWER($1) AND u.deleted_at IS NULL
             LIMIT 1`,
            [email]
        );
        return res.rows[0] || null;
    }

    async createPasswordResetApproval(data: { id: string; employeeId: string; metadata: any; tenantId: string }) {
        await pool.query(
            `INSERT INTO approvals (id, employee_id, type, status, metadata, requested_by, tenant_id)
             VALUES ($1, $2, 'password_reset', 'pending', $3, $4, $5)`,
            [data.id, data.employeeId, JSON.stringify(data.metadata), data.metadata.email, data.tenantId]
        );
    }

    async getLatestPasswordResetApproval(email: string) {
        const res = await pool.query(
            `SELECT id, status, metadata, created_at 
             FROM approvals 
             WHERE type = 'password_reset' AND LOWER(metadata->>'email') = LOWER($1)
             ORDER BY created_at DESC 
             LIMIT 1`,
            [email]
        );
        return res.rows[0] || null;
    }

    async completePasswordReset(email: string, hashedPassword: string, approvalId: string) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            await client.query(
                `UPDATE users 
                 SET password = $1, temp_password = NULL, is_password_temp = false, updated_at = NOW() 
                 WHERE LOWER(email) = LOWER($2)`,
                [hashedPassword, email]
            );
            await client.query(
                `UPDATE approvals SET status = 'completed' WHERE id = $1`,
                [approvalId]
            );
            await client.query('COMMIT');
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }
}
