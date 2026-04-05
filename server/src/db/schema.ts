import bcrypt from 'bcryptjs';
import { query } from './connection';

export const initializeDatabase = async () => {
    try {
        console.log('Initializing database schema...');

        // Users table (Common to all)
        await query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'employee',
                phone TEXT,
                address TEXT,
                emergency TEXT,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `);

        // Add profile columns if they don't exist (migration safety)
        await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT`).catch(() => {});
        await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT`).catch(() => {});
        await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS emergency TEXT`).catch(() => {});

        // Profiles / Employees table (Narendhar's work)
        await query(`
            CREATE TABLE IF NOT EXISTS employees (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                position TEXT,
                department TEXT,
                join_date TIMESTAMP,
                email TEXT UNIQUE,
                status TEXT DEFAULT 'active'
            );
        `);
        // Migration safety for existing tabes
        await query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active'`).catch(() => {});

        await query(`
            CREATE TABLE IF NOT EXISTS payroll_profiles (
                employee_id TEXT PRIMARY KEY REFERENCES employees(id),
                name TEXT,
                department TEXT,
                role TEXT,
                annual_ctc NUMERIC,
                bank_account TEXT,
                tax_regime TEXT,
                basic_salary NUMERIC,
                hra NUMERIC,
                allowances NUMERIC,
                bonus NUMERIC,
                overtime NUMERIC
            );
        `);

        // Attendance & Leave (Adithyan's work)
        await query(`
            CREATE TABLE IF NOT EXISTS attendance (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id),
                check_in TIMESTAMP NOT NULL,
                check_out TIMESTAMP,
                ip_address TEXT,
                status TEXT DEFAULT 'present',
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);

        await query(`
            CREATE TABLE IF NOT EXISTS leave_types (
                id SERIAL PRIMARY KEY,
                name TEXT UNIQUE NOT NULL,
                annual_quota INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `);

        await query(`
            CREATE TABLE IF NOT EXISTS leave_requests (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id),
                leave_type_id INTEGER NOT NULL REFERENCES leave_types(id),
                start_date DATE NOT NULL,
                end_date DATE NOT NULL,
                reason TEXT,
                status TEXT DEFAULT 'pending',
                approved_by INTEGER REFERENCES users(id),
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `);

        // Timesheets (Adithyan's work)
        await query(`
            CREATE TABLE IF NOT EXISTS timesheets (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id),
                week_start DATE NOT NULL,
                week_end DATE NOT NULL,
                total_hours NUMERIC(5,2) DEFAULT 0,
                status TEXT DEFAULT 'draft',
                approved_by INTEGER REFERENCES users(id),
                remarks TEXT,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `);

        await query(`
            CREATE TABLE IF NOT EXISTS timesheet_entries (
                id SERIAL PRIMARY KEY,
                timesheet_id INTEGER REFERENCES timesheets(id) ON DELETE CASCADE,
                project_name TEXT NOT NULL,
                task_desc TEXT,
                mon_hours NUMERIC(4,2) DEFAULT 0,
                tue_hours NUMERIC(4,2) DEFAULT 0,
                wed_hours NUMERIC(4,2) DEFAULT 0,
                thu_hours NUMERIC(4,2) DEFAULT 0,
                fri_hours NUMERIC(4,2) DEFAULT 0,
                sat_hours NUMERIC(4,2) DEFAULT 0,
                sun_hours NUMERIC(4,2) DEFAULT 0,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);

        // Regularization (Adithyan)
        await query(`
            CREATE TABLE IF NOT EXISTS regularization_requests (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                date DATE NOT NULL,
                check_in_time TIME NOT NULL,
                check_out_time TIME,
                reason TEXT NOT NULL,
                status TEXT DEFAULT 'pending',
                approved_by INTEGER REFERENCES users(id),
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `);

        // Payroll & Approvals (Narendhar)
        await query(`
            CREATE TABLE IF NOT EXISTS payroll_runs (
                id TEXT PRIMARY KEY,
                month TEXT,
                year TEXT,
                processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await query(`
            CREATE TABLE IF NOT EXISTS payroll_entries (
                id SERIAL PRIMARY KEY,
                payroll_run_id TEXT REFERENCES payroll_runs(id),
                employee_id TEXT REFERENCES employees(id),
                month TEXT,
                year TEXT,
                gross_salary NUMERIC,
                pf_employee NUMERIC,
                esi_employee NUMERIC,
                professional_tax NUMERIC,
                tds NUMERIC,
                total_deductions NUMERIC,
                net_salary NUMERIC,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);

        await query(`
            CREATE TABLE IF NOT EXISTS payroll_history (
                id SERIAL PRIMARY KEY,
                employee_id TEXT REFERENCES employees(id),
                name TEXT,
                month TEXT,
                year TEXT,
                net_salary NUMERIC,
                status TEXT DEFAULT 'paid',
                created_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(employee_id, month, year)
            );
        `);

        await query(`
            CREATE TABLE IF NOT EXISTS approvals (
                id TEXT PRIMARY KEY,
                employee_id TEXT REFERENCES employees(id),
                type TEXT,
                status TEXT DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await query(`
            CREATE TABLE IF NOT EXISTS claims (
                id TEXT PRIMARY KEY,
                employee_id TEXT REFERENCES employees(id),
                amount NUMERIC,
                category TEXT,
                description TEXT,
                status TEXT DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await query(`
            CREATE TABLE IF NOT EXISTS reimbursement_claims (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                employee_id TEXT,
                amount NUMERIC DEFAULT 0,
                category TEXT,
                description TEXT,
                status TEXT DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Seed Admin User if not exists
        const { rows: userCount } = await query('SELECT COUNT(*) FROM users');
        if (parseInt(userCount[0].count) === 0) {
            const hashedPassword = await bcrypt.hash('password', 10);
            await query(`
                INSERT INTO users (name, email, password, role)
                VALUES ('Admin User', 'admin@example.com', $1, 'admin')
            `, [hashedPassword]);
            
            await query(`
                INSERT INTO employees (id, name, department, position, join_date, email, status)
                VALUES ('EMP001', 'Admin User', 'Management', 'Administrator', NOW(), 'admin@example.com', 'active')
            `);
            console.log('✅ Admin user seeded: admin@example.com / password');
        }

        // Seed Leave Types
        const { rows: leaveTypesCount } = await query('SELECT COUNT(*) FROM leave_types');
        if (parseInt(leaveTypesCount[0].count) === 0) {
            await query(`
                INSERT INTO leave_types (name, annual_quota) VALUES 
                ('Casual Leave', 12),
                ('Sick Leave', 10),
                ('Earned Leave', 15)
            `);
            console.log('✅ Leave types seeded.');
        }

        // Seed Presentation Dummy Data
        const { rows: demoCheck } = await query("SELECT COUNT(*) FROM employees WHERE id = 'EMP999'");
        if (parseInt(demoCheck[0].count) === 0) {
            console.log('Seeding dummy presentation data...');
            const hashedPassword = await bcrypt.hash('password', 10);
            
            // 1. Users & Employees
            await query(`
                INSERT INTO users (name, email, password, role) VALUES 
                ('Sarah Jenkins', 'sarah@example.com', $1, 'manager'),
                ('Michael Chen', 'michael@example.com', $1, 'employee')
                ON CONFLICT (email) DO NOTHING
            `, [hashedPassword]);

            const sarahRes = await query("SELECT id FROM users WHERE email = 'sarah@example.com'");
            const michaelRes = await query("SELECT id FROM users WHERE email = 'michael@example.com'");
            const sarahId = sarahRes.rows[0]?.id;
            const michaelId = michaelRes.rows[0]?.id;

            await query(`
                INSERT INTO employees (id, name, department, position, join_date, email, status) VALUES 
                ('EMP999', 'Sarah Jenkins', 'Engineering', 'Lead Engineer', '2023-01-15', 'sarah@example.com', 'active'),
                ('EMP998', 'Michael Chen', 'Design', 'UI/UX Designer', '2024-02-01', 'michael@example.com', 'active'),
                ('EMP997', 'Jessica Wong', 'Marketing', 'Candidate', '2026-04-01', 'jessica@example.com', 'onboarding')
                ON CONFLICT DO NOTHING
            `);

            await query(`
                INSERT INTO payroll_profiles (employee_id, name, department, role, annual_ctc, bank_account, tax_regime, basic_salary, hra, allowances, net_salary) VALUES
                ('EMP999', 'Sarah Jenkins', 'Engineering', 'Lead Engineer', 1200000, '1234567890', 'New', 50000, 20000, 30000, 100000),
                ('EMP998', 'Michael Chen', 'Design', 'UI/UX Designer', 800000, '0987654321', 'Old', 33000, 15000, 20000, 68000)
                ON CONFLICT DO NOTHING
            `);

            // 2. Payroll History
            await query(`
                INSERT INTO payroll_history (employee_id, name, month, year, net_salary, status) VALUES 
                ('EMP999', 'Sarah Jenkins', '01', '2026', 100000, 'paid'),
                ('EMP999', 'Sarah Jenkins', '02', '2026', 100000, 'paid'),
                ('EMP998', 'Michael Chen', '01', '2026', 68000, 'paid'),
                ('EMP998', 'Michael Chen', '02', '2026', 68000, 'paid')
                ON CONFLICT DO NOTHING
            `);

            // 3. Timesheets & Entries (Assign to Sarah/Michael if valid IDs exist)
            if (sarahId) {
                const tsRes = await query(`
                    INSERT INTO timesheets (user_id, week_start, week_end, total_hours, status)
                    VALUES ($1, '2026-03-16', '2026-03-22', 40.5, 'submitted') RETURNING id
                `, [sarahId]);
                
                await query(`
                    INSERT INTO timesheet_entries (timesheet_id, project_name, task_desc, mon_hours, tue_hours, wed_hours, thu_hours, fri_hours)
                    VALUES ($1, 'Project Alpha', 'Frontend Development', 8, 8, 8.5, 8, 8)
                `, [tsRes.rows[0].id]);
                
                // 4. Leave Request
                const ltRes = await query("SELECT id FROM leave_types WHERE name = 'Sick Leave' LIMIT 1");
                if (ltRes.rows[0]) {
                    await query(`
                        INSERT INTO leave_requests (user_id, leave_type_id, start_date, end_date, reason, status)
                        VALUES ($1, $2, '2026-02-10', '2026-02-12', 'Viral Fever', 'approved')
                    `, [sarahId, ltRes.rows[0].id]);
                }
            }

            console.log('✅ Dummy presentation data seeded.');
        }

        console.log('✅ Database schema initialized successfully.');
    } catch (err) {
        console.error('❌ Database initialization failed:', err);
        throw err;
    }
};
