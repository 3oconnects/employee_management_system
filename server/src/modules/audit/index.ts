import { Router } from 'express';
import readRoutes from './read/read.routes';
export { AuditWriteService as AuditService } from './write/write.service';

const router = Router();
router.use('/', readRoutes);

export default router;
