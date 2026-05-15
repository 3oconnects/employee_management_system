import { pool } from '../../config/db';

export class AuthRepository {
    async findUserByEmail(email: string) {
        const result = await pool.query(
            `SELECT u.*, e.id as employee_id, e.department_id,
                    r.id as role_record_id, r.name as role_name, r.dashboard_type
             FROM users u
             LEFT JOIN employees e ON u.email = e.email AND u.tenant_id = e.tenant_id
             LEFT JOIN roles r ON u.role_id = r.id
             WHERE LOWER(u.email) = LOWER($1) AND u.is_active = true AND u.deleted_at IS NULL`,
            [email]
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
            `SELECT u.*, r.id as role_record_id, r.name as role_name, r.dashboard_type 
             FROM users u 
             LEFT JOIN roles r ON u.role_id = r.id 
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
                 updated_at = NOW()
             WHERE id = $6
             RETURNING id, name, email, role, phone, address, emergency, preferences`,
            [data.name, data.phone || null, data.address || null, data.emergency || null, data.preferences || null, id]
        );
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
}
