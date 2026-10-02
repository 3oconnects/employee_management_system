# Release 0 — Safety Net: Implementation Report

**Branch:** `release-0/safety-net` (from `main` @ `83c1e84d9a5834a33f72cc444aa55b89cd71b55b`) · **Date:** 2026-10-02 · **Status:** agent-side work complete; **owner actions pending** (§3). Nothing is committed yet.

> **Bottom line:** every Release 0 item is **IN PROGRESS**, none DONE. Each one now waits on a human step that the agent must not perform: production DB access, a restore drill, Sentry and staging accounts. **No business behavior changed** (§4).

---

## 1. Phase 0 — read-only verification

```text
git rev-parse HEAD       → 83c1e84d9a5834a33f72cc444aa55b89cd71b55b   (matches baseline)
git status --short       → ?? docs/audit/   (audit documents only)
git branch --show-current→ main   → switched to new branch release-0/safety-net
git log -1 --oneline     → 83c1e84 Make it stabilize
```

Every source reference for B0-01…B0-05 was re-opened at HEAD. Because HEAD equals the baseline commit, there is **no drift**. Each functional assumption was confirmed individually:
- app construction happens in `index.ts`;
- `start()` runs at module load and is the code that runs:
  - `registerDomainEvents()`;
  - `listen` (skipped when `VERCEL` is set);
  - `SELECT NOW()`;
  - `seedPermissionsAndSuperAdmin()`;
  - the process handlers;
- the file ends with `export default app`;
- the Vercel entry is `server/src/index.ts` and the start script is `node dist/index.js`;
- the payroll repository's column usage and the four legacy schema scripts are as described.

---

## 2. Per-item reports (execution-rule format)

### B0-01 — Live schema snapshot + drift report
```text
Baseline finding   : B0-01 / §0.2 — repo cannot rebuild the DB the code expects.
Source verified    : initDb.ts, db/schema.ts, db/migration_v3.ts, scripts/phase2_migrations.ts,
                     scripts/db-setup.ts, payroll.repository.ts @83c1e84 — match.
Current behavior   : Not only "drift": the documented setup is broken on a fresh DB (verified on a
                     throwaway local Postgres):
                       • `npm run db:migrate` crashes — initDb.ts self-executes on import (L606) AND
                         db-setup.ts calls initDb() → two concurrent runs → duplicate-type error.
                       • Running initDb alone then initializeDatabase() fails: tenants.is_active missing.
                       • Repo-built schema lacks users.phone/address/emergency/avatar_url (read by
                         auth.repository.findUserProfile), payroll_entries.payroll_run_id,
                         payroll_history.name/status/UNIQUE, payroll_runs.tenant_id,
                         employees.manager_id, leave_types.tenant_id.
Proposed change    : Agent writes scripts; owner runs them against production (read-only).
Files affected     : server/db/baseline/README.md, server/db/baseline/diagnostics.sql, .gitignore
Migration impact   : None. diagnostics.sql runs in BEGIN READ ONLY … ROLLBACK; aggregate-only;
                     drift-tolerant (missing columns report 'n/a (missing: …)').
Tests added        : Validated end-to-end on a stand-in DB (exit 0; all sections populated);
                     README security-review greps validated (clean dump → silent; bad samples → flagged).
Regression checks  : N/A — no application code touched.
Result             : IN PROGRESS — awaiting owner to run §3 of the README and hand back outputs.
                     Then: 0000_live_schema.md (inventory, drift table, diagnostics, §0.2–0.5 confirmed/refuted).
```

### B0-02 — Backup / restore verification
```text
Baseline finding   : B0-02 — backups/PITR unknown; never restore-tested.
Source verified    : N/A (platform configuration, not code).
Current behavior   : Unknown — requires Supabase dashboard access.
Proposed change    : Owner runbook with config capture, RPO/RTO proposal, restore-to-scratch drill,
                     verification via diagnostics.sql row counts + read-only app check, results table.
Files affected     : docs/runbooks/backup-restore.md
Migration impact   : None.
Tests added        : N/A.
Regression checks  : N/A.
Result             : IN PROGRESS — awaiting owner drill + PASS + RPO/RTO approval.
```

