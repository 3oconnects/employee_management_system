import { Request, Response } from 'express';
import { pool } from '../config/db';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { AuthenticatedRequest, UserRole } from '../types';

// ============================================================================
// DOCUMENT CONTROLLER — Managing Employee Documents
// ============================================================================

export const getEmployeeDocuments = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { employeeId } = req.params;
    const tenantId = req.user!.tenantId;

    // RBAC: Employee can only see their own docs, others need permissions
    if (req.user!.role === UserRole.EMPLOYEE) {
         // Query employee record to match userId with employeeId
         const empCheck = await pool.query('SELECT user_id FROM employees WHERE id = $1 AND tenant_id = $2', [employeeId, tenantId]);
         if (empCheck.rows.length === 0 || empCheck.rows[0].user_id !== req.user!.userId) {
             throw AppError.forbidden('You can only see your own documents');
         }
    }

    const result = await pool.query(
        'SELECT d.*, u.name as uploaded_by_name FROM employee_documents d LEFT JOIN users u ON d.uploaded_by = u.id WHERE d.employee_id = $1 AND d.tenant_id = $2 ORDER BY d.created_at DESC', 
        [employeeId, tenantId]
    );

    res.json({ success: true, items: result.rows });
});

export const uploadDocument = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { employeeId, documentType, documentName, filePath, fileSize, expiresAt } = req.body;
    const tenantId = req.user!.tenantId;
    const uploadedBy = req.user!.userId;

    if (!employeeId || !documentType || !documentName) {
        throw AppError.badRequest('Missing required fields: employeeId, documentType, documentName');
    }

    const result = await pool.query(
        `INSERT INTO employee_documents (
            tenant_id, employee_id, document_type, document_name, file_path, 
            file_size, uploaded_by, expires_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`,
        [tenantId, employeeId, documentType, documentName, filePath, fileSize, uploadedBy, expiresAt]
    );

    res.status(201).json({ success: true, document: result.rows[0] });
});

export const verifyDocument = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { verified } = req.body;
    const tenantId = req.user!.tenantId;
    const verifiedBy = req.user!.userId;

    if (req.user!.role === UserRole.EMPLOYEE) {
        throw AppError.forbidden('Only HR/Admin can verify documents');
    }

    const result = await pool.query(
        `UPDATE employee_documents 
         SET verified = $1, 
             verified_by = $2, 
             updated_at = NOW() 
         WHERE id = $3 AND tenant_id = $4
         RETURNING *`,
        [verified, verifiedBy, id, tenantId]
    );

    if (result.rowCount === 0) throw AppError.notFound('Document');

    res.json({ success: true, document: result.rows[0] });
});

export const deleteDocument = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const tenantId = req.user!.tenantId;

    // RBAC: Standard employees shouldn't delete docs their metadata is already stored in
    if (req.user!.role === UserRole.EMPLOYEE) {
        throw AppError.forbidden('You lack permissions to delete documents');
    }

    const result = await pool.query('DELETE FROM employee_documents WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
    if (result.rowCount === 0) throw AppError.notFound('Document');

    res.json({ success: true, message: 'Document removed' });
});
