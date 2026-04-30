const { Pool } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function checkData() {
    try {
        const approvals = await pool.query('SELECT count(*) FROM approvals');
        const leaves = await pool.query('SELECT count(*) FROM leave_requests');
        const employees = await pool.query('SELECT count(*) FROM employees');
        
        console.log('--- DB STATS ---');
        console.log('Approvals:', approvals.rows[0].count);
        console.log('Leave Requests:', leaves.rows[0].count);
        console.log('Employees:', employees.rows[0].count);
        
        const sample = await pool.query('SELECT id, status, tenant_id FROM approvals LIMIT 5');
        console.log('\n--- SAMPLE APPROVALS ---');
        console.table(sample.rows);
        
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

checkData();
