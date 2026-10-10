import { pool } from '../../../config/db';

export class OrgTreeRepository {
    async getOrgTree(tenantId: string) {
        try {
            const { rows: nodes } = await pool.query(`
                SELECT n.*, g.owner_id, u.name as owner_name
                FROM org_nodes n
                LEFT JOIN org_governance g ON n.id = g.node_id AND (g.tenant_id = $1 OR g.tenant_id = 'tenant_default' OR g.tenant_id = 'default')
                LEFT JOIN users u ON g.owner_id = u.id AND (u.tenant_id = $1 OR u.tenant_id = 'tenant_default' OR u.tenant_id = 'default') AND COALESCE(u.is_active, true) = true AND u.deleted_at IS NULL
                WHERE (n.tenant_id = $1 OR n.tenant_id = 'tenant_default' OR n.tenant_id = 'default')
                ORDER BY n.parent_node_id NULLS FIRST, n.name ASC
            `, [tenantId]);

            const { rows: employees } = await pool.query(`
                SELECT id, name, position, department_id, team_id, avatar_url 
                FROM employees 
                WHERE deleted_at IS NULL 
                  AND (status IS NULL OR status <> 'terminated')
                  AND (tenant_id = $1 OR tenant_id = 'tenant_default' OR tenant_id = 'default')
            `, [tenantId]);
            
            return { nodes, employees };
        } catch (err: any) {
            console.error('[OrgTreeRepository] getOrgTree error:', err.message);
            return { nodes: [], employees: [] };
        }
    }

    async updateGovernance(nodeId: string, data: any, tenantId: string) {
        await pool.query(`
            INSERT INTO org_governance (node_id, owner_id, ruler_id, is_inheritance_blocked, tenant_id)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (node_id) DO UPDATE SET
                owner_id = EXCLUDED.owner_id,
                ruler_id = EXCLUDED.ruler_id,
                is_inheritance_blocked = EXCLUDED.is_inheritance_blocked,
                updated_at = CURRENT_TIMESTAMP
        `, [nodeId, data.owner_id, data.ruler_id, data.is_inheritance_blocked, tenantId]);
    }

    async searchNodes(q: string, tenantId: string) {
        const query = `
            WITH RECURSIVE path_builder AS (
                SELECT id, name, parent_node_id, name::text as full_path, 0 as depth
                FROM org_nodes
                WHERE parent_node_id IS NULL AND (tenant_id = $2 OR tenant_id = 'tenant_default' OR tenant_id = 'default')
                
                UNION ALL
                
                SELECT n.id, n.name, n.parent_node_id, pb.full_path || ' > ' || n.name, pb.depth + 1
                FROM org_nodes n
                JOIN path_builder pb ON n.parent_node_id = pb.id
                WHERE pb.depth < 20 AND (n.tenant_id = $2 OR n.tenant_id = 'tenant_default' OR n.tenant_id = 'default')
            )
            SELECT * FROM path_builder
            WHERE name ILIKE $1
            LIMIT 10
        `;
        const { rows } = await pool.query(query, [`%${q}%`, tenantId]);
        return rows;
    }
}
