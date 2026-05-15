import { pool } from '../../config/db';

export class PerformanceRepository {
    async getPerformanceReviews(tenantId: string, employeeId?: string, status?: string) {
        let sql = 'SELECT r.*, e.name as employee_name, u.name as reviewer_name FROM performance_reviews r JOIN employees e ON r.employee_id = e.id JOIN users u ON r.reviewer_id = u.id WHERE r.tenant_id = $1';
        const params: any[] = [tenantId];
        let pIndex = 2;

        if (employeeId) {
            sql += ` AND r.employee_id = $${pIndex}`;
            params.push(employeeId);
            pIndex++;
        }

        if (status) {
            sql += ` AND r.status = $${pIndex}`;
            params.push(status);
            pIndex++;
        }

        sql += ' ORDER BY r.created_at DESC';

        const result = await pool.query(sql, params);
        return result.rows;
    }

    async createPerformanceReview(data: any, tenantId: string, reviewerId: number) {
        const result = await pool.query(
            `INSERT INTO performance_reviews (
                tenant_id, employee_id, reviewer_id, review_period, rating, 
                strengths, improvements, goals, manager_comments, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'submitted')
            RETURNING *`,
            [tenantId, data.employeeId, reviewerId, data.reviewPeriod, data.rating, data.strengths, data.improvements, data.goals, data.managerComments]
        );
        return result.rows[0];
    }

    async updatePerformanceReview(id: string, data: any, tenantId: string) {
        const check = await pool.query('SELECT * FROM performance_reviews WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
        if (check.rows.length === 0) return null;

        const result = await pool.query(
            `UPDATE performance_reviews 
             SET rating = COALESCE($1, rating),
                 strengths = COALESCE($2, strengths),
                 improvements = COALESCE($3, improvements),
                 goals = COALESCE($4, goals),
                 manager_comments = COALESCE($5, manager_comments),
                 employee_comments = COALESCE($6, employee_comments),
                 status = COALESCE($7, status),
                 updated_at = NOW()
             WHERE id = $8 AND tenant_id = $9
             RETURNING *`,
            [data.rating, data.strengths, data.improvements, data.goals, data.managerComments, data.employeeComments, data.status, id, tenantId]
        );
        return result.rows[0];
    }

    async deletePerformanceReview(id: string, tenantId: string) {
        const result = await pool.query('DELETE FROM performance_reviews WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
        return result.rowCount;
    }
}
