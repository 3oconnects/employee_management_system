import { pool } from '../../../config/db';

export class SyncGovernanceRepository {
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
