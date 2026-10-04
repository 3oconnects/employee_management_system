import { pool } from '../../config/db';

/**
 * The employee record belonging to an authenticated user, within one tenant.
 * Users and employees are linked by user_id and/or by e-mail (user_id is often unset), so both
 * are checked. Identity always comes from the verified token (userId, email, tenantId), never
 * from a request body. `db` may be a pool or a transaction client.
 */
export async function resolveEmployeeIdForUser(
    tenantId: string,
    userId: number | string,
    email: string,
    db: { query: (sql: string, params: any[]) => Promise<{ rows: any[] }> } = pool,
): Promise<string | null> {
    const { rows } = await db.query(
        `SELECT id FROM employees
         WHERE tenant_id = $1 AND (user_id = $2 OR LOWER(email) = LOWER($3))
         ORDER BY (user_id = $2) DESC NULLS LAST
         LIMIT 1`,
        [tenantId, userId, email],
    );
    return rows[0]?.id ?? null;
}
