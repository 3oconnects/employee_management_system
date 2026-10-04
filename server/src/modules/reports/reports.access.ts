import { pool } from '../../config/db';
import { AppError } from '../../core/errors/AppError';
import { hasAccess } from '../../core/security/authorize';

type Actor = { userId: number; email: string; tenantId: string; role?: string; dashboard_type?: string; permissions?: string[] };

/** An employee of the caller's tenant (and the user/e-mail that identify them), or undefined. */
export async function findEmployeeInTenant(employeeId: string, tenantId: string) {
    const { rows } = await pool.query(
        'SELECT id, user_id, email FROM employees WHERE id = $1 AND tenant_id = $2', [employeeId, tenantId]);
    return rows[0] as { id: string; user_id: number | null; email: string | null } | undefined;
}

export async function userExistsInTenant(userId: number, tenantId: string): Promise<boolean> {
    const { rows } = await pool.query('SELECT 1 FROM users WHERE id = $1 AND tenant_id = $2', [userId, tenantId]);
    return rows.length > 0;
}

/**
 * Report data keyed by an id in the query string: allowed for your own id; for anyone else's only
 * with employees:view, and only inside your tenant. (Per-team scoping arrives with the scoped RBAC work.)
 */
export async function assertMayViewUser(actor: Actor, targetUserId: number): Promise<void> {
    if (targetUserId === actor.userId) return;
    if (!hasAccess(actor, ['employees:view'])) throw AppError.forbidden('Access denied: you can only view your own data.');
    if (!(await userExistsInTenant(targetUserId, actor.tenantId))) throw AppError.notFound('User');
}

/** One employee's full profile (includes pay and documents): your own, or with employees:view in your tenant. */
export async function assertMayViewEmployeeProfile(actor: Actor, employeeId: string): Promise<void> {
    const emp = await findEmployeeInTenant(employeeId, actor.tenantId);
    if (!emp) throw AppError.notFound('Employee not found');
    const isOwn = emp.user_id === actor.userId || (!!emp.email && emp.email.toLowerCase() === actor.email.toLowerCase());
    if (!isOwn && !hasAccess(actor, ['employees:view'])) {
        throw AppError.forbidden('Access denied: you can only view your own profile.');
    }
}
