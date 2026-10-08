# Security Audit (v2, delta on 2026-10-04 audit)

Repo: `D:\AI_dev\Google_Antigravity\employee_management_system`
Baseline: `docs/audit/_raw/track-d-security-perf-infra.md`, `track-c-backend-data.md`, `PRODUCTION_READINESS_AUDIT.md` (HEAD `06dc08f`).
Current: HEAD `42aaace` (17 commits since baseline: HF-1..HF-10 hotfixes, CI, plus three feature commits) **plus uncommitted working-tree changes** (approvals module, claims/org schemas, `employees.repository.ts`, tests).
Method: static review of current code (read-only). Nothing was executed against a database, no network calls, `npm audit` was **not** re-run.

Evidence labels: **Confirmed** (read in code, `file:line`) / **Inferred** (follows from code read, not executed) / **Assumption** / **Unknown**.
Secrets: no secret value appears in this document or was written anywhere.

---

## 1. Executive summary

| | Baseline (06dc08f) | Now |
|---|---|---|
| Critical | 5 (SEC-01..05) | **0 confirmed** |
| High | 8 | **7** (2 carried over partially fixed, 3 carried over unchanged, 2 new) |
| Medium | 8 | **17** (8 carried over, 9 new) |
| Low / Info | 6 | **8** |

What the hotfix series fixed (**Confirmed**, each backed by a new unit-test file in `server/test/unit/`): the master-password backdoor (HF-1), default JWT secrets (HF-2), the unauthenticated password-reset takeover chain (HF-3), unguarded approval/leave/timesheet/claim/payroll/reports/audit endpoints (HF-4/5/6), cross-tenant reads on profile/reports/personal-records (HF-6), settings secret exposure and tenant fallbacks (HF-7/6B), and manager-to-super-admin role escalation through `/settings/*` (HF-10).

