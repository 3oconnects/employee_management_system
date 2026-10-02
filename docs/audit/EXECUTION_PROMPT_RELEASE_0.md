# Execution Prompt — Release 0 (Safety Net)

> Hand this file to the implementing agent along with `docs/audit/EMS_REMEDIATION_BASELINE.md`.
> Scope: **B0-01 to B0-05 only.** Stop when Release 0's exit criteria are met, or when blocked on a human step.

---

## Role and mission

You are implementing **Release 0 — Safety Net** of the EMS remediation plan. Your job is to create the safety infrastructure that every later fix depends on:

- a trustworthy schema baseline
- verified recovery
- a test harness
- error visibility
- a staging environment

**You must not change application business behavior.** No authorization, validation, data, workflow, UI or API-contract changes. Security and data bugs you notice are **reported, not fixed**. They belong to Releases 1–2.

## Binding rules

1. **Verify before you touch.** For every item, re-open the files the baseline references at current `HEAD`. Record the HEAD SHA. If anything differs from the baseline (`83c1e84`), stop and report the drift before continuing.
2. **Allowed changes in this release:**
   - New files under `server/db/baseline/`, `server/test/`, `server/scripts/staging/`, `docs/runbooks/`
   - `server/src/app.ts` (new) and `server/src/index.ts` (split only, see B0-03)
   - `server/package.json` and `client/package.json` (dev dependencies, test scripts, Sentry dependencies)
   - Test config files (`vitest.config.ts`)
   - Sentry initialisation in `server/src/index.ts`/`app.ts` and `client/src/main.tsx`, plus a client `ErrorBoundary` component
   - `.gitignore` additions
   - `docs/audit/EMS_REMEDIATION_BASELINE.md` §14 status tracker
3. **Forbidden in this release:** any edit under `server/src/modules/**`, `server/src/core/security/**`, `server/src/config/**` (except reading), `server/src/db/**`, `server/src/initDb.ts`, `server/src/scripts/**`, `client/src/modules/**`, `client/src/store/**`, `client/src/services/**`. Also forbidden: any DDL or DML against any database, any change to route behavior, deleting files, and `git push --force`.
4. **Credentials:**
   - Never ask for, print, log, or commit database passwords, connection strings, JWT secrets or DSNs.
   - Production access happens only through commands **the owner runs**, or through environment variables the owner sets locally. You write the scripts; the owner executes anything that touches production.
   - Do not create accounts on external services (Supabase, Sentry, Vercel, Render). The owner does that.
5. **Personal data:** committed artifacts contain **structure and aggregate counts only.** No row-level data, names, emails or IDs of real people.
6. **One PR per item.** Each PR description uses the execution-rule report format from the baseline (top of document) and the Definition of Done (§13). DoD points that cannot apply in Release 0 (e.g. no migration) are marked `N/A — reason`.
7. **Stop conditions:** stop and report (do not work around) when:
   - a human step is required
   - source drift is detected
   - a forbidden file would need changing
   - any existing behavior would change

---

## B0-01 — Live schema snapshot and drift report

**You produce** (the owner executes):

1. `server/db/baseline/README.md`: exact commands for the owner to run. Use a read-only role, and take the connection string from an environment variable that is never echoed. For example:
   - `pg_dump "$PROD_DB_URL_READONLY" --schema-only --no-owner --no-privileges --schema=public -f 0000_live_schema.sql` (add any other application schemas that diagnostics reveal)
   - `psql "$PROD_DB_URL_READONLY" -f diagnostics.sql -o diagnostics_output.txt`

   It must also tell the owner to **delete `diagnostics_output.txt` locally** once its aggregates have been transferred into the `.md`.
