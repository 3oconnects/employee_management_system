-- ============================================================================
-- EMS — B0-01 LIVE SCHEMA DIAGNOSTICS (read-only, aggregate-only)
-- ============================================================================
-- Run by the database owner with a READ-ONLY role (see README.md):
--   psql "$PROD_DB_URL_READONLY" -X -f diagnostics.sql -o diagnostics_output.txt
--
-- Guarantees:
--   * Runs inside BEGIN READ ONLY ... ROLLBACK. Nothing is written.
--   * Returns structure and aggregate counts only. No row-level data, names,
--     emails or identifiers of people. Tenant IDs are bucketed, never listed.
--   * Survives schema drift: each targeted check first tests that its table and
--     columns exist and reports 'n/a (missing)' instead of failing.
--   * Safe to re-run.
-- ============================================================================

\set ON_ERROR_STOP on
\pset pager off
\pset footer off

BEGIN READ ONLY;
SET LOCAL statement_timeout = '120s';
SET LOCAL lock_timeout = '5s';

\qecho '=== 0. RUN CONTEXT ==='
SELECT now() AS run_at, current_setting('TimeZone') AS db_timezone, version() AS server_version;

-- ----------------------------------------------------------------------------
-- 1. STRUCTURAL INVENTORY
-- ----------------------------------------------------------------------------
\qecho '=== 1.1 NON-SYSTEM SCHEMAS (decide which to pass to pg_dump --schema) ==='
SELECT n.nspname AS schema_name,
       count(c.oid) FILTER (WHERE c.relkind IN ('r','p')) AS tables,
       count(c.oid) FILTER (WHERE c.relkind = 'v') AS views
FROM pg_namespace n
LEFT JOIN pg_class c ON c.relnamespace = n.oid
WHERE n.nspname NOT IN ('pg_catalog','information_schema','pg_toast')
  AND n.nspname NOT LIKE 'pg_temp%' AND n.nspname NOT LIKE 'pg_toast_temp%'
GROUP BY n.nspname ORDER BY n.nspname;

\qecho '=== 1.2 TABLES + EXACT ROW COUNTS (public) ==='
SELECT t.table_name,
       (xpath('/row/c/text()', query_to_xml(format('SELECT count(*) AS c FROM %I.%I', t.table_schema, t.table_name), false, true, '')))[1]::text::bigint AS row_count,
       c.relrowsecurity AS rls_enabled
FROM information_schema.tables t
JOIN pg_class c ON c.relname = t.table_name AND c.relnamespace = 'public'::regnamespace
WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
ORDER BY t.table_name;

\qecho '=== 1.3 COLUMNS (public) ==='
SELECT table_name, ordinal_position AS pos, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;

\qecho '=== 1.4 CONSTRAINTS: PK / UNIQUE / CHECK / FK / EXCLUDE (public) ==='
SELECT cl.relname AS table_name, co.conname AS constraint_name,
       CASE co.contype WHEN 'p' THEN 'PRIMARY KEY' WHEN 'u' THEN 'UNIQUE' WHEN 'c' THEN 'CHECK'
                       WHEN 'f' THEN 'FOREIGN KEY' WHEN 'x' THEN 'EXCLUDE' ELSE co.contype::text END AS kind,
       co.convalidated AS validated,
       pg_get_constraintdef(co.oid) AS definition
FROM pg_constraint co
JOIN pg_class cl ON cl.oid = co.conrelid
WHERE cl.relnamespace = 'public'::regnamespace
ORDER BY cl.relname, kind, co.conname;

\qecho '=== 1.5 INDEXES (public) ==='
SELECT tablename AS table_name, indexname, indexdef
FROM pg_indexes WHERE schemaname = 'public'
ORDER BY tablename, indexname;

\qecho '=== 1.6 TRIGGERS (public, non-internal) ==='
SELECT c.relname AS table_name, t.tgname AS trigger_name, p.proname AS function_name,
       t.tgenabled AS enabled
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_proc p ON p.oid = t.tgfoid
WHERE NOT t.tgisinternal AND c.relnamespace = 'public'::regnamespace
ORDER BY c.relname, t.tgname;

