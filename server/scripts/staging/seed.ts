import pg from 'pg';
import { seedTenantWithRoles, type SeededUser } from '../../test/setup/seed';
import { STAGING_EMAIL_DOMAIN } from './guard';

// ============================================================================
// Staging seed (Release 0 — B0-05) — SYNTHETIC DATA ONLY
// ============================================================================
// Seeds the identity layer only: tenant, roles/permissions (shared definitions
// with the integration tests), one login per role, a 20-person reporting
// hierarchy, leave types and payroll profiles. Transactional data (attendance,
// leave, approvals) is created through the real API by smoke.ts instead of
// guessing table shapes.
//
// Optional blocks check that their tables/columns exist in the snapshot and
// are reported as APPLIED or SKIPPED (with the reason). Nothing fails silently.
// ============================================================================

export const STAGING_TENANT_ID = 'tenant_default';

type Report = { step: string; status: 'APPLIED' | 'SKIPPED'; detail: string }[];

async function columnsExist(db: pg.Client, table: string, cols: string[]): Promise<string[]> {
    const r = await db.query(
        `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1`,
        [table]
    );
    const have = new Set(r.rows.map((x) => x.column_name));
    return cols.filter((c) => !have.has(c));
}

export async function seedStaging(db: pg.Client, password: string): Promise<{ users: Record<string, SeededUser>; report: Report }> {
    const report: Report = [];
    const users = await seedTenantWithRoles(db, {
        tenantId: STAGING_TENANT_ID,
        password,
        emailDomain: STAGING_EMAIL_DOMAIN,
        bcryptRounds: 10,
    });
    report.push({ step: 'tenant + roles + 6 role logins', status: 'APPLIED', detail: Object.keys(users).join(', ') });

    // ── 20-person hierarchy: manager login manages 8, hr manages 4, rest under admin.
    const departments = ['Engineering', 'Sales', 'Finance', 'Operations'];
    const extra: string[] = [];
    for (let i = 1; i <= 14; i++) {
        const id = `EMP-STG-${String(i).padStart(3, '0')}`;
        await db.query(
            `INSERT INTO employees (id, name, email, tenant_id, status, department, position, join_date)
             VALUES ($1, $2, $3, $4, 'active', $5, 'Associate', NOW() - ($6 || ' days')::interval)
             ON CONFLICT (id) DO NOTHING`,
            [id, `Staging Person ${i}`, `person${i}@${STAGING_EMAIL_DOMAIN}`, STAGING_TENANT_ID, departments[i % 4], String(30 * i)]
        );
        extra.push(id);
    }
    report.push({ step: '14 additional employees (no logins)', status: 'APPLIED', detail: `${extra.length} rows` });

    const managerFor = (i: number) => (i < 8 ? users.manager : i < 12 ? users.hr : users.admin);
    const missingRm = await columnsExist(db, 'employees', ['reporting_manager_id']);
    const missingM = await columnsExist(db, 'employees', ['manager_id']);
    for (let i = 0; i < extra.length; i++) {
        const m = managerFor(i);
        // Both legacy columns are kept consistent: reporting_manager_id = users.id, manager_id = employees.id (baseline §0.4).
        if (!missingRm.length) await db.query('UPDATE employees SET reporting_manager_id = $1 WHERE id = $2', [m.userId, extra[i]]);
        if (!missingM.length) await db.query('UPDATE employees SET manager_id = $1 WHERE id = $2', [m.employeeId, extra[i]]);
    }
    // The employee and custom logins report to the manager login.
    for (const key of ['employee', 'custom']) {
        if (!missingRm.length) await db.query('UPDATE employees SET reporting_manager_id = $1 WHERE id = $2', [users.manager.userId, users[key].employeeId]);
        if (!missingM.length) await db.query('UPDATE employees SET manager_id = $1 WHERE id = $2', [users.manager.employeeId, users[key].employeeId]);
    }
    report.push({
        step: 'reporting hierarchy',
        status: missingRm.length && missingM.length ? 'SKIPPED' : 'APPLIED',
        detail: `reporting_manager_id: ${missingRm.length ? 'column missing' : 'set'}; manager_id: ${missingM.length ? 'column missing' : 'set'}`,
    });

    // ── Leave types
    const missingLt = await columnsExist(db, 'leave_types', ['name', 'annual_quota', 'tenant_id']);
    if (missingLt.length) {
        report.push({ step: 'leave types', status: 'SKIPPED', detail: `missing: ${missingLt.join(', ')}` });
    } else {
        for (const [name, quota] of [['Casual Leave', 12], ['Sick Leave', 10], ['Earned Leave', 15]] as const) {
            await db.query(
                `INSERT INTO leave_types (name, annual_quota, tenant_id)
                 SELECT $1, $2, $3 WHERE NOT EXISTS (SELECT 1 FROM leave_types WHERE name = $1 AND tenant_id = $3)`,
                [name, quota, STAGING_TENANT_ID]
            );
        }
        report.push({ step: 'leave types', status: 'APPLIED', detail: 'Casual 12, Sick 10, Earned 15' });
    }

    // ── Payroll profiles (synthetic round numbers)
    const missingPp = await columnsExist(db, 'payroll_profiles', ['employee_id', 'name', 'annual_ctc', 'basic_salary', 'hra', 'allowances', 'tenant_id']);
    if (missingPp.length) {
        report.push({ step: 'payroll profiles', status: 'SKIPPED', detail: `missing: ${missingPp.join(', ')}` });
    } else {
        const all = [...Object.values(users).map((u) => u.employeeId), ...extra];
        for (let i = 0; i < all.length; i++) {
            const ctc = 600000 + (i % 5) * 150000;
            await db.query(
                `INSERT INTO payroll_profiles (employee_id, name, annual_ctc, basic_salary, hra, allowances, tenant_id)
                 VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (employee_id) DO NOTHING`,
                [all[i], `Staging ${all[i]}`, ctc, Math.round(ctc / 12 * 0.5), Math.round(ctc / 12 * 0.2), Math.round(ctc / 12 * 0.3), STAGING_TENANT_ID]
            );
        }
        report.push({ step: 'payroll profiles', status: 'APPLIED', detail: `${all.length} profiles` });
    }

    return { users, report };
}
