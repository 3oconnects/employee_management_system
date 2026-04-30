import express from 'express';
import { 
    getLeaveTypes, 
    applyLeave, 
    getLeaveRequests, 
    approveLeave, 
    updateLeaveRequest,
    deleteLeaveRequest,
    getLeaveBalance 
} from '../controllers/leaveController';

const router = express.Router();

router.get('/types', getLeaveTypes);
router.post('/apply', applyLeave);
router.get('/requests', getLeaveRequests);
router.put('/requests/:id', updateLeaveRequest);
router.delete('/requests/:id', deleteLeaveRequest);
router.put('/requests/:id/approve', approveLeave);
router.get('/balance', getLeaveBalance);

export default router;
