import { Router } from 'express';
import {
    getTimesheetByWeek,
    saveTimesheetEntries,
    submitTimesheet,
    approveTimesheet,
    getTimesheetHistory,
    getPendingTimesheets,
} from './timesheets.controller';
import { authenticate, requireSelfOrAdmin } from '../../core/security/authorize';
import { validateRequest } from '../../core/validation/validateRequest';
import { saveTimesheetEntriesSchema, approveTimesheetSchema } from './timesheets.schema';
import { asyncHandler } from '../../core/errors/asyncHandler';

const router = Router();

router.use(authenticate);

// GET endpoints that accept ?userId= — guarded so only admin/HR/manager
// can view another user's data; employees are limited to their own.
router.get('/week',    requireSelfOrAdmin, asyncHandler(getTimesheetByWeek));
router.get('/history', requireSelfOrAdmin, asyncHandler(getTimesheetHistory));

// Admin-only list of pending timesheets — no userId param, no guard needed
router.get('/pending', asyncHandler(getPendingTimesheets));

router.put('/:id/entries', validateRequest(saveTimesheetEntriesSchema, 'body'), asyncHandler(saveTimesheetEntries));
router.put('/:id/submit', asyncHandler(submitTimesheet));
router.put('/:id/approve', validateRequest(approveTimesheetSchema, 'body'), asyncHandler(approveTimesheet));

export default router;