What is still open, in order of importance:
1. **The legacy role-name mapping still lets a manager through "admin"/"hr" route guards** (employee create/bulk/**delete**, organization, governance, document verify/delete, settings config and mail relay). The escalation chain to `super_admin` is closed; the blast radius is not. (SEC-06 PARTIAL)
2. **New: `DELETE /employees/:id` deletes child rows (payroll, claims, leave, documents) of any tenant's employee before checking tenant**, and is reachable by managers through item 1. (NEW-DB-1 / N-02)
3. **New: `PUT /users/profile` still takes `id` from the body**: any authenticated user can rewrite another same-tenant user's login email, name and phone. (N-01)
4. Refresh tokens are still never validated against storage: no logout/password-change revocation. (SEC-09 OPEN)
5. `GET /employees` still returns `annual_ctc` and `bank_account_number` to every role. (SEC-13 OPEN)
6. No security headers, permissive `*.vercel.app` CORS with credentials, no `trust proxy`, tokens in `sessionStorage` and in `?token=` query. (SEC-14..17 OPEN)
7. Credentials are in git history (not purged). The current local values differ from the historical ones (hash comparison, values never printed); production rotation is **Unknown**. (SEC-07 OPEN)
8. `dashboard_type='admin'` is still a universal bypass and the seeded `hr` role is built on it. HF-9A (remove bypasses) is blocked on the production permission export (OW-4).

### Credential note (existence only)
- `server/.env` exists locally and contains a live-looking Supabase pooler `DATABASE_URL`/`DIRECT_URL`, Gmail app credentials, and two JWT secrets. **Confirmed** (key names only were read).
- It is **gitignored** (`server/.gitignore:1`, root `.gitignore:3`), and is **not tracked** at HEAD (`git ls-files` lists only `client/.env` and `server/.env.example`).
- It **was committed in history**: 7 commits touch `server/.env` (`160ac22`, `4bd4ff3`, `8262c60`, `d4d6149`, `2ed0903`, `283f78d`) and it was deleted in `2c25bcf`. History was not rewritten. **Confirmed** (`git log --all -- server/.env`).
- Hash comparison (no values printed): the historical `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET` all differ from the current local ones, and the DB password differs. So the local file is not the leaked set. Whether **production** was rotated is **Unknown**.
- Current JWT secrets satisfy the new rule (length >= 32 and different from each other). **Confirmed** by a boolean check.
- `client/.env` is tracked but contains comments only. `file.sample` / `server/.env.example` contain placeholders only.

---

## 2. Fixed vs open against the baseline

Legend: **FIXED** (closed with evidence), **PARTIAL**, **OPEN** (unchanged), **N/A**.

### 2.1 Track D (SEC-01..27)

| ID | Baseline severity | Finding | Status | Evidence (current code) |
|---|---|---|---|---|
| SEC-01 | Critical | Hardcoded master password `admin@company.com` | **FIXED** (HF-1) | `auth.service.ts:33-41`: bcrypt compare or temp_password only. `seedPermissions.ts:9-11`: never assigns super_admin from an email. `initDb.ts:449-466`: no reset/seed of credentials without `ADMIN_BOOTSTRAP_PASSWORD` (>= 12 chars). Test `auth.backdoor.test.ts`. **Residual:** `db/schema.ts:539-556` still seeds `admin@company.com`/`admin123` when `users` is empty (greenfield only); `client/src/modules/auth/pages/LoginPage.tsx:17-19` shows `Admin@123` demo logins (gated by `import.meta.env.DEV`, not re-verified); `server/scratch/*` still carries `Admin@123`; the old credentials remain in git history. |
| SEC-02 | Critical | Password-reset takeover chain | **FIXED** (HF-3) | Token 32 random bytes, stored as SHA-256 (`auth.service.ts:17-18,168-176`), 30-minute expiry, single use through an atomic status flip (`auth.repository.ts:255-300`), token mandatory (`resetPasswordSchema`, `auth.service.ts:196-198`), generic response (`:163-192`), no token or id returned (`auth.controller.ts:153-157`), `password_reset` is a reserved type that cannot be created (`approvals.policy.ts:86-89`) and needs `settings:manage` to action (`:48`). Token travels in the URL fragment (`auth.service.ts:20-24`). **Residual:** see N-07 (completed reset rows appear in inbox history), 60 s cooldown is per user only, password minimum is 6. |
| SEC-03 | Critical | `/approvals/:id/action` unguarded; any employee approves anything | **FIXED** (HF-4/5, partly uncommitted) | Route gate `authorize(ANY_APPROVER_PERMISSIONS)` (`approvals.routes.ts:18`); record loaded by id **in the actor's tenant** and row-locked (`approvals.repository.ts:lockApproval`); type must match the record; per-type permission; self-approval refused (`approvals.service.ts:168-171`); pending-only (`:173-175`); leave/timesheet/claim direct routes go through the same path. `POST /approvals` needs `approvals:approve` and cannot mint reserved types (`approvals.routes.ts:14`, `approvals.service.ts:107-117`). **Residual:** N-07 (`GET /approvals` has no permission gate), role-name checks in `assertMayGrantRole`/`isRegularizationApprover` (`approvals.service.ts:57-77`). |
| SEC-04 | Critical | Payroll module has no authorization | **FIXED** (HF-5) | `payroll.routes.ts:15-29`: `payroll:view`, `payroll:manage`, `payroll:run`; self salary edit refused (`payroll.controller.ts:15-22`). **Residual:** the `/history/:employeeId` stub accepts `payroll:view_own` with no ownership check (`payroll.routes.ts:19-22`, returns `[]` today); must be fixed when the stub is implemented (Inferred). |
| SEC-05 | Critical | `GET /reports/profile/:employeeId` cross-tenant PII | **FIXED** (HF-6) for cross-tenant; **PARTIAL** for same-tenant breadth | `reports.access.ts:23-38` (tenant lookup, self or `employees:view`), `profile.visibility.ts` strips personal and pay fields unless `employees:update|manage` / `payroll:view|manage`. `GET /reports/admin|dashboard|summary|analytics|departments` need `reports:view` (`reports.routes.ts`). **Residual:** `employees:view` (held by the seeded manager) reads any user's dashboard/team report in the tenant (`reports.access.ts:25`), and `reports:view` (also manager) exposes org-wide salary distribution; team scoping is explicitly deferred (`reports.access.ts:20-21`). |
| SEC-06 | High | Legacy role-name mapping lets a manager pass admin/hr guards | **PARTIAL** (HF-10) | **Closed:** role, permission and user-account endpoints now require explicit keys (`rbac.routes.ts:10-15`, `user-assignments.routes.ts:9-15`) and an actor-coverage policy (`authzState.ts`): no granting authority you do not hold, no `super_admin` assignment/touch by non-super, no self role change, reserved role name, dashboard type validated. **Still open (Confirmed):** `ROLE_TO_PERMISSIONS.admin` contains `employees:view` and `reports:view` (`authorize.ts:116`), the seeded manager holds both (`schema.ts:376-384`), so a manager still passes: `settings` router gate (`settings/index.ts:11`: GET users/roles/permissions, **PUT /settings/config, POST /settings/test-email**), `employees` create/bulk-upload/**delete** (`employees.routes.ts:50,68,71`), organization writes (`organization.routes.ts:11`), governance write/sync (`governance/*.routes.ts`), document verify/delete (`documents.routes.ts:15-16`). Production impact depends on live `role_permissions` (**Unknown**, OW-4 export). |
| SEC-07 | High | Secrets in git history | **OPEN** | See credential note above. CI gitleaks scans only new commits by design (`.github/workflows/ci.yml` secret-scan job). |
| SEC-08 | High | JWT secret fallbacks | **FIXED** (HF-2) | `config/env.ts:11-28`: no default, min 32, must differ; throws at import (fail closed in every NODE_ENV). `.env.example` no longer ships values. Test `env.test.ts`. **Residual:** `NODE_ENV` defaults to `development`, `DATABASE_URL` optional, `PORT` default `5000` here vs `4000` in `index.ts:152`. |
| SEC-09 | High | Refresh token never compared | **OPEN** | `auth.service.ts:75-111` verifies the JWT only; `users.refresh_token` is still never read for validation. HF-3 nulls it on reset (`auth.repository.ts:281-282`) and `logout()` nulls it, but neither revokes anything. Refresh tokens carry no `jti` (`jwt.service.ts:246`). Stolen refresh token: valid 7 days. |
| SEC-10 | High | Plaintext temporary passwords | **PARTIAL** (HF-7) | **Closed:** `GET /settings/users/:id/temp-password` is no longer routed; `/settings/users` list no longer selects `temp_password` (`user-assignments.repository.ts:5-14`); reset clears `temp_password` (`auth.repository.ts:281`). **Open:** plaintext still stored (`user-assignments.repository.ts:createUser/updatePassword`), still accepted at login (`auth.service.ts:38-40`), the admin-chosen permanent password is stored in plaintext too (`user-assignments.service.ts:97`), `POST /settings/users` still returns `temp_password` (`RETURNING ... temp_password`), `Math.random()` still generates passwords (`user-assignments.service.ts:37,65,85`, `employees.service.ts:112`), welcome email carries it. |
| SEC-11 | High | `db:setup` resets admin password; boot seed forces super_admin | **FIXED** in `initDb.ts` and `seedPermissions.ts`; **PARTIAL** overall | See SEC-01 residual (`schema.ts:539`). |
| SEC-12 | High | IDOR / tenant gaps (table below) | **PARTIAL**, mostly fixed | see 2.2 |
| SEC-13 | High | `GET /employees` returns `annual_ctc`, `bank_account_number` to every role | **OPEN** | `employees.repository.ts:6-14` still `SELECT e.*`; `employees.routes.ts:47` allows `employee`; `employees.service.ts:43-45` returns rows unfiltered. `profile.visibility.ts` is applied to profile endpoints only, not the list. `limit` has no upper bound (`employees.controller.ts:11-17`). |
| SEC-14 | Medium | Rate limiting (no trust proxy, shared auth bucket) | **OPEN** | `app.ts:46-61,106` unchanged; no `trust proxy` in `server/src` (grep). Note new coupling: the new public reset endpoints sit under the 10/15 min IP bucket together with `/auth/me` and `/auth/refresh`. |
| SEC-15 | Medium | No security headers | **OPEN** | `helmet` absent from `server/package.json`; no headers in `vercel.json`/`render.yaml`. |
| SEC-16 | Medium | Tokens in `sessionStorage`; `?token=` accepted on every route | **OPEN** | `client/src/store/authStore.ts:132-141` persists both tokens (comment at 135 is wrong); `authorize.ts:61-63` accepts `?token=` for every route; `EmployeeTable.tsx:126` uses it for SSE. |
| SEC-17 | Medium | CORS allows any `*.vercel.app` with credentials | **OPEN** | `app.ts:66-83`. |
| SEC-18 | Medium | Weak policy / enumeration / approvals never expire | **PARTIAL** | Enumeration on forgot-password **fixed** (generic message, `auth.service.ts:12-13`). Still: minimum 6 chars (`auth.schema.ts`, `auth.service.ts:141,199`), bcrypt cost 10 (`password.service.ts`), no lockout, `login` trims the password (`auth.controller.ts:11`). Reset tokens expire (30 min); legacy approvals still do not. |
| SEC-19 | Medium | HTML email injection | **PARTIAL** | New reset template escapes (`emailService.ts:645-667`). All pre-existing templates and the offer letter still interpolate raw values (`emailService.ts` welcome/action templates, `offer-letter/html-document.template.ts`). |
| SEC-20 | Medium | Audit logging gaps | **PARTIAL** | Approval decisions now audited (`approvals.audit.ts`); `GET /audit-logs` needs `audit:view` and is tenant-filtered (`read.routes.ts:11`, `read.repository.ts:10`). Still: fire-and-forget in-process event, errors swallowed, spoofable IP (`write.service.ts:15`, `auth.controller.ts:20`), no audit for role/permission/user/password/payroll/config/employee changes, `limit` unbounded (`read.controller.ts`). |
| SEC-21 | Medium | Documents module | **PARTIAL** | Tenant filter present (`documents.repository.ts`). Read ownership check still depends on the literal role string `employee` (`documents.service.ts:13`); upload accepts any `employeeId` without checking it exists in the tenant (`documents.repository.ts:uploadDocument`); verify/delete guard is role-name based (`documents.routes.ts:15-16`). |
| SEC-22 | Low | Dependency vulnerabilities | **Unknown** | `npm audit` not re-run. |
| SEC-23 | Low | Stray scripts with DB access / credentials | **OPEN** | `server/scratch/*` (15 files), `server/check_user.js`, `server/scratch_check_db.js`, root `check_user.js` are all tracked (`git ls-files`). |
| SEC-24 | Low | 50 MB JSON limit; base64 avatars in DB | **OPEN** | `app.ts:86-87`. |
| SEC-25 | Info | SQL injection | **Holds** | See section 4.6. |
| SEC-26 | Info | Error leakage | **Holds with notes** | `errorHandler.ts:62-67` stack only in development; unique-violation messages still echo the conflicting value (`:27-32`); `authorize.ts:192-197` still logs email and the full permission list on every 403; `index.ts:194-205` still continues after uncaught exceptions. |
| SEC-27 | Info | `adm-zip`, no upload middleware | **Holds** | `adm-zip` is declared (`server/package.json:25`) and imported nowhere; no `multer`. |

### 2.2 SEC-12 sub-items

| Endpoint (baseline) | Status | Evidence |
|---|---|---|
| `GET /employees/:id/education\|experience\|emergency-contacts` cross-tenant | **FIXED** | `employees.controller.ts:66-125`: tenant passed, owner or `employees:update\|manage` required |
| `PUT /employees/:id` default-tenant fallback | **PARTIAL** | read now `tenant_id`-strict in service, but repository updates still match `tenant_default`/`default` rows (`employees.repository.ts:125,135,144,151,165,172`); self-service edit blacklist incomplete (N-05) |
| `PUT /timesheets/:id/entries` no tenant/owner | **FIXED** | `timesheets.service.ts:32-37`, `timesheets.repository.ts:25-52`; transaction still ineffective (repo ignores client) |
| `PUT /timesheets/:id/approve`, `PUT /leave/:id/approve`, `PUT /claims/:id/status` no permission, spoofable `approved_by` | **FIXED** | `timesheets.routes.ts:30`, `leaves.routes.ts:37`, `claims.routes.ts:16`; approver from token; central path |
| `PUT/DELETE /leave/requests/:id` anyone's request | **FIXED** | `leaves.repository.ts:37-60` owner and pending only |
| `GET /leave`, `GET /claims`, `GET /timesheets/pending` tenant-wide for all | **FIXED** | `leaves.service.ts:95-104`, `claims.routes.ts:15`, `timesheets.routes.ts:25` |
| `GET /audit-logs` any user | **FIXED** | `read.routes.ts:11` |
| `GET /documents/:employeeId` custom roles bypass | **OPEN** (SEC-21) | `documents.service.ts:13` |
| `GET /leave/types` | **OPEN** (not tenant scoped, low risk) | `leaves.repository.ts:5` |

### 2.3 Track C / PRODUCTION_READINESS items re-checked

| Item | Status | Evidence |
|---|---|---|
| `PUT /users/profile` IDOR (`id` from body) | **OPEN, worse than reported** | see N-01 |
| `POST /employees {role:'super_admin'}` creates a privileged account | **FIXED** (HF-10) | `employees.service.ts:50-53` `resolveRoleForNewAccount`; role never created implicitly |
| Role escalation by editing roles, `dashboard_type:'admin'`, permissions of system roles, other tenants' roles | **FIXED** | `authzState.ts:164-210`, `rbac.routes.ts`; shared template roles read-only (`:182-186`) |
| Settings fallbacks `LIMIT 100` across tenants | **FIXED** (HF-6B) | `user-assignments.repository.ts:19-22` (`WHERE tenant_id = $1`); `rbac.repository.ts:58` still includes `tenant_default`/NULL template roles by design |
| `completePasswordReset` updating all users with an email across tenants | **FIXED** | `auth.repository.ts:276-283` (id + tenant) |
| SMTP password returned in clear by `GET /settings/config` | **FIXED** (HF-7) | `configuration.secrets.ts`, `configuration.service.ts:22` masks `smtp_pass`, `api_key`, `slack_webhook`, `teams_webhook`; write of the mask is ignored (`:36`). Still plaintext at rest, and `getConfig` includes `tenant_id IS NULL` rows (`configuration.repository.ts:20`). |
| Attendance regularize direct insert | **FIXED** (request then manager approval) | `attendance.controller.ts:regularize`, `approvals.service.ts:156-166` |
| `GET /governance/tree` performs writes | **OPEN** (not re-verified) | out of scope of HF series |
| Performance review `PUT /performance/:id` unguarded | **OPEN** | `performance/reviews/reviews.routes.ts:15` |
| Authz test matrix empty | **OPEN** | `authz.matrix.test.ts:32-34` still `MATRIX = []`; HF coverage is unit tests with mocked data access |
| CI absent | **FIXED (partial)** | `.github/workflows/ci.yml` (HF-8): typecheck, unit tests, route contract, gitleaks on new commits. No integration job, no `npm audit`, no CodeQL |

---

## 3. New findings

Severity rubric: Critical = unauthenticated or any-user takeover/data loss; High = privilege escalation, cross-tenant impact or sensitive-data exposure for a normal role; Medium = needs an unusual precondition or limited impact; Low = hardening.

### N-01 (High) `PUT /api/v1/users/profile` lets any user edit any user in the tenant
`users.routes.ts:12-13` (authenticate only), `users.controller.ts:8-11` takes `id` from the **body**, `users.repository.ts:4-17` runs `UPDATE users SET name, email, phone, address, emergency WHERE id=$6 AND tenant_id=$7`. HF-6 added the tenant filter; there is still no ownership or permission check. **Confirmed.**
Impact: lockout and identity corruption of any same-tenant account (including administrators): the attacker sets the victim's login email to an address that matches nothing, and the `users.email` / `employees.email` link used throughout (`identity.ts`, profile joins, reset lookup) breaks. **Inferred, not executed:** direct takeover through the new reset flow is blocked only because `findUserForPasswordReset` joins `employees` on the same email (`auth.repository.ts:172-176`); anything that makes the two emails agree again (for example an employee-update path) would re-open the chain. Fix: remove `id` from the body, use `req.user.userId`; or require `employees:update` plus `assertMayManageUser`.

### N-02 (High) Cross-tenant child-row deletion on employee delete (NEW-DB-1)
`employees.repository.ts:323-345` deletes 15 child tables by `employee_id` only, then `DELETE FROM employees ... AND tenant_id` (`:378`), and commits regardless of rows deleted. Ids are sequential and global. Reachable by anyone passing `authorize(['admin','super_admin','hr','employees:manage'])` (`employees.routes.ts:71`), which includes the seeded **manager** (SEC-06 residual). **Confirmed in code, not executed.** Includes payroll history/entries, claims, leave, documents, reviews. Fix in DATABASE_ANALYSIS NEW-DB-1.

### N-03 (High, restating SEC-06 residual with concrete reach)
Manager-reachable via legacy mapping (all **Confirmed**): create employee/bulk (`employees.routes.ts:50,68`; role assignment now bounded by HF-10), **delete employee** (N-02), org department/team update/delete (`organization.routes.ts:11-23`), governance `PUT /:nodeId` and `POST /sync` (`governance/org-tree/org-tree.routes.ts:14`, `sync.routes.ts:10`), document verify/delete (`documents.routes.ts:15-16`), and the whole `/settings` gate (`settings/index.ts:11`): `GET /settings/users` (all tenant users with role names and `is_password_temp`), `GET /settings/roles|permissions`, `PUT /settings/config`, `POST /settings/test-email`.

### N-04 (Medium) Tenant SMTP configuration can be set by the settings gate; mail interception and open relay
`PUT /settings/config` has no per-route permission (`configuration.routes.ts:7-9`), accepts any category/key (`configuration.service.ts:29-43`) and `getSmtpConfig` uses `app_config` SMTP for a tenant (`emailService.ts:62-83`). Where `GMAIL_USER`/`GMAIL_APP_PASSWORD` are **not** set in the environment, an actor passing the settings gate (manager via N-03, or HR) can point the tenant's mail at an attacker SMTP host and receive every outgoing message, **including password-reset links**, then reset any account in the tenant including administrators. In this repository's local `.env` the Gmail env variables exist and take priority (`emailService.ts:41-52`), so this is mitigated there; production environment is **Unknown**. `POST /settings/test-email` sends to any address (mail relay for phishing from the company domain). Fix: `settings:integrations` permission for config writes, allow-list keys, never let tenant config override platform mail for auth mail.

### N-05 (Medium) Employee self-edit blacklist is incomplete
`employees.controller.ts:42-63`: non-HR callers editing their own record have only 12 fields stripped. The map `PROFILE_FIELD_MAP` (`employees.submodels.ts:100-200`) also accepts `email` (the login identity), `reporting_manager_id`/`reportingManagerId`, `team_id`, `status`-adjacent `exit_date/exit_reason/exit_type`, `bank_account_number`, `probation_end_date`, `personal_email`. Consequences: (a) an employee can choose who their approver is (regularization and self-service requests are routed to `reporting_manager_id`, `approvals.repository.ts:11-25`), enabling collusion; (b) `personal_email` is a login identifier (`auth.repository.ts:12`) with no uniqueness check on update, so see N-10; (c) bank account change without HR. HR/admin gate is by role **name** (`['admin','super_admin','hr']`, `:48,81,99,117`), not permission. **Confirmed.**

### N-06 (Medium) Performance reviews still editable by any user
`PUT /performance/:id` has no guard (`reviews.routes.ts:15`), `GET /performance` lists all tenant reviews to everyone (`:13`), create is guarded by role **names** that include `employee`-reachable permissions via the mapping (`:14`). An employee can rewrite their own rating/status. Baseline #86-88, **OPEN**.

### N-07 (Medium) Approvals inbox read has no permission gate and role-name scoping
`GET /approvals` only requires authentication (`approvals.routes.ts:13`). Row scoping applies only when the role string is exactly `manager` or `employee` (`approvals.repository.ts:33`), so custom roles and the seeded `hr` see the tenant-wide inbox (any status). The tenant predicate still accepts `tenant_id IS NULL OR ''` (`:30`), and the five-way UNION is built before the filter. History status `completed` includes consumed password-reset records whose metadata carries email, user id and token hash (**Inferred** from `:45,65`). Low replay risk, real disclosure. Fix: gate by `approvals:view`, filter `type != 'password_reset'`, drop NULL-tenant rows.

### N-08 (Medium) Access tokens trusted for 15 minutes; no server-side deactivation or permission refresh
`authenticate` verifies the JWT and copies claims; it never checks `is_active`, `deleted_at`, or current role/permissions (`authorize.ts:49-82`). A deactivated or demoted user keeps full API access for up to 15 minutes. Deactivation does end refresh, because `refresh()` loads the user and filters `is_active` (`auth.repository.ts:30-36`); but a stolen refresh token of an active user stays valid for 7 days after logout or password change (SEC-09). The recent "role changes apply without re-login" work (commit `1fd898c`, `auth.repository.ts:findUserProfile`) fixes the **screen**, not the API authorization. **Confirmed / Inferred.**

### N-09 (Medium) `mustChangePassword` is not enforced
Login returns a flag only (`auth.controller.ts:29`); no middleware blocks API use with a temp-password session; `changePassword` allows no-current-password changes while `is_password_temp` (`auth.service.ts:151-153`). Combined with SEC-10 (plaintext temp passwords accepted at login) this keeps the temp-password channel valuable to an attacker. **Confirmed.**

### N-10 (Medium, Inferred) Login identifier collision through `personal_email`
`findUserByEmail` matches `LOWER(u.email)=LOWER($1) OR LOWER(e.personal_email)=LOWER($1)` with `LIMIT 1` and no `ORDER BY` (`auth.repository.ts:4-16`). Employees can set their own `personal_email` (N-05) and creation checks uniqueness but update does not (`employees.service.ts:74-91` vs update path). An employee who sets their `personal_email` to a colleague's work email can make the colleague's login resolve to an arbitrary one of the two rows. Likely outcome is denial of service for the colleague (wrong password for the row returned) rather than takeover. Fix: log in by `users.email` only; if personal-email login is wanted, enforce global uniqueness first.

### N-11 (Medium) Authorization still depends on role names in business code
`employees.controller.ts:48,81,99,117` (`['admin','super_admin','hr']`), `approvals.service.ts:59,69-76` (`actor.role === 'admin'`), `documents.service.ts:13`, `reviews.service.ts`, `attendance` `ELEVATED_ROLES` (`authorize.ts:232-285`), `profile.visibility.ts:29` (`WRITE_ROLES`), `approvals.repository.ts:33`. A tenant that renames or customises roles silently changes who is "admin". The HF-10 module documents this as temporary (HF-9A/9B). **Confirmed.**

### N-12 (Medium) `dashboard_type='admin'` universal bypass remains; seeded `hr` depends on it
`hasDashboardAdminBypass` (`authorize.ts:137,151`) grants every check; the seed sets `hr.dashboard_type='admin'` (`schema.ts:455`); HF-10 classifies such actors as "unbounded" (may assign/touch any role except `super_admin`, `authzState.ts:54-61`). Setting `dashboard_type:'admin'` on a role is now blocked for non-admin actors (`authzState.ts:164-171`), but any HR user can still create an admin-dashboard role or assign the `admin` role. **Confirmed.** Also, several route guards use permission keys that HR does not hold (`claims:approve`, `organization:manage`; section 2.x of DATABASE_ANALYSIS), so removing the bypass without the OW-4 export would lock HR out. **Inferred.**

### N-13 (Low) Repo hygiene and logging
- `logs permission list and email on every 403` (`authorize.ts:192-197`): PII/authorization data in logs.
- `uncaughtException` handler logs and continues (`index.ts:194-205`); graceful shutdown closes only `pool` (`index.ts:176-191`).
- `GET /health` returns a hard-coded version and no DB check (`app.ts:94-101`).
- Login trims the password (`auth.controller.ts:11`), so passwords with leading/trailing spaces cannot be used; reset/change do not trim, an inconsistency.
- `server/.env` committed-history and untracked `.claude/`, `docs/audit/_raw` items are outside application risk; ensure `.claude/` does not hold tokens before committing (**Unknown**, not opened).

### N-14 (Low) Self-service approval type `role_change` carries a raw `requested_role_id`
Employees can request any role id via `POST /approvals/request` (`approvals.service.ts:83-101`, `approvals.policy.ts:77`). Approval requires an administrator by role **name** and re-validates tenant ownership of the role (`approvals.repository.ts:getRoleName`, `applySelfServiceChange`). It does not apply the HF-10 actor-coverage rule (an `admin` named actor can grant any custom role in the tenant; fine today because `admin` holds everything, brittle if that changes). **Confirmed.**

---

## 4. Domain-by-domain assessment (current state)

### 4.1 Authentication (**improved**)
- Login: bcrypt compare (cost 10), or plaintext `temp_password` (SEC-10), no lockout, IP limiter only (`app.ts:46-52`). `auth.service.ts:33-73`.
- Backdoor removed (SEC-01). Demo/seed credentials removed from `initDb.ts`.
- Reset: emailed, hashed, 30 min, single use, per-user 60 s cooldown, no enumeration (`auth.service.ts:163-230`). Residual: min 6 chars; the reset request response time differs slightly when a user exists (a DB insert) though the email send is deliberately not awaited; no per-email counter beyond the cooldown; APP_URL from env (not Host header) so no host-header poisoning. **Confirmed.**
- Password change requires the current password unless `is_password_temp`.

### 4.2 Authorization (**much improved, not complete**)
- Guard: `authorize(list)` / `hasAccess` (`authorize.ts:139-204`): super_admin pass, `dashboard_type=admin` pass, explicit `module:action` match, legacy role-name expansion via `ROLE_TO_PERMISSIONS` (any-one-of), exact role-name fallback. The legacy expansion and the two bypasses are the structural weaknesses (SEC-06, N-03, N-12).
- Routes: of the ~128 baseline routes, the unguarded sensitive set is now small (section 5). Coverage by explicit permission: payroll (all), claims (list/status), leave (approve), timesheets (pending/approve), audit, reports (admin/summary), settings roles/users, approvals action/create.
- Policy layer: `core/security/authzState.ts` (actor-covers-target, tenant-visible roles, reserved names), `approvals/approvals.policy.ts` (kind/type/permission/self-approval/pending), `reports/reports.access.ts`, `employees/profile.visibility.ts`. Pure functions with 15 unit-test files.
- Self-approval is blocked on leave, timesheet, claim, onboarding, and generic approvals (`approvals.policy.ts:104-124`).

### 4.3 Sessions and JWT
- Access 15 min HS256, refresh 7 d (`jwt.service.ts:5-6`); secrets mandatory (SEC-08). `jwt.verify` is called with the secret and no `algorithms` option; with a string secret `jsonwebtoken` v9 only accepts HMAC algorithms, so `alg:none` is rejected (**Inferred**, library behaviour).
- Claims contain role, `dashboard_type`, permissions (`authorize.ts:75-82`), frozen for 15 min (N-08). Refresh re-reads role and permissions (`auth.service.ts:86-98`), so staleness is bounded to 15 min.
- Refresh: not validated against storage, no rotation check, no reuse detection (SEC-09). Access token accepted from `?token=` on any route (SEC-16).
- Client: both tokens in `sessionStorage` (`authStore.ts:132-141`), XSS would exfiltrate them. React escaping otherwise; the only `dangerouslySetInnerHTML` is a static `<style>` block (`Dashboard.tsx:414`).

### 4.4 CSRF
No cookies are set by the server (no `cookie-parser`, no `res.cookie`), auth is bearer-header only, so classic CSRF is not exploitable. **Confirmed.** `Access-Control-Allow-Credentials: true` with a broad `*.vercel.app` origin match (SEC-17) would become relevant the moment cookies are introduced (for example when moving the refresh token to an HttpOnly cookie, which is the recommended fix for SEC-16): at that point SameSite plus an exact origin allow-list become mandatory.

### 4.5 XSS and HTML injection
- Web: low risk (see 4.3).
- Email: reset template escapes (new); every other template (welcome, action notification, role assignment, offer letter) interpolates `name`, `position`, `personalEmail`, `role` unescaped (SEC-19 PARTIAL). Names are user/HR-editable, so company-branded HTML injection remains possible. PDFs use text APIs (no HTML).

### 4.6 SQL injection (**no finding**)
All new HF code uses parameter placeholders. Interpolated identifiers are fixed maps or constants: `lockApproval`/`setDecision` table names come from a literal object keyed by an enum-validated kind (`approvals.repository.ts:lockApproval`, `setDecision`), status lists are constants (`:45-47`). Dynamic `SET` column names come from `PROFILE_FIELD_MAP`/`VALID_EMPLOYEE_COLUMNS`. Numeric-id routes pre-validate with `/^\d+$/` (`leaves.repository.ts:38,54`, `timesheets.repository.ts:48`, `approvals.repository.ts:lockApproval`). `LIMIT` values are parameterised but unbounded (performance, not injection).

### 4.7 File upload
No upload middleware; documents are metadata only (`documents.schema.ts`, `filePath` is a client string); avatars are base64 data URIs stored in `users.avatar_url`/`employees.avatar_url` under a 50 MB JSON limit (SEC-24). `adm-zip` is declared but unused (SEC-27). Public static folder `server/public` serves two PDFs and a DOCX template at `/public/...` unauthenticated (`app.ts:90`; `server/public/Company_Offer_latter_and_certificate/*`, `tax_slabs_FY2025_26.pdf`): non-sensitive templates as named; contents not opened (**Unknown**).

### 4.8 Secrets management and environment variables
- Validated: `PORT`, `DATABASE_URL` (optional), `JWT_SECRET`, `JWT_REFRESH_SECRET`, `NODE_ENV` (`config/env.ts`). Everything else is read ad hoc: `GMAIL_*`, `SMTP_*`, `APP_URL`, `APP_LOGO_URL`, `SENTRY_*`, `DIRECT_URL`, `ADMIN_BOOTSTRAP_PASSWORD`, `DB_SSL_DISABLE`.
- At rest: SMTP password and API keys in `app_config` plaintext; `users.temp_password` plaintext.
- TLS to Postgres uses `rejectUnauthorized:false` (`config/db.ts:26,39`).
- Hosting configs unchanged: `vercel.json` (serverless, no headers) and `render.yaml` (`VITE_API_URL` is a bare host, `ems-secrets` group also passed to the static site). Which one is live is **Unknown**.
- CI secret scan covers new commits only (history leak is accepted and tracked as SEC-07).

### 4.9 Rate limiting
In-memory `express-rate-limit`: 10 per 15 min per IP on all `/auth/*` (including `/me`, `/refresh`, and now forgot/reset), 300 per minute on others, none on health. No `trust proxy` (the per-IP bucket is likely the platform proxy, **Inferred**), no per-account or per-email limits except the 60 s reset cooldown. SEC-14 OPEN.

### 4.10 API exposure
- Unauthenticated routes: `GET /health`, `GET /`, `GET /auth/repair-identity` (static string), `POST /auth/login|refresh|forgot-password|reset-password`, `/public/*` static files. **Confirmed** (`app.ts`, `auth.routes.ts`).
- Authenticated but unguarded (any role) and sensitive: `GET /users` (tenant user list, filterable by role), `PUT /users/profile` (N-01), `GET /employees` (incl. pay, SEC-13), `GET /employees/roles`, `GET /employees/check-email`, `PUT /employees/:id` (own record, N-05), `GET/PUT /performance` (N-06), `GET /approvals` (N-07), `POST /documents` (any employee in tenant), `GET /documents/:employeeId` (role-name check), `GET /leave/types`, `GET /governance/tree|search|resolve` (also writes on GET per baseline), `GET /realtime/stream`.
- Route-contract tooling exists (`docs/audit/tools/route_contract_check.py`, CI job). The authorization matrix for all routes is not populated (`authz.matrix.test.ts:32-34`).

### 4.11 Tenant isolation
- Source of truth: `tenantId` from the verified JWT (`authorize.ts:75-82`); body-supplied tenant ids are ignored in the HF modules (`approvals`, `claims`, `leaves`, `timesheets`, `payroll`, `reports`, `employees` personal records, settings users/roles).
- Still leaky (Confirmed): `employees.repository.ts:19,117-119,125,135,144,151,165,172` (default-tenant rows editable by any tenant), employee child deletes (N-02), org/governance graph (`org_nodes` default `'default'` read by all tenants, NEW-DB-2; `org-tree.repository.ts:9-18`), approvals `OR tenant_id IS NULL OR ''` (`approvals.repository.ts:30,208,225`), `app_config` NULL-tenant rows (`configuration.repository.ts:20`, `workspace.repository.ts:15`), `leave_types` unscoped (`leaves.repository.ts:5,71-81`), global unique emails and global employee id sequence. No RLS. About 41 fallback predicates remain in mounted code.
- Verdict: **no longer trivially cross-tenant readable**; **not multi-tenant safe for writes/deletes** until N-02/NEW-DB-2 and the default-tenant fallbacks are removed.

---

## 5. Authorization snapshot of sensitive endpoints (current)

| Area | Endpoint(s) | Guard now | Status |
|---|---|---|---|
| Approvals | `POST /approvals/:id/action` | `ANY_APPROVER_PERMISSIONS` + per-type + self-approval + tenant + pending | FIXED |
| | `POST /approvals` | `approvals:approve`, reserved types blocked | FIXED |
| | `POST /approvals/request` | authenticated, files for caller only, 3 types | OK |
| | `GET /approvals` | authenticated only | N-07 |
| Payroll | all 10 routes | `payroll:view\|manage\|run` | FIXED |
| Claims / Leave / Timesheets | approve, list-all, pending | `claims:approve`, `leave:approve`, `timesheet:approve` | FIXED |
| Reports | `/reports/admin\|dashboard\|summary\|analytics\|departments` | `reports:view` | FIXED (broad: managers hold it) |
| | `/reports/manager\|employee\|team\|profile/:id` | self or `employees:view` + tenant | FIXED/PARTIAL |
| Audit | `GET /audit-logs` | `audit:view` | FIXED |
| Settings | roles/permissions/users mutations | explicit keys + actor-coverage | FIXED |
| | `GET /settings/users|roles|permissions`, `PUT /settings/config`, `POST /settings/test-email` | settings gate only (legacy mapping) | N-03/N-04 |
| Employees | create, bulk, delete | legacy mapping (manager passes) | N-02/N-03 |
| | `PUT /employees/:id`, personal records | owner or role name | N-05/N-11 |
| Users | `PUT /users/profile` | authenticated only | N-01 |
| Documents | read/upload/verify/delete | mixed | SEC-21 |
| Performance | create/update/delete | role names / none | N-06 |
| Organization / Governance | writes | legacy mapping | N-03 |

---

## 6. Prioritised remediation (security only)

1. **Now (small code changes):** N-01 (use token user id), N-02 (tenant-check and scope child deletes; consider soft delete), SEC-13 (select list + field policy on `GET /employees`, cap `limit`).
2. **Next:** SEC-06/N-03 (replace the legacy `ROLE_TO_PERMISSIONS` expansion for these route groups with explicit permissions: `employees:create`/`employees:delete`, `organization:manage`, `governance:manage`, `documents:manage`, `settings:integrations`); N-04 (config key allow-list, `settings:integrations`); SEC-09 (store hash of refresh token or `jti`, compare, rotate, revoke on logout/password change/deactivation); N-06; N-07.
3. **Hardening:** `helmet`, exact CORS allow-list, `app.set('trust proxy', n)`, separate limiters for login/forgot/reset (per IP and per email) vs `/me`/`/refresh`, httpOnly refresh cookie plus in-memory access token, restrict `?token=` to a short-lived SSE ticket, escape all email templates, password policy >= 10 with breach check, drop `temp_password` storage, `crypto.randomInt` password generation, audit coverage for authorization-state, payroll and config changes.
4. **Structural:** OW-4 permission export, then HF-9A (remove `super_admin`/`dashboard_type=admin` bypass and the role-name mapping), HF-9B (replace role-name checks), RLS, migrations from the live snapshot, rotation of every credential that ever lived in git history and optional `git filter-repo` purge, delete `server/scratch/*` and root strays, `npm audit` in CI, an authorization matrix test covering every route.

---

## 7. Confidence and limits

- Everything marked **Confirmed** was read in current code; **no behaviour was executed**, so exploitability claims for N-02, N-04 and N-10 are by code reading.
- Production state (live `role_permissions`, which host is live, whether credentials were rotated, whether Gmail env variables exist in production) is **Unknown**.
- Uncommitted changes (approvals module, `employees.repository.ts`, claim/org schemas, tests) were reviewed as they are in the working tree; their commit status does not change the findings but a commit/PR is still needed before they count as shipped.
- `server/src/modules/settings/settings.routes.ts` (446-line monolith) is dead code (not imported by `settings/index.ts`) but still carries the old unguarded handlers and `tenant_default` fallbacks; delete it to avoid accidental re-mounting.

---

## Files opened (this audit)

Docs: `docs/audit/_raw/track-c-backend-data.md`, `docs/audit/_raw/track-d-security-perf-infra.md`, `docs/audit/v2/README.md`, `server/db/baseline/README.md` (PRODUCTION_READINESS_AUDIT.md was not re-read; its findings are carried through the two track files).
Server core: `server/src/app.ts`, `server/src/index.ts`, `server/src/config/env.ts`, `server/src/core/security/{authorize,authzState,authzState.repository,identity,jwt.service,password.service}.ts`, `server/src/core/errors/errorHandler.ts`, `server/package.json`, `server/.gitignore`, `server/.env.example`, `server/vitest` setup list, `server/test/integration/authz.matrix.test.ts`, test file inventory (`server/test/unit/*`).
Modules: `auth/{auth.service,auth.repository,auth.controller,auth.routes,auth.schema}.ts`; `approvals/{approvals.policy,approvals.service,approvals.repository,approvals.audit,approvals.routes}.ts`; `employees/{employees.controller,employees.repository,employees.service,employees.routes,employees.submodels,profile.visibility}.ts`; `leaves/{controller,service,repository,routes}`; `claims/{service,controller,repository,routes}`; `timesheets/{service,repository,routes}`; `documents/{controller,service,repository,schema,routes}`; `users/{controller,service,repository,schema,routes}`; `payroll/{routes,controller}` (+ repository grep); `reports/{reports.access,reports.controller,reports.routes}`; `attendance/{controller,service,routes}`; `organization/{service,routes}`; `performance/reviews/{service,routes}`; `audit/{read/*,write/*}`; `settings/{index,rbac/routes,rbac/service,rbac/repository (grep),user-assignments/*,configuration/*}`; `realtime/connections/connections.controller.ts`; all `*.routes.ts` and `index.ts` under `server/src/modules` (grep enumeration).
Services/scripts: `server/src/services/emailService.ts` (28-112, 640-690, grep), `server/src/scripts/seedPermissions.ts`, `server/src/initDb.ts`, `server/src/db/schema.ts` (grep and ranges).
Client: `client/src/store/authStore.ts` (120-150), `client/src/modules/employees/components/EmployeeTable.tsx` (grep), `client/src/modules/auth/pages/LoginPage.tsx` (grep), `client/src/services/api.ts` (grep), `client/.env` (key names only).
Infra: `vercel.json`, `render.yaml`, `.github/workflows/ci.yml`, `.gitignore`, `file.sample` (values redacted), `server/public` (directory listing only).
Git: `git log 06dc08f..HEAD`, `git status`, `git diff 06dc08f HEAD` (stat and selected files), `git log --all -- server/.env`, `git ls-files` checks, `git show 2c25bcf^:server/.env` (loaded into a temp file for hash comparison only; **no values printed**, temp file deleted).
Local `server/.env`: parsed to report key names and boolean checks only; no value was printed or recorded.
