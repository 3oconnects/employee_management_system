# Track D — Security, Performance & Infrastructure

Repository: `D:\AI_dev\Google_Antigravity\employee_management_system` · HEAD `06dc08f` (branch `feat/nexus-brand-foundation`) · Read-only review.
Labels: **[Confirmed]** = read in code at HEAD · **[Inferred]** = follows from code read, not executed · **[Assumption]** · **[Unknown]** = not enough evidence found in repository.
Secrets are redacted to the first 4 characters.

---

## Phase 5. Security Audit

### 5.0 Summary table

| ID | Severity | Finding | Status vs prior audit (83c1e84) |
|---|---|---|---|
| SEC-01 | **Critical** | Hardcoded master password for `admin@company.com` (`admin123` / `Admin@123`) accepted regardless of the stored hash | **Still present** |
| SEC-02 | **Critical** | Password-reset takeover: any authenticated user can approve any `password_reset` approval; reset token is optional and leaked by an unauthenticated status endpoint | **Still present** (and the chain is wider than reported) |
| SEC-03 | **Critical** | `/approvals/:id/action` has no authorization: any employee can approve their own leave, claims, timesheets, onboarding, department/team creation | Still present |
| SEC-04 | **Critical** | Payroll module has no authorization: any employee can read all salaries, edit salary structures, and run payroll | New in this track |
| SEC-05 | **Critical** | `GET /reports/profile/:employeeId` returns bank account, CTC, payroll profile, documents and emergency contacts for any employee in **any tenant** | New |
| SEC-06 | **High** | `authorize()` legacy role-name mapping lets a **manager** pass `admin`/`hr` guards → full `/settings` (role creation with `dashboard_type=admin`, role assignment, password resets) | New |
| SEC-07 | **High** | Secrets in git history (Supabase pooler `DATABASE_URL` with credentials, JWT secrets) — removed in `2c25bcf` but not purged; rotation unverifiable | **Still in history** |
| SEC-08 | **High** | JWT secrets fall back to hardcoded defaults (`ems_secret`, `ems_refresh_secret`) when env vars are missing | New |
| SEC-09 | **High** | Refresh tokens are stored but never compared → no rotation enforcement, logout does not revoke, stolen refresh token valid 7 days | New |
| SEC-10 | **High** | Temporary passwords stored in plaintext (`users.temp_password`), accepted at login by plain string compare, retrievable via API; generated with `Math.random()` | New |
| SEC-11 | **High** | `db:setup` (`initDb.ts`) resets `admin@company.com` password to `admin123` and reactivates it; startup seeding forces it to `super_admin` on every boot/cold start | New |
| SEC-12 | **High** | IDOR / missing tenant scoping on employee education/experience/emergency-contacts reads, timesheet entry writes, leave/claim/timesheet state changes, audit-log read | New |
| SEC-13 | **High** | Sensitive columns (`annual_ctc`, `bank_account_number`) returned by `GET /employees` (`SELECT e.*`) to every authenticated role incl. `employee` | New |
| SEC-14 | Medium | Rate limiting: no `trust proxy` → per-IP limits likely keyed on the platform proxy (shared bucket); auth limiter also throttles `/auth/me`, `/auth/refresh`; no per-account lockout | Partially known (R0-F4) |
| SEC-15 | Medium | No security headers (no `helmet`, no CSP/HSTS/X-Frame-Options anywhere) | New |
| SEC-16 | Medium | Tokens (access + refresh) persisted in `sessionStorage`; access token passed in `?token=` query for SSE and accepted by `authenticate` for every route | New |
| SEC-17 | Medium | CORS allows any `*.vercel.app` origin with `credentials: true` | New |
| SEC-18 | Medium | Weak password policy (server min 6 chars), user enumeration on forgot-password, approvals never expire | New |
| SEC-19 | Medium | HTML emails interpolate user-controlled values without escaping (HTML injection in company-branded mail); temp passwords sent by email | New |
| SEC-20 | Medium | Audit logging: fire-and-forget in-process event, failures swallowed, spoofable `X-Forwarded-For` IP, readable by every authenticated user, no tamper-resistance | New |
| SEC-21 | Medium | `documents` module stores only client-supplied metadata (`filePath` string); ownership check only for the literal role name `employee`; upload for any `employeeId` | New |
| SEC-22 | Low | Dependency vulns: server 1 moderate (`qs`); client 3 high (`axios`, `form-data`, `lodash`) + 4 moderate (`react-router*`, `follow-redirects`) | New |
| SEC-23 | Low | Stray scripts committed with DB access, password backfill, plaintext temp-password dump (`server/scratch/*`, `check_user.js`, `server/scratch_check_db.js`) | Still present |
| SEC-24 | Low | 50 MB JSON body limit; avatars stored as base64 data URIs in DB | New |
| SEC-25 | Info | SQL injection: no user-controlled SQL concatenation found; dynamic `SET` clauses use whitelisted column maps | — |
| SEC-26 | Info | Error leakage: stack traces only when `NODE_ENV=development`; Sentry scrubbing is thorough | — |
| SEC-27 | Info | `adm-zip` is a declared dependency but not imported anywhere → no zip-slip surface today; no file upload middleware (`multer`) exists | — |

---

### 5.1 Authentication

**SEC-01 — Hardcoded master password (Critical) [Confirmed] — still present at HEAD**
- Evidence: `server/src/modules/auth/auth.service.ts:23-25`
  ```ts
  if (!validPassword && email.toLowerCase() === 'admin@company.com' && (passwordRaw === 'admin123' || passwordRaw === 'Admin@123')) {
      validPassword = true;
  }
  ```
- Amplifiers: `server/src/scripts/seedPermissionsAndSuperAdmin` runs on **every server start** (`server/src/index.ts:219`) and forces `admin@company.com` to `role='super_admin'` with the super_admin role id (`server/src/scripts/seedPermissions.ts:138-149`). On Vercel this runs on each cold start (`index.ts:158-160` registers events, then the same `start()` continues to `seedPermissionsAndSuperAdmin`). `authorize()` unconditionally passes `super_admin` (`server/src/core/security/authorize.ts:89`).
- Risk: anyone who knows the (public, in-repo) password owns the tenant whenever that account exists and is active.
- Fix: delete lines 23-25; remove the `admin@company.com` override from `seedPermissions.ts:138-149`; force a password change for that account in production; add a regression test.

