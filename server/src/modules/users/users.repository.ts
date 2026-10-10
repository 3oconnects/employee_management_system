import { pool } from '../../config/db';

export class UsersRepository {
    /**
     * ARC-01: `id` is `number` to match JWT userId type.
     * The controller must derive this from req.user.userId only — never from the request body.
     */
    async updateProfile(id: number, name: string, email: string, phone: string, address: string, emergency: string, tenantId: string) {
        const result = await pool.query(
            `UPDATE users
             SET name=$1,
                 email=$2,
                 phone=$3,
                 address=$4,
                 emergency=$5,
                 updated_at=NOW()
             WHERE id=$6 AND tenant_id=$7
             RETURNING id,name,email,role,phone,address,emergency`,
            [name, email, phone || null, address || null, emergency || null, id, tenantId]
        );
        return result.rows[0];
    }

    async getUsers(tenantId: string, role?: string) {
        let sql = `
            SELECT u.id, u.name, u.email, u.role, COALESCE(u.is_active, true) as is_active 
            FROM users u
            WHERE (u.tenant_id = $1 OR u.tenant_id = 'tenant_default' OR u.tenant_id = 'default')
              AND COALESCE(u.is_active, true) = true
              AND u.deleted_at IS NULL
              AND u.email NOT ILIKE 'deleted_%'
              AND u.name NOT ILIKE 'deleted_%'
              AND (
                  u.role IN ('super_admin', 'admin') 
                  OR EXISTS (
                      SELECT 1 FROM employees e 
                      WHERE (LOWER(e.email) = LOWER(u.email) OR e.user_id = u.id)
                        AND e.deleted_at IS NULL 
                        AND (e.status IS NULL OR e.status <> 'terminated')
                  )
              )
        `;
        const params: any[] = [tenantId];

        if (role) {
            sql += ' AND u.role = $2';
            params.push(role);
        }

        sql += ' ORDER BY u.name ASC';
        const result = await pool.query(sql, params);
        return result.rows;
    }
}
