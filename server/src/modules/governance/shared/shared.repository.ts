import { pool } from '../../../config/db';

export class SharedGovernanceRepository {
    async resolveOwnership(nodeId: string, tenantId: string) {
        const query = `
            WITH RECURSIVE hierarchy AS (
                SELECT id, parent_node_id, name, 0 as depth
                FROM org_nodes
                WHERE id = $1 AND tenant_id = $2
                
                UNION ALL
                
                SELECT n.id, n.parent_node_id, n.name, h.depth + 1
                FROM org_nodes n
                JOIN hierarchy h ON n.id = h.parent_node_id
                WHERE h.depth < 20 AND n.tenant_id = $2
            )
            SELECT h.*, g.owner_id, g.ruler_id, g.is_inheritance_blocked, u.name as owner_name
            FROM hierarchy h
            LEFT JOIN org_governance g ON h.id = g.node_id AND g.tenant_id = $2
            LEFT JOIN users u ON g.owner_id = u.id AND u.tenant_id = $2
            ORDER BY h.depth ASC;
        `;
        const { rows } = await pool.query(query, [nodeId, tenantId]);
        return rows;
    }
}
