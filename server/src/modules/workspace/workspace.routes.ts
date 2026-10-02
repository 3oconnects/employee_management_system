import { Router, Response } from 'express';
import { authenticate } from '../../core/security/authorize';
import { asyncHandler } from '../../core/errors/asyncHandler';
import { AuthenticatedRequest } from '../../types';
import { getWorkspace } from './workspace.service';

// GET /api/v1/workspace — the signed-in user's organisation name and logo.
// Any authenticated user may read it (it is what their own UI displays);
// it exposes no settings beyond those two values.
const router = Router();

router.get('/', authenticate, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const workspace = await getWorkspace(req.user!.tenantId);
    res.json({ success: true, data: workspace });
}));

export default router;
