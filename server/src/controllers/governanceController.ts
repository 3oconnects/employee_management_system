import { Request, Response } from 'express';
import { pool } from '../config/db';

/**
 * RESOLUTION LOGIC:
 * 1. Check explicit assignment on the node.
 * 2. If missing, traverse parent hierarchy recursively.
 * 3. Stop at root or when an owner is found.
 */
export const resolveOwnership = async (req: Request, res: Response) => {
    const { nodeId } = req.params;
    try {
        const query = `
            WITH RECURSIVE hierarchy AS (
                -- Anchor: start at the target node
                SELECT id, parent_node_id, name, 0 as depth
                FROM org_nodes
                WHERE id = $1
                
                UNION ALL
                
                -- Recursive: join with parents
                SELECT n.id, n.parent_node_id, n.name, h.depth + 1
                FROM org_nodes n
                JOIN hierarchy h ON n.id = h.parent_node_id
                WHERE h.depth < 20 -- Safety limit
            )
            SELECT h.*, g.owner_id, g.ruler_id, g.is_inheritance_blocked, u.name as owner_name
            FROM hierarchy h
            LEFT JOIN org_governance g ON h.id = g.node_id
            LEFT JOIN users u ON g.owner_id = u.id
            ORDER BY h.depth ASC;
        `;
        
        const { rows } = await pool.query(query, [nodeId]);
        
        // Find first resolved owner
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
            if (row.is_inheritance_blocked && row.depth === 0) break; // If target blocks inheritance and has no owner
        }

        res.json({ 
            success: true, 
            resolvedOwner,
            fullChain: rows 
        });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const getOrgTree = async (req: Request, res: Response) => {
    try {
        const { rows: nodes } = await pool.query(`
            SELECT n.*, g.owner_id, u.name as owner_name
            FROM org_nodes n
            LEFT JOIN org_governance g ON n.id = g.node_id
            LEFT JOIN users u ON g.owner_id = u.id
            ORDER BY n.parent_node_id NULLS FIRST, n.name ASC
        `);

        // Fetch all active employees to map into the tree
        const { rows: employees } = await pool.query(`
            SELECT id, name, position, department_id, team_id 
            FROM employees 
            WHERE deleted_at IS NULL
        `);
        
        // Transform into tree structure
        const treeMap: any = {};
        nodes.forEach((n: any) => {
            treeMap[n.id] = { ...n, children: [] };
        });

        // Add employees as leaf nodes
        employees.forEach((emp: any) => {
            // Find the node corresponding to the employee's squad or division
            // Priority: Squad (Team) > Division (Department)
            let targetNodeId = null;

            if (emp.team_id) {
                const node = nodes.find(n => n.entity_type === 'team' && n.entity_id === emp.team_id);
                if (node) targetNodeId = node.id;
            }

            if (!targetNodeId && emp.department_id) {
                const node = nodes.find(n => n.entity_type === 'department' && n.entity_id === emp.department_id);
                if (node) targetNodeId = node.id;
            }

            if (targetNodeId && treeMap[targetNodeId]) {
                treeMap[targetNodeId].children.push({
                    id: `emp_${emp.id}`,
                    name: emp.name,
                    entity_type: 'employee',
                    category: 'personnel',
                    position: emp.position,
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

        res.json({ success: true, data: root });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const updateGovernance = async (req: Request, res: Response) => {
    const { nodeId } = req.params;
    const { owner_id, ruler_id, is_inheritance_blocked } = req.body;
    try {
        await pool.query(`
            INSERT INTO org_governance (node_id, owner_id, ruler_id, is_inheritance_blocked)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (node_id) DO UPDATE SET
                owner_id = EXCLUDED.owner_id,
                ruler_id = EXCLUDED.ruler_id,
                is_inheritance_blocked = EXCLUDED.is_inheritance_blocked,
                updated_at = CURRENT_TIMESTAMP
        `, [nodeId, owner_id, ruler_id, is_inheritance_blocked]);
        
        res.json({ success: true, message: 'Governance updated' });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const searchNodes = async (req: Request, res: Response) => {
    const { q } = req.query;
    try {
        const query = `
            WITH RECURSIVE path_builder AS (
                SELECT id, name, parent_node_id, name::text as full_path, 0 as depth
                FROM org_nodes
                WHERE parent_node_id IS NULL
                
                UNION ALL
                
                SELECT n.id, n.name, n.parent_node_id, pb.full_path || ' > ' || n.name, pb.depth + 1
                FROM org_nodes n
                JOIN path_builder pb ON n.parent_node_id = pb.id
                WHERE pb.depth < 20 -- Safety limit
            )
            SELECT * FROM path_builder
            WHERE name ILIKE $1
            LIMIT 10
        `;
        const { rows } = await pool.query(query, [`%${q}%`]);
        res.json({ success: true, data: rows });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
};
export const syncGraph = async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // 1. Sync Departments
        const { rows: depts } = await client.query('SELECT * FROM departments');
        for (const dept of depts) {
            const { rows: existing } = await client.query(
                'SELECT id FROM org_nodes WHERE entity_type = $1 AND entity_id = $2',
                ['department', dept.id]
            );
            if (existing.length === 0) {
                const nodeRes = await client.query(
                    'INSERT INTO org_nodes (entity_type, entity_id, name, category) VALUES ($1, $2, $3, $4) RETURNING id',
                    ['department', dept.id, dept.name, 'core']
                );
                await client.query(
                    'INSERT INTO org_governance (node_id, owner_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                    [nodeRes.rows[0].id, dept.manager_id || null]
                );
            }
        }

        // 2. Sync Teams
        const { rows: teams } = await client.query('SELECT * FROM teams');
        for (const team of teams) {
            const { rows: existing } = await client.query(
                'SELECT id FROM org_nodes WHERE entity_type = $1 AND entity_id = $2',
                ['team', team.id]
            );
            if (existing.length === 0) {
                const { rows: parentNode } = await client.query(
                    'SELECT id FROM org_nodes WHERE entity_type = $1 AND entity_id = $2',
                    ['department', team.department_id]
                );
                const nodeRes = await client.query(
                    'INSERT INTO org_nodes (entity_type, entity_id, parent_node_id, name, category) VALUES ($1, $2, $3, $4, $5) RETURNING id',
                    ['team', team.id, parentNode[0]?.id || null, team.name, 'core']
                );
                await client.query(
                    'INSERT INTO org_governance (node_id, owner_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                    [nodeRes.rows[0].id, team.manager_id || null]
                );
            }
        }

        await client.query('COMMIT');
        res.json({ success: true, message: 'Structural graph synchronized successfully' });
    } catch (err: any) {
        await client.query('ROLLBACK');
        res.status(500).json({ success: false, message: err.message });
    } finally {
        client.release();
    }
};
