import { SharedGovernanceRepository } from './shared.repository';

export class SharedGovernanceService {
    private repo: SharedGovernanceRepository;

    constructor() {
        this.repo = new SharedGovernanceRepository();
    }

    async resolveOwnership(nodeId: string, tenantId: string) {
        const rows = await this.repo.resolveOwnership(nodeId, tenantId);
        let resolvedOwner = null;
        for (const row of rows) {
            if (row.owner_id) {
                resolvedOwner = {
                    id: row.owner_id,
                    name: row.owner_name,
                    nodeId: row.id,
                    nodeName: row.name,
                    isInherited: row.depth > 0
                };
                break;
            }
            if (row.is_inheritance_blocked && row.depth === 0) break;
        }
        return { resolvedOwner, fullChain: rows };
    }
}
