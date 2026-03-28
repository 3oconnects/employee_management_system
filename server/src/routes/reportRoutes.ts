import express from 'express';
import { getAnalytics, getDashboardSummary } from '../controllers/reportController';

const router = express.Router();

router.get('/analytics', getAnalytics);
router.get('/dashboard', getDashboardSummary);

export default router;
