const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@localhost:5432/aura_ems' });

async function backfill() {
  const users = ['saranbtech@gmail.com', 'roughu049@gmail.com'];
  for (const email of users) {
    const tempPass = 'AURA' + Math.random().toString(36).slice(-6).toUpperCase();
    const hash = await bcrypt.hash(tempPass, 10);
    await pool.query(
      'UPDATE users SET password=$1, temp_password=$2, is_password_temp=true WHERE email=$3',
      [hash, tempPass, email]
    );
    console.log(`Backfilled ${email} with temp pass: ${tempPass}`);
  }
  pool.end();
}

backfill().catch(console.error);
