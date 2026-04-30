import { directPool as pool } from '../config/db';

/**
 * MIGRATION: Backfill Organizational Shadow Graph
 * 
 * Ensures all existing departments and teams are correctly registered
 * in the org_nodes and org_governance tables for the Graph View.
 */
export const backfillShadowGraph = async () => {
    console.log('🔄 Starting Organizational Shadow Graph backfill...');
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');

        // 1. Sync Departments
        const { rows: depts } = await client.query('SELECT * FROM departments');
        for (const dept of depts) {
            // Check if already exists in shadow graph
            const { rows: existing } = await client.query(
                'SELECT id FROM org_nodes WHERE entity_type = $1 AND entity_id = $2',
                ['department', dept.id]
            );

            if (existing.length === 0) {
                console.log(`   + Registering Department: ${dept.name}`);
                const nodeRes = await client.query(
                    'INSERT INTO org_nodes (entity_type, entity_id, name, category) VALUES ($1, $2, $3, $4) RETURNING id',
                    ['department', dept.id, dept.name, 'core']
                );
                
                // Initialize Governance
                await client.query(
                    'INSERT INTO org_governance (node_id, owner_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                    [nodeRes.rows[0].id, dept.manager_id || null]
                );
            }
        }

        // 2. Sync Teams
        const { rows: teams } = await client.query('SELECT * FROM teams');
        for (const team of teams) {
            // Check if already exists
            const { rows: existing } = await client.query(
                'SELECT id FROM org_nodes WHERE entity_type = $1 AND entity_id = $2',
                ['team', team.id]
            );

            if (existing.length === 0) {
                console.log(`   + Registering Team: ${team.name}`);
                
                // Resolve Parent Node (Department)
                const { rows: parentNode } = await client.query(
                    'SELECT id FROM org_nodes WHERE entity_type = $1 AND entity_id = $2',
                    ['department', team.department_id]
                );

                const nodeRes = await client.query(
                    'INSERT INTO org_nodes (entity_type, entity_id, parent_node_id, name, category) VALUES ($1, $2, $3, $4, $5) RETURNING id',
                    ['team', team.id, parentNode[0]?.id || null, team.name, 'core']
                );

                // Initialize Governance
                await client.query(
                    'INSERT INTO org_governance (node_id, owner_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                    [nodeRes.rows[0].id, team.manager_id || null]
                );
            }
        }

        await client.query('COMMIT');
        console.log('✅ Organizational Shadow Graph backfill complete.');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Shadow Graph backfill failed:', err);
    } finally {
        client.release();
    }
};
