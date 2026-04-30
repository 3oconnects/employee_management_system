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

  CREATE TABLE IF NOT EXISTS tenants (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    domain TEXT UNIQUE,
    status TEXT DEFAULT 'active',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
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

  CREATE TABLE IF NOT EXISTS departments (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    manager_id INTEGER,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS teams (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    department_id INTEGER REFERENCES departments(id) ON DELETE CASCADE,
    parent_team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
    manager_id INTEGER,
    description TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name, department_id)
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

  -- ─── ENTERPRISE HIERARCHY & GOVERNANCE LAYER (ADDITIVE) ───

  -- 1. Unified Organizational Nodes (Shadow Graph)
  CREATE TABLE IF NOT EXISTS org_nodes (
    id SERIAL PRIMARY KEY,
    entity_type TEXT NOT NULL, -- 'department', 'team', 'squad', etc.
    entity_id INTEGER,         -- ID of original department/team
    parent_node_id INTEGER REFERENCES org_nodes(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT DEFAULT 'core', -- 'core', 'support', 'strategic', etc.
    hierarchical_path TEXT,    -- Dot-separated path (e.g. 1.5.12)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  -- 2. Governance & Ownership
  CREATE TABLE IF NOT EXISTS org_governance (
    node_id INTEGER PRIMARY KEY REFERENCES org_nodes(id) ON DELETE CASCADE,
    creator_id INTEGER REFERENCES users(id),
    owner_id INTEGER REFERENCES users(id),  -- Primary responsible authority
    ruler_id INTEGER REFERENCES users(id),  -- Ultimate decision authority
    is_inheritance_blocked BOOLEAN DEFAULT false,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  -- 3. Advanced Role Definitions
  CREATE TABLE IF NOT EXISTS org_roles (
    id SERIAL PRIMARY KEY,
    node_id INTEGER REFERENCES org_nodes(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  -- 4. Temporal Employee Participation
  CREATE TABLE IF NOT EXISTS employee_roles (
    id SERIAL PRIMARY KEY,
    employee_id TEXT REFERENCES employees(id),
    role_id INTEGER REFERENCES org_roles(id) ON DELETE CASCADE,
    context TEXT, -- 'lead', 'contributor', 'consultant'
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,
    is_primary BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  -- 5. Entity-Agnostic Attachments
  CREATE TABLE IF NOT EXISTS org_resources (
    id SERIAL PRIMARY KEY,
    node_id INTEGER REFERENCES org_nodes(id) ON DELETE CASCADE,
    resource_type TEXT NOT NULL, -- 'policy', 'handbook', 'diagram'
    title TEXT NOT NULL,
    file_url TEXT,
    metadata JSONB DEFAULT '{}',
    uploaded_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  -- 6. Structural Change Intelligence
  CREATE TABLE IF NOT EXISTS org_structural_audit (
    id SERIAL PRIMARY KEY,
    node_id INTEGER,
    action TEXT NOT NULL,
    previous_state JSONB,
    new_state JSONB,
    performed_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`;

export const initDb = async () => {
  try {
    // Split schema into individual statements and execute them one by one
    // to prevent timeouts and handle multi-statement restrictions in some environments
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    console.log(`🔧 Initializing base schema (${statements.length} tables)...`);
    
    for (const statement of statements) {
      await pool.query(statement).catch(err => {
        if (!err.message.includes('already exists')) {
          throw err;
        }
      });
    }
    
    console.log('✅ Base database schema initialized.');

    // Organization Metadata
    await pool.query(`ALTER TABLE departments ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';`).catch(() => {});
    await pool.query(`ALTER TABLE teams ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';`).catch(() => {});
    await pool.query(`ALTER TABLE teams ADD COLUMN IF NOT EXISTS parent_team_id INTEGER REFERENCES teams(id);`).catch(() => {});

    // Core Identity & Multi-tenancy
    await pool.query(`ALTER TABLE org_nodes ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'core';`).catch(() => {});
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id TEXT DEFAULT 'tenant_default';`).catch(() => {});
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;`).catch(() => {});
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;`).catch(() => {});
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;`).catch(() => {});
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS refresh_token TEXT;`).catch(() => {});
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS role_id INTEGER;`).catch(() => {});
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS temp_password TEXT;`).catch(() => {});
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_password_temp BOOLEAN DEFAULT false;`).catch(() => {});

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
    await pool.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS department_id INTEGER REFERENCES departments(id);`).catch(() => {});
    await pool.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS team_id INTEGER REFERENCES teams(id);`).catch(() => {});
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
    await pool.query(`ALTER TABLE payroll_profiles ADD COLUMN IF NOT EXISTS department_id INTEGER REFERENCES departments(id);`).catch(() => {});
    await pool.query(`ALTER TABLE payroll_profiles ADD COLUMN IF NOT EXISTS team_id INTEGER REFERENCES teams(id);`).catch(() => {});
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

    // Ensure tenant columns exist for legacy compatibility
    await pool.query(`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';`).catch(() => {});
    await pool.query(`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS domain TEXT;`).catch(() => {});
    await pool.query(`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS slug TEXT;`).catch(() => {});
    
    // Backfill slugs for existing tenants if missing
    await pool.query(`UPDATE tenants SET slug = id WHERE slug IS NULL`).catch(() => {});

    // --- Seed default tenant ---
    await pool.query(`
      INSERT INTO tenants (id, name, domain, status)
      VALUES ('tenant_default', 'AURA Default', 'company.com', 'active')
      ON CONFLICT (id) DO NOTHING
    `);

    // --- Seed/Repair default admin user ---
    const hashedAdminPassword = await bcrypt.hash('admin123', 10);
    const { rows: adminRows } = await pool.query("SELECT id FROM users WHERE email = 'admin@company.com'");
    
    if (adminRows.length === 0) {
      console.log('🌱 Seeding default admin user...');
      await pool.query(`
        INSERT INTO users (name, email, password, role, tenant_id, is_active)
        VALUES ('System Admin', 'admin@company.com', $1, 'admin', 'tenant_default', true)
      `, [hashedAdminPassword]);
    } else {
      console.log('🔧 Synchronizing admin credentials...');
      await pool.query(`
        UPDATE users 
        SET password = $1, is_active = true, deleted_at = NULL, tenant_id = 'tenant_default'
        WHERE email = 'admin@company.com'
      `, [hashedAdminPassword]);
    }

    // Seed Departments
    const { rows: deptRows } = await pool.query('SELECT COUNT(*) FROM departments');
    if (parseInt(deptRows[0].count) === 0) {
      await pool.query(`
        INSERT INTO departments (name, description) VALUES 
        ('Engineering', 'Core software development and infrastructure'),
        ('Product', 'Product management and design'),
        ('Sales', 'Sales and business development'),
        ('Marketing', 'Marketing and communications'),
        ('HR', 'Human resources and recruitment'),
        ('Finance', 'Financial planning and accounting'),
        ('Operations', 'Business operations and logistics'),
        ('Design', 'Creative design and UI/UX'),
        ('Support', 'Customer support and success'),
        ('Legal', 'Legal and compliance'),
        ('Management', 'Executive leadership and strategy')
      `);
      
      // Seed demo accounts with temp passwords for security rotation demo
      const demoUsers = [
          { email: 'saranbtech@gmail.com', pass: 'AURA_SARAN_2026' },
          { email: 'roughu049@gmail.com', pass: 'AURA_SRIDHAR_2026' }
      ];

      for (const d of demoUsers) {
          const hashed = await bcrypt.hash(d.pass, 10);
          await pool.query(
              'UPDATE users SET password=$1, temp_password=$2, is_password_temp=true WHERE email=$3',
              [hashed, d.pass, d.email]
          );
      }
      
      // Seed Teams for Engineering
      const { rows: engDept } = await pool.query("SELECT id FROM departments WHERE name = 'Engineering'");
      if (engDept.length > 0) {
        await pool.query(`
          INSERT INTO teams (name, department_id, description) VALUES 
          ('Frontend', $1, 'React and UI development'),
          ('Backend', $1, 'Node.js and API development'),
          ('DevOps', $1, 'Cloud infrastructure and CI/CD'),
          ('QA', $1, 'Quality assurance and testing')
        `, [engDept[0].id]);
      }
    }

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
    
    // ─── SHADOW GRAPH SYNCHRONIZATION ───────────────────────────────────────
    console.log('🔄 Synchronizing Organizational Shadow Graph...');
    
    // 1. Sync Departments
    const { rows: depts } = await pool.query('SELECT * FROM departments');
    for (const dept of depts) {
      const { rows: existing } = await pool.query(
        'SELECT id FROM org_nodes WHERE entity_type = $1 AND entity_id = $2',
        ['department', dept.id]
      );
      if (existing.length === 0) {
        const nodeRes = await pool.query(
          'INSERT INTO org_nodes (entity_type, entity_id, name, category) VALUES ($1, $2, $3, $4) RETURNING id',
          ['department', dept.id, dept.name, 'core']
        );
        await pool.query(
          'INSERT INTO org_governance (node_id, owner_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [nodeRes.rows[0].id, dept.manager_id || null]
        );
      }
    }

    // 2. Sync Teams
    const { rows: teams } = await pool.query('SELECT * FROM teams');
    for (const team of teams) {
      const { rows: existing } = await pool.query(
        'SELECT id FROM org_nodes WHERE entity_type = $1 AND entity_id = $2',
        ['team', team.id]
      );
      if (existing.length === 0) {
        const { rows: parentNode } = await pool.query(
          'SELECT id FROM org_nodes WHERE entity_type = $1 AND entity_id = $2',
          ['department', team.department_id]
        );
        const nodeRes = await pool.query(
          'INSERT INTO org_nodes (entity_type, entity_id, parent_node_id, name, category) VALUES ($1, $2, $3, $4, $5) RETURNING id',
          ['team', team.id, parentNode[0]?.id || null, team.name, 'core']
        );
        await pool.query(
          'INSERT INTO org_governance (node_id, owner_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [nodeRes.rows[0].id, team.manager_id || null]
        );
      }
    }

    console.log('✅ Admin credentials and analytics seed data synced.');
  } catch (err) {
    console.error('❌ Error initializing database schema:', err);
  }
};

