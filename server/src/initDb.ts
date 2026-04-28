import bcrypt from 'bcryptjs';
import { directPool as pool } from './config/db';

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

  CREATE TABLE IF NOT EXISTS leave_types (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    annual_quota INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS leave_requests (
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

  CREATE TABLE IF NOT EXISTS payroll_history (
    id SERIAL PRIMARY KEY,
    employee_id TEXT REFERENCES employees(id),
    month TEXT,
    year TEXT,
    gross_salary NUMERIC,
    deductions NUMERIC,
    net_salary NUMERIC,
    paid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS reimbursement_claims (
    id SERIAL PRIMARY KEY,
    employee_id TEXT REFERENCES employees(id),
    amount NUMERIC,
    category TEXT,
    description TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`;

export const initDb = async () => {
  try {
    // Create all tables (CREATE TABLE IF NOT EXISTS is fully idempotent)
    await pool.query(schema);
    console.log('✅ Database schema initialized.');

    // --- Migration: upgrade existing schema for AnalyticsService compatibility ---
    
    // Core Identity & Multi-tenancy
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id TEXT DEFAULT 'tenant_default';`).catch(() => {});
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;`).catch(() => {});
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;`).catch(() => {});
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;`).catch(() => {});
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS refresh_token TEXT;`).catch(() => {});
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS role_id INTEGER;`).catch(() => {});

    // Employees
    await pool.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS tenant_id TEXT DEFAULT 'tenant_default';`).catch(() => {});
    await pool.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';`).catch(() => {});
    await pool.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS gender TEXT;`).catch(() => {});
    await pool.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS phone TEXT;`).catch(() => {});
    await pool.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS personal_email TEXT;`).catch(() => {});
    await pool.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS date_of_birth DATE;`).catch(() => {});
    await pool.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS address_line1 TEXT;`).catch(() => {});
    await pool.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS city TEXT;`).catch(() => {});
    await pool.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS state TEXT;`).catch(() => {});
    await pool.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS pincode TEXT;`).catch(() => {});
    await pool.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS highest_degree TEXT;`).catch(() => {});
    await pool.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS field_of_study TEXT;`).catch(() => {});
    await pool.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS institution TEXT;`).catch(() => {});
    await pool.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS graduation_year TEXT;`).catch(() => {});
    await pool.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS bank_account_number TEXT;`).catch(() => {});
    await pool.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS internship_start_date DATE;`).catch(() => {});
    await pool.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS internship_end_date DATE;`).catch(() => {});
    await pool.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS internship_stipend NUMERIC;`).catch(() => {});
    await pool.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS internship_supervisor TEXT;`).catch(() => {});
    await pool.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS internship_college TEXT;`).catch(() => {});
    await pool.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS annual_ctc NUMERIC;`).catch(() => {});
    await pool.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS tax_regime TEXT;`).catch(() => {});
    await pool.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;`).catch(() => {});
    await pool.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS exit_date DATE;`).catch(() => {});
    await pool.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS employment_type TEXT DEFAULT 'full_time';`).catch(() => {});
    await pool.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS user_id INTEGER;`).catch(() => {});
    await pool.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS reporting_manager_id INTEGER;`).catch(() => {});
    await pool.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;`).catch(() => {});
    await pool.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;`).catch(() => {});

    // Attendance (Legacy Support + New Structure)
    await pool.query(`ALTER TABLE attendance ADD COLUMN IF NOT EXISTS tenant_id TEXT DEFAULT 'tenant_default';`).catch(() => {});
    await pool.query(`ALTER TABLE attendance ADD COLUMN IF NOT EXISTS user_id INTEGER;`).catch(() => {});
    await pool.query(`ALTER TABLE attendance ADD COLUMN IF NOT EXISTS check_in TIMESTAMP;`).catch(() => {});
    await pool.query(`ALTER TABLE attendance ADD COLUMN IF NOT EXISTS check_out TIMESTAMP;`).catch(() => {});

    // Leave Requests
    await pool.query(`ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS tenant_id TEXT DEFAULT 'tenant_default';`).catch(() => {});
    await pool.query(`ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS user_id INTEGER;`).catch(() => {});
    await pool.query(`ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS leave_type_id INTEGER;`).catch(() => {});
    await pool.query(`ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;`).catch(() => {});

    // Timesheets (Modern Weekly Structure)
    await pool.query(`ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS tenant_id TEXT DEFAULT 'tenant_default';`).catch(() => {});
    await pool.query(`ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS user_id INTEGER;`).catch(() => {});
    await pool.query(`ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS week_start DATE;`).catch(() => {});
    await pool.query(`ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS week_end DATE;`).catch(() => {});
    await pool.query(`ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS total_hours NUMERIC DEFAULT 0;`).catch(() => {});
    await pool.query(`ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;`).catch(() => {});
    await pool.query(`ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS approved_by INTEGER;`).catch(() => {});
    await pool.query(`ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS remarks TEXT;`).catch(() => {});

    // Timesheet Entries (for project-specific hours)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS timesheet_entries (
        id SERIAL PRIMARY KEY,
        timesheet_id INTEGER REFERENCES timesheets(id) ON DELETE CASCADE,
        project_name TEXT,
        task_desc TEXT,
        mon_hours NUMERIC DEFAULT 0,
        tue_hours NUMERIC DEFAULT 0,
        wed_hours NUMERIC DEFAULT 0,
        thu_hours NUMERIC DEFAULT 0,
        fri_hours NUMERIC DEFAULT 0,
        sat_hours NUMERIC DEFAULT 0,
        sun_hours NUMERIC DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `).catch(() => {});

    // Payroll Extensions
    await pool.query(`ALTER TABLE payroll_profiles ADD COLUMN IF NOT EXISTS tenant_id TEXT DEFAULT 'tenant_default';`).catch(() => {});
    await pool.query(`ALTER TABLE payroll_profiles ADD COLUMN IF NOT EXISTS annual_ctc NUMERIC DEFAULT 0;`).catch(() => {});
    await pool.query(`ALTER TABLE payroll_entries ADD COLUMN IF NOT EXISTS total_deductions NUMERIC DEFAULT 0;`).catch(() => {});
    await pool.query(`ALTER TABLE payroll_history ADD COLUMN IF NOT EXISTS tenant_id TEXT DEFAULT 'tenant_default';`).catch(() => {});
    
    // Create audit_logs if missing (needed for admin dashboard activity feed)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `).catch(() => {});

    // Create notifications if missing
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        tenant_id TEXT DEFAULT 'tenant_default',
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `).catch(() => {});

    // Ensure tenant_id exists in notifications (migration)
    await pool.query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS tenant_id TEXT DEFAULT 'tenant_default';`).catch(() => {});

    // Create holidays if missing
    await pool.query(`
      CREATE TABLE IF NOT EXISTS holidays (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        date DATE NOT NULL,
        type TEXT DEFAULT 'public',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `).catch(() => {});
    
    // Backfill user_id in employees from users table via email join
    await pool.query(`
      UPDATE employees e
      SET user_id = u.id
      FROM users u
      WHERE u.email = e.email AND e.user_id IS NULL
    `).catch(() => {});
    
    // Backfill user_id in attendance from employees via employee_id column
    await pool.query(`
      UPDATE attendance a
      SET user_id = u.id
      FROM users u
      JOIN employees e ON e.email = u.email
      WHERE a.employee_id = e.id AND a.user_id IS NULL
    `).catch(() => {});

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
    const hashedAdminPassword = await bcrypt.hash('admin123', 10);
    await pool.query(`
      INSERT INTO users (name, email, password, role)
      VALUES ('System Admin', 'admin@company.com', $1, 'admin')
      ON CONFLICT (email) DO NOTHING
    `, [hashedAdminPassword]);

    // Also seed a matching employee record for the admin so the join works
    // We do this independently of the user seed to ensure the mapping ALWAYS exists
    await pool.query(`
      INSERT INTO employees (id, name, department, position, join_date, email)
      VALUES ('EMP000', 'System Admin', 'Management', 'Admin', CURRENT_TIMESTAMP, 'admin@company.com')
      ON CONFLICT (id) DO UPDATE SET email = 'admin@company.com'
    `);

    // Seed some analytics data if tables are empty
    const { rows: leaveRows } = await pool.query('SELECT COUNT(*) FROM leave_requests');
    if (parseInt(leaveRows[0].count) === 0) {
        await pool.query(`
            INSERT INTO leave_requests (employee_id, type, start_date, end_date, reason, status)
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

