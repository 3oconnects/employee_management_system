import { Response } from 'express';
import { ConfigurationService } from './configuration.service';
import { AuthenticatedRequest } from '../../../types';

const service = new ConfigurationService();
const DEFAULT_TENANT = 'default';

export const getConfig = async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.user?.tenantId || DEFAULT_TENANT;
    const result = await service.getConfig(tenantId);
    if (result.warning) {
        res.json({ success: true, data: result.data, warning: result.warning });
    } else {
        res.json({ success: true, data: result.data });
    }
};

export const updateConfig = async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.user?.tenantId || DEFAULT_TENANT;
    await service.updateConfig(tenantId, req.body.category, req.body.settings);
    res.json({ success: true, message: 'Settings saved.' });
};

export const testEmail = async (req: AuthenticatedRequest, res: Response) => {
    const result = await service.testEmail(req.body.to);
    res.json({ success: true, ...result });
};
