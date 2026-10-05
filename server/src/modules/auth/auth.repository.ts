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

    /**
     * The signed-in person as the DATABASE sees them right now: current role, dashboard type and permissions, resolved
     * exactly as login does (COALESCE(role_id, 4)). The browser compares this with its copy so a role change shows up
     * without signing out.
     *
     * Optional profile columns are read through to_jsonb(u), which yields NULL when a column does not exist, so an older
     * database that lacks users.phone / address / emergency / avatar_url no longer makes this endpoint fail.
     * One employee row at most, even if the employee table holds duplicates for this e-mail.
     */
    async findUserProfile(id: number) {
        const result = await pool.query(
            `SELECT u.id, u.name, u.email, u.tenant_id, u.created_at,
                    to_jsonb(u)->>'phone' AS phone,
                    to_jsonb(u)->>'address' AS address,
                    to_jsonb(u)->>'emergency' AS emergency,
                    COALESCE(to_jsonb(u)->>'avatar_url', to_jsonb(e)->>'avatar_url') AS avatar_url,
                    to_jsonb(u)->'preferences' AS preferences,
                    COALESCE(to_jsonb(u)->>'availability_status', 'available') AS availability_status,
                    e.id AS employee_id,
                    COALESCE(r.name, to_jsonb(u)->>'role') AS role,
                    r.id AS role_id,
                    r.dashboard_type,
                    ARRAY(SELECT p.module || ':' || p.action
                            FROM role_permissions rp JOIN permissions p ON p.id = rp.permission_id
                           WHERE rp.role_id = r.id
                           ORDER BY 1) AS permissions
             FROM users u
             LEFT JOIN LATERAL (
                 SELECT e2.* FROM employees e2
                  WHERE e2.email = u.email AND e2.tenant_id = u.tenant_id
                  ORDER BY e2.id LIMIT 1
             ) e ON TRUE
             LEFT JOIN roles r ON r.id = COALESCE(u.role_id, 4)
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

    /** Changes ONE account's availability (the caller's own, in the caller's tenant). Returns the stored value, or null if no such account. */
    async updateStatus(id: number, tenantId: string, status: string): Promise<string | null> {
        const res = await pool.query(
            'UPDATE users SET availability_status = $1 WHERE id = $2 AND tenant_id = $3 RETURNING availability_status',
            [status, id, tenantId]
        );
        return res.rows[0]?.availability_status ?? null;
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

    // ── Password reset (HF-3) ────────────────────────────────────────────────
    // Reset records live in `approvals` (type 'password_reset') so no schema change is
    // needed. Only the SHA-256 hash of the token is stored, never the token itself.
    // Status lifecycle: issued -> completed | superseded. 'issued' rows are not shown in
    // the approvals inbox (it lists pending/active/onboarding and approved/rejected/completed).

    async findUserForPasswordReset(email: string) {
        const res = await pool.query(
            `SELECT u.id, u.name, u.email, u.tenant_id, e.id AS employee_id
             FROM users u
             JOIN employees e ON LOWER(u.email) = LOWER(e.email) AND u.tenant_id = e.tenant_id
             WHERE LOWER(u.email) = LOWER($1)
               AND u.is_active = true AND u.deleted_at IS NULL
             LIMIT 1`,
            [email]
        );
        return res.rows[0] || null;
    }

    async hasRecentPasswordReset(userId: number, withinSeconds: number): Promise<boolean> {
        const res = await pool.query(
            `SELECT 1 FROM approvals
             WHERE type = 'password_reset'
               AND metadata->>'user_id' = $1::text
               AND created_at > NOW() - make_interval(secs => $2)
             LIMIT 1`,
            [userId, withinSeconds]
        );
        return res.rows.length > 0;
    }

    /** Issues a new reset record and supersedes any older outstanding one for the same user. */
    async createPasswordResetToken(data: {
        id: string;
        employeeId: string;
        tenantId: string;
        userId: number;
        email: string;
        tokenHash: string;
        expiresAt: Date;
    }) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            await client.query(
                `UPDATE approvals SET status = 'superseded'
                 WHERE type = 'password_reset' AND status = 'issued' AND metadata->>'user_id' = $1::text`,
                [data.userId]
            );
            await client.query(
                `INSERT INTO approvals (id, employee_id, type, status, metadata, requested_by, tenant_id)
                 VALUES ($1, $2, 'password_reset', 'issued', $3, $4, $5)`,
                [
                    data.id,
                    data.employeeId,
                    JSON.stringify({
                        email: data.email,
                        user_id: data.userId,
                        token_hash: data.tokenHash,
                        expires_at: data.expiresAt.toISOString(),
                        requested_at: new Date().toISOString(),
                    }),
                    data.email,
                    data.tenantId,
                ]
            );
            await client.query('COMMIT');
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }

    async findPasswordResetByTokenHash(tokenHash: string) {
        const res = await pool.query(
            `SELECT id, status, tenant_id, metadata
             FROM approvals
             WHERE type = 'password_reset' AND metadata->>'token_hash' = $1
             LIMIT 1`,
            [tokenHash]
        );
        return res.rows[0] || null;
    }

    /**
     * Atomically consumes a reset token and sets the new password. Returns false (and changes
     * nothing) if the token is not currently valid: not issued, expired, already used, or the
     * user is not in the record's tenant / is inactive. Two concurrent uses cannot both win.
     */
    async consumePasswordReset(data: {
        recordId: string;
        tokenHash: string;
        userId: number;
        tenantId: string;
        hashedPassword: string;
    }): Promise<boolean> {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const used = await client.query(
                `UPDATE approvals SET status = 'completed'
                 WHERE id = $1 AND type = 'password_reset' AND status = 'issued'
                   AND metadata->>'token_hash' = $2
                   AND (metadata->>'expires_at')::timestamptz > NOW()
                 RETURNING id`,
                [data.recordId, data.tokenHash]
            );
            if (used.rowCount !== 1) {
                await client.query('ROLLBACK');
                return false;
            }
            // New password; the plaintext temp password is cleared so it can no longer sign in,
            // and the stored refresh credential is cleared.
            const updated = await client.query(
                `UPDATE users
                 SET password = $1, temp_password = NULL, is_password_temp = false,
                     refresh_token = NULL, updated_at = NOW()
                 WHERE id = $2 AND tenant_id = $3 AND is_active = true AND deleted_at IS NULL
                 RETURNING id`,
                [data.hashedPassword, data.userId, data.tenantId]
            );
            if (updated.rowCount !== 1) {
                await client.query('ROLLBACK');
                return false;
            }
            await client.query(
                `UPDATE approvals SET status = 'superseded'
                 WHERE type = 'password_reset' AND status = 'issued'
                   AND metadata->>'user_id' = $1::text AND id <> $2`,
                [data.userId, data.recordId]
            );
            await client.query('COMMIT');
            return true;
        } catch (err) {
            await client.query('ROLLBACK').catch(() => undefined);
            throw err;
        } finally {
            client.release();
        }
    }
}