### B0-03 — Test harness
```text
Baseline finding   : B0-03 — no tests; importing index.ts has side effects (listen, DB, seed).
Source verified    : server/src/index.ts @83c1e84 — match.
Current behavior   : app could not be imported without starting the server and touching the DB.
Proposed change    : Split index.ts → app.ts (construction only) + index.ts (startup, unchanged).
                     vitest 3 + supertest; unit project (no DB) and integration project (DB built
                     ONLY from 0000_live_schema.sql; seeded once in global setup; users passed via
                     provide/inject). Authz matrix skeleton with ZERO rows (Release 1 fills it).
                     Route-contract check wired as `npm run check:routes` (report-only) + baseline file.
Files affected     : server/src/app.ts (new), server/src/index.ts, server/vitest.config.ts,
                     server/tsconfig.test.json, server/test/** (unit/app.test.ts,
                     integration/harness.test.ts, integration/authz.matrix.test.ts, setup/db-guard.ts,
                     setup/integration.global.ts, setup/seed.ts, setup/tokens.ts),
                     server/db/baseline/loadSnapshot.ts, server/package.json (+lock),
                     docs/audit/tools/route_contract_check.py (cwd-independent; reads app.ts),
                     docs/audit/tools/route_contract_baseline.txt
Migration impact   : None.
Tests added        : unit: health 200, JSON 404, 401 without token, 401 malformed token (4/4 pass).
                     integration: seeds-one-user-per-role; /auth/me returns user; login accepts
                     seeded credentials (validated on stand-in: mechanics pass; /auth/me fails ONLY
                     because the repo-built stand-in lacks users.phone — expected to pass on the real
                     snapshot). Guards verified: unset → skip; no snapshot → loud BLOCKED;
                     DB name without "test" → refused; non-local → refused; URL = server/.env → refused.
Regression checks  : (a) Route table dump identical before/after via index.ts AND via app.ts alone
                         (171 entries incl. middleware order).
                     (b) Compiled original vs compiled split: startup logs byte-identical (normalized
                         date/port); /health, unknown route, unauth payroll, empty login → 200/404/401/400
                         on both.
                     (c) Importing app.ts produces no output: no DB connection, no seeding.
                     (d) tsc clean (src) and tsc -p tsconfig.test.json clean.
                     (e) Route contract: 124 backend routes / 18 unmatched (16 genuine + 2 dynamic) —
                         identical to the baseline audit.
                     (f) Test env pre-sets every secret/DB/SMTP var to inert values so dotenv cannot
                         load server/.env credentials into tests.
Result             : IN PROGRESS — unit layer complete; integration layer blocked on B0-01 snapshot.
```

### B0-04 — Error visibility (Sentry)
```text
Baseline finding   : B0-04 — no error visibility.
Source verified    : server/src/index.ts, client/src/main.tsx, server/.env.example @83c1e84 — match.
Current behavior   : Errors only in console logs.
Proposed change    : @sentry/node (server/src/instrument.ts, first import of index.ts; 5xx-only
                     Express handler registered in app.ts before globalErrorHandler, only when Sentry
                     is initialised) and @sentry/react (main.tsx; ErrorBoundary only when enabled).
                     Sentry 11 collects bodies/headers/query/DB params/stack variables BY DEFAULT —
                     every category explicitly restricted via `dataCollection`, plus beforeSend /
                     beforeBreadcrumb scrubbing; query strings stripped (tokens can ride in ?token=);
                     tracing off by default (deviation from the prompt's 0.1: URLs may carry tokens
                     until W-6).
Files affected     : server/src/instrument.ts (new), server/src/index.ts, server/src/app.ts,
                     client/src/main.tsx, server/.env.example (docs only), package.json/lock ×2,
                     docs/runbooks/monitoring.md
Migration impact   : None.
Tests added        : Local privacy verification against a fake ingest endpoint (nothing sent to Sentry):
                     server — forced 500 with query token, cookie, Bearer JWT, body password/CTC/phone/
                     email → 1 event, 0 occurrences of any secret; response unchanged.
                     client — uncaught error on /login?token=…&email=… → 1 event, URL '/login',
                     0 occurrences of token/email.
Regression checks  : DSN unset: route table identical; compiled startup logs identical; responses
                     identical; client main bundle 287.82 kB → 287.83 kB (Sentry tree-shaken out).
                     npm audit (prod deps): unchanged vs 83c1e84 (server 1 moderate; client 7).
Result             : IN PROGRESS — awaiting owner Sentry projects + DSNs; staging verification.
```

