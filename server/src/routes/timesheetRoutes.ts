import express from 'express';
import { 
    getTimesheetByWeek, 
    saveTimesheetEntries, 
    submitTimesheet, 
    approveTimesheet,
    getTimesheetHistory,
    getPendingTimesheets
} from '../controllers/timesheetController';

import { authenticate } from '../middleware/authMiddleware';

const router = express.Router();

router.use(authenticate); // Secure all timesheet routes

router.get('/week', getTimesheetByWeek);
router.get('/pending', getPendingTimesheets);
router.get('/', getTimesheetHistory);
router.put('/:id/entries', saveTimesheetEntries);
router.put('/:id/submit', submitTimesheet);
router.put('/:id/approve', approveTimesheet);

export default router;