2. `server/db/baseline/diagnostics.sql`: read-only queries (`SELECT` only; `BEGIN READ ONLY` … `ROLLBACK`) returning **aggregates only**:
   - Structural inventory from `information_schema`/`pg_catalog`: tables, columns (with types and nullability), indexes, constraints (PK/UNIQUE/CHECK/FK), triggers, functions, enums/types, RLS policies (`pg_policies`), extensions, sequences
   - Duplicate `payroll_runs` per `(tenant_id, year, month)` (counts)
   - Existence checks: `payroll_entries.payroll_run_id`, `payroll_entries.tenant_id`, `payroll_history.name`, `payroll_history.status`, and the unique constraint on `payroll_history(employee_id, month, year, tenant_id)`
   - `leave_requests`: count with `employee_id IS NULL`; counts with `user_id IS NULL`; counts using `type` vs `leave_type_id`
   - `employees.status` value counts
   - Count of employees where `manager_id` and `reporting_manager_id` are both set and disagree once translated (`reporting_manager_id` is a users.id; translate it via `employees.user_id`). Also counts for "only one set" and "untranslatable".
   - `attendance`: counts of rows populated in (`user_id`, `check_in`) vs (`employee_id`, `check_in_time`); count of open sessions (`check_out_time IS NULL`) older than 24h
   - `tenant_id` distribution (NULL, `''`, `'default'`, `'tenant_default'`, other) for: users, employees, attendance, leave_requests, leave_types, timesheets, payroll_profiles, payroll_runs, payroll_entries, payroll_history, approvals, claims, departments, teams, roles, audit_logs
   - `approvals` counts by `type` × `status`
   - Row counts per table
   - `SHOW timezone;` and `SELECT version();`
3. After the owner provides the outputs:
   - Review `0000_live_schema.sql` line by line for secrets, data, `COPY`/`INSERT`, Supabase-internal schemas and owner/role names. Strip any that appear and record what was stripped.
   - Write `server/db/baseline/0000_live_schema.md` containing:
     - the structural inventory checklist (each category: captured ✓ with a count)
     - a **drift table** (for each table/column: present in repo scripts? present live?), covering at least the §0.2 items
     - all diagnostic results (aggregates)
     - the SQL used (link to `diagnostics.sql`)
     - a "Findings confirmed / refuted" section against baseline §0.2–0.5, A1-3 and A2-9

**Exit:** both files committed and reviewed by the owner. The baseline's §0.2–0.5 are marked confirmed or refuted from evidence.

## B0-02 — Backup and restore verification

**You produce** `docs/runbooks/backup-restore.md`:

- An owner checklist: Supabase plan tier, daily backup retention, PITR enabled (Y/N), retention window
- Restore procedure into a **scratch** project. Never restore over production.
- Post-restore smoke checks: `SELECT count(*)` on core tables compared with the B0-01 counts; app login against the restored DB from a local build
- A results template: date, operator, restore source timestamp, duration (= measured RTO), data age (= measured RPO), pass/fail
- Proposed RPO/RTO targets for the owner to approve (suggested: RPO ≤ 24h without PITR, ≤ 5 min with PITR; RTO ≤ 4h)

The owner performs the restore and fills in the results.

**Exit:** the results section is filled in with a PASS, and the targets are approved.

## B0-03 — Test harness

