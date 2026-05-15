import { pool } from '../../config/db';

export class ClaimsRepository {
    async submitClaim(id: string, employee_id: string, amount: number, category: string, description: string | undefined, tenantId: string) {
        const result = await pool.query(
            'INSERT INTO claims (id, employee_id, amount, category, description, status, tenant_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
            [id, employee_id, amount, category, description || null, 'pending', tenantId]
        );
        return result.rows[0];
    }

    async getEmployeeClaims(employeeId: string, tenantId: string) {
        const result = await pool.query('SELECT * FROM claims WHERE employee_id = $1 AND tenant_id = $2 ORDER BY created_at DESC', [employeeId, tenantId]);
        return result.rows;
    }

    async getAllClaims(tenantId: string) {
        const result = await pool.query(
            'SELECT c.*, e.name as employee_name FROM claims c JOIN employees e ON c.employee_id = e.id WHERE c.tenant_id = $1 ORDER BY c.created_at DESC',
            [tenantId]
        );
        return result.rows;
    }

    async updateClaimStatus(id: string, status: string, tenantId: string) {
        const result = await pool.query('UPDATE claims SET status = $1 WHERE id = $2 AND tenant_id = $3 RETURNING *', [status, id, tenantId]);
        return result.rows[0];
    }
}
