import express from 'express';
import { authenticate, authorize } from '../middleware/authMiddleware';
import { UserRole } from '../types';
import { 
    getEmployeeDocuments, 
    uploadDocument, 
    verifyDocument, 
    deleteDocument 
} from '../controllers/documentController';

const router = express.Router();

// GET /api/v1/documents/:employeeId — Get employee documents
router.get('/:employeeId', authenticate, getEmployeeDocuments);

// POST /api/v1/documents — Upload a new document (Metadata)
router.post(
    '/',
    authenticate,
    uploadDocument
);

// PUT /api/v1/documents/:id/verify — Verify a document (HR/Admin only)
router.put(
    '/:id/verify',
    authenticate,
    authorize([UserRole.HR, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
    verifyDocument
);

// DELETE /api/v1/documents/:id — Delete a document
router.delete(
    '/:id',
    authenticate,
    authorize([UserRole.HR, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
    deleteDocument
);

export default router;
