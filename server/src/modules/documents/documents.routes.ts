import { Router } from 'express';
import { getEmployeeDocuments, uploadDocument, verifyDocument, deleteDocument } from './documents.controller';
import { authenticate, authorize } from '../../core/security/authorize';
import { validateRequest } from '../../core/validation/validateRequest';
import { uploadDocumentSchema, verifyDocumentSchema } from './documents.schema';
import { asyncHandler } from '../../core/errors/asyncHandler';
import { UserRole } from '../../types';

const router = Router();

router.use(authenticate);

router.get('/:employeeId', asyncHandler(getEmployeeDocuments));
router.post('/', validateRequest(uploadDocumentSchema, 'body'), asyncHandler(uploadDocument));
router.put('/:id/verify', authorize([UserRole.HR, UserRole.ADMIN, UserRole.SUPER_ADMIN]), validateRequest(verifyDocumentSchema, 'body'), asyncHandler(verifyDocument));
router.delete('/:id', authorize([UserRole.HR, UserRole.ADMIN, UserRole.SUPER_ADMIN]), asyncHandler(deleteDocument));

export default router;
