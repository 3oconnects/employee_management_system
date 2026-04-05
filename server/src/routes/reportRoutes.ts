import express from 'express';
import { getAnalytics, getDashboardSummary, getReportSummary } from '../controllers/reportController';

const router = express.Router();

router.get('/analytics', getAnalytics);
router.get('/dashboard', getDashboardSummary);
router.get('/summary', getReportSummary);

export default router;

