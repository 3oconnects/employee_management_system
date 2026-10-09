import { pool } from '../src/config/db';

async function test() {
  try {
    const res = await pool.query("SELECT NOW() + ($1 || ' days')::INTERVAL", [7]);
    console.log('Query success:', res.rows[0]);
  } catch (e: any) {
    console.error('Query ERROR:', e.message);
  } finally {
    await pool.end();
  }
}
test();