**SEC-08 — JWT secret fallbacks (High) [Confirmed]**
- Evidence: `server/src/config/env.ts:8-9` — `JWT_SECRET: z.string().default('ems_secret')`, `JWT_REFRESH_SECRET: z.string().default('ems_refresh_secret')`. Used by `server/src/core/security/jwt.service.ts:10,14,18,22`.
- Also: `server/.env.example` and `file.sample` ship `JWT_SECRET=ems_****` example values; if copied verbatim the secret is public.
- Risk: a deploy missing the env var silently signs tokens with a public secret → anyone can mint a `super_admin` token.
- Fix: `z.string().min(32)` with no default when `NODE_ENV=production`; fail fast at boot.

**SEC-09 — Refresh token not validated against storage (High) [Confirmed]**
- Evidence: login stores the token (`auth.service.ts:50` → `auth.repository.ts:73-78`), but `refresh()` (`auth.service.ts:60-96`) only verifies the JWT signature and loads the user; it never compares to `users.refresh_token`. `logout()` sets the column to NULL (`auth.service.ts:98-100`), which therefore has no effect.
- Token lifetimes: access 15 m, refresh 7 d (`jwt.service.ts:5-6`). Refresh tokens contain no `jti`.
- Risk: no revocation; a leaked refresh token (sessionStorage, see SEC-16) is usable for 7 days even after logout or password change. Deactivation is honoured on refresh (`findUserById` filters `is_active`, `auth.repository.ts:35`), but the access token stays valid up to 15 m.
- Fix: store a hash of the refresh token (or a `jti` family) and compare on refresh; rotate and detect reuse; revoke all on password change/logout.

**SEC-10 — Plaintext temporary passwords (High) [Confirmed]**
- Login accepts `temp_password` by direct string compare: `auth.service.ts:20-22`.
- Stored in plaintext: `server/src/modules/settings/user-assignments/user-assignments.repository.ts:53-58` (`temp_password=$2` with the plain value), called from `user-assignments.service.ts:63,80,94` (note `updatePassword` stores the *admin-chosen permanent* password as `temp_password` too, line 94).
- Retrievable via API: `GET /settings/users/:id/temp-password` → `user-assignments.service.ts:85-89`.
- Generated with `Math.random().toString(36).slice(-10).toUpperCase()` (`user-assignments.service.ts:32,60,78`; `employees.service.ts:113`) — not a CSPRNG.
- Fix: never store plaintext; use `crypto.randomBytes`; one-time, expiring reset links instead of emailed passwords.

**SEC-18 — Password policy / enumeration (Medium) [Confirmed]**
- Server minimum 6 chars (`auth.service.ts:123,220`; `auth.schema.ts:30-31`); client asks for 8 (`client/src/modules/auth/pages/ChangePasswordPage.tsx:26`). bcrypt cost 10 (`server/src/core/security/password.service.ts:5`) — acceptable but low-end.
- Forgot-password reveals account existence: `auth.service.ts:144-146` throws "No registered user account found with this email address."
- No account lockout / failed-attempt counter anywhere in `auth.service.ts` (only the IP limiter, SEC-14).

**SEC-11 — Admin password reset by setup script (High) [Confirmed]**
- `server/src/initDb.ts:449-465`: if `admin@company.com` exists, `UPDATE users SET password = <bcrypt('admin123')>, is_active = true, deleted_at = NULL`. Also `server/src/db/schema.ts:534-551` seeds `admin@company.com / admin123`. Both are run by `npm run db:migrate|db:seed` (`server/scripts/db-setup.ts:12-19`).
- Risk: running setup against production silently restores a known admin credential and undeletes the account.
- Fix: remove credential seeding from migration paths; seed admins only via an explicit, interactive bootstrap.

### 5.2 Authorization / RBAC

How it works: `authenticate` decodes the JWT and copies `role`, `dashboard_type`, `permissions[]` into `req.user` (`authorize.ts:5-55`). `authorize(list)` passes on `role==='super_admin'` or `dashboard_type==='admin'` (`authorize.ts:88-93`); entries with `:` must be in `permissions[]`; bare role names are expanded through `ROLE_TO_PERMISSIONS` and pass if the user holds **any one** of the mapped permissions (`authorize.ts:69-75,105-111`).

**SEC-06 — Role-name mapping escalates managers (High) [Confirmed in code / Inferred for prod data]**
- `ROLE_TO_PERMISSIONS.admin` includes `employees:view` and `reports:view`; `.hr` includes `employees:view`, `leave:approve` (`authorize.ts:71-72`). The default `manager` role is seeded with `employees:view`, `leave:approve`, `reports:view` (`server/src/db/schema.ts:376-383`).
- Therefore a manager passes `authorize(['admin','super_admin','hr','settings:manage'])` on the whole settings router (`server/src/modules/settings/index.ts:11`) and `adminOnly` in organization (`server/src/modules/organization/organization.routes.ts:11`).
- From `/settings` a manager can: create a role with `dashboard_type='admin'` (`server/src/modules/settings/rbac/rbac.service.ts:51-56`, repository `rbac.repository.ts:41-43`) → assign it to themselves via `PUT /settings/users/:id/role` (`user-assignments.service.ts:98-103`, no check on target role) → `dashboard_type==='admin'` bypasses every guard. Also reset any user's password and read temp passwords.
- [Inferred] Exact production impact depends on the live `role_permissions` rows; `server/db/baseline/0000_live_schema.sql` is not committed so this cannot be verified.
- Fix: drop the legacy role-name expansion; guard routes with explicit `module:action` permissions only; forbid assigning roles with more privileges than the actor holds.

**SEC-03 — Approvals action unguarded (Critical) [Confirmed]**
- `server/src/modules/approvals/approvals.routes.ts:10,14` — only `authenticate`. Controller `approvals.controller.ts:20-25` and service `approvals.service.ts:25-92` take `type` from the body and update leave / employee status / timesheet / claim / approval rows with only a tenant filter. No check that the actor is an approver, nor that the actor is not the requester.
- `POST /approvals` (`approvals.routes.ts:13`) lets anyone create an approval row of any `type`/`status` for any `employeeId` (`approvals.service.ts:20-23`).
- `GET /approvals` returns rows where `ap.tenant_id IS NULL OR ''` across tenants (`approvals.repository.ts:10`), and the role filter only applies when the role string is exactly `manager` or `employee` (`approvals.repository.ts:13`), so custom roles see everything.
- Fix: require `approvals:manage` (or per-type permissions), verify the actor is the assigned approver and ≠ requester, whitelist `type`.

