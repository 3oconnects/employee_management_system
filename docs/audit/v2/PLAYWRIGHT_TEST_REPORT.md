# Playwright E2E Test Report (executed)

Date: 2026-10-06 | Branch: feat/profile-visibility-by-viewer | Browser: Chromium (headless shell 153) | Workers: 1

## 1. Result summary

| Batch | Scope | Passed | Failed | Skipped / not run | Total |
|---|---|---|---|---|---|
| Main | specs 02-06 (RBAC API+UI, CRUD/workflows, responsive/a11y, negative/interception) | 104 | 5 | 3 | 112 |
| Auth | spec 01 (run on a freshly restarted API, see 3.2) | 10 | 1 | 0 | 11 |
| **Total** | | **114** | **6** | **3** | **123** |

Of the 6 failures, **5 are real application findings** (confirmed at runtime) and **1 is an expected dev-build observation** (AUTH-11). The 3 skips are
test-design artifacts, not app results (see 4.3). Details of the 6 are in section 4.

Honesty notes up front:
- The DB schema was **not** the production baseline (see 2). Several flows hit missing columns; those results are marked as environment-limited. Leave approval and a few dashboards were never exercised successfully.
- The final suite file differs slightly from the code that produced these numbers: after the last run I changed the leave-approve request body (`status` -> `action`) in `04-crud-workflows.spec.ts`. That edit was **not re-run** (the DB was already torn down).
- Test-side fixes made during iteration (selectors, response shapes, per-describe serial mode, rate-limit batching) were applied between runs; the numbers above are from the last complete runs only.

## 2. Environment (what actually ran)

| Item | Detail |
|---|---|
| DB | Private throwaway Postgres 17.5 cluster (`initdb --auth=trust`, 127.0.0.1:55432, DB `ems_audit_e2e`), created under the session scratchpad. **Stopped and its data dir deleted.** The existing Postgres on :5432 and the Supabase DB were never touched. |
| Schema | `server/db/baseline/0000_live_schema.sql` does **not exist**, so `staging/rebuild.ts` is BLOCKED (B0-01). Fallback: `src/initDb.ts` + `src/db/schema.ts initializeDatabase` + `migration_v3` against the throwaway DB only. `migration_v3` failed on `tenants.is_active`, `plan`, `max_employees`; I added those and later `employees.avatar_url/education_history/experience_history`, `users.avatar_url`, `departments.code`, `audit_logs.tenant_id` by hand (all in the throwaway DB). Still missing at the end: e.g. `leave_requests.approved_by`. This confirms the baseline README claim that the repo schema scripts cannot build a working DB (**Confirmed**). |
| Seed | `scripts/staging/seed.ts` logic via `e2e/scripts/seed-local.ts` (synthetic `@ems-staging.example.test` users: admin, hr, manager, employee, super_admin, custom; 14 extra employees; leave types inserted manually). Seed password generated for the run, not recorded. |
| API | `server/src/index.ts` on **:4100** with process-env overrides (local DB, test JWT secrets meeting HF-2, `GMAIL_*`/`SMTP_*` set empty so mail cannot send, `SENTRY_DSN` empty). `server/.env` not edited; dotenv did not override. |
| Client | Vite on **localhost:3000** (an allowed CORS origin), `VITE_API_URL` -> :4100. |
| Mail | Disabled by empty env; no email transport configured; no real emails sent. |

### Incident to disclose (safety)
The developer's own servers were already running on this machine (an API on **:4000** and a Vite on **:5173**). My first `run-local.ps1` attempt used 4000/5173, hit EADDRINUSE on the server, and the suite's **global setup sent 3 login requests (synthetic seed emails + a throwaway password) to the developer's API on :4000**, which answered 401. That API likely uses the remote DB. No other request was sent to it, no data could be created (logins failed), and I then moved to ports 4100/3000. Later I also issued one `GET /health` to :4000 several times to confirm it was still alive (it was). **The Vite on :5173 was listening at the start and was not listening at the end**; my commands only stopped processes on 4100/3000 and processes whose command line matched my own API, so I believe it exited independently (the machine's clock also jumped about 1h50m mid-session), but I cannot prove that. The :4000 API is still up.
`run-local.ps1` has the same port-collision hazard (it does not check that 4000/5173 are free); use `scripts/restart-api.sh` (port 4100, kills only its own port) or fix the script before reuse.

## 3. Coverage

### 3.1 Coverage by feature and role (123 tests)

Legend: P = pass, F = fail, S = skipped, - = not applicable/not covered.

| Feature | Guest | Employee | Manager | Admin | Result |
|---|---|---|---|---|---|
| Login/logout/invalid creds/validation/enumeration | P | P | - | - | 10 P, 1 F (AUTH-11 dev prefill) |
| Session expiry (401 interception), refresh/forgot/reset (no real mail) | P | P | - | - | all P |
| API 401 for unauthenticated (19 endpoints), health, repair-identity | P | - | - | - | all P |
| API privilege denial (payroll, reports, claims, settings, audit, create/delete/update-other, approve) | - | P | **F** (settings read) | - | 1 F |
| UI route guards (direct URL / in-app / nav visibility) | P | P | P | P | all P |
| Employees CRUD, search, filter, sort, validation, XSS | - | - | - | P (EMP-01..06) | EMP-08 F (own-profile update), EMP-07 S |
| Leave apply/validate | - | P/F | - | - | LV-02 P, LV-03 **F** (date order) |
| Leave approve | - | S | - | S | **not verified** (test serial artifact + schema gap `approved_by`) |
| Claims submit/validate/IDOR/approve/validation | - | P | - | P | all P |
| Attendance check-in/out/history/regularize | - | P | - | - | all P |
| Approvals, dashboards x3, notifications, export data sources | - | P | P | P | all P |
| Responsive mobile/tablet/desktop (no h-scroll) + screenshots | - | P | - | P | all P (6) |
| Navigation smoke of 13 modules (console/network capture) | - | - | - | P | P (SSE stream abort filtered) |
| A11y basics | P | P | - | - | login P; dashboard P in last run, F in earlier runs (3 icon-only buttons, intermittent) |
| Malformed responses (500, HTML, null, empty, abort, slow, 429) | - | - | - | P | all P (7) |
| Negative UI/forms (XSS login, empty leave form, 404 route, stored-XSS render) | - | P | - | P | all P (4) |
| CORS / security headers | P | - | - | - | 2 F (vercel origin, nosniff) |

