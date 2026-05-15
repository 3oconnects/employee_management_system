import { pool } from '../../config/db';

export class DocumentsRepository {
    async getEmployeeUserId(employeeId: string, tenantId: string) {
        const empCheck = await pool.query('SELECT user_id FROM employees WHERE id = $1 AND tenant_id = $2', [employeeId, tenantId]);
        return empCheck.rows[0]?.user_id;
    }

    async getEmployeeDocuments(employeeId: string, tenantId: string) {
        const result = await pool.query(
            'SELECT d.*, u.name as uploaded_by_name FROM employee_documents d LEFT JOIN users u ON d.uploaded_by = u.id WHERE d.employee_id = $1 AND d.tenant_id = $2 ORDER BY d.created_at DESC', 
            [employeeId, tenantId]
        );
        return result.rows;
    }

    async uploadDocument(data: any, tenantId: string, uploadedBy: number) {
        const result = await pool.query(
            `INSERT INTO employee_documents (
                tenant_id, employee_id, document_type, document_name, file_path, 
                file_size, uploaded_by, expires_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *`,
            [tenantId, data.employeeId, data.documentType, data.documentName, data.filePath, data.fileSize, uploadedBy, data.expiresAt]
        );
        return result.rows[0];
    }

    async verifyDocument(id: string, verified: boolean, verifiedBy: number, tenantId: string) {
        const result = await pool.query(
            `UPDATE employee_documents 
             SET verified = $1, 
                 verified_by = $2, 
                 updated_at = NOW() 
             WHERE id = $3 AND tenant_id = $4
             RETURNING *`,
            [verified, verifiedBy, id, tenantId]
        );
        return result.rows[0];
    }

    async deleteDocument(id: string, tenantId: string) {
        const result = await pool.query('DELETE FROM employee_documents WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
        return result.rowCount;
    }
}