\qecho '=== 1.7 FUNCTIONS / PROCEDURES (public) ==='
SELECT p.proname AS name, pg_get_function_identity_arguments(p.oid) AS args,
       CASE p.prokind WHEN 'f' THEN 'function' WHEN 'p' THEN 'procedure' WHEN 'a' THEN 'aggregate' WHEN 'w' THEN 'window' END AS kind,
       l.lanname AS language
FROM pg_proc p JOIN pg_language l ON l.oid = p.prolang
WHERE p.pronamespace = 'public'::regnamespace
ORDER BY p.proname;

\qecho '=== 1.8 ENUMS / DOMAINS / COMPOSITE TYPES (public) ==='
SELECT t.typname AS type_name,
       CASE t.typtype WHEN 'e' THEN 'enum' WHEN 'd' THEN 'domain' WHEN 'c' THEN 'composite' ELSE t.typtype::text END AS kind,
       (SELECT string_agg(e.enumlabel, ', ' ORDER BY e.enumsortorder) FROM pg_enum e WHERE e.enumtypid = t.oid) AS enum_labels
FROM pg_type t
WHERE t.typnamespace = 'public'::regnamespace
  AND (t.typtype IN ('e','d') OR (t.typtype = 'c' AND NOT EXISTS (SELECT 1 FROM pg_class c WHERE c.reltype = t.oid AND c.relkind <> 'c')))
ORDER BY t.typname;

\qecho '=== 1.9 RLS POLICIES (all schemas) ==='
SELECT schemaname, tablename, policyname, permissive, roles::text, cmd
FROM pg_policies ORDER BY schemaname, tablename, policyname;

\qecho '=== 1.10 EXTENSIONS ==='
SELECT extname, extversion, n.nspname AS installed_in
FROM pg_extension x JOIN pg_namespace n ON n.oid = x.extnamespace ORDER BY extname;

\qecho '=== 1.11 SEQUENCES (public) ==='
SELECT sequence_name, data_type FROM information_schema.sequences
WHERE sequence_schema = 'public' ORDER BY sequence_name;

-- ----------------------------------------------------------------------------
-- 2. TARGETED DIAGNOSTICS (baseline §0.2–0.5, A1-3, A2-9, H1, H5)
-- ----------------------------------------------------------------------------
-- Pattern: CASE WHEN <table/columns exist> THEN <scalar from query_to_xml>
--          ELSE 'n/a (missing)' END. query_to_xml only runs the chosen branch.
\qecho '=== 2.1 COLUMN / CONSTRAINT EXISTENCE (drift checks, baseline §0.2) ==='
WITH want(tbl, col) AS (VALUES
    ('payroll_entries','payroll_run_id'), ('payroll_entries','tenant_id'),
    ('payroll_history','name'), ('payroll_history','status'), ('payroll_history','tenant_id'),
    ('payroll_runs','tenant_id'), ('payroll_runs','status'),
    ('leave_requests','employee_id'), ('leave_requests','user_id'), ('leave_requests','type'), ('leave_requests','leave_type_id'),
    ('attendance','employee_id'), ('attendance','check_in_time'), ('attendance','user_id'), ('attendance','check_in'),
    ('employees','manager_id'), ('employees','reporting_manager_id'), ('employees','user_id'), ('employees','status'),
    ('users','phone'), ('users','address'), ('users','emergency'), ('users','avatar_url'),
    ('users','temp_password'), ('users','is_password_temp'), ('users','refresh_token'),
    ('tenants','is_active')
)
SELECT w.tbl AS table_name, w.col AS column_name,
       EXISTS (SELECT 1 FROM information_schema.columns c
               WHERE c.table_schema = 'public' AND c.table_name = w.tbl AND c.column_name = w.col) AS exists_live