**SEC-02 — Password reset takeover chain (Critical) [Confirmed] — still present, wider than prior report**
1. Unauthenticated `POST /auth/forgot-password {email: victim}` creates approval `PR-<ts>` and **returns `requestId`** (`auth.service.ts:168-190`).
2. Any authenticated user in the victim's tenant: `POST /approvals/PR-<ts>/action {action:'approve', type:'password_reset'}` → falls into the generic `else` branch (`approvals.service.ts:89-91`) → `UPDATE approvals SET status='approved'` (`approvals.repository.ts:199-204`).
3. Unauthenticated `GET /auth/forgot-password/status?email=victim` returns the `resetToken` once approved (`auth.service.ts:204-207`); `POST /auth/forgot-password` also returns it (`auth.service.ts:158-164`).
4. Unauthenticated `POST /auth/reset-password {email, newPassword}` — the token is **only checked if supplied** (`auth.service.ts:246`: `if (req.metadata?.reset_token && resetToken && ...)`).
- Even without step 2 by an attacker, once an admin legitimately approves *any* user's reset, any anonymous party knowing the email can set that user's password first. Approvals have no expiry.
- Fix: mandatory, single-use, short-lived token delivered out-of-band (email link), never returned by an API; separate privileged approval endpoint; rate-limit per email.

**SEC-04 — Payroll unguarded (Critical) [Confirmed]**
- `server/src/modules/payroll/payroll.routes.ts:10-26` — `authenticate` only, no `authorize` on any route. `GET /payroll/employees` returns `annual_ctc` etc. (`payroll.repository.ts:4-12`); `PUT /payroll/employees/:id` edits salary structure; `POST /payroll/process` runs payroll (`payroll.controller.ts:54-58` → `payroll.service.ts:200-254`).
- Fix: `payroll:read` / `payroll:manage` permissions; employees get only their own payslips.

**SEC-05 — Cross-tenant employee profile (Critical) [Confirmed]**
- `server/src/modules/reports/reports.routes.ts:8,21` (authenticate only) → `reports.controller.ts:34-40` → `server/src/services/analyticsService.ts:636-698`: every query is `WHERE e.id = $1` / `employee_id = $1` with **no tenant filter**; selects `bank_account_number`, `annual_ctc`, plus `SELECT * FROM payroll_profiles`, documents, emergency contacts.
- Same pattern: `getManagerDashboard`, `getEmployeeDashboard`, `getTeamEmployees` take `userId`/`managerId` from the query string with no ownership or tenant check (`reports.controller.ts:13-32`). `GET /reports/admin` (salary distribution, `analyticsService.ts:~100`) is available to every authenticated user.
- Fix: tenant predicate on every query; `reports:view` permission; self-only for employees.

**SEC-12 — Other IDOR / tenant-scope gaps (High) [Confirmed]**
| Endpoint | Evidence | Problem |
|---|---|---|
| `GET /employees/:id/education|experience|emergency-contacts` | `employees.controller.ts:64-67,81-84,98-101`; repo `employees.repository.ts:209-213,249-253,283-287` | No auth check, no tenant filter → cross-tenant read |
| `PUT /employees/:id/education` etc. (HR path) | `employees.controller.ts:69-79` | HR/admin role-name check only; repository has no tenant filter |
| `PUT /employees/:id` | `employees.controller.ts:41-61`; `employees.repository.ts:124,134` | Update matches `tenant_id = $n OR tenant_id='tenant_default' OR 'default'` → any tenant can edit default-tenant rows; non-admin path uses a blacklist of fields |
| `PUT /timesheets/:id/entries` | `timesheets.controller.ts:19-22`; `timesheets.service.ts:28-44`; `timesheets.repository.ts:29-35` | No tenant, no owner check; also not actually transactional (repo uses `pool`, not the transaction `client`) |
| `PUT /timesheets/:id/approve`, `PUT /leave/:id/approve`, `PUT /claims/:id/status` | `timesheets.controller.ts:30-35`; `leaves.controller.ts:27-33`; `claims.controller.ts:25-29` | No permission check; `approved_by` accepted from request body |
| `PUT/DELETE /leave/requests/:id` | `leaves.controller.ts:35-45`; `leaves.repository.ts:46-54` | Any user in tenant can edit/delete anyone's pending leave |
| `GET /leave`, `GET /claims`, `GET /timesheets/pending` | `leaves.controller.ts:20-25`, `leaves.repository.ts:18-35`; `claims.controller.ts:19-23`; `timesheets.controller.ts:44-48` | Tenant-wide lists for every role |
| `GET /audit-logs` | `server/src/modules/audit/read/read.routes.ts:8-9` | Any authenticated user reads the tenant audit trail |
| `GET /documents/:employeeId` | `server/src/modules/documents/documents.service.ts:12-20` | Ownership enforced only when role string equals `employee`; custom roles bypass |

**SEC-13 — Salary/bank data in employee list (High) [Confirmed]**
- `GET /employees` allows the `employee` role (`employees.routes.ts:47`), and `findMany` selects `e.*` (`employees.repository.ts:7-21`). `employees` has `annual_ctc` and `bank_account_number` columns (`server/src/initDb.ts:308,314`). `getEmployees` returns rows unfiltered (`employees.service.ts:37-39`).

### 5.3 API protection, rate limiting, CORS, headers, CSRF, sessions

**SEC-14 — Rate limiting (Medium) [Confirmed config / Inferred effect]**
- `server/src/app.ts:46-61`: `authLimiter` 10 req / 15 min / IP on **all** `/api/v1/auth/*` (`app.ts:106`) including `GET /auth/me`, `PUT /auth/status`, `POST /auth/refresh`; `apiLimiter` 300/min/IP on other routers. Health check is unlimited.
- No `app.set('trust proxy', …)` anywhere in `server/src` (grep). [Inferred] Behind Vercel/Render proxies, `req.ip` is the proxy address, so all users share one bucket — the runbook already flags this as R0-F4 (`docs/runbooks/staging.md` §3) and it is unresolved.
- Refresh every 15 minutes plus `/auth/me` calls consume the 10-request auth budget. No per-account lockout.
- Fix: `trust proxy` set to the platform hop count; separate limiters for login/forgot/reset (per IP + per email) vs `/me`/`/refresh`; shared store (Redis) once multi-instance.