Not covered: real CSV/PDF export download, bulk upload, payroll run, timesheet submission flow, onboarding, org chart interactions, settings role editing, HR/super_admin role journeys, cross-tenant isolation, axe-core, Firefox/WebKit, HR approval of leave (blocked), password-reset email delivery (mail intentionally disabled).

### 3.2 Rate limiter and batching (test/env issue)
`authLimiter` allows 10 `/auth/*` requests per 15 min per IP (in memory). The suite exceeds 10 auth calls, so it ran in two batches with the API restarted between them (`scripts/restart-api.sh`; auth batch runs with `E2E_SKIP_SETUP=1` to reuse cached logins). Early runs saw 429s that masked results (e.g. repair-identity, AUTH-02, AUTH-06); those were test/env issues and the final runs have none in the auth tests.

## 4. Failed-test analysis (final runs)

### 4.1 App bugs (confirmed at runtime)
| Test | Failure | Verdict | Bug |
|---|---|---|---|
| MANAGER denied ... settings/roles | Manager got **200** on `GET /settings/roles` (and `/settings/users` by curl) | App bug | BUG-1 |
| EMP-08 employee updates own profile | `PUT /employees/<own id>` -> **403** "only authorized to update your own profile" | App bug | BUG-2 (was B-1) |
| CORS arbitrary *.vercel.app | `access-control-allow-origin: https://attacker-example.vercel.app` | App bug | BUG-3 (was B-2) |
| x-content-type-options | header absent (no helmet-style headers) | App bug | BUG-4 |
| LV-03 end before start | `POST /leave/apply` with end < start -> **201** | App bug | BUG-5 |

### 4.2 Expected observation
| AUTH-11 | login prefilled `admin@company.com` under `vite dev` | Confirms B-4; dev build only, not a prod defect | BUG-9 |

### 4.3 Test/env issues (not app bugs)
- EMP-07, LV-04, LV-05 skipped: Playwright restarts the worker after a failure in the same file, losing shared variables (`createdId`, `leaveId`). Not an app result.
- Leave approve body was wrong in the suite (`status` instead of `action`); fixed afterwards, not re-run. By curl, employee -> 403 (correct); admin approve -> 500 because of schema drift (`leave_requests.approved_by` missing) = env.
- Earlier-run failures resolved on the test side: employee list is a card grid, not a table; manager `/payroll` is a self-service "My Payroll" page by design; `reports/manager|employee` need `?userId=`; employee create returns `{employeeId}`; leave types return `{items}`; logout is in the avatar menu (`Sign Out`); Time Off link name.
- 500s from missing columns (employees list, notifications, audit logs, dashboards) in early runs were schema drift in the fallback schema, not app defects.

## 5. Evidence paths (all under `docs/audit/v2/e2e/`, gitignored)
- `artifacts-main/` : html-report, `results.json`, `test-results/**` (screenshot per test, `trace.zip` for 111, `video.webm` for failures), `shots/*.png` (dashboards at mobile/tablet/desktop, 13 admin modules).
- `artifacts-auth/` : same for spec 01.
- API server log was in `/tmp/api.log` (not preserved); notable server errors: `column ... does not exist` (schema drift only).

## 6. Evidence discipline
- **Confirmed**: everything in 4.1 (assertion output + curl); schema baseline missing; local mail disabled via env; counts in section 1.
- **Inferred**: BUG-1 is caused by `ROLE_TO_PERMISSIONS` fallthrough (code read at `core/security/authorize.ts`, behaviour confirmed).
- **Assumption**: that the :5173 Vite exited on its own.
- **Unknown**: leave approval behaviour, payroll run, exports, behaviour on the real production schema (drifted columns could change results), a11y flakiness cause, source of one observed 429 on the dashboard (apiLimiter 300/min vs authLimiter).

## 7. Re-running
```bash
cd docs/audit/v2/e2e && npm install && npm run install:browsers
# local DB (never Supabase) -> API on :4100 via scripts/restart-api.sh, Vite: VITE_API_URL=http://localhost:4100/api/v1 npx vite --port 3000 --strictPort (in client/)
export E2E_API_URL=http://localhost:4100/api/v1 E2E_CLIENT_URL=http://localhost:3000 E2E_SEED_PASSWORD=<seed pw>
npx playwright test --grep-invert "AUTH-"      # then restart API, then:
E2E_SKIP_SETUP=1 npx playwright test 01-auth
```
`scripts/seed-local.ts` and `scripts/schema-local.ts` are the local-only fallbacks used because the baseline snapshot is missing.