### B0-05 — Staging environment
```text
Baseline finding   : B0-05 — no staging; needed by DoD item 14.
Source verified    : N/A (new tooling).
Current behavior   : No staging environment.
Proposed change    : TypeScript tooling (bash/PowerShell duplicates avoided; runs via `npm run`):
                     rebuild (snapshot only → seed), seed (synthetic, shared role definitions with
                     tests; optional steps report APPLIED/SKIPPED), smoke (records, never asserts),
                     guard (refuses: URL = server/.env, any non-synthetic user present, missing flag,
                     wrong typed host, short seed password).
                     Deviation: the prompt suggested seed.sql — password hashing needs bcrypt, so the
                     seed is TS.
Files affected     : server/scripts/staging/{guard,rebuild,seed,smoke}.ts, server/package.json
                     (staging:rebuild, staging:smoke), docs/runbooks/staging.md
Migration impact   : None in Release 0 (staging rebuild is destructive BY DESIGN on staging only).
Tests added        : Local validation on throwaway Postgres: all 4 guard refusals fire; stand-in DB
                     data untouched; rebuild succeeds twice (idempotent); smoke records results.
Regression checks  : N/A — tooling only.
Result             : IN PROGRESS — awaiting snapshot (B0-01) and owner staging project/deployment.
```

---

## 3. Human actions pending (in order)

| # | Action | Owner | Runbook | Unblocks |
|---|---|---|---|---|
| 1 | Create the read-only role; run `diagnostics.sql` and `pg_dump`; review per README §4; hand back | DB owner | `server/db/baseline/README.md` | B0-01 → B0-03 integration, B0-05 |
| 2 | Perform the restore drill into a scratch project; record results; approve RPO/RTO | DB owner | `docs/runbooks/backup-restore.md` | B0-02 |
| 3 | Create Sentry org/projects (`ems-api`, `ems-web`); enable server-side scrubbing | Eng lead | `docs/runbooks/monitoring.md` | B0-04 |
| 4 | Create the staging Supabase project and deployment with staging-only secrets and empty SMTP variables | Eng lead | `docs/runbooks/staging.md` | B0-05 |
| 5 | Run the staging rebuild and smoke; verify Sentry events in staging; record results | Eng lead | `staging.md` §2–4, `monitoring.md` §3 | Release 0 gate |
| 6 | Decide how to commit and review: one PR per item (recommended), or one PR for the release | Owner | n/a | Merge and tag `release-0-safety` |

After item 1, the agent writes `0000_live_schema.md` and runs the integration suite against the real snapshot.

---

## 4. Proof that no business behavior changed

- `git diff 83c1e84 -- server/src/modules server/src/core server/src/config server/src/db server/src/initDb.ts server/src/scripts client/src/modules client/src/store client/src/services` → **empty**.
- Route table identical, compiled startup logs identical, and responses identical for representative requests (§2 B0-03).
- Client behavior identical when `VITE_SENTRY_DSN` is unset (Sentry code is not in the bundle).
- The only runtime-reachable server additions are (i) `import './instrument'`, which is a no-op without `SENTRY_DSN` (it loads `dotenv` slightly earlier; dotenv never overrides and `config/db.ts` already calls it), and (ii) the Sentry error handler, which is registered only when Sentry is initialised and passes errors through unchanged.

**Scope notes:** files outside the prompt's explicit allow-list, each justified:
- `server/src/instrument.ts`: Sentry must initialise before any other module loads. Its official pattern requires a separate first import, so it cannot live in `index.ts` itself, where imports are hoisted.
- `server/tsconfig.test.json`: a test config, needed so DoD #9 ("no new TypeScript errors") covers tests and scripts.
- `server/db/baseline/loadSnapshot.ts`: inside the allowed `server/db/baseline/**`. It is shared by the test setup and the staging rebuild.
- `docs/audit/tools/route_contract_baseline.txt`: records the known 18 unmatched calls.

---

## 5. Findings discovered during Release 0: reported, NOT fixed

