import { Router } from 'express';
import reviewsRoutes from './reviews/reviews.routes';

const router = Router();
router.use('/', reviewsRoutes);

export default router;