**SEC-15 — No security headers (Medium) [Confirmed]**
- `helmet` absent from `server/package.json:21-36`; no CSP/HSTS/X-Frame-Options/`x-powered-by` handling in `server/src`, `vercel.json`, or `client/index.html` (grep).
- Fix: `helmet()`; Vercel `headers` block with CSP, HSTS, frame-ancestors.

**SEC-16 — Token storage & query-string tokens (Medium) [Confirmed]**
- `client/src/store/authStore.ts:132-142`: persisted to `sessionStorage` with `partialize` **including `accessToken` and `refreshToken`** — the inline comment at line 135 says tokens are *not* persisted, which is wrong.
- `authorize.ts:16-17` accepts `?token=` for every route; client uses it for SSE (`client/src/modules/employees/components/EmployeeTable.tsx:126`). Tokens end up in proxy/access logs.
- Fix: refresh token in `HttpOnly; Secure; SameSite=Strict` cookie; access token in memory; restrict `?token=` to the SSE route or use a short-lived SSE ticket.

**CSRF [Confirmed]** Auth is bearer-header based; no cookies are set by the server (no `cookie-parser`, no `res.cookie` in `server/src`). Classic CSRF is therefore not exploitable today. If SEC-16 moves the refresh token into a cookie, CSRF protection (SameSite + origin check) becomes required.

**SEC-17 — CORS (Medium) [Confirmed]**
- `server/src/app.ts:66-83`: allows any origin ending in `.vercel.app` plus no-origin requests, with `credentials: true`. Any attacker-hosted Vercel app is a trusted origin. Impact is limited while auth is bearer-only, but it defeats origin checks.
- Fix: exact allowlist from env (`CORS_ORIGINS`).

### 5.4 Injection

**SQL injection — SEC-25 (Info) [Confirmed]**
- All repositories use `pg` parameter placeholders. Interpolations found are: fixed status lists / booleans in `approvals.repository.ts:38-112` (server constants, not user input); placeholder indices (`$${idx}`) in `audit/read/read.repository.ts:15-20`, `employees.repository.ts:28-52`, `leaves.repository.ts:28-30`, `performance/*.repository.ts`.
- Dynamic `SET` clause: `employees.repository.ts:127-136` builds column names from keys, but keys come from `extractEmployeeProfileUpdates` which maps through `PROFILE_FIELD_MAP` and `VALID_EMPLOYEE_COLUMNS` (`employees.submodels.ts:202-214`). Safe.
- No dynamic `ORDER BY` from user input (grep for `sortBy|orderBy|ORDER BY ${` found only a type in `server/src/types/index.ts:347`).
- Note: `LIMIT` values are user-controlled but parameterized; no upper bound (perf, not injection).

**XSS — SEC-19 (Medium) [Confirmed]**
- Client: only `dangerouslySetInnerHTML` is a static `<style>` block (`client/src/modules/dashboard/pages/Dashboard.tsx:408-412`, no interpolation). React escaping otherwise. Low web-XSS risk found.
- Email HTML: templates interpolate raw values, e.g. `Hi ${opts.name}!` (`server/src/services/emailService.ts:264,322,545`), offer letter `${data.name}`, `${data.position}`, `${data.personalEmail}` (`server/src/services/offer-letter/html-document.template.ts:27,307-339`). No escaping helper exists (grep `escape|sanitize` = none). Names/positions are HR/user-editable → HTML injection in company-branded email (phishing links).
- Welcome/offer emails carry the temporary password (`employees.service.ts:113-144`, `user-assignments.service.ts:47-51,68-72`).
- PDF: built with pdfkit text APIs (`server/src/services/offer-letter/pdf.generator.ts`) — no HTML rendering, low risk.
- Fix: escape all interpolations (small `escapeHtml` helper or a templating engine with auto-escape); replace emailed passwords with set-password links.

### 5.5 File uploads — SEC-21, SEC-27, SEC-24
- No upload middleware: no `multer`/`busboy` in `server/package.json`; `adm-zip` is declared (`server/package.json:25`) but not imported anywhere in `server/src` or `server/scratch` (grep) → no zip-slip exposure today. **[Confirmed]**
- `POST /documents` stores client-supplied `filePath`, `fileSize`, `documentName` only (`documents.schema.ts:3-10`); no actual file bytes, no type/size validation, no storage — [Inferred] files are either not stored at all or stored elsewhere by the client; **[Unknown]** where document binaries live.
- Avatars: client reads an image to a data URI and compresses it (`client/src/modules/profile/pages/Profile.tsx:238-256`); server stores the string in `users.avatar_url` / `employees.avatar_url` (`auth.repository.ts:80-97`). Body limit is 50 MB (`app.ts:86-87`).
- Fix: object storage (Supabase Storage / S3) with signed URLs, MIME sniffing, size caps; lower JSON limit to ~1 MB.

### 5.6 Secrets — SEC-07, SEC-23

**Git history [Confirmed]**
- `git show 2c25bcf^:server/.env` contains `DATABASE_URL=post****` (Supabase pooler host `aws-1-****`, with credentials), `DIRECT_URL=post****`, `JWT_SECRET=ems_****` (47 chars), `JWT_REFRESH_SECRET=ems_****`. File touched in commits `f7bbf21, 160ac22, 4bd4ff3, 8262c60, d4d6149, 2ed0903, 283f78d, b28cb50`, deleted in `2c25bcf` ("Delete server/.env"). History has not been rewritten.
- Local `server/.env` values differ from the leaked ones (hash comparison only). **[Unknown]** whether production credentials were rotated — not determinable from the repository.
- `client/.env` is tracked (`git ls-files`) despite `.gitignore:3`; it contains only comments (no secrets).
- `server/.env.example` and `file.sample` contain placeholder DB URLs and example JWT secrets (`ems_****`).
- Stray scripts with hardcoded local connection strings and credential handling: `server/scratch/backfill_passwords.js:3,9-12` (writes plaintext temp passwords), `server/scratch/check_passwords.js:2-3` (dumps `temp_password` for all users), `server/scratch/update_demo_passwords.js:11-14` (sets `Admin@123`), `server/scratch/test_reset_flow.js:5`, `check_user.js`, `server/check_user.js`, `server/scratch_check_db.js`. All tracked.
- SMTP credentials can be stored in plaintext in `app_config` (`emailService.ts:62-80`) and are returned by `GET /settings/config` without masking (`server/src/modules/settings/configuration/configuration.service.ts:13-26`).
- Demo credentials in client are gated by `import.meta.env.DEV` (`client/src/modules/auth/pages/LoginPage.tsx:14-20`) — acceptable.
- Fix: rotate Supabase DB password and JWT secrets (assume compromised), optionally purge history with `git filter-repo`, delete `server/scratch/*` and root strays, mask secrets in config API, add secret scanning (gitleaks) in CI.

