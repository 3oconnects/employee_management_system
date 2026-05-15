import { OrgTreeRepository } from './org-tree.repository';

export class OrgTreeService {
    private repo: OrgTreeRepository;

    constructor() {
        this.repo = new OrgTreeRepository();
    }

    async getOrgTree(tenantId: string) {
        const { nodes, employees } = await this.repo.getOrgTree(tenantId);
        const treeMap: any = {};
        nodes.forEach((n: any) => { treeMap[n.id] = { ...n, children: [] }; });

        employees.forEach((emp: any) => {
            let targetNodeId = null;
            if (emp.team_id) {
                const node = nodes.find((n: any) => n.entity_type === 'team' && n.entity_id === emp.team_id);
                if (node) targetNodeId = node.id;
            }
            if (!targetNodeId && emp.department_id) {
                const node = nodes.find((n: any) => n.entity_type === 'department' && n.entity_id === emp.department_id);
                if (node) targetNodeId = node.id;
            }
            if (targetNodeId && treeMap[targetNodeId]) {
                treeMap[targetNodeId].children.push({
                    id: `emp_${emp.id}`, name: emp.name, entity_type: 'employee',
                    category: 'personnel', position: emp.position, children: []
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
