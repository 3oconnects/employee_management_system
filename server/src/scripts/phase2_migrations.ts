// ============================================================================
// PHASE 2 MIGRATION — Payroll History Tenant Isolation Fix
// ============================================================================
//
// Problem:
//   The payroll_history table had a UNIQUE constraint on (employee_id, month, year)
//   only. This means two different tenants whose employee IDs collide (e.g. both
//   have an "EMP001") would overwrite each other's payroll history rows on upsert.
//
// Fix:
//   Drop the old constraint and create a new one that includes tenant_id:
//   UNIQUE (employee_id, month, year, tenant_id)
//
//   The upsertPayrollHistory() repository method has been updated to match
//   this new conflict target.
//
// Safe to run multiple times (idempotent).
//
// Run with:
//   cd server && npx tsx src/scripts/phase2_migrations.ts
//
// ============================================================================

import { directPool as pool } from '../config/db';

export const runPhase2Migrations = async () => {
    console.log('🔧 Running Phase 2 migrations...');

    // ── 1. Ensure tenant_id column exists on payroll_history ─────────────────
    // (Should already exist from initDb additive migrations, but guard anyway)
    await pool.query(`
        ALTER TABLE payroll_history
        ADD COLUMN IF NOT EXISTS tenant_id TEXT DEFAULT 'tenant_default'
    `).catch((err) => {
        if (!err.message.includes('already exists')) throw err;
    });
    console.log('  ✅ payroll_history.tenant_id column ensured.');

    // ── 2. Ensure status column exists on payroll_history ────────────────────
    await pool.query(`
        ALTER TABLE payroll_history
        ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'paid'
    `).catch((err) => {
        if (!err.message.includes('already exists')) throw err;
    });
    console.log('  ✅ payroll_history.status column ensured.');

    // ── 3. Drop old unique constraint (employee_id, month, year) if it exists ─
    //
    //    FIX (Phase 2 verification): The original block used DECLARE inside a
    //    BEGIN…END body, which is invalid PL/pgSQL syntax. DECLARE must appear
    //    at the top of the anonymous block, before BEGIN.
    //
    //    We use a named dollar-quote tag ($drop_old_uc$) to avoid any tooling
    //    issues with bare $$ delimiters.
    //
    //    Idempotent: silently no-ops when the constraint is already gone.
    //
    const dropOldConstraintSql = [
        'DO $drop_old_uc$',
        'DECLARE',
        '    v_conname TEXT;',
        'BEGIN',
        '    -- Find any 3-column unique constraint on payroll_history.',
        '    -- The old constraint was UNIQUE (employee_id, month, year) only.',
        '    SELECT c.conname INTO v_conname',
        '    FROM pg_constraint c',
        '    JOIN pg_class t ON t.oid = c.conrelid',
        "    WHERE t.relname = 'payroll_history'",
        "      AND c.contype = 'u'",
        '      AND array_length(c.conkey, 1) = 3',
        '    LIMIT 1;',
        '',
        '    IF v_conname IS NOT NULL THEN',
        "        EXECUTE 'ALTER TABLE payroll_history DROP CONSTRAINT ' || quote_ident(v_conname);",
        "        RAISE NOTICE 'Dropped old 3-col constraint: %', v_conname;",
        '    ELSE',
        "        RAISE NOTICE 'No 3-column unique constraint on payroll_history -- already clean.';",
        '    END IF;',
        'END $drop_old_uc$;',
    ].join('\n');

    await pool.query(dropOldConstraintSql).catch((err) => {
        // Log but don't fail — old constraint may not exist at all
        console.warn('  ⚠️  Old constraint removal (non-fatal):', err.message?.slice(0, 120));
    });
    console.log('  ✅ Old 3-column unique constraint removed (if existed).');

    // ── 4. Create the new 4-column unique constraint ──────────────────────────
    //
    //    Uses a named dollar-quote tag to avoid tooling collisions.
    //    Idempotent: skips silently if the constraint already exists.
    //
    const addNewConstraintSql = [
        'DO $add_new_uc$',
        'BEGIN',
        '    IF NOT EXISTS (',
        '        SELECT 1 FROM pg_constraint',
        "        WHERE conrelid = 'payroll_history'::regclass",
        "          AND conname  = 'payroll_history_emp_month_year_tenant_key'",
        '    ) THEN',
        '        ALTER TABLE payroll_history',
        '        ADD CONSTRAINT payroll_history_emp_month_year_tenant_key',
        '        UNIQUE (employee_id, month, year, tenant_id);',
        "        RAISE NOTICE 'Created constraint payroll_history_emp_month_year_tenant_key';",
        '    ELSE',
        "        RAISE NOTICE 'Constraint payroll_history_emp_month_year_tenant_key already exists -- skipped';",
        '    END IF;',
        'END $add_new_uc$;',
    ].join('\n');

    await pool.query(addNewConstraintSql);
    console.log('  ✅ New UNIQUE (employee_id, month, year, tenant_id) constraint ensured.');

    // ── 5. Backfill NULL tenant_id rows ──────────────────────────────────────
    const { rowCount } = await pool.query(`
        UPDATE payroll_history
        SET tenant_id = 'tenant_default'
        WHERE tenant_id IS NULL OR tenant_id = ''
    `);
    console.log(`  ✅ Backfilled ${rowCount} payroll_history rows with default tenant_id.`);

    console.log('🚀 Phase 2 migrations complete.');
};

// ─── Execute when run directly ──────────────────────────────────────────────
runPhase2Migrations()
    .then(() => {
        console.log('🏁 Done.');
        process.exit(0);
    })
    .catch((err) => {
        console.error('❌ Phase 2 migration failed:', err);
        process.exit(1);
    });