### 5.7 Audit logging — SEC-20 [Confirmed]
- Write path: controllers publish `AUDIT_LOG_REQUESTED` on an in-process `EventEmitter` (`server/src/core/events/eventBus.ts:1-10`); listener inserts into `audit_logs` and swallows errors (`server/src/modules/audit/audit.listeners.ts:7-23`, `write/write.repository.ts:4-25`). On serverless, the event may be lost if the function freezes after the response. [Inferred]
- Coverage seen: login, logout, profile update (`auth.controller.ts:15-28,72-82,93-101`). Not seen for approvals, payroll processing, role changes, password resets [Inferred from greps of `AUDIT_LOG_REQUESTED`/`AuditService` call sites in the controllers read].
- IP is taken from raw `x-forwarded-for` (`auth.controller.ts:21`, `write.service.ts:15`) → client-spoofable.
- No append-only protection, hash chaining, or DB role separation; `audit_logs` is a normal table (`server/src/db/schema.ts:234-244`); profile update logs full `req.body` as `newValues` (`auth.controller.ts:96`).
- Read access unguarded (SEC-12) and `limit` unbounded (`audit/read/read.controller.ts:8-12`).
- Fix: write audit synchronously within the business transaction for sensitive actions; restrict reads to `audit:read`; revoke UPDATE/DELETE on `audit_logs` from the app role.

### 5.8 Error leakage — SEC-26 [Confirmed]
- `server/src/core/errors/errorHandler.ts:62-67`: stack only when `NODE_ENV === 'development'`. Unique-violation messages echo the conflicting value (`errorHandler.ts:28-32`) and `AppError.conflict` messages include another employee's ID/name (`employees.service.ts:49`) — minor info disclosure.
- `configuration.service.ts:38` returns DB error text to the client ("Failed to save settings: " + err.message).
- `authorize.ts:119-124` logs user email and full permission list on every 403.
- Sentry: `server/src/instrument.ts:23-75` disables bodies, cookies, query strings, DB params, stack vars; scrubs headers and breadcrumbs. Good.
- `index.ts:194-209`: `uncaughtException` handler logs and **continues** for all errors, leaving the process in an undefined state.

### 5.9 Dependencies — SEC-22 [Confirmed, `npm audit --omit=dev --json` ran successfully]
- server: 1 moderate — `qs` (GHSA-q8mj-m7cp-5q26, GHSA-x5fp-wj9c-mxmx, GHSA-4mjr-xmp4-gh2g), fix available.
- client: 3 high — `axios` (multiple SSRF/prototype-pollution/header-injection advisories), `form-data` (CRLF injection), `lodash` (`_.template` code injection, prototype pollution); 4 moderate — `react-router`, `react-router-dom`, `@remix-run/router` (open redirect), `follow-redirects`.

---

## Phase 8. Performance & Scalability

### 8.1 Database connection pooling [Confirmed]
- Three independent pools per process: `config/db.ts` `pool` max 10 and `directPool` max 3 (`server/src/config/db.ts:24-45`), plus `database/client.ts` `pool` max 10 (`server/src/database/client.ts:16-24`) used by every `withTransaction` (`server/src/database/transaction.ts:1-4`). Up to **23 connections per instance**.
- `ssl: { rejectUnauthorized: false }` for all non-local DBs (`config/db.ts:26,39`) — TLS without certificate verification.
- On Vercel each concurrent lambda instance holds its own pools → Supabase connection exhaustion under modest concurrency. [Inferred] Port 6543 (transaction pooler) is suggested in `.env.example`, which mitigates server-side but prepared statement / session features must not be relied upon.
- `config/db.ts:66-82` retries any query once on transient errors — including non-idempotent writes.

### 8.2 Request-path heavy work (bottlenecks) [Confirmed]
| Bottleneck | Evidence | Effect |
|---|---|---|
| PDF generation + SMTP send **inside a DB transaction** on employee create | `employees.service.ts:41-160` (`withTransaction` → `await sendCandidateWelcomeAndOffer` at ~124, which generates PDF and sends mail `emailService.ts:174-215`) | Holds a pooled connection and row locks for the duration of SMTP; slow SMTP = slow API & pool starvation |
| Bulk upload: up to 50 sequential `createEmployee` calls each with PDF + SMTP | `employees.service.ts:28,396-412` | Single HTTP request can run for minutes → exceeds serverless timeouts |
| Payroll run: 2 queries per employee in one request/transaction, profiles read outside the transaction | `payroll.service.ts:200-254`, `payroll.repository.ts:66-69` | O(N) round-trips; 1,000 employees ≈ 2,000 sequential queries |
| Admin dashboard: ~20 parallel queries via `Promise.all` | `analyticsService.ts:~90-360` (20 `safeQuery`/`pool.query` calls counted) | One request can take all 10 connections of the main pool |
| Employee profile: 7 parallel queries | `analyticsService.ts:636-688` | Same |
| Employee ID generation scans all employees with regex + cast, global across tenants | `employees.service.ts:80-89` | Full scan per create; race → duplicate PK under concurrency |
| Synchronous SMTP in role change / welcome / test email | `user-assignments.service.ts:47,68,110`; `configuration.service.ts:44` | Request latency tied to SMTP |
| Startup seeding on every cold start (N+1 upserts over all permissions and role grants) | `seedPermissions.ts:76-135`; `index.ts:219` | Adds DB load and latency to each Vercel cold start |

