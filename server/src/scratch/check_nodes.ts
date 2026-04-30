import { directPool as pool } from './config/db';

const checkDb = async () => {
    try {
        const { rows: depts } = await pool.query('SELECT id, name FROM departments');
        const { rows: teams } = await pool.query('SELECT id, name FROM teams');
        const { rows: nodes } = await pool.query('SELECT id, name, entity_type FROM org_nodes');
        
        console.log('--- DB STATUS ---');
        console.log('Departments:', depts.length);
        console.log('Teams:', teams.length);
        console.log('Org Nodes:', nodes.length);
        
        if (nodes.length > 0) {
            console.log('Sample Nodes:', nodes.slice(0, 5));
        }
    } catch (err) {
        console.error('Error checking DB:', err);
    } finally {
        await pool.end();
    }
};

checkDb();
