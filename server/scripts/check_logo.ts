import { pool } from '../src/config/db';

async function check() {
    try {
        const r1 = await pool.query('SELECT id, name, logo_url FROM tenants');
        console.log('Tenants:', JSON.stringify(r1.rows, null, 2));
        const r2 = await pool.query("SELECT * FROM app_config WHERE key LIKE '%logo%'");
        console.log('App Config:', JSON.stringify(r2.rows, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

check();
