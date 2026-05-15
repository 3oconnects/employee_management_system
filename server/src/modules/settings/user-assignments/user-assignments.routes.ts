import { Router } from 'express';
import { getUsers, createUser, sendWelcome, resetPassword, getTempPassword, updatePassword, updateUserRole, updateUserStatus, deleteUser } from './user-assignments.controller';
import { asyncHandler } from '../../../core/errors/asyncHandler';

const router = Router();

router.get('/users', asyncHandler(getUsers));
router.post('/users', asyncHandler(createUser));
router.post('/users/:id/send-welcome', asyncHandler(sendWelcome));
router.post('/users/:id/reset-password', asyncHandler(resetPassword));
router.get('/users/:id/temp-password', asyncHandler(getTempPassword));
router.put('/users/:id/password', asyncHandler(updatePassword));
router.put('/users/:id/role', asyncHandler(updateUserRole));
router.put('/users/:id/status', asyncHandler(updateUserStatus));
router.delete('/users/:id', asyncHandler(deleteUser));

export default router;