FROM want w ORDER BY 1, 2;

SELECT 'payroll_history UNIQUE(employee_id,month,year,tenant_id)' AS check_name,
       EXISTS (
         SELECT 1 FROM pg_index i
         JOIN pg_class c ON c.oid = i.indrelid AND c.relname = 'payroll_history' AND c.relnamespace = 'public'::regnamespace
         WHERE i.indisunique
           AND (SELECT array_agg(a.attname::text ORDER BY a.attname)
                FROM pg_attribute a WHERE a.attrelid = c.oid AND a.attnum = ANY (i.indkey))
               = ARRAY['employee_id','month','tenant_id','year']
       ) AS exists_live;

\qecho '=== 2.2 TARGETED COUNTS ==='
WITH cols AS (
    SELECT table_name AS t, column_name AS c FROM information_schema.columns WHERE table_schema = 'public'
),
checks(id, label, needs, sql) AS (VALUES
  -- Payroll (§0.2, A2-3)
  ('P1','payroll_runs: periods with >1 run (tenant,year,month)', ARRAY['payroll_runs.tenant_id','payroll_runs.year','payroll_runs.month'],
   'SELECT count(*) AS c FROM (SELECT 1 FROM public.payroll_runs GROUP BY tenant_id, year, month HAVING count(*) > 1) d'),
  ('P2','payroll_runs: max runs in a single period', ARRAY['payroll_runs.tenant_id','payroll_runs.year','payroll_runs.month'],
   'SELECT coalesce(max(n),0) AS c FROM (SELECT count(*) n FROM public.payroll_runs GROUP BY tenant_id, year, month) d'),
  ('P3','payroll_history: rows by status', ARRAY['payroll_history.status'],
   'SELECT string_agg(k || ''='' || n, ''; '' ORDER BY k) AS c FROM (SELECT coalesce(status,''NULL'') k, count(*) n FROM public.payroll_history GROUP BY 1) s'),
  -- Leave (A1-3, A2-9)
  ('L1','leave_requests: employee_id IS NULL', ARRAY['leave_requests.employee_id'],
   'SELECT count(*) AS c FROM public.leave_requests WHERE employee_id IS NULL'),
  ('L2','leave_requests: user_id IS NULL', ARRAY['leave_requests.user_id'],
   'SELECT count(*) AS c FROM public.leave_requests WHERE user_id IS NULL'),
  ('L3','leave_requests: legacy "type" populated', ARRAY['leave_requests.type'],
   'SELECT count(*) AS c FROM public.leave_requests WHERE type IS NOT NULL'),
  ('L4','leave_requests: leave_type_id populated', ARRAY['leave_requests.leave_type_id'],
   'SELECT count(*) AS c FROM public.leave_requests WHERE leave_type_id IS NOT NULL'),
  ('L5','leave_requests: rows by status', ARRAY['leave_requests.status'],
   'SELECT string_agg(k || ''='' || n, ''; '' ORDER BY k) AS c FROM (SELECT coalesce(status,''NULL'') k, count(*) n FROM public.leave_requests GROUP BY 1) s'),
  ('L6','leave_requests: employee_id NULL but user_id maps to exactly one employee (backfillable)', ARRAY['leave_requests.employee_id','leave_requests.user_id','employees.user_id'],
   'SELECT count(*) AS c FROM public.leave_requests lr WHERE lr.employee_id IS NULL AND (SELECT count(*) FROM public.employees e WHERE e.user_id = lr.user_id) = 1'),
  -- Employees (W-1)
  ('E1','employees: rows by status', ARRAY['employees.status'],
   'SELECT string_agg(k || ''='' || n, ''; '' ORDER BY k) AS c FROM (SELECT coalesce(status,''NULL'') k, count(*) n FROM public.employees GROUP BY 1) s'),
  ('E2','employees: deleted_at IS NOT NULL', ARRAY['employees.deleted_at'],
   'SELECT count(*) AS c FROM public.employees WHERE deleted_at IS NOT NULL'),
  ('E3','employees: user_id IS NULL', ARRAY['employees.user_id'],
   'SELECT count(*) AS c FROM public.employees WHERE user_id IS NULL'),
  -- Managers (§0.4, W-3). reporting_manager_id holds users.id; translate via employees.user_id.
  ('M1','managers: category counts', ARRAY['employees.manager_id','employees.reporting_manager_id','employees.user_id'],
   'SELECT string_agg(k || ''='' || n, ''; '' ORDER BY k) AS c FROM (
      SELECT CASE
        WHEN e.manager_id IS NULL AND e.reporting_manager_id IS NULL THEN ''neither_set''
        WHEN e.reporting_manager_id IS NULL THEN ''only_manager_id''
        WHEN tr.emp_id IS NULL AND tr.matches = 0 THEN ''reporting_untranslatable''
        WHEN tr.matches > 1 THEN ''reporting_ambiguous''
        WHEN e.manager_id IS NULL THEN ''only_reporting_manager_id''
        WHEN e.manager_id::text = tr.emp_id::text THEN ''both_agree''
        ELSE ''both_disagree'' END k, count(*) n
      FROM public.employees e
      LEFT JOIN LATERAL (SELECT min(x.id::text) emp_id, count(*) matches FROM public.employees x
                         WHERE x.user_id::text = e.reporting_manager_id::text) tr ON true
      GROUP BY 1) s'),
  ('M2','managers: self-reference (either column)', ARRAY['employees.manager_id','employees.reporting_manager_id','employees.user_id'],
   'SELECT count(*) AS c FROM public.employees e WHERE e.manager_id::text = e.id::text OR e.reporting_manager_id::text = e.user_id::text'),
  ('M3','managers: 2-cycles via manager_id (A→B→A)', ARRAY['employees.manager_id'],
   'SELECT count(*) / 2 AS c FROM public.employees a JOIN public.employees b ON a.manager_id::text = b.id::text AND b.manager_id::text = a.id::text AND a.id <> b.id'),
  -- Attendance (§0.5, A2-5, A2-6)
  ('A1','attendance: rows using employee_id+check_in_time (current)', ARRAY['attendance.employee_id','attendance.check_in_time'],
   'SELECT count(*) AS c FROM public.attendance WHERE employee_id IS NOT NULL AND check_in_time IS NOT NULL'),
  ('A2','attendance: rows using user_id+check_in (legacy)', ARRAY['attendance.user_id','attendance.check_in'],
   'SELECT count(*) AS c FROM public.attendance WHERE user_id IS NOT NULL AND check_in IS NOT NULL'),
  ('A3','attendance: open sessions (check_out_time NULL) older than 24h', ARRAY['attendance.check_in_time','attendance.check_out_time'],
   'SELECT count(*) AS c FROM public.attendance WHERE check_out_time IS NULL AND check_in_time < now() - interval ''24 hours'''),
  ('A4','attendance: employees with >1 open session', ARRAY['attendance.employee_id','attendance.check_out_time'],
   'SELECT count(*) AS c FROM (SELECT employee_id FROM public.attendance WHERE check_out_time IS NULL GROUP BY 1 HAVING count(*) > 1) d'),
  ('A5','attendance: rows by status', ARRAY['attendance.status'],
   'SELECT string_agg(k || ''='' || n, ''; '' ORDER BY k) AS c FROM (SELECT coalesce(status,''NULL'') k, count(*) n FROM public.attendance GROUP BY 1) s'),
  -- Approvals (A2-2, S2)
  ('AP1','approvals: rows by type:status', ARRAY['approvals.type','approvals.status'],
   'SELECT string_agg(k || ''='' || n, ''; '' ORDER BY k) AS c FROM (SELECT coalesce(type,''NULL'') || '':'' || coalesce(status,''NULL'') k, count(*) n FROM public.approvals GROUP BY 1) s'),
  -- Credentials hygiene (H1) — counts only
  ('U1','users: temp_password stored in plaintext (NOT NULL)', ARRAY['users.temp_password'],
   'SELECT count(*) AS c FROM public.users WHERE temp_password IS NOT NULL'),
  ('U2','users: rows by role (legacy users.role)', ARRAY['users.role'],
   'SELECT string_agg(k || ''='' || n, ''; '' ORDER BY k) AS c FROM (SELECT coalesce(role,''NULL'') k, count(*) n FROM public.users GROUP BY 1) s'),
  ('U3','users: is_active=false or deleted_at set', ARRAY['users.is_active','users.deleted_at'],
   'SELECT count(*) AS c FROM public.users WHERE is_active = false OR deleted_at IS NOT NULL'),
  ('R1','roles: count per dashboard_type', ARRAY['roles.dashboard_type'],
   'SELECT string_agg(k || ''='' || n, ''; '' ORDER BY k) AS c FROM (SELECT coalesce(dashboard_type,''NULL'') k, count(*) n FROM public.roles GROUP BY 1) s'),
  ('R2','permissions: distinct module:action vocabulary', ARRAY['permissions.module','permissions.action'],
   'SELECT string_agg(k, '', '' ORDER BY k) AS c FROM (SELECT DISTINCT module || '':'' || action k FROM public.permissions) s')
)
SELECT ch.id, ch.label,
       CASE WHEN (SELECT bool_and(EXISTS (SELECT 1 FROM cols WHERE t = split_part(n, '.', 1) AND c = split_part(n, '.', 2)))
                  FROM unnest(ch.needs) n)
            THEN coalesce((xpath('/row/c/text()', query_to_xml(ch.sql, false, true, '')))[1]::text, '(no rows)')
            ELSE 'n/a (missing: ' || (SELECT string_agg(n, ', ') FROM unnest(ch.needs) n
                                       WHERE NOT EXISTS (SELECT 1 FROM cols WHERE t = split_part(n, '.', 1) AND c = split_part(n, '.', 2))) || ')'
       END AS result