### 8.3 Pagination & result-size inventory [Confirmed]
| Endpoint | Paginated? | Evidence |
|---|---|---|
| `GET /employees` | Yes (page/limit, default 10) but **no max limit** | `employees.controller.ts:9-15`; `employees.repository.ts:52` |
| `GET /audit-logs` | Yes, no max limit | `audit/read/read.controller.ts:8-12`; `read.repository.ts:20` |
| `GET /notifications` | Yes (LIMIT/OFFSET) | `notifications/core/core.repository.ts:9` |
| `GET /payroll/runs` | Optional LIMIT | `payroll.repository.ts:54` |
| `GET /governance/search` | LIMIT 10 | `governance.repository.ts:109`, `org-tree.repository.ts:56` |
| `GET /approvals` | **No** (5-way UNION, full history) | `approvals.repository.ts:9-122` |
| `GET /leave`, `/leave/requests` | **No** | `leaves.repository.ts:18-35` |
| `GET /claims`, `/claims/employee/:id` | **No** | `claims.repository.ts:12-23` |
| `GET /payroll/employees` | **No** | `payroll.repository.ts:4-` |
| `GET /timesheets/pending` | LIMIT 20 (only one query) / others unbounded | `timesheets.repository.ts:71` |
| `GET /reports/team`, `/organization/*`, `/settings/users`, `/documents/:employeeId`, `/performance` | **No** | `analyticsService.ts:613-634`; `user-assignments.repository.ts:~10-24`; `documents.repository.ts`; `performance.repository.ts` (0 LIMIT) |
| `GET /governance/tree` | **No** (whole org graph) | `governance` repositories |

`SELECT *` / `e.*` appears in most repositories (count per file: employees 5, governance 5, payroll 5, timesheets 3…). Combined with base64 avatars stored in `avatar_url` (SEC-24), list endpoints ship large rows. [Inferred]

### 8.4 Indexing vs hot filters [Confirmed DDL in repo; live schema Unknown]
Indexes declared in `server/src/db/schema.ts:269-299` and `server/src/db/migration_v3.ts`/`initDb.ts` (~33 `CREATE INDEX`). Mismatches with hot queries:
- Login: `WHERE LOWER(u.email) = LOWER($1) OR LOWER(e.personal_email) = LOWER($1)` (`auth.repository.ts:10-12`), but index is on `users(email)` (`schema.ts:270`) — functional `LOWER()` and the `OR` across a join defeat it → sequential scans on every login. Same for the `LOWER(u.email)=LOWER(e.email)` joins in `findUserByEmail`, `findUserWithEmployee`, `employees.repository.ts:18`.
- Password reset lookup: `metadata->>'email'` (`auth.repository.ts:147`) — no expression index.
- Attendance "today": `a.check_in::date = CURRENT_DATE` (`employees.repository.ts:20`), `COALESCE(check_in, check_in_time)::date` (`reports.controller.ts:47`) — casts prevent use of `idx_attendance_user_date`.
- Approvals/onboarding: `LOWER(status) IN (...)` (`approvals.repository.ts:38,74`) — function on column.
- Employee search: `ILIKE '%term%'` across 4 columns (`employees.repository.ts:28`) — needs `pg_trgm` GIN for scale.
- **[Unknown]** whether these indexes exist in production: `server/db/baseline/0000_live_schema.sql` is not in the repo (only `README.md`, `diagnostics.sql`, `loadSnapshot.ts`).

### 8.5 Caching, jobs, storage, search, realtime
- **Caching [Confirmed none]:** no Redis/in-memory cache; no `Cache-Control` on API responses; JWT embeds permissions (acts as a 15-minute permission cache).
- **Background jobs [Confirmed none]:** no queue (no bull/pg-boss/etc. in `server/package.json`). Domain events are an in-process `EventEmitter` (`eventBus.ts`) — not durable, not cross-instance.
- **File storage:** none server-side; avatars in DB as data URIs; documents are metadata only. Offer-letter logo read from `public/Images` at runtime (`services/offer-letter/utils.ts:25-55`) — fine on Render, [Inferred] on Vercel the `server/public` folder must be included in the function bundle (`vercel.json` does not declare `includeFiles`).
- **Search:** `ILIKE` only (employees, governance search).
- **Realtime [Confirmed]:** SSE with clients kept in a static in-memory array (`server/src/modules/realtime/connections/connections.service.ts:9-35`), 30 s keepalive. On Vercel serverless this cannot work reliably: functions time out, and broadcasts only reach clients connected to the same instance. Even on Render, it is single-instance only. SSE requests are also counted by `apiLimiter`.

### 8.6 Scaling strategy (specific to this codebase)

| Users (≈ employees across tenants) | What breaks first | Actions |
|---|---|---|
| **100** | Security, not scale. Pool fan-out (20-query dashboard vs max 10), SMTP inside transactions, SSE on Vercel. | Fix Critical security items. Pick **one** host (Render web service recommended for SSE + long requests). Merge the three pools into one; move email/PDF out of transactions (send after commit). Cap `limit` at 100 on all list endpoints. |
| **1,000** | Payroll run (≈2k sequential queries per request), bulk upload timeouts, login seq-scans on `LOWER(email)`, unpaginated approvals/leave/claims lists, base64 avatars in list payloads. | Add expression indexes (`lower(email)`, `lower(personal_email)`, `(metadata->>'email')` partial on `type='password_reset'`), replace `::date` filters with range predicates. Payroll via set-based `INSERT … SELECT` (one statement). Introduce a durable job queue (pg-boss on the same Postgres) for emails, PDFs, payroll, bulk import. Move avatars/documents to Supabase Storage. Paginate every list. Supabase transaction pooler (6543) for app traffic. |
| **10,000** | Single Node instance CPU (bcrypt, PDF), in-memory SSE and event bus across instances, rate-limit memory store per instance, dashboard aggregates computed live. | Horizontal scale behind a load balancer with `trust proxy`; Redis for rate limits + SSE fan-out (or Supabase Realtime / Postgres LISTEN-NOTIFY); materialized views or nightly rollups for dashboards/analytics; `pg_trgm` search; read replica for reports; structured logging + APM traces; tenant-scoped composite indexes `(tenant_id, status, created_at)`. |
| **100,000** | Shared-schema multi-tenancy with `OR tenant_id IS NULL / 'default'` predicates, audit_logs growth, single primary write load. | Enforce tenant isolation in the DB (Postgres RLS keyed on `tenant_id`), remove default-tenant fallbacks; partition `audit_logs`, `attendance`, `notifications` by month; separate worker tier for payroll/import/email; dedicated search (OpenSearch/Meilisearch) if needed; consider per-region or large-tenant sharding; SLOs and autoscaling. |

