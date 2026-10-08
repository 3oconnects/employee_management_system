# Track E — Quality, Tests, Technical Debt, Dependencies

Target: `06dc08f` (branch `feat/nexus-brand-foundation`), audited 2026-10-04. All claims below were read at HEAD unless marked otherwise.
Labels: **[Confirmed]** read directly / command output; **[Inferred]** reasoned from confirmed evidence; **[Assumption]** general knowledge not verifiable in repo; **[Unknown]** not enough evidence found in repository.

Repo size: 509 tracked files; 45 commits; ~42,000 lines of tracked `.ts/.tsx/.js` source outside `dist/` (`git ls-files | xargs wc -l`). [Confirmed]

---

## Phase 11. Technical Debt Register

### 11.1 Largest source files (top 15 by line count, tracked, excluding dist) [Confirmed]

| # | File | Lines | Note |
|---|---|---|---|
| 1 | client/src/modules/timesheet/pages/Timesheets.tsx | 1316 | god page: fetching, role logic (`:126`), UI, modals in one file |
| 2 | client/src/modules/profile/components/ProfileHeader.tsx | 952 | god component, own modal overlay |
| 3 | client/src/modules/employees/components/EmployeeTable.tsx | 917 | table + SSE client (`:116-130`) + modals |
| 4 | client/src/modules/employees/components/modals/AddEmployeeModal.tsx | 762 | |
| 5 | server/src/services/analyticsService.ts | 699 | god service; 13 `any` usages |
| 6 | client/src/modules/profile/pages/Profile.tsx | 650 | 13 `any`; image resize + upload inline (`:245-262`) |
| 7 | server/src/services/emailService.ts | 642 | SMTP resolution + templates + sending |
| 8 | server/src/initDb.ts | 609 | legacy schema + seeding; 80 swallowed `.catch(() => {})` |
| 9 | client/src/modules/approvals/components/ApprovalCard.tsx | 585 | |
| 10 | server/src/db/schema.ts | 574 | second schema source |
| 11 | client/src/modules/profile/components/OverviewTab.tsx | 555 | |
| 12 | server/src/modules/employees/employees.service.ts | 535 | |
| 13 | client/src/modules/attendance/pages/Attendance.tsx | 509 | |
| 14 | client/src/modules/settings/components/UsersTab.tsx | 503 | |
| 15 | client/src/components/ui/index.tsx | 469 | shared primitives (Modal, DataTable) — unused by modules, see E-12 |

(Next: `server/src/modules/settings/settings.routes.ts` 446 lines — dead, see E-09.)

### 11.2 Code metrics [Confirmed via git grep]

| Metric | server/src | client/src |
|---|---|---|
| `: any` / `as any` / `<any>` / `any[]` occurrences | 201 | 272 |
| `@ts-ignore` / `@ts-expect-error` / `@ts-nocheck` | 0 | 0 |
| `eslint-disable` | 0 | 1 |
| `console.log` | 53 | 4 |
| `console.*` (log/warn/error/info/debug) | 110 | 33 |
| Swallowed errors `.catch(() => { })` | 91 (80 in initDb.ts) | — |
| TODO / FIXME / HACK / XXX | **0** | **0** |

Top `any` offenders: `server/src/modules/employees/employees.repository.ts` (16), `server/src/services/analyticsService.ts` (13), `client/src/modules/profile/pages/Profile.tsx` (13), `server/src/modules/employees/employees.service.ts` (11), `server/src/modules/employees/employees.controller.ts` (10). [Confirmed]
Top `console.log` offenders: `server/src/db/schema.ts` (15), `server/src/scripts/phase2_migrations.ts` (8), `server/src/initDb.ts` (7), `server/src/index.ts` (7). [Confirmed]
No TODO/FIXME markers exist, so there are no TODOs to quote; the softer markers found are: `client/src/modules/employees/components/modals/shared.ts:5` (commented-out `DEPTS` list, "Deprecated: Now dynamic"), `client/src/modules/settings/components/PermissionMatrix.tsx:96` ("For now, I'll update the role object directly…" — an AI-assistant voice comment left in code), `client/src/modules/settings/components/RolesTab.tsx:26` ("simulating a callback for now"), `server/src/middleware/authMiddleware.ts:2` (`@deprecated` shim). [Confirmed] Absence of TODOs means debt is undocumented, not absent. [Inferred]

