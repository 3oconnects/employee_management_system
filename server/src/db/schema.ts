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
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `);

        // Profiles / Employees table (Narendhar's work)
        await query(`
            CREATE TABLE IF NOT EXISTS employees (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                position TEXT,
                department TEXT,
                join_date TIMESTAMP,
                email TEXT UNIQUE
            );
        `);

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

        // Seed Admin User if not exists
        const { rows: userCount } = await query('SELECT COUNT(*) FROM users');
        if (parseInt(userCount[0].count) === 0) {
            const hashedPassword = await bcrypt.hash('password', 10);
            await query(`
                INSERT INTO users (name, email, password, role)
                VALUES ('Admin User', 'admin@example.com', $1, 'admin')
            `, [hashedPassword]);
            
            await query(`
                INSERT INTO employees (id, name, department, position, join_date, email)
                VALUES ('EMP001', 'Admin User', 'Management', 'Administrator', NOW(), 'admin@example.com')
            `);
            console.log('✅ Admin user seeded: admin@example.com / password');
        }

        console.log('✅ Database schema initialized successfully.');
    } catch (err) {
        console.error('❌ Database initialization failed:', err);
        throw err;
    }
};