1. **Verify** that `server/src/index.ts` still: builds the app, mounts routes, runs `start()` at module load (`start()` → `registerDomainEvents()`, `app.listen` when `!process.env.VERCEL`, process handlers, `SELECT NOW()`, `seedPermissionsAndSuperAdmin()`), and ends with `export default app`. Also verify that `vercel.json` routes `/api/(.*)` to `server/src/index.ts`, and that `server/package.json` `start` is `node dist/index.js`.
2. **Split without behavior change:**
   - `server/src/app.ts`: everything that builds the Express app (middleware, rate limiters, CORS, body parsers, static, health, route mounts, 404 and error handlers). `export default app`. **No** listen, seed, DB query, event registration or process handlers.
   - `server/src/index.ts`: `import app from './app'`, keeps `start()` exactly as it is today, and keeps `export default app`. The Vercel and Render entry points are therefore unchanged.
   - Prove there is no behavior change: (a) `tsc --noEmit` passes; (b) `npm run build` passes and `dist/index.js` starts locally with the same startup logs; (c) the route list is identical before and after (`app._router.stack` dump diff, or the route-contract tool's backend list).
3. **Tooling (dev dependencies only):** `vitest`, `supertest`, `@types/supertest`. Add the scripts `test` and `test:integration`.
4. **Two test layers:**
   - `server/test/unit/**`: no database. First test: `GET /api/v1/health` → 200 with `success:true`, using `supertest(app)` imported from `app.ts`.
   - `server/test/integration/**`: needs `TEST_DATABASE_URL`, and skips with a clear message if it is unset. Provide `server/test/setup/db.ts`, which creates an empty database from `server/db/baseline/0000_live_schema.sql` (**blocked until B0-01 lands**; leave a TODO that fails loudly, not silently), plus `factories.ts` that seeds one tenant and the roles super_admin, admin, hr, manager, employee and one custom role, with permission sets mirroring the seeds in `db/schema.ts:363-393` and `scripts/seedPermissions.ts`. Include a token helper (`JwtService.generateAccessToken` with a test-only secret).
   - Provide the **empty skeleton** of the authorization matrix (`server/test/integration/authz.matrix.test.ts`): a table-driven structure (route, method, role → expected status), with **no assertions on current insecure behavior.** Rows are filled in Release 1.
5. Add `docs/audit/tools/route_contract_check.py` as an `npm run check:routes` script (it reports, does not fail, in Release 0) and record the current output (16 unmatched) as the known baseline.
6. **Do not** write tests that assert the current buggy behavior as correct.

**Exit:** `npm test` passes locally; the build and route list are unchanged; integration tests run against a DB built from the snapshot (once B0-01 lands).

## B0-04 — Error visibility (Sentry)

- Server: `@sentry/node`. Initialise in `index.ts` **before** importing the app, and only if `SENTRY_DSN` is set. Add the Sentry Express error handler in `app.ts` **before** the existing `globalErrorHandler`, so responses are unchanged.
- Client: `@sentry/react`. Initialise in `main.tsx` only if `VITE_SENTRY_DSN` is set. Wrap the app in an `ErrorBoundary` with a neutral fallback.
- Privacy: `sendDefaultPii: false`; a `beforeSend` that scrubs the `Authorization` header, cookies, query `token`, and body fields `password`, `newPassword`, `currentPassword`, `temp_password`, `refreshToken`, `resetToken`, `email`, `personal_email`. Set `tracesSampleRate` (default 0.1) and the environment from env vars.
- Add `SENTRY_DSN`, `SENTRY_ENVIRONMENT` and `VITE_SENTRY_DSN` to `server/.env.example`, documented with placeholders only. (This is allowed as documentation; do not change any existing variable.)
- A verification route is **not** added to production code. Verify with a temporary local-only throw (not committed), or with Sentry's test-event CLI.

**Exit:** with the DSN unset, the app behaves exactly as before. With it set (in staging), a test error appears in Sentry with PII scrubbed.

## B0-05 — Staging environment

- `server/scripts/staging/rebuild.sh` (plus a PowerShell equivalent): applies `0000_live_schema.sql` to `$STAGING_DB_URL`, then `seed.sql`.
- `server/scripts/staging/seed.sql`: **synthetic** data only (fake names and emails on a reserved domain such as `example.test`). One tenant, the six roles, about 20 employees with a manager hierarchy, leave types, a few attendance, leave, timesheet and approval rows, and payroll profiles.
- `server/scripts/staging/smoke.ts`: logs in as each role, then checks `GET /employees`, `POST /attendance/check-in`, `POST /leave/apply` and `GET /approvals`. It **records** the results; it does not assert the security fixes, since those come in Release 1.
- `docs/runbooks/staging.md`: owner steps (create the staging Supabase project and deployment, set separate secrets and the DSN).

**Exit:** the owner has created staging, the rebuild succeeds from the snapshot, and the smoke script runs and its results are recorded. **A failed rebuild sends you back to B0-01.**

---

## Release 0 exit criteria (all required)

- [ ] B0-01 committed and owner-reviewed; drift confirmed or refuted with evidence
- [ ] B0-02 restore PASS recorded; RPO/RTO approved
- [ ] B0-03 `npm test` green; build and route list unchanged
- [ ] B0-04 Sentry verified in staging with scrubbing; no change when the DSN is unset
- [ ] B0-05 staging rebuilt from the snapshot; smoke results recorded
- [ ] `tsc --noEmit` clean for server and client
- [ ] `git diff 83c1e84..HEAD -- server/src/modules client/src/modules server/src/core` is **empty**
- [ ] Baseline §14 updated (items RESOLVED with PR links); tag `release-0-safety`

## Final report (what you hand back)

1. Per item: the execution-rule report block.
2. The list of human actions still pending, with owners.
3. Any drift found against the baseline.
4. Anything noticed but deliberately not fixed, as a new finding with its target release.
5. Explicit confirmation that no business behavior changed, with evidence (diff stat, route-list diff, test output).

**Then stop. Do not begin Release 1.**
