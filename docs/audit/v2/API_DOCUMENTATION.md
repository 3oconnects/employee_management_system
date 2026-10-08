# Ozofi Nexus EMS — Backend API Documentation (code-derived, v2)

Scope: every HTTP endpoint of the Express/TypeScript server in `server/src` (mounted under `/api/v1`, plus `/`, `/public/*`).
Snapshot: branch `feat/profile-visibility-by-viewer`, HEAD `42aaace` **plus the uncommitted working tree** (11 modified server files: approvals/*, claims.schema, employees.repository, organization.schema/service, 2 unit tests).
Baseline compared against: `docs/audit/_raw/track-c-backend-data.md` and `docs/audit/PERMISSION_MATRIX.md` (commit `06dc08f`/`9bc32db`). Since then HF-1..HF-10 and later commits landed; every claim below was re-read in current code.
Method: static reading only. Nothing was executed except `python docs/audit/tools/route_contract_check.py` (read-only). No secret values were read or printed. No application file was modified.

## 0. Evidence legend

| Tag | Meaning |
|---|---|
| **C** `path:line` | Confirmed by reading that line (paths relative to `server/src/` unless they start with `docs/` or `client/`). |
| **I** | Inferred: follows from code but depends on data/state not visible (DB contents, deployment, concurrency). |
| **A** | Assumption: stated so the reader can challenge it. |
| **U** | Unknown: "Not enough evidence found in repository." |

Severity used in the findings register: Critical / High / Medium / Low.

## 1. Cross-cutting behaviour

### 1.1 Request pipeline (order, `app.ts`)

1. `cors` with a function origin check: allows `localhost:5173`, `127.0.0.1:5173`, `localhost:3000`, `https://ozofi-homie.vercel.app` **and any origin ending `.vercel.app`**; `credentials: true`; methods GET/POST/PUT/DELETE/PATCH/OPTIONS; headers Content-Type, Authorization, X-Requested-With. A disallowed origin raises `Error('Not allowed by CORS')`, which reaches the global handler as a 500 (C `app.ts:61-79`).
2. `express.json({limit:'50mb'})` and `express.urlencoded({limit:'50mb'})` (C `app.ts:86-87`).
3. `/public` static files from `process.cwd()/public`, **no auth** (C `app.ts:90`). 11 files are present: 7 under `Company_Offer_latter_and_certificate/`, 3 under `Images/`, 1 PDF at root (I: directory listing only; contents not opened).
4. `GET /api/v1/health` (no limiter, no auth): `{success, status:'ok', version:'2.0.0', timestamp}` (C `app.ts:94-100`). `GET /` returns a plain-text banner (C `app.ts:~120`).
5. Per-prefix rate limiter, then the module router (see 1.3).
6. `notFoundHandler` (404 JSON), optional Sentry error handler when `Sentry.isInitialized()`, then `globalErrorHandler` (C `app.ts:135-139`).

There is **no** `helmet`, no `app.set('trust proxy')`, no request-id/logging middleware, no CSRF layer (token is a Bearer header, so CSRF is not applicable unless the `?token=` fallback is abused). (C `app.ts` whole file; `package.json` has no helmet.)

### 1.2 Authentication — `authenticate` (`core/security/authorize.ts:5-53`)

- Token source: `Authorization: Bearer <jwt>`; **otherwise `?token=<jwt>` in the query string for every authenticated route** (C `authorize.ts:13-17`). The latter exists for SSE (`EventSource` cannot set headers) but is accepted everywhere. JWT in URLs ends up in access logs and proxies (finding S-11).
- Verification: `jsonwebtoken.verify` with `JWT_SECRET`; access token TTL **15 min**, refresh token TTL **7 d** (C `core/security/jwt.service.ts:5-6`). Secrets have no default, minimum length 32, must differ (C `config/env.ts`; HF-2). Algorithm is not pinned in `verify` (library default accepts HS256/384/512 for a string secret) (I).
- The verified claims become `req.user = {userId, email, tenantId, role, dashboard_type, permissions[]}`. **Nothing is re-read from the database per request**: a deactivated user, a changed role or a revoked permission stays effective until the access token expires (<= 15 min) (C `authorize.ts:26-36`; baseline F-9 still open; partly mitigated by `/auth/me` polling client-side (I, `client/src/services/sessionSync.ts:35`)).
- Failures: 401 `{success:false,message}`; expired token adds `code:'TOKEN_EXPIRED'` (C `authorize.ts:41-52`).

### 1.3 Rate limiting (`app.ts:46-62,106-124`)

| Limiter | Window / max | Mounted on | Keyed by |
|---|---|---|---|
| `authLimiter` | 15 min / **10** | `/api/v1/auth/*` (**every** auth route, including `GET /me`, `PUT /status`, `POST /logout`) | client IP (express-rate-limit default) |
| `apiLimiter` | 1 min / 300 | all other module prefixes | client IP |
| none | n/a | `/health`, `/`, `/public/*` | n/a |

Concerns: (a) 10 requests per 15 min across all auth routes means a normal signed-in session that polls `/auth/me` or updates status can exhaust the budget and be locked out of login from the same IP (I; frequency of client polling not measured). (b) Without `trust proxy`, behind Vercel/any reverse proxy all users may share one IP (I; deployment not visible), or express-rate-limit may log a forwarded-header validation error. (c) No per-account or per-email throttling of login or password reset; the IP limiter is the only brake (C `auth.routes.ts`).

### 1.4 Authorization primitives

| Primitive | Behaviour | Evidence |
|---|---|---|
| `authorize(permOrRole | permOrRole[])` | 401 if no `req.user`; else `hasAccess`; 403 `{message:'Access denied: insufficient permissions'}` and a `console.warn` that **logs the user's email and full permission list** (PII in logs). | C `authorize.ts:132-159` |
| `hasAccess(user, required[])` | 1) role name `super_admin` -> allow. 2) `dashboard_type='admin'` -> allow. 3) entry with `:` -> exact match in JWT `permissions`. 4) legacy role-name entry (`admin`,`hr`,`manager`,`employee`) -> allow if user holds **any** permission in `ROLE_TO_PERMISSIONS[entry]`. 5) otherwise equal role name. | C `authorize.ts:94-130` |
| `ROLE_TO_PERMISSIONS` | `admin`: settings:manage, employees:view/create/update, payroll:manage, reports:view. `hr`: employees:view/create/update, leave:approve, onboarding:manage, attendance:manage. `manager`: employees:view, leave:approve, reports:view, attendance:view. `employee`: attendance:view, attendance:check_in, leave:view, leave:apply, profile:view, profile:update, dashboard:view. | C `authorize.ts:69-75` |
| `requireSelfOrAdmin` | Reads `req.params.userId || req.query.userId`; no id -> pass; own id -> pass; else JWT **role name** must be in {super_admin, admin, hr, manager} (case-sensitive set). A custom role (e.g. `team_lead`) is refused even if it holds every permission. Array-valued `?userId=a&userId=b` is not rejected. | C `authorize.ts:187-216` |
| `enforceTenantIsolation` | Exported but **not used by any route** (I: grep of route files shows no import). Tenant isolation is done per query via `tenantId` from the token. | C `authorize.ts:161-176` |
| `core/security/authzState.ts` | HF-10 policy: an actor may grant/assign/act on only what it already holds; `super_admin` identity only touchable by a super admin; role names `super_admin` reserved; `dashboard_type` limited to admin/manager/employee; setting `admin` requires a non-ordinary actor; no self role change. Used by settings roles/users and employee create/update/bulk. | C `core/security/authzState.ts:32-210` |

**Consequence (baseline F-1, still open):** `authorize(['admin',...])`/`['hr',...]` guards are satisfied by any role holding a single broad permission such as `employees:view` (seeded `manager` holds it; C `db/schema.ts` role map, `authorize.ts:69-75`). Every endpoint below that is guarded by legacy role names is therefore effectively "anyone with employees:view / reports:view / payroll:manage / leave:approve / attendance:manage".

Permission vocabulary mismatch (baseline F-10, re-checked): `db/schema.ts` seeds `audit:view`, `employees:update`, `payroll:view/run/view_own`, `attendance:regularize`; `scripts/seedPermissions.ts` (runs at every start, `index.ts`) seeds `audit:read`, `employees:read/manage`, `claims:approve`, `organization:manage`, `payroll:read`. Routes here require e.g. `audit:view`, `claims:approve`, `organization:manage`, `employees:manage` that exist only in one vocabulary, so effective access depends on which seed ran (U for production: "Not enough evidence found in repository").

### 1.5 Tenant model

- `tenantId` always comes from the verified JWT; request bodies are never trusted for it (C throughout; `enforceTenantIsolation` unused).
- **Shared pseudo-tenants:** many queries accept `tenant_id IN ($tenant, 'tenant_default', 'default')` or `OR tenant_id IS NULL` (employees findById/update/user joins C `employees.repository.ts:19,117,119,125,135`; governance C `governance/*/*.repository.ts`; roles C `rbac.repository.ts:212`; approvals C `approvals.repository.ts:30`; settings users/config C `user-assignments.repository.ts:16-18`, `configuration.repository.ts:20`). Rows of those pseudo-tenants are visible to, and in several cases writable by, every real tenant (findings S-08, S-15).
- Reference data that is not tenant-scoped: `leave_types` (C `leaves.repository.ts:4-7`), `permissions`, shared template `roles`.

### 1.6 Validation

Zod 4 via `validateRequest(schema, 'body'|'query'|'params')` (`core/validation/validateRequest.ts`). On failure responds 400 `{success:false, message:'Validation failed.', errors:{<path>:[msgs]}}`. Parsed body replaces `req.body`; parsed query/params go to `req.validatedQuery/validatedParams` (**no route uses 'query' or 'params' validation**, so path ids and query strings are unvalidated everywhere; C route files). Unknown keys are stripped by default `z.object` but several schemas use `.passthrough()` (createEmployee, updateEmployee, payroll profile, attendance check-in/out, regularize) so arbitrary keys reach services. Many handlers read `req.body` without any schema (approvals `/request`, employees sub-records, settings roles/users/config, users none).

### 1.7 Error handling and response envelopes

`globalErrorHandler` (`core/errors/errorHandler.ts`, the one mounted; `middleware/errorHandler.ts` is an unused older copy):

| Source | Status | Body |
|---|---|---|
| `AppError` | its status | `{success:false,message,code?}` (codes: UNAUTHORIZED, FORBIDDEN, NOT_FOUND, CONFLICT, INTERNAL_ERROR) |
| `ZodError` | 400 | `{success:false,message:'Validation failed.',code:'VALIDATION_ERROR'}` (no field list) |
| PG `23505` | 409 | `DUPLICATE_RESOURCE`; message **echoes the conflicting column and value** parsed from `err.detail` (e.g. an email) (C `errorHandler.ts:23-39`) |
| PG `23503` | 400 | `FOREIGN_KEY_VIOLATION` "Referenced entity does not exist." |
| PG `23502` | 400 | `NOT_NULL_VIOLATION` with column name |
| anything else (incl. PG `22P02` bad cast, `22007` bad date, CORS error, `RangeError`) | **500** | generic message; `stack` added when `NODE_ENV==='development'` |

Unexpected errors are `console.error`-logged with stack, URL and method. Response shapes are **not uniform**: `{success,data}` (approvals, org, governance, settings, reports/admin partly), bare arrays/objects (leave, attendance, timesheets, employees list, payroll, claims), `{items,total}`, `{success,items}`, plus `{success,message}`. Clients must handle all. There is no pagination envelope standard.

### 1.8 Events, audit, notifications

- In-process `EventEmitter` bus (`core/events/*`); `registerDomainEvents()` registers audit, notification and realtime listeners at start (C `index.ts`, `core/events/registry.ts`). Synchronous emit; listener failures are caught and logged; events are lost on crash (no outbox).
- **Audit writes exist only for:** login, logout, profile update (`auth.controller.ts`), and approve/reject decisions through approvals, leave, timesheet and claim controllers (`approvals.audit.ts`). **No audit** for employee create/update/delete, payroll edit/run, role/permission/user changes, settings/config changes, document verify/delete, performance, org changes (C grep of `AUDIT_LOG_REQUESTED|publishDecisionAudit`; baseline gap persists). Audit write failures are swallowed (C `audit/write/write.repository.ts:22`).
- Notifications are created through `NotificationService.*` calls that are **not awaited** in several handlers (e.g. `leaves.service.ts:32`, `employees.service.ts` after create) so rejected promises become unhandled rejections, which `index.ts` only logs (I).
- Email: `services/emailService.ts` (not an endpoint; used by reset, create employee, settings). Not reviewed line by line (U for template content).

### 1.9 Database access

`pg.Pool` (max 10, connect timeout 25 s) in `config/db.ts`, second pool in `database/client.ts` (max 10, timeout 10 s) used by `withTransaction`; **two independent pools = up to 20 connections from one process** against a pooled/Supabase DB (I; `DATABASE_URL` pooler setting not visible). TLS: `rejectUnauthorized:false` for non-local DBs (certificate not verified; C `config/db.ts:26`). `db/connection.ts` exposes a third `query` helper (audit, notifications). Parameterised queries are used throughout; the only dynamic SQL fragments are column names built from a whitelist (`employees.submodels.ts`) and table names from an enum map (`approvals.repository.ts:271-274`) (C), so no SQL injection was found. Schema is created by scripts (`initDb.ts`, `db/schema.ts`, `db/migration_v3.ts`, `scripts/phase2_migrations.ts`); the live schema is unknown (U), and `attendance` carries both legacy (`user_id, check_in, check_out`) and current (`employee_id, check_in_time, check_out_time`) columns (I from `analyticsService.ts` COALESCE usage).

### 1.10 Performance baseline concerns (global)

- Almost every list endpoint returns **unbounded** result sets (leave, claims, performance, payroll/employees, settings/users, org). Only employees list, audit and notifications paginate (and with no upper cap on `limit`; C `employees.controller.ts:16`, `audit/read/read.controller.ts:11`, `notifications/core/core.controller.ts:9`).
- Dashboards run ~20 independent queries per call through `safeQuery`, which **swallows errors and returns fallbacks** (C `services/analyticsService.ts:73-79`): schema drift yields silently wrong numbers instead of errors.
- N+1 patterns: employee create/replace sub-records loop single-row inserts; notifications loop one INSERT per recipient (C `notifications/channels/channels.service.ts`); payroll run inserts two rows per employee in a loop inside one transaction.
- Multi-statement operations that are **not transactional**: role create + permission insert, role permission replace, timesheet clear + insert (the transaction client is created but queries use `pool`, C `timesheets.service.ts:41-55`), department/team approval side effects are transactional (ok).

---

## 2. Endpoint index (127 module routes + health + root + static)

`route_contract_check.py` reports **126** backend routes (my enumeration is 127; the 1-route difference is not explained, U) and **18 unmatched client calls** (Appendix B). Dead, unmounted route files are listed in Appendix A and are **not** in this table.

Legend: Auth = JWT required (`J`) or public (`-`). Authz column shows the exact guard in code. **Risk flags** point to the findings register (section 4).

| ID | Method | Path (under `/api/v1`) | Auth | Authorization (code) | Body schema | Flags |
|---|---|---|---|---|---|---|
| H-1 | GET | `/health` | - | none | - | - |
| ROOT | GET | `/` | - | none | - | - |
| ST-1 | GET | `/public/*` (static) | - | none | - | S-19 |
| AU-01 | GET | `/auth/repair-identity` | - | none | - | disabled stub |
| AU-02 | POST | `/auth/login` | - | none | loginSchema | S-09,S-10,S-12 |
| AU-03 | POST | `/auth/refresh` | - | none | refreshSchema | S-09 |
| AU-04 | POST | `/auth/forgot-password` | - | none | forgotPasswordSchema | - |
| AU-05 | POST | `/auth/reset-password` | - | none | resetPasswordSchema | - |
| AU-06 | POST | `/auth/logout` | J | any user | - | S-09 |
| AU-07 | GET | `/auth/me` | J | any user | - | S-10 |
| AU-08 | PUT | `/auth/me` | J | any user | updateProfileSchema | - |
| AU-09 | PUT | `/auth/me/preferences` | J | any user | updatePreferencesSchema | - |
| AU-10 | PUT | `/auth/status` | J | any user | updateStatusSchema | - |
| AU-11 | PUT | `/auth/me/password` | J | any user | changePasswordSchema | - |
| US-01 | GET | `/users` | J | any user | - | S-14 |
| US-02 | PUT | `/users/profile` | J | **none** (any user) | updateProfileSchema (users) | **S-02** |
| AT-01 | GET | `/attendance/today` | J | requireSelfOrAdmin | - | S-14 |
| AT-02 | GET | `/attendance/history` | J | requireSelfOrAdmin | - | S-14 |
| AT-03 | GET | `/attendance/weekly-hours` | J | requireSelfOrAdmin | - | S-18 |
| AT-04 | GET | `/attendance/summary/:userId` | J | requireSelfOrAdmin | - | - |
| AT-05 | POST | `/attendance/check-in` | J | any user | checkInSchema (passthrough) | S-17b |
| AT-06 | POST | `/attendance/check-out` | J | any user | checkOutSchema | - |
| AT-07 | POST | `/attendance/regularize` | J | any user (own) | regularizeSchema | - |
| LV-01 | GET | `/leave/types` | J | any user | - | global table |
| LV-02 | POST | `/leave/apply` | J | any user (own) | applyLeaveSchema | S-17 |
| LV-03 | GET | `/leave` | J | any user; tenant-wide only with `leave:approve` | - | - |
| LV-04 | GET | `/leave/requests` | J | same as LV-03 (alias) | - | - |
| LV-05 | PUT | `/leave/requests/:id` | J | owner only | updateLeaveSchema | - |
| LV-06 | DELETE | `/leave/requests/:id` | J | owner only, pending | - | - |
| LV-07 | GET | `/leave/balance` | J | requireSelfOrAdmin | - | S-14,S-17 |
| LV-08 | PUT | `/leave/:id/approve` | J | `leave:approve` + central policy | approveLeaveSchema | - |
| LV-09 | PUT | `/leave/:id` | J | owner only | updateLeaveSchema | - |
| LV-10 | DELETE | `/leave/:id` | J | owner only | - | - |
| TS-01 | GET | `/timesheets/week` | J | requireSelfOrAdmin | - | S-18, GET writes |
| TS-02 | GET | `/timesheets/history` | J | requireSelfOrAdmin | - | S-14 |
| TS-03 | GET | `/timesheets/pending` | J | `timesheet:approve` | - | - |
| TS-04 | PUT | `/timesheets/:id/entries` | J | owner only | saveTimesheetEntriesSchema | non-transactional |
| TS-05 | PUT | `/timesheets/:id/submit` | J | owner only | - | - |
| TS-06 | PUT | `/timesheets/:id/approve` | J | `timesheet:approve` + central policy | approveTimesheetSchema | - |
| EM-01 | GET | `/employees/check-email` | J | any user | - (query) | enumeration |
| EM-02 | GET | `/employees/roles` | J | any user | - | shared roles |
| EM-03 | GET | `/employees/me` | J | any user (own) | - | - |
| EM-04 | GET | `/employees` | J | `authorize([admin,super_admin,hr,manager,employee,employees:read,employees:manage])` = almost anyone | - (query) | **S-04** |
| EM-05 | POST | `/employees` | J | `authorize([admin,super_admin,hr,employees:manage])` + authzState for role | createEmployeeSchema | S-01b,S-22,S-23 |
| EM-06 | GET | `/employees/:id/education` | J | owner or `employees:update/manage` | - | - |
| EM-07 | PUT | `/employees/:id/education` | J | role name hr/admin/super_admin or owner | none | S-14 |
| EM-08 | GET | `/employees/:id/experience` | J | owner or `employees:update/manage` | - | - |
| EM-09 | PUT | `/employees/:id/experience` | J | role name hr/admin/super_admin or owner | none | S-14 |
| EM-10 | GET | `/employees/:id/emergency-contacts` | J | owner or `employees:update/manage` | - | - |
| EM-11 | POST | `/employees/:id/emergency-contacts` | J | role name hr/admin/super_admin or owner | none | S-14 |
| EM-12 | PUT | `/employees/:id` | J | role name hr/admin/super_admin; others "owner" (**broken**) | updateEmployeeSchema (passthrough) | **S-05**,S-14 |
| EM-13 | POST | `/employees/bulk-upload` | J | `authorize([admin,super_admin,hr,employees:manage])` | bulkUploadSchema | - |
| EM-14 | DELETE | `/employees/:id` | J | `authorize([admin,super_admin,hr,employees:manage])` | - | **S-01** |
| PY-01 | GET | `/payroll/employees` | J | `payroll:view` | - | bank no. in clear |
| PY-02 | PUT | `/payroll/employees/:id` | J | `payroll:manage` (+ not self) | updatePayrollProfileSchema | S-16 |
| PY-03 | GET | `/payroll/history/:employeeId` | J | `payroll:view` or `payroll:view_own` | - | stub |
| PY-04 | GET | `/payroll/runs` | J | `payroll:view` | - | - |
| PY-05 | GET | `/payroll/activity` | J | `payroll:view` | - | - |
| PY-06 | GET | `/payroll/pending-approvals` | J | `payroll:view` | - | - |
| PY-07 | GET | `/payroll/live-summary` | J | `payroll:view` | - | S-16 |
| PY-08 | GET | `/payroll/deadlines` | J | `payroll:view` | - | static dates |
| PY-09 | GET | `/payroll/tax-summary` | J | `payroll:view` | - | S-16 |
| PY-10 | POST | `/payroll/process` | J | `payroll:run` | processPayrollSchema | S-16 |
| RP-01 | GET | `/reports/admin` | J | `reports:view` | - | - |
| RP-02 | GET | `/reports/manager` | J | any user; others' data needs `employees:view` | - (query userId) | - |
| RP-03 | GET | `/reports/employee` | J | same as RP-02 | - | - |
| RP-04 | GET | `/reports/dashboard` | J | `reports:view` (alias of RP-01) | - | - |
| RP-05 | GET | `/reports/dashboard/manager` | J | alias of RP-02 | - | - |
| RP-06 | GET | `/reports/dashboard/employee` | J | alias of RP-03 | - | - |
| RP-07 | GET | `/reports/departments` | J | `reports:view` (alias of RP-12) | - | - |
| RP-08 | GET | `/reports/team` | J | any user; others need `employees:view` | - (query managerId) | - |
| RP-09 | GET | `/reports/profile/:employeeId` | J | own or `employees:view`, then field filter | - | - |
| RP-10 | GET | `/reports/analytics` | J | `reports:view` | - | - |
| RP-11 | GET | `/reports/summary` | J | `reports:view` | - | fake `recentReports` |
| CL-01 | POST | `/claims` | J | any user (own employee) | submitClaimSchema | S-17c |
| CL-02 | GET | `/claims/employee/:employeeId` | J | own, or `claims:approve` | - | - |
| CL-03 | GET | `/claims` | J | `claims:approve` | - | - |
| CL-04 | PUT | `/claims/:id/status` | J | `claims:approve` + central policy | updateClaimStatusSchema | - |
| AP-01 | GET | `/approvals` | J | any user; rows filtered only for role names `manager`/`employee` | - (query status) | **S-14b**,S-15 |
| AP-02 | POST | `/approvals` | J | `approvals:approve` | createApprovalSchema | - |
| AP-03 | POST | `/approvals/request` | J | any user (own) | none (manual whitelist) | - |
| AP-04 | POST | `/approvals/:id/action` | J | any-approver gate + per-type policy | updateApprovalActionSchema | - |
| AL-01 | GET | `/audit-logs` | J | `audit:view` | - (query) | vocab. mismatch |
| NT-01 | GET | `/notifications` | J | own | - | - |
| NT-02 | PUT | `/notifications/read-all` | J | own | - | - |
| NT-03 | PUT | `/notifications/:id/read` | J | own | - | S-18 |
| PF-01 | GET | `/performance` | J | **any user** | - | **S-06** |
| PF-02 | POST | `/performance` | J | role names manager/hr/admin/super_admin (via legacy expansion) | createPerformanceReviewSchema | S-06 |
| PF-03 | PUT | `/performance/:id` | J | **any user** | updatePerformanceReviewSchema | **S-06** |
| PF-04 | DELETE | `/performance/:id` | J | role names admin/super_admin (route and again in service) | - | S-14 |
| DC-01 | GET | `/documents/:employeeId` | J | blocked only for role name `employee` | - | **S-07** |
| DC-02 | POST | `/documents` | J | **any user** | uploadDocumentSchema | **S-07** |
| DC-03 | PUT | `/documents/:id/verify` | J | role names hr/admin/super_admin | verifyDocumentSchema | S-14 |
| DC-04 | DELETE | `/documents/:id` | J | role names hr/admin/super_admin | - | hard delete |
| SE-01 | GET | `/settings/permissions` | J | settings gate (S-03) | - | S-03 |
| SE-02 | GET | `/settings/roles` | J | settings gate | - | S-03 |
| SE-03 | GET | `/settings/roles/:id/members` | J | `roles:assign` / `roles:manage` / `users:manage` | - | - |
| SE-04 | GET | `/settings/roles/:id/candidates` | J | `roles:assign` | - | - |
| SE-05 | POST | `/settings/roles` | J | `roles:manage` + authzState | none | non-transactional |
| SE-06 | PUT | `/settings/roles/:id` | J | `roles:manage` + authzState | none | - |
| SE-07 | DELETE | `/settings/roles/:id` | J | `roles:manage` + authzState | - | - |
| SE-08 | PUT | `/settings/roles/:id/permissions` | J | `permissions:grant` + authzState | none | non-transactional |
| SE-09 | GET | `/settings/config` | J | settings gate | - | S-03 |
| SE-10 | PUT | `/settings/config` | J | settings gate only | none | **S-03** |
| SE-11 | POST | `/settings/test-email` | J | settings gate only | none | **S-03** |
| SE-12 | GET | `/settings/users` | J | settings gate | - | S-03 |
| SE-13 | POST | `/settings/users` | J | `users:manage` + authzState | none | S-12 |
| SE-14 | POST | `/settings/users/:id/send-welcome` | J | `users:manage` | none | S-12 |
| SE-15 | POST | `/settings/users/:id/reset-password` | J | `users:manage` + may-manage-target | - | S-12 |
| SE-16 | PUT | `/settings/users/:id/password` | J | `users:manage` + may-manage-target | none | S-12 |
| SE-17 | PUT | `/settings/users/:id/role` | J | `roles:assign` + authzState | none | - |
| SE-18 | PUT | `/settings/users/:id/status` | J | `users:manage` + may-manage-target | none | - |
| SE-19 | DELETE | `/settings/users/:id` | J | `users:manage` + may-manage-target | - | soft delete |
| OR-01 | GET | `/organization/team-status` | J | any user; scope by role name | - | S-14 |
| OR-02 | GET | `/organization/departments` | J | any user | - | - |
| OR-03 | POST | `/organization/departments` | J | `adminOnly` | createDepartmentSchema | creates approval, 202 |
| OR-04 | PUT | `/organization/departments/:id` | J | `adminOnly` | updateDepartmentSchema | wipes fields |
| OR-05 | DELETE | `/organization/departments/:id` | J | `adminOnly` | - | silent no-op |
| OR-06 | GET | `/organization/teams` | J | any user | - | - |
| OR-07 | POST | `/organization/teams` | J | `adminOnly` | createTeamSchema | 202 approval |
| OR-08 | PUT | `/organization/teams/:id` | J | `adminOnly` | updateTeamSchema | - |
| OR-09 | DELETE | `/organization/teams/:id` | J | `adminOnly` | - | silent no-op |
| GV-01 | GET | `/governance/tree` | J | any user | - | S-08 |
| GV-02 | GET | `/governance/search` | J | any user | - | S-08 |
| GV-03 | PUT | `/governance/:nodeId` | J | `authorize([admin,hr,super_admin])` | updateGovernanceSchema | **S-08** |
| GV-04 | POST | `/governance/sync` | J | `authorize([admin,hr,super_admin])` | - | S-08 |
| GV-05 | GET | `/governance/resolve/:nodeId` | J | any user | - | S-08 |
| RT-01 | GET | `/realtime/stream` (SSE) | J (header or `?token=`) | any user | - | S-11,S-24 |
| WS-01 | GET | `/workspace` | J | any user | - | - |

`adminOnly` = `authorize(['admin','super_admin','organization:manage','employees:manage'])` (C `organization.routes.ts:11`).

---

## 3. Endpoint detail by module

Common to every authenticated endpoint below unless stated: 401 on missing/invalid/expired token (`authenticate`); 403 from `authorize`; 429 from the IP limiter; 500 for any uncaught DB/runtime error; `tenantId` and `userId` come from the token.

### 3.1 Auth (`modules/auth/*`, mounted with `authLimiter`)

| | |
|---|---|
| **AU-01 GET /auth/repair-identity** | Public. Returns a fixed text "Identity Baseline Restoration is disabled in secure mode..." (C `auth.controller.ts` repairIdentity). No DB. Harmless residue; remove (Low). |
| **AU-02 POST /auth/login** | Body `{email: email, password: string>=1}` (C `auth.schema.ts:3-6`). Controller **trims email and password** (C `auth.controller.ts:13`): a password with deliberate leading/trailing space can never match a hash created untrimmed elsewhere (I). Service: `findUserByEmail` joins `users`-`employees`-`roles`, matches on login email **or the employee's `personal_email`**, requires `is_active` and `deleted_at IS NULL`, **not scoped by tenant** (emails treated as globally unique) (C `auth.repository.ts:4-23`; role join falls back to hard-coded role id 4, C `:7-11`). Password check: bcrypt compare **or plaintext equality against `users.temp_password`** (C `auth.service.ts:36-40`). Loads role permissions, signs access (15 m) and refresh (7 d) tokens, stores the refresh token in `users.refresh_token` and updates `last_login` (C `auth.repository.ts:97-103`). Audit event LOGIN with raw `x-forwarded-for` (spoofable) + UA. **Response 200:** `{success, accessToken, token (duplicate), refreshToken, mustChangePassword, user:{id,tenant_id,employee_id,name,email,role,dashboard_type,availability_status,phone,address,emergency,permissions[]}}`. **Errors:** 400 validation; 401 `Invalid credentials.` (same message for unknown user and bad password; timing differs because bcrypt is skipped for unknown users, I); 401 no tenant. **Security:** S-09 (refresh not bound to stored value), S-10 (limiter), S-12 (plaintext temp passwords). No lockout, no MFA, no per-account throttle. |
| **AU-03 POST /auth/refresh** | Body `{refreshToken?}`; falls back to a Bearer header. Verifies the refresh JWT, loads the **active** user, recomputes role/permissions from DB, issues **new access and refresh tokens**, writes the new refresh token to DB (C `auth.service.ts:75-111`). **The submitted token is never compared with `users.refresh_token`**, so rotation does not invalidate the old token and `logout` (which only nulls the column, C `:113-115`) does not stop a stolen refresh token for up to 7 days (S-09). Response `{success, accessToken, refreshToken}`; 401 for invalid/expired/inactive user. This endpoint is the only place a role/permission change or deactivation is re-evaluated. |
| **AU-04 POST /auth/forgot-password** | Body `{email}` (trimmed). Always 200 `{success:true,message}` generic text (C `auth.service.ts:163-193`). If an active user with a matching **employee row** exists and no reset was issued within 60 s: supersedes older tokens and inserts an `approvals` row `type='password_reset'`, `status='issued'`, `metadata` holds the SHA-256 token hash, expiry (30 min), user id, email; sends the link by e-mail (not awaited). Token is 32 random bytes base64url, link places it in the URL fragment (C `:11-26`). Errors are swallowed so response cannot disclose account existence. Concern: reset requests are stored in the business `approvals` table; users without an employee row can never reset (I). |
| **AU-05 POST /auth/reset-password** | Body `{token (min 1), email?, newPassword|password (>=6)}`. Looks up the hash, requires status `issued`, unexpired, optional email match, then `consumePasswordReset` in one transaction (single use; sets password hash, clears `temp_password`/`is_password_temp`) (C `auth.service.ts:195-232`, `auth.repository.ts:255-304`). Failure 400 with a generic "invalid or expired" message. Min password length 6 only, no complexity check; existing refresh tokens/sessions are **not revoked** after a reset (I: no `refresh_token` null in the consume query). |
| **AU-06 POST /auth/logout** | Nulls `users.refresh_token`; audit LOGOUT. Access token remains valid until expiry. |
| **AU-07 GET /auth/me** | Fresh profile from DB: id, name, email, tenant, created_at, optional phone/address/emergency/avatar (read via `to_jsonb(u)` so missing columns yield NULL), role, `dashboard_type` (default `employee`), `permissions[]`, one employee row (C `auth.repository.ts:56-95`; `auth.service.ts:117-121`). Response `{success,user}`. Used by the client to sync role changes. |
| **AU-08 PUT /auth/me** | Body (`updateProfileSchema`, C `auth.schema.ts:12-18`): `name?, phone?, address?, emergency?, preferences?(any)`. `UPDATE users ... COALESCE(...)`; **empty string/`null` cannot clear a field** because falsy values map to NULL then COALESCE keeps the old value (C `auth.repository.ts:104-119`). `avatar_url` handling in the repository is unreachable because the schema strips unknown keys (I). Audit event logs the whole body as `newValues`. Response `{success,message,user}`. |
| **AU-09 PUT /auth/me/preferences** | Body `{preferences:any}` stored as JSON text in `users.preferences`; no size limit beyond the 50 MB body cap (S-18). |
| **AU-10 PUT /auth/status** | Body `{status: 'available'|'busy'|'away'|'lunch'|'break'|'dnd'|'offline'}` (C `auth.schema.ts:23-27`). `UPDATE users SET availability_status WHERE id AND tenant_id`; broadcasts SSE `STATUS_UPDATE` to the tenant (C `auth.controller.ts` updateStatus). Identity only from token. 404 if the user row is missing. |
| **AU-11 PUT /auth/me/password** | Body `{currentPassword?, newPassword?|password?}` (>=6). If `currentPassword` supplied it must match; if omitted it is accepted **only when `is_password_temp`** (first-login flow) (C `auth.service.ts:140-160`). Updates hash, clears `temp_password`, `is_password_temp=false`. No session revocation (S-09), no history/complexity check. 401 wrong current password; 400 missing. |

### 3.2 Users (`modules/users/*`)

- **US-01 GET /users** — Query `role?` (exact match on `users.role`). Returns `{success, items:[{id,name,email,role,is_active}]}` for **all users of the tenant** to any authenticated user (C `users.routes.ts:12`, `users.repository.ts:20-32`). Includes deactivated users (only `COALESCE(is_active,true)` exposed). Unpaginated. Directory disclosure of logins and role names to every employee (S-14).
- **US-02 PUT /users/profile** — Body `{id: string|number, name: string, email: email, phone?, address?, emergency?}` (all of `name`/`email` required). No `authorize`; `id` is taken from the **body**, not the token (C `users.controller.ts:9`, `users.repository.ts:4-17`). SQL: `UPDATE users SET name,email,phone,address,emergency WHERE id=$6 AND tenant_id=$7 RETURNING id,name,email,role,phone,address,emergency`. **Any authenticated user can overwrite the name, login e-mail and contact fields of any other user in their tenant, including administrators (Critical, S-02).** There is no uniqueness pre-check (duplicate emails yield 409 that echoes the value), no email verification, no audit event, and an unset `phone` is written as NULL (erases). Changing `users.email` breaks the link to `employees.email` used for login, reset and role resolution, locking the victim out (I). The self-service profile route `PUT /auth/me` already exists and is safe; this route appears to be a legacy duplicate used by the client (U: client usage not traced).

### 3.3 Attendance (`modules/attendance/*`)

All routes `authenticate`; tenant from token. Employee id is resolved from the user via email join or `employees.user_id` (C `attendance.repository.ts:2-14`).

| Endpoint | Request | Behaviour / DB | Response / errors |
|---|---|---|---|
| **AT-01 GET /attendance/today** | `?userId?` | `requireSelfOrAdmin`. Open session + today's stats from `attendance` by employee/date/tenant (C `attendance.service.ts:5-34`). | `{status:'IN'|'OUT', checkIn, sessions_today, total_hours_today}`; unresolvable user returns an empty OUT state rather than 404. |
| **AT-02 GET /attendance/history** | `?userId?&month?&year?` (`parseInt` fallback to current) | `SELECT *, overtime_hours (hours over 9)` for the month, unbounded (C `attendance.repository.ts:~78-95`). | `{items,total}`. Filters on `EXTRACT(MONTH FROM check_in_time)` so no index use (Medium perf). |
| **AT-03 GET /attendance/weekly-hours** | `?userId?&weekStart&weekEnd` | `check_in_time::date BETWEEN $2::date AND $3::date`. **Params unvalidated**: missing/invalid dates produce a PG cast error and a 500 (C `attendance.controller.ts` getWeeklyHours; S-18). | `{days:{'YYYY-MM-DD':hours}}`. |
| **AT-04 GET /attendance/summary/:userId** | `:userId`, `?month,year` | Counts present/half days, avg hours. Elevated-role check uses the **role name** (S-14). | `{userId, present_days, half_days, total_entries, avg_hours}`. |
| **AT-05 POST /attendance/check-in** | `{}` (passthrough; ignored) | `getOpenSession` then `INSERT attendance(employee_id, check_in_time, date, status='present', tenant_id)` (C `attendance.repository.ts:49-57`). No lock/unique constraint: two concurrent calls create two open sessions (S-17b, I). Server time only. | 201 `{status:'IN',checkIn,employee_id,message}`; 400 already checked in; 404 no employee. |
| **AT-06 POST /attendance/check-out** | `{}` | `UPDATE attendance SET check_out_time WHERE employee_id AND date=CURRENT_DATE AND check_out_time IS NULL` (closes every open row at once). | `{status:'COMPLETED',total_hours,message}`; 404 no open session. Uses server/DB `CURRENT_DATE` in the DB timezone (I): sessions crossing midnight cannot be closed after the date rolls (open row has yesterday's `date`). |
| **AT-07 POST /attendance/regularize** | `{date: 'YYYY-MM-DD', check_in_time:'HH:MM[:SS]', check_out_time?, reason?}` (+ passthrough) | HF-5: only files a request. Validates date shape/real date/not in future, time pattern, out > in, no pending request for that date; inserts `approvals(type='attendance_regularization', status='pending', metadata{date,times,reason,user_id})` (C `attendance.service.ts:106-134`). Approval writes the attendance row (see AP-04). | 201 `{id:'REG-<uuid>',status:'pending',message}`; 400/404/409. |

### 3.4 Leave (`modules/leaves/*`)

Shared facts: `leave_requests` rows keyed by `user_id` (and `employee_id` in approvals joins). **No server-side check** that `end_date >= start_date`, that dates are valid ISO strings (just `z.string()`), for overlaps, or for available balance (C `leaves.schema.ts:7-12`, `leaves.repository.ts:9-16`). Balance counts approved requests only and uses calendar days incl. weekends (C `leaves.repository.ts:69-85`) (S-17).

- **LV-01 GET /leave/types** — `SELECT * FROM leave_types ORDER BY name`, **not tenant-scoped** (global quota table). Response `{items,total}`.
- **LV-02 POST /leave/apply** — Body `{leave_type_id: number(coerce), start_date, end_date, reason?}`; user id from token. Inserts a `pending` row; sends (un-awaited) notification to admin/hr/manager roles. 201 returns the row plus message. A non-existent `leave_type_id` yields FK 400.
- **LV-03/LV-04 GET /leave, /leave/requests** — Query `userId?, status?, leave_type_id?` (unvalidated; `::int` casts throw 500 on garbage). Without `leave:approve` the caller sees only own rows and asking for another `userId` is 403; with it, the tenant's rows with `leave_type_name`, `applicant_email` (C `leaves.service.ts:42-52`). Unpaginated.
- **LV-05/LV-09 PUT /leave/requests/:id, /leave/:id** — Body optional `{leave_type_id,start_date,end_date,reason}`. Owner-only and `status='pending'` enforced in the WHERE clause; non-numeric id returns not-found; own-but-decided gives 409 (C `leaves.repository.ts:37-49`, `leaves.service.ts` explainRefusal). Note `PUT /leave/:id/approve` is declared before `/:id` so it is not shadowed.
- **LV-06/LV-10 DELETE /leave/requests/:id, /leave/:id** — Hard-deletes an own pending request. Response `{message}`.
- **LV-07 GET /leave/balance** — `?userId?&year?`; `requireSelfOrAdmin` (role-name based). Response `{userId,year,balances:[{leave_type_id,name,annual_quota,used,available}]}`; `available` can go negative.
- **LV-08 PUT /leave/:id/approve** — Body `{action:'approved'|'rejected'}`. Delegates to the central approvals path (`leave-<id>`): needs `leave:approve`, kind/type check, tenant-scoped `FOR UPDATE` lock, **no self-approval**, only `pending`/`pending_audit`, records `approved_by`, notifies applicant, writes an audit event (C `leaves.service.ts:58-72`). Response `{...row, message}`. 403/404/409 as in AP-04. Note: approver is not required to be the requester's manager (any holder of `leave:approve` in the tenant can decide anyone's leave) (I, per-team scoping not implemented).

### 3.5 Timesheets (`modules/timesheets/*`)

- **TS-01 GET /timesheets/week** — Query `weekStart` (required, **unvalidated string**), `userId?`. Reads the user's sheet for that week; **if none exists it INSERTs a new draft sheet** (a GET that writes; C `timesheets.service.ts:15-30`), including for another user when an elevated role passes `?userId=`. Invalid `weekStart` makes `toISOString` throw `RangeError` -> 500; any date, not only Mondays, is accepted so duplicate "weeks" can be created. `week_end = weekStart + 6`. Response: sheet row with aggregated `entries[]` (json_agg).
- **TS-02 GET /timesheets/history** — Latest 20 sheets with entries for `userId` (default own). `requireSelfOrAdmin` (role names).
- **TS-03 GET /timesheets/pending** — `timesheet:approve`. All `submitted` sheets of the tenant with applicant name and e-mail; unpaginated.
- **TS-04 PUT /timesheets/:id/entries** — Body `{entries:[{project_name, task_desc?, mon_hours..sun_hours: string|number}]}`. Owner-only, status must be `draft`/`rejected`. `parseFloat(h)||0` per day; **no per-day (<=24) or negative bound**; `total_hours` recomputed. DB: DELETE existing entries, INSERT each, UPDATE total. `withTransaction` is opened but the repository calls use `pool`, so the writes are **not actually in the transaction** and a mid-way failure leaves a sheet emptied (C `timesheets.service.ts:41-55`, `timesheets.repository.ts:25-45`). Response: updated sheet + message.
- **TS-05 PUT /timesheets/:id/submit** — Owner-only transition draft/rejected -> submitted; 409 if state wrong; 404 otherwise.
- **TS-06 PUT /timesheets/:id/approve** — Body `{action:'approved'|'rejected', remarks?}`; central path (`ts-<id>`), `timesheet:approve`, no self-approval, only `submitted`, records approver and remarks, audit event. Response `{...row,message}`.

### 3.6 Employees (`modules/employees/*`)

Identity model: users and employees are linked by `users.email = employees.email`, `employees.user_id`, or the employee's `personal_email`.

- **EM-01 GET /employees/check-email** — Query `email?, name?`. Reveals whether an email exists as an employee (id and name returned for same-tenant matches) or login in the tenant; other tenants give a neutral "in use" (C `employees.service.ts:461-527`). Generates up to 3 `@ozofi.com` suggestions (hard-coded domain, ~10 queries). Open to **any authenticated user**: a tenant-directory oracle (Medium).
- **EM-02 GET /employees/roles** — Inline handler (not in a service); returns roles where `tenant_id = tenant OR NULL OR 'tenant_default' OR 'default'`: `{success,data:[{id,name,description,is_system,dashboard_type}]}` to any user (C `employees.routes.ts:31-41`).
- **EM-03 GET /employees/me** — Own full profile from `AnalyticsService.getEmployeeProfile` passed through `applyProfileAccess(profile, own)`. 404 if no employee row.
- **EM-04 GET /employees** — Query `search, page(1), limit(10), status, departmentId|department_id, teamId|team_id` (no cap on `limit`; `Number()` of garbage -> NaN -> 500). SQL (C `employees.repository.ts:4-62`): `SELECT e.*, avatar, user_id, department_name, manager_name, availability_status, role, role_id, is_checked_in FROM employees e LEFT JOIN departments, users (manager), users (self; tenant or 'tenant_default'/'default'), roles, attendance (ON u.id = a.user_id AND a.check_in::date = CURRENT_DATE)` + ILIKE on name/id/department/email (pattern characters in `search` are not escaped) + a separate COUNT. **`e.*` returns every employees column to the caller, including `annual_ctc`, `bank_account_number`, `date_of_birth`, address, `personal_email`, exit data** (S-04). The route guard accepts any holder of `attendance:view`, `dashboard:view`, `profile:view`, etc. via the `employee` legacy entry (C `employees.routes.ts:47`, `authorize.ts:73-75`), so ordinary employees can read colleagues' pay and personal data even though the profile endpoint now hides them (commit 42aaace only protects `/reports/profile/:id` and `/employees/me`). The attendance join can duplicate employee rows (multiple sessions today) and may reference legacy columns (`a.user_id`, `a.check_in`) that new check-ins never populate, so `is_checked_in` is likely always false (I). Response `{items,totalItems,totalPages}`.
- **EM-05 POST /employees** — Body `createEmployeeSchema` + passthrough (C `employees.schema.ts:3-36`): required `name, annualCTC(>=0), department, joinDate`; optional email, position, status, personal fields, `reportingManagerId`, `departmentId|department_id`, `team_id`, education/experience arrays, internship fields; `role` accepted via passthrough. Flow in one transaction (C `employees.service.ts:47-180`): resolve/authorize role (HF-10, baseline `employee` role unless `roles:assign` + coverage); pre-check duplicate work/personal e-mails against employees **and users** (messages for other tenants are neutral); **generate next id `EMP###` from a global max over all tenants with no lock** (S-22); insert employee (status default `onboarding`); if e-mail given create login with a random temp password (`Math.random`, S-12), `ON CONFLICT (email) DO NOTHING`; **await the offer-letter e-mail (PDF) inside the open transaction** (failure caught and logged, but latency holds a connection); insert payroll profile with a fixed split (50/20/25/5%) and `bank_account='PENDING'`; un-awaited notification. Response 201 `{success,employeeId}`. Errors: 409 duplicates, 400/403/404 role rules. No audit event, no max on `annualCTC` or string lengths, `joinDate` is not validated as a date until the DB casts it (500 on bad input).
- **EM-06/08/10 GET /employees/:id/{education|experience|emergency-contacts}** — Allowed for the owner (email/user/personal-email match, tenant-bound) or holders of `employees:update`/`employees:manage` (C `employees.controller.ts:67-72`, `profile.visibility.ts:20-24`); then `assertEmployeeInTenant` and a tenant-bound read. Education/experience fall back to the JSON column when child rows are absent. Unpaginated lists.
- **EM-07/09/11 PUT|PUT|POST /employees/:id/{education|experience|emergency-contacts}** — Body is **unvalidated** (`entries[]`/`contacts[]` or a bare array; anything else becomes `[]`). Authorization is by **role name** hr/admin/super_admin or ownership (C `employees.controller.ts:79-105`): a role holding `employees:update` under another name cannot edit, and ownership uses the correct 4-argument call here. Replace-all semantics: DELETE all child rows then INSERT per entry, and **an empty/invalid body wipes the records** (S-18); child rows are inserted `WHERE EXISTS employee in tenant` (good). Emergency contact fields (`name,relationship,phone`) are not required. Response `{success,items}`.
- **EM-12 PUT /employees/:id** — Body: `updateEmployeeSchema` + passthrough. Controller: `isHrOrAdmin = role in (admin,super_admin,hr)` by name; otherwise it calls `service.isEmployeeOwner(targetId, user.email, user.userId)` (C `employees.controller.ts:50`) but the method signature is `(employeeId, tenantId, email, userId)` (C `employees.service.ts:543`). The arguments shift: the e-mail is treated as `tenant_id`, so **the ownership check can never succeed and every non-HR user gets 403 "You are only authorized to update your own profile"** (S-05, functional regression introduced by HF-6; the restricted-field filter that follows is therefore dead code for them). For HR/admin by name: tenant-bound `findById`; e-mail uniqueness across employees and logins; role/e-mail changes go through authzState; profile columns via a whitelist map (`employees.submodels.ts:112-197`, includes `bank_account_number`, `annual_ctc`, `status`, `exit_*`, `reporting_manager_id`); user avatar/e-mail/role updates; payroll profile sync (`COALESCE` so nulls are ignored); un-awaited promotion/status e-mail. The whole update is one transaction. Notable: `status` is free text (no state machine; `terminated` does not deactivate the login), `reporting_manager_id` is not validated to belong to the tenant, e-mail changes update `users.email` without verification. Response `{success:true,message}`.
- **EM-13 POST /employees/bulk-upload** — Body `{employees: any[]>=1}`; **max 50 rows** (C `employees.service.ts:34,347-459`). Phase 1 validates every row (name, department, joinDate, duplicate-in-batch, duplicate-in-DB via a `findMany` search per row, role coverage); any failure aborts with `{inserted:0,aborted:true,results}` (HTTP 200). Phase 2 inserts row by row, each its own transaction and each sending an e-mail, so a mid-way error gives partial import; response `{inserted,skipped,total,aborted,results[]}`. Date normalisation supports only `d/m/yyyy`. 50 sequential transactions plus PDF e-mails can approach request timeouts (I).
- **EM-14 DELETE /employees/:id** — Guard `authorize([admin,super_admin,hr,employees:manage])` (legacy expansion makes this any holder of `employees:view`/`employees:create`/`employees:update`, S-03 family). Repository (C `employees.repository.ts:320-399`): in one transaction, **15 `DELETE ... WHERE employee_id = $1` statements run with no tenant condition** (education, experience, emergency contacts, documents, roles, performance reviews, timesheets, leave requests, approvals, payroll profiles/entries/history, reimbursement claims, claims, loans) **before** the tenant-bound lookup; `UPDATE employees SET manager_id = $2 WHERE manager_id = $1` is also tenant-less; then `DELETE FROM employees WHERE id AND tenant_id` and the `COMMIT` run unconditionally. **Employee ids are short sequential strings (`EMP001`...) shared in one global namespace, so a caller in tenant A who guesses `EMP007` belonging to tenant B destroys tenant B's child records (payroll history, claims, documents, approvals) while the final employee delete matches zero rows, the transaction commits, and the API answers 404.** (Critical, S-01; derived by reading, not executed.) Even same-tenant it is an irreversible hard delete of payroll/financial/audit-relevant history with no audit event, no confirmation and no soft-delete (the soft-delete exists only as an error fallback, C `:387-398`). Also deactivates the login by e-mail (except `admin@company.com`, a hard-coded exception) and re-parents reports using a regex on `position` to find a "CEO". Response 200 `{success,message}` or 404.

### 3.7 Payroll (`modules/payroll/*`)

The route comment says "payroll freeze unchanged" (C `payroll.routes.ts:12-14`); the endpoints below are the live ones.

- **PY-01 GET /payroll/employees** — `payroll:view`. All employees of the tenant LEFT JOIN payroll profiles, **unpaginated**; per row computes gross (basic+hra+allowances+bonus+overtime), PF 12% of basic, PT 200 if CTC>180000, net. Returns `annualCTC`, **`bank_account_number` in clear**, tax regime, salary structure. Includes terminated/soft-deleted employees (no `deleted_at` filter).
- **PY-02 PUT /payroll/employees/:id** — `payroll:manage`; refuses when `:id` is the caller's own employee id. Body (`updatePayrollProfileSchema`, passthrough): `basicSalary, hra, allowances, annualCTC, bankAccountNumber, taxRegime, salary_structure{basic_salary,hra,allowances}`. **Every field omitted from the body is overwritten with 0 / `'Not Linked'` / `'New'`** (C `payroll.service.ts:50-58`, `payroll.repository.ts:45-50`): a partial update (e.g. only `taxRegime`) zeroes salary components and CTC (S-16). `0` values cannot be set intentionally (`||`). Inserts the profile if absent. No audit, no history of changes, no bounds. Response `{success,message}`; 404 if employee not in tenant.
- **PY-03 GET /payroll/history/:employeeId** — `payroll:view` or `payroll:view_own`; **always returns `{payroll_history:[]}`** (stub) and does not verify that `view_own` holders ask for their own id. Not implemented.
- **PY-04/05 GET /payroll/runs, /payroll/activity** — `SELECT * FROM payroll_runs WHERE tenant_id ORDER BY processed_at DESC` (activity: LIMIT 5).
- **PY-06 GET /payroll/pending-approvals** — `{pending: COUNT(reimbursement_claims pending)}`; counts a different table than the live claims module (`claims`) (I: legacy table).
- **PY-07 GET /payroll/live-summary** — Aggregates over all payroll profiles: TDS bands 15% (>10 lakh) / 5% (>5 lakh), PF, PT; returns `{totalGross,totalDeductions,netOutflow,govtPayables}`.
- **PY-08 GET /payroll/deadlines** — Computed static list (PF 15th, PT 20th, IT sync month-end) with urgency; no DB.
- **PY-09 GET /payroll/tax-summary** — `{tds,pf,pt,esi:0,total}` with a **different TDS formula** (15% of basic only above 10 lakh, no 5% band) than live-summary/process (S-16).
- **PY-10 POST /payroll/process** — `payroll:run`. Body `{month: string|number, year: string|number}` (no range/format check; stored as text). Creates `payroll_runs(id='RUN-<year>-<month>-<Date.now()>')`, then for **every payroll profile in the tenant** inserts `payroll_entries` and upserts `payroll_history` (net, status `paid`) in one transaction; then un-awaited notifications to employees/managers and admin/hr (C `payroll.service.ts:200-255`). **No idempotency or duplicate-period guard**: re-running the same month inserts another run and duplicate `payroll_entries` (history is upserted, entries are not); payslip "paid" is set with no payment step; includes terminated employees whose profile remains; deductions (PF, PT, TDS, ESI) are simplified placeholders and not compliant tax computation (S-16). No audit event, no approval step, no dry-run. Response `{success,message,runId}`.

### 3.8 Reports (`modules/reports/*` + `services/analyticsService.ts`)

Access helper `reports.access.ts`: other-user data requires `employees:view` and the target must exist in the caller's tenant (C `reports.access.ts:23-40`).

- **RP-01/04 GET /reports/admin, /reports/dashboard** — `reports:view`. `AnalyticsService.getAdminDashboard(tenantId)` ~20 queries via `safeQuery` (error-swallowing): headcount, hires/exits, payroll CTC totals/averages, pending leaves/timesheets, attendance, gender, department distribution, 6-month trends, last 10 audit entries (with user names), upcoming holidays (`tenant_id = $1 OR NULL`), today's attendance log, salary distribution by position, org metrics. Sensitive aggregates (average salary, CTC totals) are exposed to every holder of `reports:view` (seeded `manager` has it) (I).
- **RP-02/05 GET /reports/manager, /reports/dashboard/manager** — Query `userId` (required int). Own id, or `employees:view` + same tenant. Team metrics for that manager; attendance joins use legacy `a.user_id/a.check_in` columns (current check-ins write `employee_id/check_in_time`), so metrics may be empty (I; `analyticsService.ts:390-425`).
- **RP-03/06 GET /reports/employee, /reports/dashboard/employee** — Query `userId`; same checks; personal dashboard (attendance, leave balances, holidays, payslip history, notifications, hours). Mixed `COALESCE(check_in, check_in_time)` handling.
- **RP-08 GET /reports/team** — Query `managerId` (required int); same access helper; returns `{items,total}` of direct reports with today's check-in/leave. Any holder of `employees:view` can read any manager's team.
- **RP-09 GET /reports/profile/:employeeId** — Own, or `employees:view` within tenant (else 403/404). Profile (employee, department, manager, compensation, documents, emergency contacts, last 5 reviews, attendance stats, leave balances) is then trimmed by `applyProfileAccess`: someone else's profile loses personal fields unless `employees:update/manage`, and pay fields unless `payroll:view/manage` (C `employees/profile.visibility.ts`, `reports.controller.ts:35-43`). The response also carries `access:{own,personal,pay,edit}`; `edit` is derived from **role names** (S-14). **This is the only hardened view; EM-04 is not (S-04).**
- **RP-10 GET /reports/analytics** — `reports:view`; four counts to percentages (division by headcount, `|| 1` guard).
- **RP-07/11 GET /reports/summary, /reports/departments** — `reports:view`; wraps the admin dashboard plus a 30-day attendance trend (recursive CTE); `recentReports` is **hard-coded fake data** (names, sizes, dates) (C `reports.controller.ts:128-132`) — must not be presented as real documents.
- `/reports/holidays` is called by the client but **does not exist** (Appendix B).

### 3.9 Claims (`modules/claims/*`)

- **CL-01 POST /claims** — Body `{employee_id: string, amount: coerce number >0 <=10,000,000 finite, category: string, description?}`. The employee must be the caller's own (`employee_id` is only compared, else 403). Inserts `claims(id='CLM-<Date.now()>', status='pending')`; the millisecond id can collide for simultaneous submissions (PK violation -> 409, S-17c). Category is free text. 201 `{success,claimId}`.
- **CL-02 GET /claims/employee/:employeeId** — Own id or `claims:approve`; tenant-bound list (all columns). Unpaginated.
- **CL-03 GET /claims** — `claims:approve`; every claim in the tenant with employee name.
- **CL-04 PUT /claims/:id/status** — Body `{status:'approved'|'rejected'}`; delegated to the central approval transaction (`claim-<id>`, type `claim`, permission `claims:approve`, no self-approval, pending only); audit event. 200 `{success:true}`. Note `claims:approve` exists only in the startup-seed vocabulary and in no seeded role, so only super_admin / `dashboard_type=admin` can use claims approvals until a role is granted it (baseline F-10, I for production).

### 3.10 Approvals (`modules/approvals/*`, partly uncommitted)

Unified inbox over `approvals`, `leave_requests`, `employees` (onboarding), `timesheets`, `claims`, with prefixed ids `std-`, `leave-`, `onb-`, `ts-`, `claim-` (C `approvals.policy.ts`).

- **AP-01 GET /approvals** — Query `status` (default `pending`; `history` or `completed` for decided items; **no schema**). Authenticated only. The repository builds a UNION ALL of five sources and filters on `ap.tenant_id = $1 OR ap.tenant_id IS NULL OR ap.tenant_id = ''` (C `approvals.repository.ts:30`): **the leave/onboarding/timesheet/claim branches carry no tenant predicate of their own**, so isolation depends entirely on that outer filter, and `std` approvals with a NULL/empty tenant are visible to every tenant (S-15). **Row scoping applies only when the JWT role name is exactly `manager` or `employee`** (own requests, about me, mine as manager/direct reports, C `:33-43`); **any other role name (hr, admin, custom roles such as `intern`, `trainee`) receives every pending/decided request of the whole tenant**, including leave reasons, claim amounts, onboarding and password-reset-type records (S-14b). The service then tags each row with `is_mine` and `can_act` using `hasAccess` per type and the manager rule (C `approvals.service.ts:25-55`). Response `{success,data:[{id,employee_id,employee_name,department,type,status,metadata,requested_by,created_at,manager_id,is_mine,can_act}]}`; unpaginated; ordered by department.
- **AP-02 POST /approvals** — `approvals:approve`. Body `{employeeId: string|number, type: string, status?(ignored)}`. Rejects reserved types (password_reset, leave, timesheet, claim, onboarding, department_creation, team_creation, attendance_regularization); employee must exist in the tenant; inserts `APP-<uuid>` as `pending` with no metadata/requester (C `approvals.service.ts:107-117`). Free-text `type` values fall under the generic `approvals:approve` permission. 201 `{success:true}` (the new id is **not** returned).
- **AP-03 POST /approvals/request** — Any user; no schema. Body `{type: 'role_change'|'promotion'|'team_change', ...fields}`; whitelisted string fields per type, each trimmed and cut to 500 chars (`role_change: requested_role, requested_role_id, reason`; `promotion: requested_designation, effective_date, reason`; `team_change: target_team, target_team_id, effective_date, reason`). Filed for the caller's own employee id with `requested_by = email`. 201 `{success,id:'REQ-<uuid>'}`; 400 unsupported type/empty details; 404 no employee. No rate limit specific to it and no cap on open requests (Low).
- **AP-04 POST /approvals/:id/action** — Body `{action:'approve'|'reject', type: string}`; route gate = any holder of **any** approval-type permission (`leave:approve, timesheet:approve, claims:approve, onboarding:manage, organization:manage, employees:manage, settings:manage, attendance:regularize, attendance:manage, approvals:approve`) (C `approvals.policy.ts:38-61`). Service (C `approvals.service.ts:124-225`): parse prefixed id (400 otherwise); for table-backed kinds check the claimed type then the type's permission **before** touching the DB; single transaction; `SELECT ... FOR UPDATE` tenant-bound lock (404 if not found); recheck claimed type vs real record; manager-routed types (role_change, promotion, team_change, attendance_regularization) are decided by the requester's reporting manager (self-service types also by a general approver); `isRegularizationApprover` falls back to **role name `admin`/`super_admin`** when the requester has no manager (C `approvals.service.ts:57-60`); **no self-approval** (user id, employee id or e-mail match); only pending statuses (409 otherwise). Effects: `department_creation`/`team_creation` execute the creation inside the transaction (department + org node + governance row; team + members re-assignment) with `meta.owner_id` etc. taken from stored metadata (the department code uses `Math.random()`); `role_change` requires an admin (and a super admin for admin roles) and rewrites `users.role_id/role`; `promotion` and `team_change` update `employees`; `attendance_regularization` **inserts** an attendance row (no overlap check; time strings concatenated into a timestamp, bad data would 500 after approval); onboarding approval sets `employees.status='active'` and sends an e-mail after commit. Audit event `APPROVAL_APPROVE/REJECT` (actor from token). Response `{success:true}`. Observations: the org-node and governance inserts in `executeTeamCreation/DepartmentCreation` have **no tenant column** (C `approvals.repository.ts:187-191,219-223`) so created graph nodes are tenant-less rows (I; interacts with S-08). The `role_change` guard checks `actor.role` names rather than permissions. Statuses written by decisions: `approved`/`rejected` (`active` for onboarding).

### 3.11 Audit logs (`modules/audit/*`)

- **AL-01 GET /audit-logs** — `audit:view` (exists in the `schema.ts` vocabulary; the startup seed uses `audit:read`, so the permission may be missing in some databases, U). Query `entityType, entityId, userId(int), action, page(1), limit(50)`; `limit` is not capped (a caller can request the entire table). SQL: audit rows for the tenant joined to users, filtered by the parameters, `ORDER BY created_at DESC LIMIT/OFFSET`, plus `COUNT(*)` of **all tenant rows ignoring the filters** (so `totalItems/totalPages` do not reflect filters; C `audit/read/read.repository.ts:25`). Response `{success,data,pagination}`. Read-only; no write/export route exists (`AuditExportService` is a stub). `userId=abc` -> NaN passed to SQL -> 500 (I).

### 3.12 Notifications (`modules/notifications/core/*`, mounted from `notifications/index.ts`)

- **NT-01 GET /notifications** — Query `page(1), limit(20)` (no cap). Own rows (user + tenant), plus an extra `COUNT` of unread. Response `{success,data,meta:{unreadCount,page,limit}}`.
- **NT-02 PUT /notifications/read-all** — Marks all own unread rows read. `{success,message}`.
- **NT-03 PUT /notifications/:id/read** — Own row only; 404 otherwise; non-numeric id (if the column is integer) causes a 500 (I). Response `{success,data}`.
- A second, unmounted copy of these routes exists (`notifications.routes.ts`, differs: `offset` instead of `page`), see Appendix A.

### 3.13 Performance reviews (`modules/performance/reviews/*`, mounted via `performance/index.ts`)

Schemas (C `performance.schema.ts`): create `{employeeId, reviewPeriod, rating: coerce number (no range), strengths?, improvements?, goals?, managerComments?}`; update all optional plus `employeeComments?, status?`.

- **PF-01 GET /performance** — Any authenticated user. Query `employeeId?, status?`. Returns **every performance review of the tenant** (rating, strengths, improvements, goals, manager comments, reviewer name, employee name) joined to employees and users (C `reviews.repository.ts:4-25`, route `reviews.routes.ts:13`). An ordinary employee can read all colleagues' reviews (S-06). Unpaginated.
- **PF-02 POST /performance** — `authorize([manager,hr,admin,super_admin])` -> legacy expansion (any `employees:view` holder). Inserts with `reviewer_id` = caller, `status='submitted'`; `employeeId` is not verified to belong to the tenant (only FK) and a rating of any number is accepted; a reviewer can review themselves. 201 `{success,review}`.
- **PF-03 PUT /performance/:id** — **No authorization beyond login.** Tenant-bound lookup then `UPDATE ... COALESCE`: any employee can change another person's review rating, comments and `status` (S-06). Employees can also alter reviews written about themselves.
- **PF-04 DELETE /performance/:id** — Route and service both require role name `admin`/`super_admin`; hard delete; 404 if absent.

### 3.14 Documents (`modules/documents/*`)

- **DC-01 GET /documents/:employeeId** — Authenticated. Only when the JWT role is literally `employee` does the service compare the document owner's `user_id` to the caller (strict `!==`; C `documents.service.ts:13-18`); **every other role name (manager, custom roles) can list any employee's documents of the tenant**, including `file_path` references (S-07). Rows `SELECT d.*, uploaded_by_name`, unpaginated.
- **DC-02 POST /documents** — **Any authenticated user.** Body `{employeeId: string|number, documentType, documentName, filePath?, fileSize?: number, expiresAt?: string|null}`. Inserts into `employee_documents` for the caller's tenant; **`employeeId` is never checked to belong to the tenant or to the caller** (FK only), `filePath` is an arbitrary string (no allowed prefix/extension; becomes a stored link that the UI may follow, XSS/SSRF/phishing vector depending on rendering, U), `fileSize` unvalidated. There is no file upload endpoint: the service stores metadata only (U where files actually live). 201 `{success,document}`. Any user can attach a document to any employee (`verified` defaults by DB).
- **DC-03 PUT /documents/:id/verify** — role-name guard (hr/admin/super_admin -> legacy expansion); body `{verified: boolean}`; sets `verified_by`; 404 if not in tenant.
- **DC-04 DELETE /documents/:id** — same guard; **hard delete**, no audit; 404 if not found.

### 3.15 Settings (`modules/settings/*`)

Router-level gate (C `settings/index.ts:9-11`): `authenticate` then `authorize(['admin','super_admin','hr','settings:manage'])`. Through the legacy expansion (1.4) **any user holding any of employees:view/create/update, payroll:manage, reports:view, leave:approve, onboarding:manage, attendance:manage (seeded `manager`, `hr`) passes this gate** (baseline F-1, probe table still valid because `ROLE_TO_PERMISSIONS` and `index.ts:11` are unchanged). Sub-routes that add their own `authorize` are tighter; the others are not:

- **SE-01 GET /settings/permissions** — all permission rows `{success,data:{module:[{id,action,description}]},flat}` (global table).
- **SE-02 GET /settings/roles** — roles of the tenant, shared templates, and NULL tenant with `user_count` (tenant users only) and permission keys; on any error falls back to a degraded list that stays inside the tenant (C `rbac.service.ts:34-57`). `created_at` is fabricated as `new Date()`.
- **SE-03/04 GET /settings/roles/:id/members | /candidates** — `roles:assign|manage|users:manage` / `roles:assign`; role must be visible to the tenant; query `search(<=100, LIKE-escaped), limit(<=50; candidates <=20), offset`; tenant-only users; response `{success,items,total,limit,offset}`.
- **SE-05 POST /settings/roles** — `roles:manage` + `assertMayCreateRole` (name required, not reserved, valid dashboard type, actor must hold every granted permission, permission format `^[a-z_]+:[a-z_]+$` and must exist). Insert role then loop inserts into `role_permissions` **without a transaction** (a failure leaves a role with partial permissions; failures are rethrown as 400 including `err.message`, which can leak DB text, C `rbac.service.ts:~79-85`). Body unvalidated by zod.
- **SE-06 PUT /settings/roles/:id** — `roles:manage`; role must be tenant-owned (shared templates are read-only), actor must cover the role; `name` ignored for system roles; `dashboard_type` validated. 404 if tenant-owned row not found.
- **SE-07 DELETE /settings/roles/:id** — as above; refuses roles with assigned users (count not tenant-scoped; blocks deletion if another tenant's user holds the role id, I) and system roles.
- **SE-08 PUT /settings/roles/:id/permissions** — `permissions:grant`; body `{permissions: string[]}`; role tenant-owned and covered; every permission must exist and be held by the actor (unless a bypass actor). `DELETE FROM role_permissions` then inserts in a loop, **not transactional**: a crash or concurrent request between the delete and the inserts leaves the role with no permissions (S-26). Changes reach users only after their next refresh (<=15 min).
- **SE-09 GET /settings/config** — settings gate only. Returns all `app_config` rows for the tenant **and tenant NULL**, grouped `{category:{key:value}}`; secret keys (`smtp_pass, api_key, slack_webhook, teams_webhook`) are masked (HF-7, C `configuration.secrets.ts`). Other keys (smtp host/user, from address, org name, logo URL, tax IDs, etc.) are returned in clear to every gate-passing user. Errors degrade to `{data:{},warning:<db message>}` (leaks DB error text).
- **SE-10 PUT /settings/config** — settings gate only, **no permission of its own** (C `configuration.routes.ts:8`). Body `{category: string, settings: {key: any}}` unvalidated; every key is upserted (`String(value)`) for the caller's tenant; mask placeholders for secrets are ignored; the `app_config` table is created on demand (`CREATE TABLE IF NOT EXISTS`, error swallowed). **Any manager-level user can change SMTP host/credentials, webhook URLs, API key and org identity for the tenant** (S-03). Arbitrary categories/keys, no size limit, no audit event, secrets stored in plaintext (U: encryption at rest not visible).
- **SE-11 POST /settings/test-email** — settings gate only; body `{to}` (no format check). Sends an e-mail through the **tenant/system SMTP** to any recipient; abuse as a mail relay / harassment, no throttle other than 300 req/min (S-03). Response `{success,sent,message}`.
- **SE-12 GET /settings/users** — settings gate only; employees LEFT JOIN users (+roles) for the tenant **and NULL tenant**: employee id, name, email, department, position, user id, role, active flag, `last_login`, role id, `is_password_temp`, role name; unpaginated; no longer returns `temp_password` (HF-7, C `user-assignments.repository.ts:4-20`).
- **SE-13 POST /settings/users** — `users:manage`. Body unvalidated `{name, email, password?, role?, role_id?, send_welcome_email?}`. Rejects an existing e-mail (global), resolves the role through `resolveRoleForNewAccount` (baseline role or full assignment rules), bcrypt-hashes the supplied or generated (`Math.random`) password, **stores the auto-generated password in clear in `users.temp_password`**, returns it in the response (`RETURNING ... temp_password`), notifies and optionally e-mails. **Bug:** the welcome e-mail is built with `tempPassword: password` (the request value), so for auto-generated passwords it sends `undefined` (C `user-assignments.service.ts:53`). No e-mail format validation or password policy; **no employee row is created**, so the user cannot use reset-password (I). 201 `{success,data}`.
- **SE-14 POST /settings/users/:id/send-welcome** — `users:manage`; optional body `temp_password` (sets that password after `assertMayManageUser`, stored hashed **and in clear in temp_password**); e-mails credentials. Response `{success,sent,message}`.
- **SE-15 POST /settings/users/:id/reset-password** — `users:manage` + `assertMayManageUser` (target's authority must be covered); generates a temp password (`Math.random`, ~10 chars base36), stores hash and the **plaintext** in `temp_password`, flags `is_password_temp`, **returns the plaintext in the HTTP response** (C `user-assignments.service.ts:82-90`, controller). Existing sessions are not revoked (S-09).
- **SE-16 PUT /settings/users/:id/password** — `users:manage` + may-manage; body `{password}` (any length >= 1, no policy); stores hash and **plaintext copy in `temp_password`** (C `user-assignments.service.ts:97`), sets `is_password_temp=true` (user forced to change on next login). The plaintext column also works as a login credential (AU-02) (S-12).
- **SE-17 PUT /settings/users/:id/role** — `roles:assign`; body `{role?, role_id?, notify_user?}`; policy: not self, target covered, role visible to tenant and covered; updates `users.role/role_id`; optional e-mail; un-awaited notification. Effective after the target's next refresh.
- **SE-18 PUT /settings/users/:id/status** — `users:manage`; body `{is_active}` (coerced with `Boolean()`; the string `"false"` becomes true); not self; may-manage-target. Deactivation blocks login/refresh but not an already-issued access token (<=15 min).
- **SE-19 DELETE /settings/users/:id** — `users:manage`; not self; soft delete (`deleted_at`, `is_active=false`); the linked `employees` row is untouched (I).

### 3.16 Organization (`modules/organization/*`, partly uncommitted)

- **OR-01 GET /organization/team-status** — Any user. Role looked up from the `users` table (not the JWT) and admin-ness by name (`admin, super_admin, hr, administrator`); admins see all employees, others see people in the same department/team, direct reports, or whose `user_id` matches their reporting manager; includes `availability_status`, clock-in state; `DISTINCT` + correlated subqueries per row (heavy for large tenants). Returns `{success,data}`.
- **OR-02/06 GET /organization/departments, /teams** — Any user; tenant-bound lists with employee/team counts (correlated subqueries); teams accept `?department_id` (unvalidated).
- **OR-03 POST /organization/departments** — `adminOnly`. Body `{name, description?, manager_id?: number|null, metadata?: any, category?}`. **Does not create the department**: inserts an `approvals` row `department_creation` (`STR-<Date.now()>`, id collisions possible) with metadata; returns **202** `{success,message}`. `metadata` given as a string is `JSON.parse`d without try/catch (invalid JSON -> 500, C `organization.service.ts:22,50`). The requester's employee id is looked up via `employees.user_id` only (NULL when the user has no `user_id`, so the approval has no requester, I). The central policy forbids self-approval only when the requester's employee id is known, so a requester with no `user_id` link can bypass that check (I).
- **OR-04 PUT /organization/departments/:id** — `adminOnly`. Schema = create schema. **Immediate** update of `name, description, manager_id, metadata` for tenant row; **omitted optional fields overwrite with NULL / `{}`** (no COALESCE, C `organization.repository.ts:28-34`) and no approval workflow, so edits bypass the approval that creation requires; returns the row (or `undefined` data when the id is not in the tenant, 200).
- **OR-05 DELETE /organization/departments/:id** — `adminOnly`; `DELETE FROM departments WHERE id AND tenant_id`, always 200 (even when nothing matched); employees keep a dangling `department_id` unless FK rules apply (U); the corresponding `org_nodes`/`org_governance` rows are not removed (I).
- **OR-07 POST /organization/teams** — `adminOnly`; body `{name, department_id: number, parent_team_id?, member_ids?: string[]<=200, description?, manager_id?, metadata?, category?}`; filed as a `team_creation` approval (202); `department_id` is not checked to belong to the tenant until approval executes.
- **OR-08 PUT /organization/teams/:id** — `adminOnly`; partial schema; `COALESCE` update, but `parent_team_id` and `metadata` cannot be cleared; immediate. Parent/department/manager ids are not tenant-validated (cross-tenant FK references possible, I).
- **OR-09 DELETE /organization/teams/:id** — as OR-05.

### 3.17 Governance (`modules/governance/*`, mounted via `governance/index.ts`)

Org graph tables `org_nodes` and `org_governance`; queries accept `tenant_id IN ($tenant,'tenant_default','default')`.

- **GV-01 GET /governance/tree** — Any user. Loads nodes (with governance owner names) and **all employees (id, name, position, department_id, team_id, avatar_url)** of the tenant plus shared pseudo-tenant rows; **if there are no nodes it auto-runs `syncGraph` as a side effect of a GET** (C `org-tree.service.ts:~14-24`); on any DB error returns an empty tree (error swallowed). Response `{success,data:[tree]}`; each employee is placed under a team or department node. O(n*m) `find` per employee in memory.
- **GV-02 GET /governance/search** — Any user; query `q` (unvalidated; undefined becomes `%undefined%`); recursive CTE with a depth limit of 20; `LIMIT 10`; `{success,data:[{id,name,parent_node_id,full_path,depth}]}`.
- **GV-03 PUT /governance/:nodeId** — `authorize([admin,hr,super_admin])` (legacy expansion: any `employees:view` holder). Body `{owner_id?: number|null, ruler_id?: number|null, is_inheritance_blocked?: boolean}`. `INSERT INTO org_governance(node_id, owner_id, ruler_id, is_inheritance_blocked, tenant_id) ... ON CONFLICT (node_id) DO UPDATE SET owner_id, ruler_id, is_inheritance_blocked` (C `org-tree.repository.ts:28-37`). **The node id is never verified to belong to the caller's tenant**, and the conflict update has no tenant condition: a user in tenant A can overwrite the owner/ruler/inheritance flags of tenant B's org nodes by id (integer ids) (S-08). Omitted fields overwrite with NULL. `owner_id` is not verified as a user of the tenant. `nodeId` non-numeric -> 500. No audit.
- **GV-04 POST /governance/sync** — same guard; copies departments and teams of the tenant **and of the shared `tenant_default`/`default` rows** into `org_nodes`/`org_governance` inside a transaction (idempotent by entity id). Response `{success,message}`.
- **GV-05 GET /governance/resolve/:nodeId** — Any user; walks up to 20 ancestors and returns the nearest owner `{success,resolvedOwner:{id,name,nodeId,nodeName,isInherited},fullChain[]}`. `nodeId` non-numeric -> 500.

### 3.18 Realtime (`modules/realtime/connections/*`)

- **RT-01 GET /realtime/stream** — `authenticate` (header or `?token=`). Opens a Server-Sent Events stream, registers `{userId, tenantId, res}` in an **in-memory array**, writes `data: {"type":"connected"}` and a keep-alive comment every 30 s; removed on close. Events: `STATUS_UPDATE {userId,email,status}` broadcast to all clients of the same tenant (C `realtime/events/events.service.ts`). Concerns (S-24): unlimited connections per user, no heartbeat timeout, state is per process (does not work across serverless instances/replicas; `index.ts` supports a Vercel mode, I), tokens in URL (S-11), a token expiring (15 min) does not close the stream (the connection stays authenticated indefinitely), no per-user filtering of broadcast data (availability and email of every user to every tenant member).

### 3.19 Workspace (`modules/workspace/*`)

- **WS-01 GET /workspace** — Any authenticated user. Reads `app_config` category `general` keys `org_name` and `logo_url` (tenant row wins over NULL-tenant row); `logoUrl` returned only if it starts with `http(s)://`; missing table (`42P01`) yields empty. Response `{success,data:{name,logoUrl}}`. Minimal, no issues found beyond: `logo_url` can point to any host (privacy/tracking pixel) and is written through the unguarded SE-10 (S-03).

---

## 4. Findings register (security and reliability, ordered by severity)

All items are from reading current code; none were reproduced by execution unless stated.

| ID | Sev | Finding | Evidence |
|---|---|---|---|
| **S-01** | Critical | `DELETE /employees/:id` runs child-table deletes and manager re-parenting without a tenant filter, then commits even when the tenant-scoped employee delete matches nothing. With sequential global ids (`EMP###`), a user of any tenant who holds an `employees`-type permission can destroy another tenant's payroll history, claims, documents, approvals and leave. Irreversible hard delete without audit even in-tenant. | C `employees/employees.repository.ts:326-340,369,378,385`; `employees.routes.ts:71`; id scheme C `employees.service.ts:97-104` |
| S-01b | Medium | Employee ids are generated from a global `MAX(EMP###)` with no lock and no tenant prefix: concurrent creates collide (409), and any tenant can infer the global employee count/ids of others. | C `employees.service.ts:96-104` |
| **S-02** | Critical | `PUT /users/profile` takes the target `id` from the body, has no authorization, and updates name, login e-mail, phone, address, emergency contact of any user in the tenant (including admins). Enables impersonation/lock-out; e-mail swap breaks login/reset links. | C `users/users.routes.ts:13`, `users.controller.ts:9`, `users.repository.ts:4-17` |
| **S-03** | High | `/settings` gate is satisfied by any holder of a broad permission (legacy `hr`/`admin` expansion). `GET /settings/{config,users,roles,permissions}`, `PUT /settings/config`, `POST /settings/test-email` have no further guard: a seeded Manager can rewrite SMTP/webhook/API key settings, read the user directory with temp-password flags, and send mail via the org SMTP to any address. Baseline F-1 remains true for these routes; HF-10 hardened only roles/users mutations. | C `settings/index.ts:11`, `core/security/authorize.ts:69-75,94-130`, `settings/configuration/configuration.routes.ts:7-9`, `settings/rbac/rbac.routes.ts:8-9`, `user-assignments.routes.ts:8` |
| **S-04** | High | `GET /employees` returns `e.*` (annual CTC, bank account number, DOB, address, personal e-mail, exit details) for every employee of the tenant to anyone passing the guard, and the guard accepts any user with attendance/profile/dashboard permissions. The recent profile-visibility work does not cover this list. | C `employees.repository.ts:8`, `employees.routes.ts:47`, `employees.controller.ts:9-30` |
| **S-05** | High (functional) | `PUT /employees/:id` owner check is called with 3 arguments against a 4-parameter method, so a non-HR user can never update even their own profile; the e-mail is compared as the tenant id. Tests did not catch it (U: unit test coverage not read for this path). | C `employees.controller.ts:50` vs `employees.service.ts:543-550` |
| **S-06** | High | Performance reviews: `GET /performance` returns all tenant reviews to any user; `PUT /performance/:id` lets any user edit any review (rating, comments, status). | C `performance/reviews/reviews.routes.ts:13,15`; `reviews.repository.ts:4-25,39-58` |
| **S-07** | High | Documents: listing blocked only for the role literally named `employee`; any user can POST a document record against any employee id with an arbitrary `filePath` string. | C `documents/documents.service.ts:13-19`; `documents.routes.ts:13-14`; `documents.repository.ts:17-25`; `documents.schema.ts:3-9` |
| **S-08** | High | Governance: `PUT /governance/:nodeId` upserts by `node_id` with no tenant check on the node; `'tenant_default'`/`'default'` pseudo-tenant rows are readable by (and synced into) every tenant. | C `governance/org-tree/org-tree.repository.ts:9-10,28-37`; `sync/sync.repository.ts:9-11` |
| **S-09** | Medium | Refresh tokens are never matched against the stored value: logout, reset-password, password change and user deactivation do not revoke refresh tokens; a stolen refresh token works for 7 days and old tokens keep working after rotation. | C `auth/auth.service.ts:75-115,140-160,195-232`; `auth.repository.ts:97-103` |
| S-10 | Medium | The 10/15-min IP limiter covers every `/auth/*` route (incl. `/auth/me`, `/auth/status`); no per-account lockout; `trust proxy` not configured. | C `app.ts:46-52,106`; no `trust proxy` anywhere in `app.ts` |
| S-11 | Medium | `?token=` JWT in the query string is accepted on all authenticated routes. | C `core/security/authorize.ts:13-17` |
| S-12 | Medium | Temporary/admin-set passwords are stored in clear in `users.temp_password`, accepted at login by plaintext comparison, returned in API responses, generated with `Math.random`; admin `PUT /settings/users/:id/password` writes the typed password to that column. | C `auth.service.ts:36-40`; `user-assignments.service.ts:37,65,85,97`; `user-assignments.repository.ts:39-40`; `employees.service.ts:128` |
| S-13 | Medium | Access tokens carry role/permissions for 15 min and are never re-validated against the DB: deactivated or demoted users keep access until expiry; role-name checks use the stale JWT role. | C `authorize.ts:26-36` |
| S-14 | Medium | Inconsistent authorization vocabulary: many checks use the role **name** (`requireSelfOrAdmin`, documents, performance, employee sub-record writes, `isHrOrAdmin`, `WRITE_ROLES`, regularization fallback, team-status, role-change approval). Custom roles behave unpredictably (denied where they hold the permission, or allowed where they do not). | C `authorize.ts:187-216`; `documents.service.ts:13`; `employees.controller.ts:48,81,99`; `profile.visibility.ts:29`; `approvals.service.ts:59,69`; `organization.repository.ts:83` |
| **S-14b** | High | `GET /approvals` scopes rows only for role names `manager` and `employee`; any other role (hr, custom) receives the whole tenant's requests (leave reasons, claim amounts, onboarding, etc.). | C `approvals/approvals.repository.ts:33-43` |
| S-15 | Medium | Approvals inbox and several joins include rows with NULL/empty tenant; leave/onboarding/timesheet/claim union branches have no tenant predicate of their own (rely on the outer filter). | C `approvals.repository.ts:30,50-140` |
| S-16 | Medium | Payroll: partial update wipes omitted salary fields; run is not idempotent and not approval-gated; three inconsistent deduction formulas; bank account in clear; terminated employees included. | C `payroll.service.ts:50-58,200-255,102-181`; `payroll.repository.ts:45-50` |
| S-17 | Medium | Leave: no date-order/overlap/balance validation, global `leave_types`; (b) attendance check-in race; (c) claim id `CLM-<ms>` collisions; timesheets accept any hours. | C `leaves.schema.ts`; `attendance.repository.ts:49-57`; `claims.service.ts:21`; `timesheets.service.ts:36-55` |
| S-18 | Medium | No validation of path/query parameters anywhere (no `validate(...,'query'|'params')`): bad dates/ids cause 500s; replace-all sub-record endpoints accept empty/invalid bodies and wipe data; unbounded `limit`. | C all `*.routes.ts` (no query/params schemas); `employees.controller.ts:100-115`; `attendance.controller.ts` |
| S-19 | Medium | `/public` serves offer-letter/certificate files without authentication. | C `app.ts:90` (contents of the 7 files not read) |
| S-20 | Low | CORS trusts every `*.vercel.app` origin with credentials; 50 MB JSON body limit on all routes; no `helmet`; DB TLS not verified. | C `app.ts:74,86-87`; `config/db.ts:26` |
| S-21 | Low | Dead but dangerous code remains: `settings/settings.routes.ts` (older, unguarded temp-password endpoints incl. `GET /users/:id/temp-password`), `governance/governance.routes.ts`, `notifications/notifications.routes.ts`, `realtime/realtime.routes.ts`, `performance/performance.routes.ts`, whole `departments/` module, `middleware/errorHandler.ts`. Not mounted today; one `app.use` away from exposure. | C `app.ts:20-39` imports; grep shows no importers (Appendix A) |
| S-22 | Low | `createEmployee`/bulk send the temp password to a creator-supplied `personalEmail` and wait for PDF e-mail inside a transaction; no audit of employee lifecycle. | C `employees.service.ts:127-163` |
| S-23 | Low | Audit trail covers only login/logout/profile/approval decisions; `GET /audit-logs` total ignores filters and `limit` is uncapped. | C grep (1.8); `audit/read/read.repository.ts:25` |
| S-24 | Low | SSE: in-memory client registry, no connection cap, token expiry does not close the stream, broadcasts email+status of every user to the tenant. | C `realtime/connections/connections.service.ts:10-36` |
| S-25 | Low | Duplicate 23505 handler echoes conflicting column/value; `GET /settings/config` and role fallbacks return raw DB error text in `warning`; role creation returns `err.message`. | C `core/errors/errorHandler.ts:23-39`; `configuration.service.ts:21-24`; `rbac.service.ts` createRole |
| S-26 | Low | `PUT /settings/roles/:id/permissions` and `POST /settings/roles` perform multi-statement writes outside a transaction (role may be left with zero permissions). | C `rbac.service.ts:110-134`; `rbac.repository.ts:124-126` |

Baseline carry-over (fixed since `06dc08f`, verified in code): master-password backdoor removed (HF-1), JWT secrets required (HF-2), token-based password reset (HF-3), central tenant-bound, locked, no-self-approve decision path (HF-4), explicit permission gates on payroll/claims/audit/timesheets/reports (HF-5), tenant-bound sub-record reads/writes and settings fallbacks (HF-6/6B), credential masking in config reads (HF-7), role/permission escalation policy (HF-10), availability limited to the caller. **Still open from the baseline:** F-1 (legacy role expansion), F-9 (stale JWT), F-10 (vocabulary drift), F-12 (identity-affecting profile route; now worse, see S-02).

---

## Appendix A. Unmounted / dead route files (not part of the live API)

Verified: no import of these files exists outside their own module (C grep of `server/src`).

| File | Content | Note |
|---|---|---|
| `modules/settings/settings.routes.ts` | Older monolithic settings router (roles, users, temp-password reveal, config, test-email) | Not imported by `settings/index.ts` or `app.ts`; superseded by `rbac/`, `user-assignments/`, `configuration/` |
| `modules/governance/governance.routes.ts` (+ controller/service/repository) | Older governance router with `/tree`, `/sync`, `/search`, `/resolve`, `PUT /:nodeId` | Superseded by `org-tree/`, `sync/`, `shared/` |
| `modules/notifications/notifications.routes.ts` (+ controller/service/repository) | Duplicate of `core/` routes with `offset` pagination | Mounted module is `notifications/index.ts` -> `core/` |
| `modules/realtime/realtime.routes.ts` (+ controller) | Duplicate SSE route | Mounted via `realtime/index.ts` -> `connections/` |
| `modules/performance/performance.routes.ts` (+ controller/service/repository) | Duplicate of `reviews/` | Mounted via `performance/index.ts` -> `reviews/` |
| `modules/departments/*` | `GET /` departments with employee counts | Never imported by `app.ts`; the client's departments list uses `/organization/departments` |
| `middleware/errorHandler.ts`, `middleware/authMiddleware.ts` | Older error/validate and re-export shim | `app.ts` imports `core/errors/errorHandler` |

## Appendix B. Client calls with no matching backend route (`route_contract_check.py`, 18)

| Method | Path | Called from (client/src) | Consequence |
|---|---|---|---|
| GET | `/approvals/pending` | `modules/settings/components/ApprovalsTab.tsx` | 404 |
| PUT | `/approvals/X/X` | `modules/settings/components/ApprovalsTab.tsx` | 404 |
| GET | `/claims/admin` | `modules/payroll/sections/Approvals.tsx` | 404 |
| PUT | `/claims/X/approve`, `/claims/X/reject` | `modules/payroll/sections/Approvals.tsx` | 404 (real route is `PUT /claims/:id/status`) |
| GET | `/payroll/deadlines/latest`, POST `/payroll/deadlines` | `modules/payroll/sections/Approvals.tsx` | 404 |
| GET | `/payroll/documents/bulk-payslips` | `DocumentsPayslips.tsx` | 404 |
| GET | `/payroll/payslip/X/monthly`, `/payroll/payslip/X/yearly` | `DocumentsPayslips.tsx`, `EmployeePayroll.tsx` | 404 (no payslip generation endpoints) |
| GET | `/payroll/tax-statutory/summary` | `TaxStatutory.tsx` | 404 |
| POST | `/payroll/run`, `/payroll/profiles` | `PayRuns.tsx`, `CreateProfileModal.tsx` | 404 (real: `POST /payroll/process`; profile create is `PUT /payroll/employees/:id`) |
| GET | `/reports/holidays` | `OrgCalendarWidget.tsx` | 404 (holidays are only embedded in dashboards) |
| GET | `/timesheets` | `modules/timesheet/pages/Timesheets.tsx` | 404 |
| PUT/DELETE | `/X/X` | `modules/organization/hooks/useOrganizationForm.ts` | template path, cannot be resolved statically (U) |

## Appendix C. Files opened for this document

`server/src/`: `app.ts`, `index.ts`, `config/db.ts`, `config/env.ts`, `database/client.ts`, `database/transaction.ts`, `middleware/authMiddleware.ts`, `middleware/errorHandler.ts`, `core/errors/{errorHandler,AppError}.ts`, `core/response/ApiResponse.ts`, `core/validation/validateRequest.ts`, `core/security/{authorize,authzState,identity,jwt.service,password.service}.ts`, `core/events/{eventBus,eventPublisher,registry}.ts`, `types/index.ts` (excerpts), `db/schema.ts` (permission lists/role map), `initDb.ts` (attendance/claims/leave tables), `scripts/seedPermissions.ts` (permission list), `services/{analyticsService,auditService,notificationService,realtimeService}.ts` (analytics: query inventory only).
`server/src/modules/`: `auth/{routes,schema,controller,service,repository}`; `users/{routes,schema,controller,service,repository}`; `attendance/{routes,schema,controller,service,repository}`; `leaves/{routes,schema,controller,service,repository}`; `timesheets/{routes,schema,controller,service,repository}`; `employees/{routes,schema,controller,service,repository,submodels,profile.visibility}`; `payroll/{routes,schema,controller,service,repository}`; `reports/{routes,access,controller}`; `claims/{routes,schema,controller,service,repository}`; `approvals/{routes,schema,controller,policy,service,repository,audit}`; `audit/{index,read/*,write/*,audit.listeners,export}`; `notifications/{index,core/*,channels/*,templates/*,notifications.*}`; `performance/{index,performance.*,reviews/*}`; `documents/{routes,schema,controller,service,repository}`; `settings/{index,settings.routes,rbac/*,configuration/*,user-assignments/*}`; `organization/{routes,schema,controller,service,repository}`; `governance/{index,governance.*,org-tree/*,shared/*,sync/*}`; `realtime/{index,realtime.*,connections/*,events/*}`; `workspace/{routes,service,repository}`; `departments/{routes,controller}`.
Other: `server/package.json` (dependency grep), `server/public/` (file listing only, contents not opened), `client/src/services/sessionSync.ts` (grep), `docs/audit/PERMISSION_MATRIX.md` (first ~80 lines), `docs/audit/_raw/track-c-backend-data.md` (heading scan), `docs/audit/tools/route_contract_check.py` (read and run), `git log`/`git diff HEAD` for `employees.repository.ts` and approvals.
Not opened: `services/emailService.ts` and `services/offer-letter/*` (templates and SMTP code), `utils/pdfGenerator.ts`, `server/test/**` (tests), client UI code beyond greps, the live database (U for actual schema, seeded permissions and production data: "Not enough evidence found in repository.").
