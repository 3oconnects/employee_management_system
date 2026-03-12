import { pool } from './db';

const schema = `
  CREATE TABLE IF NOT EXISTS employees (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    department TEXT,
    position TEXT,
    join_date TIMESTAMP,
    email TEXT UNIQUE
  );

  CREATE TABLE IF NOT EXISTS payroll_profiles (
    employee_id TEXT PRIMARY KEY REFERENCES employees(id),
    name TEXT,
    department TEXT,
    role TEXT,
    annual_ctc NUMERIC,
    bank_account TEXT,
    tax_regime TEXT,
    basic_salary NUMERIC DEFAULT 0,
    hra NUMERIC DEFAULT 0,
    allowances NUMERIC DEFAULT 0,
    bonus NUMERIC DEFAULT 0,
    overtime NUMERIC DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS payroll_entries (
    id SERIAL PRIMARY KEY,
    employee_id TEXT REFERENCES employees(id),
    month TEXT,
    year TEXT,
    gross_salary NUMERIC,
    pf_employee NUMERIC,
    esi_employee NUMERIC,
    professional_tax NUMERIC,
    tds NUMERIC,
    total_deductions NUMERIC,
    net_salary NUMERIC
  );

  CREATE TABLE IF NOT EXISTS payroll_runs (
    id TEXT PRIMARY KEY,
    month TEXT,
    year TEXT,
    processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS approvals (
    id TEXT PRIMARY KEY,
    employee_id TEXT REFERENCES employees(id),
    type TEXT,
    status TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT
  );

  CREATE TABLE IF NOT EXISTS investment_deadlines (
    id TEXT PRIMARY KEY,
    deadline_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS loans (
    id TEXT PRIMARY KEY,
    employee_id TEXT REFERENCES employees(id),
    amount NUMERIC,
    status TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS attendance (
    id SERIAL PRIMARY KEY,
    employee_id TEXT NOT NULL,
    check_in_time TIMESTAMP,
    check_out_time TIMESTAMP,
    status TEXT DEFAULT 'OUT',
    date DATE DEFAULT CURRENT_DATE
  );
  CREATE TABLE IF NOT EXISTS claims (
    id TEXT PRIMARY KEY,
    employee_id TEXT REFERENCES employees(id),
    amount NUMERIC,
    category TEXT,
    description TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS leaves (
    id SERIAL PRIMARY KEY,
    employee_id TEXT REFERENCES employees(id),
    type TEXT,
    start_date DATE,
    end_date DATE,
    reason TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS timesheets (
    id SERIAL PRIMARY KEY,
    employee_id TEXT REFERENCES employees(id),
    project TEXT,
    hours NUMERIC,
    date DATE,
    status TEXT DEFAULT 'submitted',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`;

export const initDb = async () => {
  try {
    // Create all tables (CREATE TABLE IF NOT EXISTS is fully idempotent)
    await pool.query(schema);
    console.log('✅ Database schema initialized.');

    // --- Migration: upgrade existing users table to include id column ---
    // If the table was created before this schema update (email was PRIMARY KEY,
    // no id column), these ALTER statements bring it up to date safely.
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS id SERIAL;
    `).catch(() => { /* id column already exists or not applicable */ });

    await pool.query(`
      ALTER TABLE employees ADD COLUMN IF NOT EXISTS email TEXT UNIQUE;
    `).catch(() => { /* email column already exists or not applicable */ });

    await pool.query(`
      ALTER TABLE payroll_entries ADD COLUMN IF NOT EXISTS total_deductions NUMERIC;
    `).catch(() => { /* column already exists */ });

    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS name TEXT;
    `).catch(() => { /* name column already exists */ });

    // Ensure the UNIQUE constraint on email exists (no-op if already present)
    await pool.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conrelid = 'users'::regclass AND conname = 'users_email_unique'
        ) THEN
          ALTER TABLE users ADD CONSTRAINT users_email_unique UNIQUE (email);
        END IF;
      END $$;
    `).catch(() => { /* constraint already exists */ });

    // --- Seed default admin user ---
    await pool.query(`
      INSERT INTO users (name, email, password, role)
      VALUES ('System Admin', 'admin@company.com', 'admin123', 'admin')
      ON CONFLICT (email) DO NOTHING
    `);

    // Also seed a matching employee record for the admin so the join works
    // We do this independently of the user seed to ensure the mapping ALWAYS exists
    await pool.query(`
      INSERT INTO employees (id, name, department, position, join_date, email)
      VALUES ('EMP000', 'System Admin', 'Management', 'Admin', CURRENT_TIMESTAMP, 'admin@company.com')
      ON CONFLICT (id) DO UPDATE SET email = 'admin@company.com'
    `);

    // Seed some analytics data if tables are empty
    const { rows: leaveRows } = await pool.query('SELECT COUNT(*) FROM leaves');
    if (parseInt(leaveRows[0].count) === 0) {
        await pool.query(`
            INSERT INTO leaves (employee_id, type, start_date, end_date, reason, status)
            VALUES ('EMP000', 'CASUAL', CURRENT_DATE, CURRENT_DATE, 'Family function', 'approved')
        `);
    }

    const { rows: tsRows } = await pool.query('SELECT COUNT(*) FROM timesheets');
    if (parseInt(tsRows[0].count) === 0) {
        await pool.query(`
            INSERT INTO timesheets (employee_id, project, hours, date, status)
            VALUES ('EMP000', 'Internal Admin', 8, CURRENT_DATE - INTERVAL '1 day', 'submitted')
        `);
    }

    await pool.query(`
        UPDATE payroll_profiles 
        SET overtime = 5000 
        WHERE employee_id = 'EMP000' AND (overtime = 0 OR overtime IS NULL)
    `);
    
    console.log('✅ Admin credentials and analytics seed data synced.');
  } catch (err) {
    console.error('❌ Error initializing database schema:', err);
  }
};

