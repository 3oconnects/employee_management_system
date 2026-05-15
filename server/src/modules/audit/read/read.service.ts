import { AuditReadRepository } from './read.repository';

export class AuditReadService {
    private repo: AuditReadRepository;

    constructor() {
        this.repo = new AuditReadRepository();
    }

    async getLogs(tenantId: string, filters: any) {
        return this.repo.getLogs(tenantId, filters);
    }
}
