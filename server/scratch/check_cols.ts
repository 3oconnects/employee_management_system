import { pool } from '../src/config/db';

async function main() {
    const emp = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'employees'");
    console.log('EMP COLS:', emp.rows.map(r => r.column_name));
    const usr = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'users'");
    console.log('USR COLS:', usr.rows.map(r => r.column_name));
    process.exit(0);
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
