import { pool } from '../../config/db';

export class GovernanceRepository {
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

    async getOrgTree(tenantId: string) {
        try {
            // Ensure tables exist (no-op if already present)
            await pool.query(`
                CREATE TABLE IF NOT EXISTS org_nodes (
                    id SERIAL PRIMARY KEY,
                    tenant_id TEXT NOT NULL,
                    entity_type TEXT NOT NULL,
                    entity_id INTEGER,
                    parent_node_id INTEGER REFERENCES org_nodes(id) ON DELETE SET NULL,
                    name TEXT NOT NULL,
                    category TEXT DEFAULT 'core',
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                )
            `);
            await pool.query(`
                CREATE TABLE IF NOT EXISTS org_governance (
                    id SERIAL PRIMARY KEY,
                    node_id INTEGER REFERENCES org_nodes(id) ON DELETE CASCADE,
                    tenant_id TEXT NOT NULL,
                    owner_id INTEGER,
                    ruler_id INTEGER,
                    is_inheritance_blocked BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW(),
                    UNIQUE(node_id)
                )
            `);

            const { rows: nodes } = await pool.query(`
                SELECT n.*, g.owner_id, u.name as owner_name
                FROM org_nodes n
                LEFT JOIN org_governance g ON n.id = g.node_id AND g.tenant_id = $1
                LEFT JOIN users u ON g.owner_id = u.id AND u.tenant_id = $1
                WHERE n.tenant_id = $1
                ORDER BY n.parent_node_id NULLS FIRST, n.name ASC
            `, [tenantId]);

            const { rows: employees } = await pool.query(`
                SELECT id, name, position, department_id, team_id 
                FROM employees 
                WHERE deleted_at IS NULL AND tenant_id = $1
            `, [tenantId]);

            return { nodes, employees };
        } catch (err: any) {
            console.error('[GovernanceRepo] getOrgTree error:', err.message);
            // Return empty tree instead of crashing — tables may not be seeded yet
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
                WHERE parent_node_id IS NULL AND tenant_id = $2
                
                UNION ALL
                
                SELECT n.id, n.name, n.parent_node_id, pb.full_path || ' > ' || n.name, pb.depth + 1
                FROM org_nodes n
                JOIN path_builder pb ON n.parent_node_id = pb.id
                WHERE pb.depth < 20 AND n.tenant_id = $2
            )
            SELECT * FROM path_builder
            WHERE name ILIKE $1
            LIMIT 10
        `;
        const { rows } = await pool.query(query, [`%${q}%`, tenantId]);
        return rows;
    }

    async syncGraph(tenantId: string) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            
            const { rows: depts } = await client.query('SELECT * FROM departments WHERE tenant_id = $1', [tenantId]);
            for (const dept of depts) {
                const { rows: existing } = await client.query(
                    'SELECT id FROM org_nodes WHERE entity_type = $1 AND entity_id = $2 AND tenant_id = $3',
                    ['department', dept.id, tenantId]
                );
                if (existing.length === 0) {
                    const nodeRes = await client.query(
                        'INSERT INTO org_nodes (entity_type, entity_id, name, category, tenant_id) VALUES ($1, $2, $3, $4, $5) RETURNING id',
                        ['department', dept.id, dept.name, 'core', tenantId]
                    );
                    await client.query(
                        'INSERT INTO org_governance (node_id, owner_id, tenant_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
                        [nodeRes.rows[0].id, dept.manager_id || null, tenantId]
                    );
                }
            }

            const { rows: teams } = await client.query('SELECT * FROM teams WHERE tenant_id = $1', [tenantId]);
            for (const team of teams) {
                const { rows: existing } = await client.query(
                    'SELECT id FROM org_nodes WHERE entity_type = $1 AND entity_id = $2 AND tenant_id = $3',
                    ['team', team.id, tenantId]
                );
                if (existing.length === 0) {
                    const { rows: parentNode } = await client.query(
                        'SELECT id FROM org_nodes WHERE entity_type = $1 AND entity_id = $2 AND tenant_id = $3',
                        ['department', team.department_id, tenantId]
                    );
                    const nodeRes = await client.query(
                        'INSERT INTO org_nodes (entity_type, entity_id, parent_node_id, name, category, tenant_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
                        ['team', team.id, parentNode[0]?.id || null, team.name, 'core', tenantId]
                    );
                    await client.query(
                        'INSERT INTO org_governance (node_id, owner_id, tenant_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
                        [nodeRes.rows[0].id, team.manager_id || null, tenantId]
                    );
                }
            }

            await client.query('COMMIT');
        } catch (err: any) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }
}