---

## Deployment & Operational Readiness

### Environments [Confirmed]
- Local dev (`server/.env`, `client/.env` local; ngrok hosts hardcoded in `client/vite.config.ts:13-18`).
- Staging is **documented** (`docs/runbooks/staging.md`) but its results log is empty (`staging.md` §4 table has no rows) → **[Unknown]** whether a staging environment exists.
- Production: two competing configs (below). **[Unknown]** which one is live; CORS hardcodes `https://ozofi-homie.vercel.app` (`app.ts:72`), suggesting Vercel. [Inferred]

### Hosting conflict: `vercel.json` vs `render.yaml` [Confirmed]
- `vercel.json:1-38`: legacy `builds` — `client/package.json` via `@vercel/static-build` and `server/src/index.ts` via `@vercel/node`; `/api/(.*)` → serverless function; SPA fallback; `NODE_ENV=production`. No `maxDuration`, no `headers`, no `includeFiles`.
- `render.yaml:1-35`: `ems-api` web service (`npm install && npm run build`, `npm start` → `node dist/index.js`) and `ems-client` static site.
  - [Inferred] `NODE_ENV=production` is set on the API service; `npm install` then omits devDependencies, but `typescript` (needed by `npm run build` = `tsc`) is a devDependency (`server/package.json:37-51`) → build likely fails unless Render overrides.
  - `VITE_API_URL` comes from `fromService … property: host` (`render.yaml:22-27`), which is a bare host (no scheme, no `/api/v1`); the client uses it verbatim as axios `baseURL` (`client/src/services/api.ts:37-38`) → [Inferred] broken API URL on Render.
  - The static site also receives the whole `ems-secrets` group (`render.yaml:21`); only `VITE_*` vars are inlined by Vite, so exposure is limited, but secrets need not be in the frontend build env.
- `index.ts` behaves differently per platform: listens only when `!process.env.VERCEL` (`index.ts:157-173`); SSE (`realtime`) and long requests (bulk upload, payroll) are incompatible with Vercel function limits.
- Recommendation: choose one platform. For this architecture (SSE, long-running requests, in-memory state) a long-running service (Render/Fly/Railway) fits; keep Vercel for the static client only, or refactor realtime/jobs first.

### CI/CD [Confirmed]
- No `.github/` directory, no other CI config found (`ls` of repo root). Tests exist (`server/test/unit/*`, `server/test/integration/*`; vitest configs) but nothing runs them automatically. The authz matrix is an empty skeleton (`server/test/integration/authz.matrix.test.ts:31-33`).
- `package-lock.json` is listed in `.gitignore:6` but both lockfiles are tracked (`git ls-files`) — confusing; keep them tracked and remove the ignore line.
- Recommendation: GitHub Actions — `npm ci`, `typecheck`, unit tests, integration tests against a Postgres service container, `npm audit --omit=dev`, gitleaks; deploy only from `main`.

### Environment variable strategy [Confirmed]
- `dotenv.config()` called from multiple modules (`instrument.ts:14`, `config/env.ts:4`, `config/db.ts:16`, `database/client.ts:9`).
- Only `PORT`, `DATABASE_URL`, `JWT_*`, `NODE_ENV` validated (`config/env.ts:6-12`), with insecure defaults; `DATABASE_URL` optional. Other vars (`GMAIL_*`, `SMTP_*`, `APP_URL`, `APP_LOGO_URL`, `SENTRY_*`, `DIRECT_URL`, `DB_SSL_DISABLE`) read ad hoc. Note `env.ts` defaults `PORT` to `5000` while `index.ts:11` defaults to `4000`.
- Recommendation: one validated config module, fail fast in production, no defaults for secrets.

### Migrations on deploy [Confirmed]
- Automatic migrations disabled at startup (`index.ts:216`). Manual `npm run db:setup` → `initDb.ts`; `db:migrate`/`db:seed` → `scripts/db-setup.ts` running `initDb` + `initializeDatabase` (`db/schema.ts`) + `runMigrationV3` — three overlapping, idempotent-by-`IF NOT EXISTS` scripts with errors swallowed (`initDb.ts:300-320` `.catch(() => {})`), plus `src/scripts/phase2_migrations.ts` and `legacy_cleanup.ts`.
- No migration tool, no version table, no down-migrations. The setup path also resets admin credentials (SEC-11). Production schema snapshot not committed (`server/db/baseline/`).
- But `seedPermissionsAndSuperAdmin()` **does** mutate data on every start (`index.ts:219`).
- Recommendation: adopt a migration tool (node-pg-migrate / Drizzle / Prisma migrate) starting from the live baseline; run migrations as a release step; remove seeding from startup.

### Observability [Confirmed]
- Sentry server (`server/src/instrument.ts`) and client (`client/src/main.tsx:4-17`), both off unless DSN set; strong PII scrubbing; tracing off by default. `Sentry.setupExpressErrorHandler` registered only if initialised (`app.ts:138`).
- Logging is `console.*` with emojis; no structured logger, no request IDs (header `x-request-id` is allowed for Sentry but never generated), no access log.
- Alerting: only "new issue → notify" proposed (`docs/runbooks/monitoring.md` §4). **[Unknown]** whether DSNs are configured in production.

### Backups [Confirmed doc / Unknown execution]
- `docs/runbooks/backup-restore.md` defines a restore drill and RPO/RTO targets, but the configuration table (§1) and results table (§4) are **blank** → no evidence a restore has ever been tested; Supabase tier/PITR status **[Unknown]**.

### Health checks [Confirmed]
- `GET /api/v1/health` returns static JSON (`app.ts:94-101`) — no DB check, hardcoded version `2.0.0`. `render.yaml` defines no `healthCheckPath`.
- Recommendation: `/health/live` (process) and `/health/ready` (`SELECT 1` with timeout); set Render `healthCheckPath`.

### Graceful shutdown [Confirmed]
- `index.ts:176-191`: on SIGTERM/SIGINT closes the HTTP server, then `pool.end()` only — `directPool` and the `database/client.ts` pool are not closed. No timeout: open SSE connections keep `server.close()` from completing [Inferred] until the platform kills the process. `uncaughtException` swallowed (`index.ts:194-205`).
- Recommendation: track sockets / end SSE streams on shutdown, close all pools, hard-exit after a deadline (e.g. 10 s); exit on unknown `uncaughtException` and let the platform restart.

