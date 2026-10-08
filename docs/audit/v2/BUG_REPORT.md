# Bug Report (from executed Playwright run, 2026-10-06)

Run context: throwaway local Postgres, fallback (drifted) schema, API :4100, client :3000. See `PLAYWRIGHT_TEST_REPORT.md`.
Evidence root: `docs/audit/v2/e2e/` (`artifacts-main/`, `artifacts-auth/`). Level: **Confirmed** = reproduced at runtime; **Inferred** = from code; **Unknown** = not verified.

## Ranked application bugs

### BUG-1 (High, Confirmed): Managers can read the full Settings roles and users lists
- **Repro**: log in as `manager@ems-staging.example.test`; `GET /api/v1/settings/roles` and `GET /api/v1/settings/users` with the manager's Bearer token -> **200** with all roles (with permission lists) and all users (name, email, role, `is_active`, `last_login`, `role_id`, department). Employee gets 403 on the same call.
- **Cause (Confirmed in code)**: `settings.routes.ts` guards the router with `authorize(['admin','super_admin','hr','settings:manage'])`. `hasAccess()` in `core/security/authorize.ts` resolves role-name entries through `ROLE_TO_PERMISSIONS` and passes if the user holds **any one** of the mapped permissions. `admin` maps to `employees:view`/`reports:view`, which managers hold. The same fall-through applies to every route that uses legacy role-name guards (blast radius beyond Settings: Unknown, needs a sweep).
- **Mitigation seen**: mutating settings calls were denied for the manager (`POST /settings/roles`, `PUT users/:id/role`, `PUT users/:id/status`, `POST users/:id/reset-password` all 403 at runtime), so this is information disclosure plus role-model leakage, not privilege escalation, for those routes.
- **Evidence**: test "MANAGER denied payroll, settings, audit logs, admin report" in `artifacts-main/results.json` (failure at `settings/roles`); trace in `artifacts-main/test-results/02-rbac-api-RBAC-Manager-*`.

### BUG-2 (Medium, Confirmed): Non-HR users cannot update their own profile via `PUT /employees/:id` (was B-1)
- **Repro**: as `employee@...`, `PUT /api/v1/employees/EMP-TEST-EMPLOYEE` `{"phone":"9999999999"}` -> **403** "You are only authorized to update your own profile."
- **Cause**: `employees.controller.ts:50` calls `isEmployeeOwner(targetId, user.email, user.userId)` but the service signature is `(employeeId, tenantId, email, userId)`; arguments are shifted so the ownership query can never match. `user` is `any`, so `tsc` does not flag it.
- **Impact**: any client using this endpoint for self-service edits fails. Whether the Profile UI uses another route (`PUT /auth/me`) was not tested (Unknown).
- **Evidence**: test EMP-08, `artifacts-main/test-results/04-crud-workflows-Employees-*EMP-08*`.

### BUG-3 (Medium, Confirmed): CORS trusts any `*.vercel.app` origin with credentials (was B-2)
- **Repro**: `curl -H "Origin: https://attacker-example.vercel.app" <api>/health` -> `access-control-allow-origin: https://attacker-example.vercel.app` (with `credentials: true`).
- **Cause**: `app.ts` `origin.endsWith('.vercel.app')`. Practical impact limited while tokens are Bearer headers rather than cookies (Inferred); still a standing misconfiguration.
- **Evidence**: test "CORS: arbitrary *.vercel.app origin ..." failed with the reflected origin.

### BUG-4 (Medium, Confirmed): No standard security response headers
- `x-content-type-options` (and, by the same cause, likely the other helmet headers: Unknown, only nosniff asserted) is absent from API responses. No `helmet` middleware.
- **Evidence**: test "x-content-type-options: nosniff present" failed (`undefined`).

### BUG-5 (Medium, Confirmed): Leave can be applied with end date before start date
- **Repro**: employee `POST /api/v1/leave/apply` `{"leave_type_id":1,"start_date":"2026-12-20","end_date":"2026-12-10"}` -> **201**, row stored as pending. `applyLeaveSchema` has bare strings; no date-order check at service level either.
- **Evidence**: test LV-03 (`Expected >= 400, Received 201`); the created row is leave id 4 in the (deleted) throwaway DB.

