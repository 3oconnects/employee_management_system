// Builds reporting trees from the employee list. Pure, so the layout code stays simple and this can be tested.
//
// `reporting_manager_id` on an employee is a USER id; an employee is matched to their manager through the
// manager's `user_id`. A manager id that matches no employee in the list becomes a stand-in manager node
// (when allowed), so the people under them are still grouped rather than scattered.

export interface OrgNode {
    id: string;
    name: string;
    position?: string;
    department_name?: string;
    avatar_url?: string | null;
    children: OrgNode[];
    [k: string]: any;
}

interface Options {
    /** Group people whose manager is not in the list under a stand-in manager node. Default true. */
    standInManagers?: boolean;
}

export function buildOrgTree(items: any[], { standInManagers = true }: Options = {}): OrgNode[] {
    const nodes = new Map<string, OrgNode>();
    const byUserId = new Map<number, OrgNode>();
    for (const e of items) {
        const n: OrgNode = { ...e, children: [] };
        nodes.set(String(e.id), n);
        if (e.user_id !== undefined && e.user_id !== null) byUserId.set(Number(e.user_id), n);
    }

    const parentOf = new Map<OrgNode, OrgNode | null>();
    const standIns = new Map<number, OrgNode>();
    const roots: OrgNode[] = [];

    const managerNode = (n: OrgNode): OrgNode | null => {
        const m = n.reporting_manager_id;
        if (m === undefined || m === null || m === '') return null;
        const found = byUserId.get(Number(m)) ?? null;
        return found && found !== n ? found : null;
    };

    // a manager chain that loops back on itself would hide everyone in it: break it at the first person met
    const loopsBack = (n: OrgNode, parent: OrgNode): boolean => {
        const seen = new Set<OrgNode>([n]);
        for (let cur: OrgNode | null | undefined = parent; cur; cur = parentOf.get(cur)) {
            if (seen.has(cur)) return true;
            seen.add(cur);
        }
        return false;
    };

    for (const n of nodes.values()) {
        const parent = managerNode(n);
        if (parent && !loopsBack(n, parent)) {
            parentOf.set(n, parent);
            parent.children.push(n);
        } else if (!parent && standInManagers && n.reporting_manager_id) {
            const key = Number(n.reporting_manager_id);
            let s = standIns.get(key);
            if (!s) {
                s = { id: `v-${key}`, name: n.manager_name || 'System Admin', position: 'Administrative Head', department_name: 'Corporate', children: [] };
                standIns.set(key, s);
            }
            parentOf.set(n, s);
            s.children.push(n);
        } else {
            parentOf.set(n, null);
            roots.push(n);
        }
    }
    return [...roots, ...standIns.values()];
}

export const countNodes = (nodes: OrgNode[]): number =>
    nodes.reduce((sum, n) => sum + 1 + countNodes(n.children), 0);

/** Keeps people who match, and the people above them. */
export function filterOrgTree(nodes: OrgNode[], query: string): OrgNode[] {
    const q = query.trim().toLowerCase();
    if (!q) return nodes;
    const walk = (n: OrgNode): OrgNode | null => {
        const kids = n.children.map(walk).filter(Boolean) as OrgNode[];
        const hit = [n.name, n.position, n.department_name].some((v) => String(v ?? '').toLowerCase().includes(q));
        return hit || kids.length ? { ...n, children: kids } : null;
    };
    return nodes.map(walk).filter(Boolean) as OrgNode[];
}
