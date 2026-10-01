import { pool } from '../../../config/db';

export class SyncGovernanceRepository {
    async syncGraph(tenantId: string) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            
            const targetTenant = tenantId || 'tenant_default';
            const { rows: depts } = await client.query(
                'SELECT * FROM departments WHERE tenant_id = $1 OR tenant_id = \'tenant_default\' OR tenant_id = \'default\'', 
                [targetTenant]
            );
            for (const dept of depts) {
                const nodeTenant = dept.tenant_id || targetTenant;
                const { rows: existing } = await client.query(
                    'SELECT id FROM org_nodes WHERE entity_type = $1 AND entity_id = $2 AND (tenant_id = $3 OR tenant_id = \'tenant_default\' OR tenant_id = \'default\')',
                    ['department', dept.id, nodeTenant]
                );
                if (existing.length === 0) {
                    const nodeRes = await client.query(
                        'INSERT INTO org_nodes (entity_type, entity_id, name, category, tenant_id) VALUES ($1, $2, $3, $4, $5) RETURNING id',
                        ['department', dept.id, dept.name, 'core', nodeTenant]
                    );
                    await client.query(
                        'INSERT INTO org_governance (node_id, owner_id, tenant_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
                        [nodeRes.rows[0].id, dept.manager_id || null, nodeTenant]
                    );
                }
            }

            const { rows: teams } = await client.query(
                'SELECT * FROM teams WHERE tenant_id = $1 OR tenant_id = \'tenant_default\' OR tenant_id = \'default\'', 
                [targetTenant]
            );
            for (const team of teams) {
                const nodeTenant = team.tenant_id || targetTenant;
                const { rows: existing } = await client.query(
                    'SELECT id FROM org_nodes WHERE entity_type = $1 AND entity_id = $2 AND (tenant_id = $3 OR tenant_id = \'tenant_default\' OR tenant_id = \'default\')',
                    ['team', team.id, nodeTenant]
                );
                if (existing.length === 0) {
                    const { rows: parentNode } = await client.query(
                        'SELECT id FROM org_nodes WHERE entity_type = $1 AND entity_id = $2 AND (tenant_id = $3 OR tenant_id = \'tenant_default\' OR tenant_id = \'default\')',
                        ['department', team.department_id, nodeTenant]
                    );
                    const nodeRes = await client.query(
                        'INSERT INTO org_nodes (entity_type, entity_id, parent_node_id, name, category, tenant_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
                        ['team', team.id, parentNode[0]?.id || null, team.name, 'core', nodeTenant]
                    );
                    await client.query(
                        'INSERT INTO org_governance (node_id, owner_id, tenant_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
                        [nodeRes.rows[0].id, team.manager_id || null, nodeTenant]
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
