import { query } from './connection';

/**
 * Creates all tables defined in docs/11_database_schema_requirements.md
 * Tables: users, departments, profiles, attendance, leave_types,
 *         leave_requests, payroll, performance_appraisals, assets, audit_logs
 *
 * Safe to run multiple times (IF NOT EXISTS).
 */
export async function initializeDatabase(): Promise<void> {
    console.log('🔧 Initializing database schema...');

    // Enable UUID generation
    await query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);

    // ── 1. users ──────────────────────────────────────────────
    await query(`
        CREATE TABLE IF NOT EXISTS users (
            id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            email           VARCHAR(255) UNIQUE NOT NULL,
            password_hash   VARCHAR(255) NOT NULL,
            role            VARCHAR(20) NOT NULL CHECK (role IN ('admin','hr','manager','employee')),
            status          VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','terminated')),
            deleted_at      TIMESTAMP,
            created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
        );
    `);

    // ── 2. departments ────────────────────────────────────────
    await query(`
        CREATE TABLE IF NOT EXISTS departments (
            id      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            name    VARCHAR(100) UNIQUE NOT NULL,
            head_id UUID REFERENCES users(id),
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
    `);

    // ── 3. profiles ───────────────────────────────────────────
    await query(`
        CREATE TABLE IF NOT EXISTS profiles (
            id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            employee_id     VARCHAR(50) UNIQUE NOT NULL,
            dept_id         UUID REFERENCES departments(id),
            manager_id      UUID REFERENCES users(id),
            joining_date    DATE NOT NULL,
            designation     VARCHAR(100) NOT NULL,
            compensation    JSONB,
            deleted_at      TIMESTAMP,
            created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
        );
    `);

    // ── 4. attendance ─────────────────────────────────────────
    await query(`
        CREATE TABLE IF NOT EXISTS attendance (
            id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            check_in    TIMESTAMP NOT NULL,
            check_out   TIMESTAMP,
            ip_address  VARCHAR(45),
            status      VARCHAR(20) DEFAULT 'present' CHECK (status IN ('present','half_day','on_duty')),
            created_at  TIMESTAMP NOT NULL DEFAULT NOW()
        );
    `);

    // ── 5. leave_types ────────────────────────────────────────
    await query(`
        CREATE TABLE IF NOT EXISTS leave_types (
            id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            name            VARCHAR(100) NOT NULL,
            annual_quota    INTEGER NOT NULL,
            created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
        );
    `);

    // ── 6. leave_requests ─────────────────────────────────────
    await query(`
        CREATE TABLE IF NOT EXISTS leave_requests (
            id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            leave_type_id   UUID NOT NULL REFERENCES leave_types(id),
            start_date      DATE NOT NULL,
            end_date        DATE NOT NULL,
            reason          TEXT,
            status          VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
            approved_by     UUID REFERENCES users(id),
            created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
        );
    `);

    // ── 7. payroll ────────────────────────────────────────────
    await query(`
        CREATE TABLE IF NOT EXISTS payroll (
            id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            month           INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
            year            INTEGER NOT NULL,
            base_salary     NUMERIC(12,2) NOT NULL,
            tax_deduction   NUMERIC(12,2) NOT NULL,
            net_payable     NUMERIC(12,2) NOT NULL,
            status          VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft','processed','paid')),
            created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at      TIMESTAMP NOT NULL DEFAULT NOW(),
            UNIQUE(user_id, month, year)
        );
    `);

    // ── 8. performance_appraisals ─────────────────────────────
    await query(`
        CREATE TABLE IF NOT EXISTS performance_appraisals (
            id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            cycle_id        VARCHAR(50) NOT NULL,
            self_rating     INTEGER CHECK (self_rating BETWEEN 1 AND 5),
            manager_rating  INTEGER CHECK (manager_rating BETWEEN 1 AND 5),
            final_score     NUMERIC(3,2),
            created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
        );
    `);

    // ── 9. assets ─────────────────────────────────────────────
    await query(`
        CREATE TABLE IF NOT EXISTS assets (
            id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            name        VARCHAR(255) NOT NULL,
            serial_no   VARCHAR(100) UNIQUE,
            assigned_to UUID REFERENCES users(id),
            created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at  TIMESTAMP NOT NULL DEFAULT NOW()
        );
    `);

    // ── 10. audit_logs ────────────────────────────────────────
    await query(`
        CREATE TABLE IF NOT EXISTS audit_logs (
            id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            table_name  VARCHAR(50) NOT NULL,
            record_id   UUID NOT NULL,
            field       VARCHAR(100) NOT NULL,
            old_value   TEXT,
            new_value   TEXT,
            changed_by  UUID REFERENCES users(id),
            changed_at  TIMESTAMP NOT NULL DEFAULT NOW()
        );
    `);

    // ── 11. regularization_requests ───────────────────────────
    await query(`
        CREATE TABLE IF NOT EXISTS regularization_requests (
            id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            date            DATE NOT NULL,
            check_in_time   TIME NOT NULL,
            check_out_time  TIME,
            reason          TEXT NOT NULL,
            status          VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
            approved_by     UUID REFERENCES users(id),
            created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
        );
    `);

    // ── 12. timesheets ────────────────────────────────────────
    await query(`
        CREATE TABLE IF NOT EXISTS timesheets (
            id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            week_start      DATE NOT NULL,
            week_end        DATE NOT NULL,
            status          VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','approved','rejected')),
            total_hours     NUMERIC(6,2) NOT NULL DEFAULT 0,
            approved_by     UUID REFERENCES users(id),
            remarks         TEXT,
            created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at      TIMESTAMP NOT NULL DEFAULT NOW(),
            UNIQUE(user_id, week_start)
        );
    `);

    // ── 13. timesheet_entries ─────────────────────────────────
    await query(`
        CREATE TABLE IF NOT EXISTS timesheet_entries (
            id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            timesheet_id    UUID NOT NULL REFERENCES timesheets(id) ON DELETE CASCADE,
            project_name    VARCHAR(255) NOT NULL,
            task_desc       TEXT,
            mon_hours       NUMERIC(4,2) NOT NULL DEFAULT 0,
            tue_hours       NUMERIC(4,2) NOT NULL DEFAULT 0,
            wed_hours       NUMERIC(4,2) NOT NULL DEFAULT 0,
            thu_hours       NUMERIC(4,2) NOT NULL DEFAULT 0,
            fri_hours       NUMERIC(4,2) NOT NULL DEFAULT 0,
            sat_hours       NUMERIC(4,2) NOT NULL DEFAULT 0,
            sun_hours       NUMERIC(4,2) NOT NULL DEFAULT 0,
            created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
        );
    `);

    // ── Indexes (from doc: Performance & Security) ────────────
    await query(`CREATE INDEX IF NOT EXISTS idx_users_email         ON users(email);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_profiles_employee_id ON profiles(employee_id);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_attendance_user_id   ON attendance(user_id);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_attendance_check_in  ON attendance(check_in);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_leave_requests_user  ON leave_requests(user_id);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_payroll_user         ON payroll(user_id);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_profiles_dept        ON profiles(dept_id);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_audit_record         ON audit_logs(table_name, record_id);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_regularization_user   ON regularization_requests(user_id);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_timesheets_user        ON timesheets(user_id);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_timesheets_week        ON timesheets(week_start);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_timesheet_entries_ts   ON timesheet_entries(timesheet_id);`);

    console.log('✅ Database schema initialized successfully.');
}
