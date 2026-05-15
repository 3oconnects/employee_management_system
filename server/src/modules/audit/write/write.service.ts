import { AuditWriteRepository } from './write.repository';
import { AuthenticatedRequest } from '../../../types';

export class AuditWriteService {
    private static repo = new AuditWriteRepository();

    static async log(params: any): Promise<void> {
        await this.repo.log(params);
    }

    static fromRequest(req: AuthenticatedRequest) {
        return {
            tenantId: req.user?.tenantId || 'unknown',
            userId: req.user?.userId || 0,
            ipAddress: (req.headers['x-forwarded-for'] as string) || req.ip || 'unknown',
            userAgent: req.headers['user-agent'] || 'unknown',
        };
    }
}
