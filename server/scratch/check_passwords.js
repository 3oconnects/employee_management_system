const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@localhost:5432/aura_ems' });
pool.query('SELECT email, temp_password, is_password_temp FROM users', (err, res) => {
  if (err) console.error(err);
  else console.table(res.rows);
  pool.end();
});
