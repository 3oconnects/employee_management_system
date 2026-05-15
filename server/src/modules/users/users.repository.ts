import { pool } from '../../config/db';

export class UsersRepository {
    async updateProfile(id: string, name: string, email: string, phone: string, address: string, emergency: string, tenantId: string) {
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
        let sql = 'SELECT id, name, email, role, COALESCE(is_active, true) as is_active FROM users WHERE tenant_id = $1';
        const params: any[] = [tenantId];

        if (role) {
            sql += ' AND role = $2';
            params.push(role);
        }

        sql += ' ORDER BY name ASC';
        const result = await pool.query(sql, params);
        return result.rows;
    }
}
