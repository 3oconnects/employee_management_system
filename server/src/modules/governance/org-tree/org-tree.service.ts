import { OrgTreeRepository } from './org-tree.repository';
import { SyncGovernanceRepository } from '../sync/sync.repository';

export class OrgTreeService {
    private repo: OrgTreeRepository;
    private syncRepo: SyncGovernanceRepository;

    constructor() {
        this.repo = new OrgTreeRepository();
        this.syncRepo = new SyncGovernanceRepository();
    }

    async getOrgTree(tenantId: string) {
        let { nodes, employees } = await this.repo.getOrgTree(tenantId);

        // If no nodes discovered, automatically synchronize from departments & teams
        if (nodes.length === 0) {
            try {
                await this.syncRepo.syncGraph(tenantId);
                const refetched = await this.repo.getOrgTree(tenantId);
                nodes = refetched.nodes;
                employees = refetched.employees;
            } catch (err: any) {
                console.error('[OrgTreeService] auto-sync error:', err.message);
            }
        }

        const treeMap: any = {};
        nodes.forEach((n: any) => { treeMap[n.id] = { ...n, children: [] }; });

        employees.forEach((emp: any) => {
            let targetNodeId = null;
            if (emp.team_id) {
                const node = nodes.find((n: any) => n.entity_type === 'team' && String(n.entity_id) === String(emp.team_id));
                if (node) targetNodeId = node.id;
            }
            if (!targetNodeId && emp.department_id) {
                const node = nodes.find((n: any) => n.entity_type === 'department' && String(n.entity_id) === String(emp.department_id));
                if (node) targetNodeId = node.id;
            }
            if (targetNodeId && treeMap[targetNodeId]) {
                treeMap[targetNodeId].children.push({
                    id: `emp_${emp.id}`, 
                    name: emp.name, 
                    entity_type: 'employee',
                    category: 'personnel', 
                    position: emp.position,
                    avatar_url: emp.avatar_url,
                    children: []
                });
            }
        });
        
        const root: any[] = [];
        nodes.forEach((n: any) => {
            if (n.parent_node_id && treeMap[n.parent_node_id]) {
                treeMap[n.parent_node_id].children.push(treeMap[n.id]);
            } else {
                root.push(treeMap[n.id]);
            }
        });
        return root;
    }

    async updateGovernance(nodeId: string, data: any, tenantId: string) {
        return this.repo.updateGovernance(nodeId, data, tenantId);
    }

    async searchNodes(q: string, tenantId: string) {
        return this.repo.searchNodes(q, tenantId);
    }
}