### Infrastructure diagram (what is actually configured)

```mermaid
flowchart LR
    U[Browser<br/>React SPA<br/>tokens in sessionStorage] -->|HTTPS| V{{Vercel project<br/>vercel.json}}
    V -->|static| VS[client/dist<br/>@vercel/static-build]
    V -->|/api/*| VF[Serverless fn<br/>server/src/index.ts<br/>@vercel/node]
    U -. alternative .-> R{{Render<br/>render.yaml}}
    R --> RS[ems-client static site<br/>VITE_API_URL = host only]
    R --> RA[ems-api web service<br/>node dist/index.js]
    VF -->|pg pools: 10 + 3 + 10<br/>TLS no verify| DB[(Supabase Postgres<br/>pooler 6543 / direct 5432)]
    RA --> DB
    VF -->|nodemailer| SMTP[Gmail SMTP / app_config SMTP]
    RA --> SMTP
    VF -. errors if SENTRY_DSN .-> S[Sentry]
    RA -. errors if SENTRY_DSN .-> S
    U -. if VITE_SENTRY_DSN .-> S
    VF -->|SSE in-memory clients| U
    subgraph Missing
      CI[CI/CD: none]
      Q[Job queue: none]
      C[Cache/Redis: none]
      OS[Object storage: none]
      MIG[Migration tool: none]
    end
```

---

## Files reviewed

Server
- `server/package.json`, `server/.env.example` (redacted), `server/vitest.config.ts`
- `server/src/app.ts`, `server/src/index.ts`, `server/src/instrument.ts`, `server/src/db.ts`, `server/src/initDb.ts` (lines 1-30, 300-320, 448-470)
- `server/src/config/env.ts`, `server/src/config/db.ts`
- `server/src/database/client.ts`, `server/src/database/transaction.ts`, `server/src/db/connection.ts`, `server/src/db/schema.ts` (lines 1-20, 230-300, 340-420, 530-555 via grep)
- `server/src/core/security/authorize.ts`, `jwt.service.ts`, `password.service.ts`
- `server/src/core/errors/errorHandler.ts`, `server/src/core/events/eventBus.ts`
- `server/src/middleware/authMiddleware.ts`, `server/src/middleware/errorHandler.ts` (head)
- `server/src/modules/auth/auth.routes.ts`, `auth.controller.ts`, `auth.service.ts`, `auth.repository.ts`, `auth.schema.ts`
- `server/src/modules/approvals/approvals.routes.ts`, `approvals.controller.ts`, `approvals.service.ts`, `approvals.repository.ts`, `approvals.schema.ts`
- `server/src/modules/settings/index.ts`, `settings/user-assignments/user-assignments.controller.ts`, `user-assignments.service.ts`, `user-assignments.repository.ts` (excerpts), `settings/rbac/rbac.service.ts` / `rbac.repository.ts` (excerpts), `settings/configuration/configuration.service.ts`
- `server/src/modules/payroll/payroll.routes.ts`, `payroll.controller.ts`, `payroll.service.ts` (200-255), `payroll.repository.ts` (excerpts)
- `server/src/modules/documents/documents.routes.ts` (via grep), `documents.controller.ts`, `documents.schema.ts`, `documents.service.ts`
- `server/src/modules/employees/employees.routes.ts` (grep), `employees.controller.ts` (41-140), `employees.service.ts` (37-160, 160-200, 311-412, 493-505), `employees.repository.ts` (1-60, 95-140, 209-290 excerpts), `employees.submodels.ts` (200-244), `employees.schema.ts` (excerpt)
- `server/src/modules/leaves/leaves.controller.ts` (20-45), `leaves.service.ts` (38-63), `leaves.repository.ts` (1-55)
- `server/src/modules/claims/claims.controller.ts` (excerpts), `claims.repository.ts`
- `server/src/modules/timesheets/timesheets.controller.ts` (excerpts), `timesheets.service.ts` (28-48), `timesheets.repository.ts` (excerpts)
- `server/src/modules/reports/reports.routes.ts` (grep), `reports.controller.ts` (7-75)
- `server/src/modules/audit/read/read.controller.ts`, `read.repository.ts`, `read.routes.ts` (grep), `audit/write/write.repository.ts`, `write.service.ts`, `audit/audit.listeners.ts`
- `server/src/modules/realtime/connections/connections.controller.ts`, `connections.service.ts`
- `server/src/modules/organization/organization.routes.ts` (1-23), `server/src/modules/workspace/workspace.routes.ts`, `server/src/modules/notifications/core/core.repository.ts` (excerpt)
- All `*.routes.ts` / module `index.ts` route declarations (grep enumeration)
- `server/src/services/emailService.ts` (1-110, 170-215, grep), `services/analyticsService.ts` (95-125, 636-699, grep), `services/auditService.ts`, `services/realtimeService.ts`, `services/offer-letter/html-document.template.ts` (grep), `services/offer-letter/utils.ts` (grep)
- `server/src/scripts/seedPermissions.ts` (20-162)
- `server/scripts/db-setup.ts` (head)
- `server/test/integration/authz.matrix.test.ts` (head)
- `server/scratch/*.js` (grep for credentials), `server/scratch_check_db.js` (head), `server/check_user.js` (listed)

Client
- `client/src/store/authStore.ts` (50-145), `client/src/services/api.ts` (30-60, grep), `client/src/modules/auth/pages/LoginPage.tsx` (8-25), `client/src/modules/employees/components/EmployeeTable.tsx` (115-130), `client/src/modules/profile/pages/Profile.tsx` (238-262), `client/src/modules/dashboard/pages/Dashboard.tsx` (408-412), `client/src/main.tsx` (head), `client/vite.config.ts`, `client/.env` (redacted), `client/package.json` (grep)

Root / infra / docs
- `vercel.json`, `render.yaml`, `.gitignore`, `file.sample` (redacted), `check_user.js` (head)
- `docs/runbooks/backup-restore.md`, `docs/runbooks/monitoring.md`, `docs/runbooks/staging.md`
- Git history: `git log` for `server/.env`, `git show 2c25bcf --stat`, `git show 2c25bcf^:server/.env` (keys/redacted prefixes only), hash comparison with local `server/.env`
- `npm audit --omit=dev --json` in `server/` and `client/`
