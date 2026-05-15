import { SyncGovernanceRepository } from './sync.repository';

export class SyncGovernanceService {
    private repo: SyncGovernanceRepository;

    constructor() {
        this.repo = new SyncGovernanceRepository();
    }

    async syncGraph(tenantId: string) {
        return this.repo.syncGraph(tenantId);
    }
}