| ID | Finding | Evidence | Current behavior | Target release | Why deferred |
|---|---|---|---|---|---|
| R0-F1 | `initDb.ts` self-executes on import, so `npm run db:migrate`/`db:seed` race two runs | `src/initDb.ts:606` (`initDb().then(...)`); `scripts/db-setup.ts:13` imports and calls it | Fresh DB: crashes with a duplicate `pg_type` error | Release 5 (O-5: versioned migrations supersede these scripts) | Fixing the legacy scripts is moot once migrations come from the snapshot; Release 0 forbids `src/initDb.ts` edits |
| R0-F2 | Legacy schema scripts are mutually inconsistent | `initializeDatabase()` fails after `initDb()`: `tenants.is_active` missing (initDb creates `tenants` without it; `CREATE TABLE IF NOT EXISTS` then skips) | Fresh setup cannot complete | Release 5 (O-5) | Same as R0-F1 |
| R0-F3 | Auth code reads columns that no repo script creates | `auth.repository.ts` `findUserProfile` selects `u.phone, u.address, u.emergency, avatar_url`; only `scratch/add_avatar_col.ts` adds `avatar_url` | Any repo-built DB returns 500 on `/auth/me`, `/employees`, `/approvals` | Resolved by B0-01 (the snapshot becomes the source of truth) | Evidence for §0.2, not a code fix |
| R0-F4 | **Auth rate limiter scope + proxy keying**: `authLimiter` (10 per 15 min per IP) applies to **all** `/api/v1/auth/*`, including `/me`, `/refresh` and `/status`. No `trust proxy` is set. | `src/app.ts:44-104` (moved verbatim from `index.ts`); no `trust proxy` anywhere | Locally: the 11th `/auth/*` call → 429. Behind Vercel/Render, or an office NAT, **all users may share one IP bucket**, so the organisation could be locked out of login after 10 auth calls [I: verify on staging] | **Release 1** (with S1–S6; High) | Behavior change; out of Release 0 scope |
| R0-F5 | Pre-existing vulnerable client dependencies | `npm audit --omit=dev` (client): 7 (3 high, 4 moderate) in axios, follow-redirects, form-data, lodash, react-router(-dom), @remix-run/router; server: 1 moderate. Identical at `83c1e84` | Unchanged by Release 0 | Release 1 (dependency hygiene alongside the security release) | Version upgrades can change behavior; need their own tests |
| R0-F6 | `vitest` 5 requires `@types/node` ≥ 22; the project pins 20 | `npm install` ERESOLVE | vitest 3 pinned instead | Release 5 (toolchain refresh) | Bumping Node types could change type-checking of `src/` |
| R0-F7 | Sentry SDK requires Node ≥ 20.19 (`@sentry/node` 11 engines) | `package.json` engines of the SDK | The deploy target's Node version is unverified | Before enabling Sentry (owner, step 3) | Platform setting |
| R0-F8 | Client Sentry DSN is **build-time** | Vite inlines `import.meta.env` | A DSN set only at runtime has no effect | Documented in `monitoring.md` | Operational note |

---

## 6. Definition of Done status

| DoD point | B0-01 | B0-02 | B0-03 | B0-04 | B0-05 |
|---|---|---|---|---|---|
| 1 Source re-verified | ✅ | N/A | ✅ | ✅ | N/A |
| 2 Implementation complete | ⏳ owner run | ⏳ drill | ⏳ integration needs snapshot | ⏳ DSN | ⏳ staging |
| 3 Migration tested | N/A | N/A | N/A | N/A | N/A |
| 4 Unit tests pass | N/A | N/A | ✅ 4/4 | N/A | N/A |
| 5 Integration tests pass | N/A | N/A | ⏳ snapshot | N/A | N/A |
| 6 Authz matrix passes | N/A | N/A | ✅ skeleton (no rows by design) | N/A | N/A |
| 7 Route contract | report-only (18 known) | | | | |
| 8 Existing tests pass | ✅ (none existed) | | | | |
| 9 No new TS errors | ✅ src + tests + scripts | | | | |
| 10 No unrelated files | ✅ (§4) | | | | |
| 11 Idempotent | ✅ diagnostics | N/A | ✅ seed | N/A | ✅ rebuild ×2 |
| 12 Rollback documented | N/A | ✅ runbook | revert branch | DSN unset = off | N/A |
| 13 Before/after evidence | ✅ | ⏳ | ✅ | ✅ | ✅ local |
| 14 Staging smoke | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| 15 Marked RESOLVED | ❌ (all IN PROGRESS) | | | | |

**Stopping here, as instructed. Release 1 has not been started.**