Mixed JS/TS: tracked `.js` files outside config: `check_user.js`, `server/check_user.js`, `server/scratch_check_db.js`, 9 files under `server/scratch/*.js`, `client/src/utils/cleanup_data.js`. All are scripts, none are imported by the app. [Confirmed]

### 11.3 Register (ranked by severity)

| ID | Item | Location | Severity | Impact | Fix | Effort |
|---|---|---|---|---|---|---|
| E-01 | Hardcoded login backdoor: `admin@company.com` accepted with `admin123` or `Admin@123` even if the stored hash does not match | server/src/modules/auth/auth.service.ts:23-25 | Critical | Anyone knowing the seeded email gets admin on any deployment where that user exists [Confirmed code; exploitability per env Unknown] | Delete the branch; force reset of that account | S |
| E-02 | Secrets committed in git history: `server/.env` (keys `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`) existed in commits 160ac22…283f78d and was deleted in 2c25bcf; still reachable in history | `git log --all -- server/.env` | Critical | DB and token-signing credentials recoverable by anyone with repo access; whether they were rotated is [Unknown] | Rotate DB password + JWT secrets; optionally purge history (filter-repo) | S (rotate) / M (purge) |
| E-03 | Plaintext temporary passwords: login compares `user.temp_password === passwordRaw`; seed writes plaintext `temp_password` for two real personal Gmail addresses with guessable passwords (`AURA_SARAN_2026`, `AURA_SRIDHAR_2026`) | server/src/modules/auth/auth.service.ts:20; server/src/initDb.ts:487-497; 27 `temp_password` references in server/src | Critical | Credential exposure on DB read; real people's emails in source | Hash temp passwords (or one-time tokens); remove personal emails from seed | M |
| E-04 | Insecure env defaults: `JWT_SECRET` defaults to `'ems_secret'`, `JWT_REFRESH_SECRET` to `'ems_refresh_secret'` | server/src/config/env.ts:9-10 | Critical | If env var missing in prod, tokens are forgeable | Make required (fail fast) in non-test envs | S |
| E-05 | Tenant-isolation bypass hardcoded as `OR tenant_id = 'tenant_default' OR tenant_id = 'default'` in queries | server/src/modules/employees/employees.repository.ts:18,116,118,124,134,143,176,183,197,204; employees.routes.ts:36; governance/org-tree/org-tree.repository.ts:9-52; governance/shared/shared.repository.ts:9-20; governance/sync/sync.repository.ts (6); settings/rbac/rbac.repository.ts (5) | Critical | Every tenant can read/update rows of the default tenant (multi-tenant leak) [Inferred from SQL] | Remove fallback; migrate legacy rows to proper tenant | M |
| E-06 | Payroll statutory math duplicated 4× inside one service with **divergent formulas**: TDS = 15%/5% of gross in `:120` and `:219`, but 15% of *basic* with no 5% slab in `:194`, and absent in `:24-26`; ESI only in `:220`; all rates hardcoded (PF 0.12, PT 200 above 180000, ESI 0.0075 below 252000) | server/src/modules/payroll/payroll.service.ts:24-26, 118-120, 192-194, 217-220 | High | Dashboard, tax summary and processed payslips disagree; statutory changes need 4 edits; no tests (see QA) | Extract one `computePayslip()` pure function with a versioned rates config; unit-test it | M |
| E-07 | Client re-derives employer liabilities with magic numbers (`/0.75*3.25`, `*0.04` gratuity, `*0.02` bonus) | client/src/modules/payroll/sections/TaxStatutory.tsx:49-52 | High | Financial figures computed in the browser, inconsistent with server | Move to server, single source | S |
| E-08 | Five overlapping schema sources, none of which describes production (per baseline README) and the snapshot file is missing: `initDb.ts` (27 CREATE TABLE, 74 ALTER), `db/schema.ts` (11/50), `db/migration_v3.ts` (5/23), `scripts/phase2_migrations.ts` (0/4), `scripts/legacy_cleanup.ts`. Tables created in 2 files: tenants, notifications, holidays, departments, audit_logs, approvals. `db:migrate` and `db:seed` both run the same `scripts/db-setup.ts`, which chains initDb → initializeDatabase → runMigrationV3 | server/src/initDb.ts; server/src/db/schema.ts; server/src/db/migration_v3.ts; server/scripts/db-setup.ts:12-19; server/package.json scripts; server/db/baseline/README.md:3; `server/db/baseline/` contains no `0000_live_schema.sql` | High | Cannot build a correct DB from repo; integration tests blocked; schema drift | Land baseline snapshot, adopt numbered migrations tool, delete legacy scripts | L |
| E-09 | Dead server code (0 importers): `modules/settings/settings.routes.ts` (446 lines, contains bcrypt, emails, `tenant_default`), `modules/governance/governance.{routes,controller,service,repository}.ts`, `modules/performance/performance.{routes,controller,service,repository}.ts`, `modules/notifications/notifications.{routes,controller,service,repository}.ts`, `modules/realtime/realtime.{routes,controller}.ts`, `modules/departments/*` (not mounted in app.ts), `middleware/errorHandler.ts` (161), `middleware/authMiddleware.ts` (deprecated shim), `services/userService.ts`, `utils/pdfGenerator.ts` (155) | server/src/app.ts:20-38 (actual mounts); module index files `governance/index.ts`, `performance/index.ts`, `notifications/index.ts`, `realtime/index.ts`, `settings/index.ts` | High | ~1,400 lines of parallel, divergent implementations; reviewers and AI tools edit the wrong file | Delete after a route-contract check | S |
| E-10 | Two independent pg Pools + two legacy re-export layers: `config/db.ts` (pool max 10 + directPool max 3) and `database/client.ts` (another pool max 10, different timeouts) used by `database/transaction.ts`; plus `src/db.ts` and `src/db/connection.ts` re-exports | server/src/config/db.ts:24-44; server/src/database/client.ts:16-24; server/src/database/transaction.ts:1 | High | Up to 23 connections per instance against Supabase pooler; transactions run on a different pool than reads | One pool module | S |
| E-11 | Duplicate audit service paths: `services/auditService.ts` (used by auth.controller) vs `modules/audit/write/write.service.ts` (exported as AuditService) | server/src/modules/auth/auth.controller.ts:3; server/src/modules/audit/index.ts:3 | Medium | Two audit write paths may diverge | Consolidate | S |
| E-12 | Shared UI primitives unused: `Modal` and `DataTable` exported from components/ui but **0** module files use `<Modal` or `<DataTable`; 24 module files hand-roll overlays (`fixed inset-0`), 11 hand-roll `<table` | client/src/components/ui/index.tsx:183,249; e.g. modules/payroll/components/CreateProfileModal.tsx, modules/settings/components/UsersTab.tsx | Medium | Inconsistent a11y/focus handling, duplicated code | Migrate modals/tables to primitives | M |
| E-13 | No client data layer: 58 component files make 160 direct `api.get/post/put/patch/delete` calls; 26 files hand-roll `setLoading(true)` | client/src/modules/** ; client/src/services/api.ts | Medium | Repeated fetch/loading/error code, no caching | Per-module API clients + query hook (e.g. TanStack Query) | L |
| E-14 | Role checks duplicated and inconsistent: server mixes `authorize([...])` with raw role strings, `UserRole` enum, and permission strings; controllers re-check `['admin','super_admin','hr'].includes(user?.role)` 4× ; client: `GeneratePayroll.tsx:30` treats only admin/hr as admin (omits super_admin), `Timesheets.tsx:126`, `Topbar.tsx:342`, `Profile.tsx:92`; `authStore.ts:108` grants admin by `user.name === 'System Admin'` or the hardcoded admin email | server/src/modules/employees/employees.controller.ts:47,71,88,105; employees.routes.ts:47-71; governance/*.routes.ts; client files listed | Medium | Authorization drift between UI and API | Single permission helper on each side driven by permissions | M |
| E-15 | Hardcoded URLs/origins: CORS allow-list includes `https://ozofi-homie.vercel.app` and any `*.vercel.app` origin; `http://localhost:5173` fallback repeated 9× for login links; SSE uses `VITE_API_URL || 'http://localhost:4000/api/v1'` while `api.ts` derives base URL from hostname | server/src/app.ts:69-74; server/src/modules/settings/user-assignments/user-assignments.service.ts:45,66,108; employees.service.ts:120; emailService.ts:361; offer-letter/email.template.ts:17; client/src/modules/employees/components/EmployeeTable.tsx:119; client/src/services/api.ts:40-53; Profile.tsx:506 | Medium | Any Vercel-hosted site is an allowed CORS origin with credentials; SSE breaks in prod without VITE_API_URL [Inferred] | Env-driven origin list + single base-URL helper | S |
| E-16 | Hardcoded brand/company strings across three brand eras (AURA, Ozofi, Nexus): `'AURA Default'` tenant, "Welcome — Your AURA account", "AURA EMS — Test Email", `AURA CORE` on landing page, `aura_` API key prefix, "Ozofi Technologies Private Limited • Bengaluru & Chennai", `Ozofi People Operations` sender | server/src/initDb.ts:445; server/src/modules/settings/settings.routes.ts:276,436 (dead file); client/src/modules/public/pages/LandingPage.tsx:20,139; client/src/modules/settings/components/IntegrationsTab.tsx:36; server/src/services/offer-letter/email.template.ts:202,214; pdf.generator.ts:231; emailService.ts:56 | Medium | Not white-label/multi-tenant ready; brand leaks to tenants | Route through `config/brand.ts` + tenant settings | M |
| E-17 | Client-side API-key generation with `Math.random()`; webhook/Slack/Teams URLs are saved to config but no server code dispatches webhooks (only match for "webhook" in server/src is a comment) | client/src/modules/settings/components/IntegrationsTab.tsx:36,15-18,26; `git grep webhook server/src` → server/src/config/db.ts:17 only | Medium | Non-cryptographic keys; UI promises integrations that do nothing | Generate keys server-side (crypto); hide or implement webhooks | M |
| E-18 | Process-level error swallowing: `uncaughtException` handler logs and continues; `unhandledRejection` only warns; 91 empty `.catch(() => {})` | server/src/index.ts:53-67; initDb.ts (80) | Medium | Process continues in undefined state; migration failures invisible | Exit on uncaught; surface migration errors | S |
| E-19 | Layering inconsistency: SQL in controllers/routes (`reports.controller.ts:46-72`, `employees.routes.ts:33`, `departments.controller.ts`) and services (`approvals.service.ts`, `employees.service.ts`) while other modules use repositories; reports module has no service/repository | server/src/modules/reports/; employees.routes.ts:33 | Medium | Hard to test; tenant filters reimplemented ad hoc | Move to repositories | M |
| E-20 | Startup side effect: `seedPermissionsAndSuperAdmin()` runs on every boot, and `seedPermissions.ts` force-fixes `admin@company.com` to super_admin | server/src/index.ts:78; server/src/scripts/seedPermissions.ts:138-149 | Medium | Prod data mutated at boot; reinforces E-01 | Make it an explicit migration | S |
| E-21 | Committed junk / build artifacts: `att_ours.tsx`, `att_theirs.tsx` (0 bytes, merge leftovers), `check_user.js`, `server/check_user.js`, `server/scratch_check_db.js` (requires nonexistent `./src/config/db` JS path; hardcodes `tenant_default`), `server/scratch/` (15 scripts incl. `backfill_passwords.js`, `update_demo_passwords.js`, `fix_tenant_id.ts`), `client/ts_*.txt` (5 stale tsc logs), `.vite/deps_temp_*/package.json`, `graphify-out/` (4.1 MB incl. cache), `client/src/utils/cleanup_data.js` (SQLite-era script requiring `sqlite3`), `4D_FULLSTACK_SKILL_v2.13.md` (2,657 lines), `file.sample` (env template at root, Supabase). `server/dist` and `client/dist` are **not** tracked (gitignored). `server/src/scratch/` exists on disk but is empty and untracked | `git ls-files` output; .gitignore | Low | Noise, confusion, scripts that mutate prod passwords | Delete; add ignore rules | S |
| E-22 | `server/public/` (3.3 MB) committed: offer-letter templates (.docx/.pdf, incl. duplicate `… (1).pdf`), `Images/Screenshot 2026-06-07 154148.png`, `tax_slabs_FY2025_26.pdf`; served statically at `/public` | server/src/app.ts:90; git ls-files server/public | Low | Binary churn; screenshot publicly served | Move templates to storage; drop screenshot/duplicate | S |
| E-23 | Dependency hygiene: `adm-zip` declared but 0 imports; `tailwind-merge` 0 imports (docs mandate it); `@types/adm-zip`, `@types/pdfkit` in `dependencies`; `@types/bcryptjs@^2` alongside `bcryptjs@^3`; `ts-node` and `nodemon` unused by scripts (`dev` uses tsx; nodemon.json execs tsx); nodemailer loaded via dynamic `import().catch(() => null)` despite being a hard dependency | server/package.json; client/package.json; server/nodemon.json; server/src/services/emailService.ts:139-143 | Low | Larger attack surface/install; misleading | Prune | S |
| E-24 | zod major mismatch: client `^3.22.4` (installed 3.25.76) vs server `^4.3.6` (installed 4.3.6); client uses zod in 1 file, server in 17 — no shared schemas | client/package.json; server/package.json; node_modules versions | Low | Blocks sharing validation schemas | Align on v4 when sharing | S |
| E-25 | Tooling age: ESLint 8.57.1 + @typescript-eslint 7 (ESLint 8 is end-of-life [Assumption]); Express 4.22; React Router 6.30 emitting v7 future-flag warnings in tests; Vite 5 client vs Vite 7 pulled by server vitest | client/package.json; client test output; installed versions | Low | Upgrade debt accumulates | Planned upgrades | M |
| E-26 | Lint is broken: `npm run lint` fails — "ESLint couldn't find a configuration file" (no `.eslintrc*` / `eslint.config.*` in client) | client/package.json `lint` script; command output | Medium | No static analysis gate at all | Add flat config; run in CI | S |
| E-27 | Mismatched defaults: server `PORT` default `'5000'` in env schema vs `4000` in index.ts and client | server/src/config/env.ts:7; server/src/index.ts:11; client/src/services/api.ts:45 | Low | Confusion | One default | S |
| E-28 | Body limit `50mb` JSON/urlencoded; avatars uploaded as base64 data URLs | server/src/app.ts:86-87; client/src/modules/profile/pages/Profile.tsx:245-255 | Low (debt) | Memory pressure/DoS surface; images stored in DB rows [Inferred] | Object storage + multipart | M |
| E-29 | render.yaml attaches the `ems-secrets` env group to the static frontend service | render.yaml:20-22 | Low | Secrets exposed to client build if any are `VITE_`-prefixed [Inferred] | Separate groups | S |
| E-30 | Dev demo credentials in login page (guarded by `import.meta.env.DEV`) and in 3 seed paths (`admin123`, `Admin@123`) | client/src/modules/auth/pages/LoginPage.tsx:13-20; server/src/db/schema.ts:551; server/src/initDb.ts:451-464 | Low | Acceptable for dev only if E-01 removed | Keep DEV guard; random seed passwords | S |

---

## QA & Testing

### Test inventory [Confirmed]

| File | Runner/project | What it actually covers |
|---|---|---|
| server/test/unit/app.test.ts (34 lines, 4 tests) | vitest `unit` | `GET /api/v1/health` 200; unknown route JSON 404; `/api/v1/employees` 401 without token and with malformed token. No DB. |
| server/test/unit/workspace.test.ts (46 lines, 5 tests) | vitest `unit` | `/api/v1/workspace` 401; `workspace.service` trims org name, nulls, rejects non-http logo URLs (repository mocked). |
| server/test/integration/harness.test.ts (39 lines, 2 tests) | vitest `integration`, `describe.skipIf(!TEST_DATABASE_URL)` | `/auth/me` and `/auth/login` with seeded users. |
| server/test/integration/authz.matrix.test.ts (62 lines) | vitest `integration`, skipped without DB | 1 test ("seeds one user per role"); `MATRIX` is an **empty array** (`:32-34`) — zero route authorization assertions. |
| server/test/setup/{db-guard,integration.global,seed,tokens}.ts | support | Guard refuses non-local / non-"test" DBs (`db-guard.ts:20-41`); global setup **throws** if `server/db/baseline/0000_live_schema.sql` is missing (`integration.global.ts:27-32`) — and that file does not exist, so integration tests cannot run at HEAD. |
| client/src/components/ui/form.test.tsx (62 lines, 4 tests) | vitest jsdom | FormField label/error/hint wiring; PasswordInput visibility toggle. |
| client/src/modules/auth/pages/LoginPage.test.tsx (61 lines, 4 tests) | vitest jsdom | Branding text, labels, inline validation, server error message on failed login (api mocked). |

Total: **17 executable tests** (9 server unit + 8 client) plus 3 DB-gated integration tests. Test code ≈ 584 lines vs ≈ 42,000 source lines.

### Command results (run at HEAD, deps already installed) [Confirmed]

| Command | Result |
|---|---|
| `server: npx tsc --noEmit -p tsconfig.json` | exit 0, no errors (`strict: true`, server/tsconfig.json:9) |
| `server: npm test` (vitest `--project unit`) | 2 files, **9/9 passed**, duration 83 s (collect 78 s — importing the whole app) |
| `client: npx tsc --noEmit` | exit 0 (`strict: true`, client/tsconfig.json:9) |
| `client: npm test` | 2 files, **8/8 passed**, 96 s; stderr: React Router v7 future-flag warnings |
| `client: npm run lint` | **FAILED, exit 2**: "ESLint couldn't find a configuration file." |

Note: committed `client/ts_errors*.txt` (from 2026-03-28) show historical TS errors (e.g. `Can.tsx(22,27) TS18048`) that no longer reproduce — stale artifacts. [Confirmed]

### Coverage gaps by module [Confirmed by absence of any test importing these paths]

Zero tests for: payroll calculation (`payroll.service.ts`, the most defect-prone file — see E-06), payroll processing transaction, leave apply/balance (`leaves.service.ts:66`, `leaves.repository.ts`), approvals workflow (`approvals.service.ts:27-74` approve/reject + department creation), attendance check-in/out, timesheets, employees CRUD/bulk upload, RBAC/permissions (`core/security/authorize.ts`, `seedPermissions.ts`), tenant isolation (E-05), auth service (backdoor E-01 would be caught by a single test), email/offer-letter generation, analytics service (699 lines), audit logging, SSE realtime. Client: no tests for any module page other than LoginPage; `authStore.ts` permission logic untested.

### CI presence [Confirmed]
No `.github/` directory and no `*.yml` CI definition in the repo (only `render.yaml`, a deploy manifest). `render.yaml` and `vercel.json` build without running tests or type-check gates beyond `tsc` in `client build` (`"build": "tsc && vite build"`). No coverage tooling configured (no `coverage` in either vitest config).

### Testing maturity
Level 1 of 5 ("smoke harness exists"). Positives: well-designed harness from Release 0 (inert env in `server/vitest.config.ts:11-27`, disposable-DB guard, app/index split so `app.ts` is side-effect free). Negatives: harness is blocked by the missing schema snapshot, authz matrix empty, no business-logic tests, no CI, lint broken. [Inferred]

### Testing roadmap
1. **Week 1:** Add ESLint flat config; add GitHub Actions running `tsc`, unit tests, lint for both packages on PR. Add a unit test asserting login rejects `admin@company.com`/`admin123` after removing E-01.
2. **Week 2:** Extract payroll math to a pure function; table-driven unit tests (PF/PT/ESI/TDS boundaries 180000, 252000, 500000, 1000000). Same for leave balance arithmetic.
3. **Week 3–4:** Commit `0000_live_schema.sql`; run integration project in CI against a Postgres service container; fill `MATRIX` with one row per guarded route (role × status) and tenant-isolation tests (tenant A cannot read `tenant_default` rows).
4. **Month 2:** Workflow integration tests (leave → approval → balance; payroll run → entries; employee create → user + email stubbed). Client component tests for authStore permission logic and key forms. Add coverage thresholds (start 30% server services).
5. **Month 3:** Playwright E2E smoke on staging (`server/scripts/staging/smoke.ts` exists as a start) for login, check-in, apply leave, approve, run payroll.

---

## Third-Party Dependencies & Integrations

| Service | Purpose | Where used | Dependency level | Business impact if broken | Replacement complexity |
|---|---|---|---|---|---|
| PostgreSQL on Supabase [Confirmed Postgres; Supabase Inferred from `file.sample:1-6`, config/db.ts:15 comment, `.agents/skills/supabase-postgres-best-practices`] | Sole datastore (raw `pg`, no ORM, no Supabase SDK) | server/src/config/db.ts:24-44; server/src/database/client.ts:16; ~39 importers of config/db | Critical | Entire app down | Low–Medium: plain Postgres via `pg`, any Postgres host works; TLS `rejectUnauthorized:false` must be revisited |
| SMTP via nodemailer (Gmail first, then tenant `app_config`, then `SMTP_*` env) | Welcome/offer/credential/reset emails | server/src/services/emailService.ts:48-98, 133-165; templates in server/src/services/offer-letter/* | High (onboarding & password reset flows) | New hires don't get credentials; failures only logged (`return false`) | Low: transport abstraction exists; tenant SMTP passwords stored in `app_config` (plaintext storage [Inferred]) |
| Sentry (`@sentry/node` 11.2.0, `@sentry/react` 11.2.0) | Error monitoring, opt-in via `SENTRY_DSN`/`VITE_SENTRY_DSN`, with PII scrubbing | server/src/instrument.ts:17-40+; server/src/app.ts:138; client/src/main.tsx:11-40 | Low (optional) | Loss of error visibility only | Low |
| Vercel | Hosting: static client + `@vercel/node` function at `server/src/index.ts`; CORS trusts `*.vercel.app` | vercel.json; server/src/app.ts:72-74 | Medium | Deploy target; note `index.ts` calls `app.listen` and runs boot seeding — serverless suitability [Unknown] | Low–Medium |
| Render | Alternative hosting: `ems-api` web service + `ems-client` static site | render.yaml | Medium | Same | Low |
| Google Fonts | Outfit/Inter/JetBrains Mono in app; Plus Jakarta Sans/Space Grotesk in offer-letter HTML | client/src/index.css:1; server/src/services/offer-letter/html-document.template.ts:29 | Low | Fallback fonts; render-blocking CSS import; GDPR consideration for EU tenants [Assumption] | Low (self-host) |
| PDFKit | Offer letters / documents PDF generation | server/src/services/offer-letter/pdf.generator.ts; (dead) server/src/utils/pdfGenerator.ts | Medium | Offer letters fail | Medium |
| Server Sent Events (in-house) | Realtime employee updates; token passed in query string | server/src/modules/realtime/connections/connections.service.ts:13; client EmployeeTable.tsx:126 | Low | Stale UI only | Low |
| Slack / Teams / generic webhooks | **UI-only**: URLs stored via `/settings/config`, never dispatched by server | client/src/modules/settings/components/IntegrationsTab.tsx:15-26; no dispatcher in server/src | None (not implemented) | — | n/a |
| File storage / CDN | **None.** No S3/Supabase Storage/Cloudinary/multer; avatars as base64 data URLs; templates and logos served from `server/public` | `git grep` for supabase/s3/cloudinary/multer → no code hits; Profile.tsx:245-255; app.ts:90 | — | Files tied to server disk/DB | Medium to introduce |
| Logo hosting | `APP_LOGO_URL` env → `tenants.logo_url` → `app_config.logo_url` | server/src/services/emailService.ts:102-126 | Low | Emails without logo | Low |

---

## Maintainability Assessment

**README** [Confirmed]: `README.md` is UTF-16 LE with BOM (`file` + `od` show `377 376`), so it renders poorly in many tools/diffs. Content is stale: lists "Nodemon, ts-node" as dev tools (scripts use tsx), describes server as "`index.ts` Primary API entry point and routes" (routes are in `app.ts` + 20 modules), roadmap still lists "Integration with a persistent Database (MongoDB/PostgreSQL)", "Email notifications" and "Profile picture uploads" (Postgres and email exist), and omits `.env` setup, `db:setup`, Supabase, tests and Release 0 runbooks.

**docs/** [Confirmed]: `docs/01…11_*.md` all last changed 2026-02-28 (requirements-era, 41–147 lines each); `10_technical_handover_guide.md` prescribes `tailwind-merge` (0 imports) and "Valibot or Zod". Current docs are `docs/audit/*` (2026-10-01/02), `docs/runbooks/{backup-restore,monitoring,staging}.md` (2026-10-02) and `docs/nexus/*` (2026-10-02/03) — these are the only up-to-date docs. `4D_FULLSTACK_SKILL_v2.13.md` (2,657 lines) at root is an AI-agent skill file, not project documentation.

**Onboarding friction** [Confirmed/Inferred]: High. `npm run db:migrate` / `db:seed` both run `scripts/db-setup.ts`, which chains three legacy schema scripts (`db-setup.ts:12-19`); `db:setup` runs `initDb.ts` only. The baseline README states these "cannot build a fresh database" (`server/db/baseline/README.md:3`) and the snapshot that should replace them is absent, so a new developer cannot create a correct local DB from the repo. There is no root `package.json`, no docker-compose, no `.env.example` (only root `file.sample`). Seeds create `admin@company.com` with known passwords. Positive: `server/scripts/staging/{guard,rebuild,seed,smoke}.ts` and `docs/runbooks/staging.md` exist.

**Code ownership & history** [Confirmed]: 45 commits, 3 merge commits; authors: Lovelyboy-Sri / Sridhar S (32), Adithyan78 (6), karthikdhanasekar… (4), Manu080405 (2), narendhar24 (1). Since 2026-04-28 essentially single-maintainer. Commit message quality was poor until 2026-10-01 — six identical "Permissions are handled properly" (2026-05-02), five "Product streamline" (2026-04-29), "Updated Code", "Make it stabilize", "All the repos are combined togather here" — large opaque commits (e.g. 83c1e84 touched 171 files, +77,810 lines). From 2e0ef84 (2026-10-02) onward, commits follow Conventional Commits with scoped messages (`feat(nexus):`, `docs(release-0):`). Local stale branches: adithyan, manu, narendhar, final-integration, unified-ems, release-0/safety-net. `att_ours.tsx`/`att_theirs.tsx` (empty) were introduced by 4bd4ff3, the manual "repos combined" merge. A `server/.env` with secrets was committed and later deleted by "Delete server/.env" (2c25bcf) — see E-02.

**Overall**: Maintainability is Low–Medium. Strengths: TypeScript strict mode passes on both sides, modular server folder convention (controller/service/repository/schema), Release 0 safety net and runbooks. Weaknesses: parallel dead implementations, five schema sources, high `any` usage (473), no lint, no CI, minimal tests, three brand names in code.

---

## Files reviewed

- client/package.json, server/package.json, .gitignore, render.yaml, vercel.json, file.sample (head), README.md (decoded), check_user.js (head), server/scratch_check_db.js (head)
- server/vitest.config.ts, client/vitest.config.ts, server/tsconfig.json, server/tsconfig.test.json (grep), client/tsconfig.json (grep), server/nodemon.json
- server/test/unit/app.test.ts, server/test/unit/workspace.test.ts, server/test/integration/authz.matrix.test.ts, server/test/integration/harness.test.ts, server/test/setup/db-guard.ts, server/test/setup/integration.global.ts, server/test/setup/seed.ts (1-40); client/src/components/ui/form.test.tsx and client/src/modules/auth/pages/LoginPage.test.tsx (test names)
- server/src/app.ts, server/src/index.ts (1-30, 53-90), server/src/instrument.ts (1-40), server/src/config/db.ts (1-60), server/src/config/env.ts, server/src/database/client.ts, server/src/db.ts (head), server/src/middleware/authMiddleware.ts (head)
- server/src/modules/{governance,performance,notifications,realtime,settings,audit}/index.ts
- server/src/modules/auth/auth.service.ts (10-40), server/src/modules/payroll/payroll.service.ts (15-35, 108-128, 183-230), server/src/modules/leaves/leaves.service.ts (grep), leaves.controller.ts (grep), server/src/services/emailService.ts (40-175), server/src/initDb.ts (480-505 + grep), server/scripts/db-setup.ts, server/db/baseline/README.md (1-50)
- client/src/modules/auth/pages/LoginPage.tsx (8-25), client/src/store/authStore.ts (100-112), client/src/services/api.ts (40-60), client/src/modules/employees/components/EmployeeTable.tsx (115-130), client/src/main.tsx (1-40), client/src/modules/profile/pages/Profile.tsx (245-262), client/src/utils/cleanup_data.js (head), client/src/modules/settings/components/IntegrationsTab.tsx (grep), client/src/components/ui/index.tsx (exports grep)
- docs/10_technical_handover_guide.md (1-30), docs/audit/AUDIT_PROGRESS.md (head), docs/*.md / docs/runbooks / docs/nexus (git dates, line counts)
- Grep-only (git grep) across server/src, client/src, server/scripts for: tenant_default, URLs, emails, brand names, statutory rates, any/ts-ignore/console/TODO, role checks, authorize(), importers of candidate dead files, pool.query in controllers, swallowed catches, storage/CDN keywords, dependency imports
- Command outputs: server tsc, server unit tests, client tsc, client tests, client lint; git log / shortlog / branch; git log of server/.env (keys only, values redacted)