### BUG-6 (Low, Confirmed in code and observed in requests): JWT in URL query for SSE
- The client opens `GET /api/v1/realtime/stream?token=<full access JWT>`; tokens in URLs leak into access logs, proxies and history. Observed in the navigation smoke test network capture (`artifacts-main/results.json`, `failed-requests` annotation).

### BUG-7 (Low, Confirmed in code): Client logout does not call the server
- `Topbar.tsx handleLogout` runs `logout(); navigate('/login')` only; `POST /auth/logout` is never called, so server-side session/refresh state (if any) stays valid. Whether the server tracks sessions is Unknown. Logout UI flow itself passed (AUTH-04).

### BUG-8 (Low, Confirmed intermittently): icon-only buttons without accessible names
- On the dashboard 3 buttons (collapse toggle and two header icon buttons) have no text/`aria-label`/`title`: `<button class="w-8 h-8 ... hover:text-indigo-600 ...">` (svg only). The a11y test failed in 3 early runs and passed in the last; the count depended on which widgets rendered. Evidence: failure messages in earlier runs (not preserved) and test "dashboard: images have alt, buttons have names ...".

### BUG-9 (Info, Confirmed in dev only): demo credentials pre-filled on the login page
- `vite dev` pre-fills `admin@company.com` / `Admin@123`. Stripped in production builds per code (prod bundle not inspected). Test AUTH-11 fails by design in dev.

### BUG-10 (Low, Confirmed in code): 5199 vs CORS, shared limiter (was B-3, B-5)
- `.claude/launch.json` serves the client on 5199, which the CORS allow-list rejects (observed: use 3000/5173). The in-memory `authLimiter` (10/15 min/IP) was reached repeatedly by an ordinary test run; behind a proxy without `trust proxy` it could lock real users out (Unknown: `trust proxy` not checked).

## Previous B-1..B-5: confirm/refute
| Old ID | Verdict |
|---|---|
| B-1 own-profile PUT arg shift | **Confirmed** (BUG-2) |
| B-2 CORS *.vercel.app | **Confirmed** (BUG-3) |
| B-3 port 5199 vs CORS | **Confirmed** (CORS rejected the 5199 origin by design; env/dev-tooling issue) |
| B-4 dev prefill | **Confirmed** in `vite dev`; prod bundle Unknown |
| B-5 authLimiter | **Confirmed** (limiter tripped in normal test volume; proxy impact Unknown) |
| "suspected IDOR" on employee education/experience/emergency contacts, other-employee update, claims on behalf/read-other | **Refuted at runtime**: all denied (tests passed) |
| `employees/check-email`, `/roles` open to any authenticated user | Not tested (Unknown) |

## Test/environment issues (not app bugs)
| ID | Issue |
|---|---|
| E-1 | `server/db/baseline/0000_live_schema.sql` missing; repo schema scripts cannot build a working schema (columns/tables missing: tenants.plan/max_employees/is_active, employees.avatar_url etc., users.avatar_url, departments.code, audit_logs.tenant_id, leave_requests.approved_by, others). 500s from these were environment, not product defects. |
| E-2 | Local Postgres on :5432 required a password; resolved by private throwaway cluster on :55432 (approved), since deleted. |
| E-3 | Port collision with the developer's running API (:4000) / Vite (:5173) in the first attempt (see report section 2 incident). `run-local.ps1` needs a free-port check. |
| E-4 | authLimiter forces two-batch runs; early 429s masked results. |
| E-5 | Serial-mode worker restarts skipped EMP-07, LV-04, LV-05. |
| E-6 | Leave approve and downstream notification behaviour unverified (schema + test body bug). |

## Not verified
Leave approval flow, payroll run, report exports, HR/super_admin role journeys, cross-tenant isolation, production-schema behaviour. Severity rankings are runtime-confirmed only for BUG-1..5 and BUG-9.
