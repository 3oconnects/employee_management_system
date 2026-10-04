import { Router } from 'express';
import {
    getTimesheetByWeek,
    saveTimesheetEntries,
    submitTimesheet,
    approveTimesheet,
    getTimesheetHistory,
    getPendingTimesheets,
} from './timesheets.controller';
import { authenticate, authorize, requireSelfOrAdmin } from '../../core/security/authorize';
import { validateRequest } from '../../core/validation/validateRequest';
import { saveTimesheetEntriesSchema, approveTimesheetSchema } from './timesheets.schema';
import { asyncHandler } from '../../core/errors/asyncHandler';

const router = Router();

router.use(authenticate);

// GET endpoints that accept ?userId= — guarded so only admin/HR/manager
// can view another user's data; employees are limited to their own.
router.get('/week',    requireSelfOrAdmin, asyncHandler(getTimesheetByWeek));
router.get('/history', requireSelfOrAdmin, asyncHandler(getTimesheetHistory));

// Everyone's submitted timesheets, with names and e-mails: approvers only (HF-5)
router.get('/pending', authorize(['timesheet:approve']), asyncHandler(getPendingTimesheets));

router.put('/:id/entries', validateRequest(saveTimesheetEntriesSchema, 'body'), asyncHandler(saveTimesheetEntries));
router.put('/:id/submit', asyncHandler(submitTimesheet));
// HF-5: route gate; the central approval path re-checks permission, ownership, tenant and state
router.put('/:id/approve', authorize(['timesheet:approve']), validateRequest(approveTimesheetSchema, 'body'), asyncHandler(approveTimesheet));

export default router;
