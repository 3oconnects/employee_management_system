import express from 'express';
import { 
    getTodayStatus, 
    checkIn, 
    checkOut, 
    getHistory, 
    getWeeklyHours, 
    getSummary, 
    regularize 
} from '../controllers/attendanceController';

const router = express.Router();

router.get('/today', getTodayStatus);
router.post('/check-in', checkIn);
router.post('/check-out', checkOut);
router.get('/history', getHistory);
router.get('/weekly-hours', getWeeklyHours);
router.get('/summary/:userId', getSummary);
router.post('/regularize', regularize);

export default router;
