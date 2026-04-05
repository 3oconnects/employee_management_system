import express from 'express';
import { 
    getTimesheetByWeek, 
    saveTimesheetEntries, 
    submitTimesheet, 
    approveTimesheet,
    getTimesheetHistory,
    getPendingTimesheets
} from '../controllers/timesheetController';

const router = express.Router();

router.get('/week', getTimesheetByWeek);
router.get('/pending', getPendingTimesheets);
router.get('/', getTimesheetHistory);
router.put('/:id/entries', saveTimesheetEntries);
router.put('/:id/submit', submitTimesheet);
router.put('/:id/approve', approveTimesheet);

export default router;