FROM checks ch ORDER BY ch.id;

\qecho '=== 2.3 TENANT_ID DISTRIBUTION (bucketed; real tenant IDs are never listed) ==='
SELECT tbl AS table_name,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns
                         WHERE table_schema = 'public' AND table_name = tbl AND column_name = 'tenant_id')
            THEN coalesce((xpath('/row/c/text()', query_to_xml(format(
                   'SELECT string_agg(k || ''='' || n, ''; '' ORDER BY k) AS c FROM (
                      SELECT CASE WHEN tenant_id IS NULL THEN ''NULL''
                                  WHEN tenant_id::text = '''' THEN ''EMPTY''
                                  WHEN tenant_id::text = ''default'' THEN ''default''
                                  WHEN tenant_id::text = ''tenant_default'' THEN ''tenant_default''
                                  ELSE ''other'' END k, count(*) n
                      FROM public.%I GROUP BY 1) s', tbl), false, true, '')))[1]::text, '(no rows)')
            WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl)
            THEN 'n/a (no tenant_id column)'
            ELSE 'n/a (table missing)' END AS distribution,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns
                         WHERE table_schema = 'public' AND table_name = tbl AND column_name = 'tenant_id')
            THEN (xpath('/row/c/text()', query_to_xml(format(
                   'SELECT count(DISTINCT tenant_id) AS c FROM public.%I WHERE tenant_id IS NOT NULL AND tenant_id::text NOT IN ('''', ''default'', ''tenant_default'')', tbl),
                   false, true, '')))[1]::text
       END AS distinct_other_tenants
FROM unnest(ARRAY['users','employees','attendance','leave_requests','leave_types','timesheets','payroll_profiles',
                  'payroll_runs','payroll_entries','payroll_history','approvals','claims','departments','teams',
                  'roles','audit_logs']) AS tbl
ORDER BY tbl;

ROLLBACK;
\qecho '=== DONE (transaction rolled back; nothing was written) ==='
