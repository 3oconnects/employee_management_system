import { Request, Response } from 'express';
import { pool } from '../config/db';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { AuthenticatedRequest, UserRole } from '../types';

// ============================================================================
// PERFORMANCE CONTROLLER — Managing Employee Reviews
// ============================================================================

export const getPerformanceReviews = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { employeeId, status } = req.query;
    const tenantId = req.user!.tenantId;

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
    res.json({ success: true, items: result.rows });
});

export const createPerformanceReview = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { 
        employeeId, reviewPeriod, rating, strengths, improvements, goals, managerComments 
    } = req.body;
    const tenantId = req.user!.tenantId;
    const reviewerId = req.user!.userId;

    if (!employeeId || !reviewPeriod || !rating) {
        throw AppError.badRequest('Missing required fields: employeeId, reviewPeriod, rating');
    }

    const result = await pool.query(
        `INSERT INTO performance_reviews (
            tenant_id, employee_id, reviewer_id, review_period, rating, 
            strengths, improvements, goals, manager_comments, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'submitted')
        RETURNING *`,
        [tenantId, employeeId, reviewerId, reviewPeriod, rating, strengths, improvements, goals, managerComments]
    );

    res.status(201).json({ success: true, review: result.rows[0] });
});

export const updatePerformanceReview = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { rating, strengths, improvements, goals, managerComments, employeeComments, status } = req.body;
    const tenantId = req.user!.tenantId;

    // Verify ownership/tenant
    const check = await pool.query('SELECT * FROM performance_reviews WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
    if (check.rows.length === 0) throw AppError.notFound('Performance Review');

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
        [rating, strengths, improvements, goals, managerComments, employeeComments, status, id, tenantId]
    );

    res.json({ success: true, review: result.rows[0] });
});

export const deletePerformanceReview = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const tenantId = req.user!.tenantId;

    if (req.user!.role !== UserRole.ADMIN && req.user!.role !== UserRole.SUPER_ADMIN) {
        throw AppError.forbidden('Only admins can delete reviews');
    }

    const result = await pool.query('DELETE FROM performance_reviews WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
    if (result.rowCount === 0) throw AppError.notFound('Performance Review');

    res.json({ success: true, message: 'Review deleted' });
});
