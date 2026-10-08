# Ozofi Nexus — PERMISSION MATRIX (read-only reconnaissance)

Source: branch `fix/HF-6B-settings-fallback-tenant-scope`, commit `9bc32db`. **No application code was modified to produce this document.** One throw-away probe (`hasAccess()` called with seeded permission sets, in the scratch folder) was executed; it is marked ▶ below.

## 0. Legend

| Tag | Meaning |
|---|---|
| **CONFIRMED** | Read directly in the code at `9bc32db` (file:line given) or reproduced by the ▶ probe. |
| **INFERRED** | Follows from the code but also depends on data/state I cannot see (e.g. which seed ran, what is in the production tables). |
| **MISSING** | Needed (by HF-4/HF-5 code, the dynamic-RBAC plan or the Workspace design) and defined nowhere. |
| **UNCONFIRMED — OW-4 REQUIRED** | Depends on the production `roles` / `permissions` / `role_permissions` / `users.role_id` data. Cannot be settled from source. |

Scope vocabulary: `self / team / department / tenant / global`. "Scope enforced" says whether the *server code* actually restricts to that scope today.

---

## 1. Headline findings (inputs to HF-10)

| # | Finding | Tag | Evidence |
|---|---|---|---|
| F-1 | **The legacy role-name expansion makes every ordinary holder of a broad permission an "admin" for guard purposes.** `authorize(['admin',…])` is resolved through `ROLE_TO_PERMISSIONS`, where `admin` ⇒ any of `settings:manage, employees:view, employees:create, employees:update, payroll:manage, reports:view`. With the seeded permission sets, **a Manager passes the whole `/settings` router** (roles, role permissions, user role / password / status / delete), employee create/delete/bulk-upload, organization management and governance writes. A custom role holding only `employees:view`, or only `reports:view`, or only `payroll:manage` passes the same guards. | **CONFIRMED ▶** | `core/security/authorize.ts:69-76, 82-125`; `settings/index.ts:11`; probe output §2.4 |
| F-2 | **`dashboard_type='admin'` is a full bypass and is editable.** `hasAccess` returns true for any user whose *role record* has `dashboard_type='admin'`. A role's `dashboard_type` is set by `POST /settings/roles` and `PUT /settings/roles/:id` (body field), also on seeded system roles (name is protected, `dashboard_type` is not), and the Roles tab UI offers it as a dropdown. The seeded `hr` role is created with `dashboard_type='admin'` (`schema.ts:450`). | **CONFIRMED** | `authorize.ts:95`; `rbac.service.ts:51-76`; `rbac.repository.ts:44-72`; `schema.ts:450`; client `RolesTab.tsx:32-60` |
| F-3 | **`super_admin` is a role *name*, not a protected identity.** `hasAccess` passes anyone whose JWT `role === 'super_admin'`; the JWT role is `roles.name`. Nothing reserves that name: `createRole` and `ensureRoleExists` accept it, and `updateUserRole` accepts the string. | **CONFIRMED ▶** (name passes every guard); creation of such a role is **CONFIRMED** by reading `rbac.service.ts:51`, `employees.repository.ts:139-170` (no reserved-name check) |
| F-4 | **Role assignment trusts the request.** `PUT /settings/users/:id/role` takes `role` (any string) and `role_id` (any integer) and writes `users.role_id` with **no check that the role exists, belongs to the caller's tenant, or is one the actor may grant**; no self-assignment guard; no "actor holds these permissions" check. Same for `POST /settings/users` (`role`, `role_id`). Login then resolves the role with `LEFT JOIN roles r ON COALESCE(u.role_id,4) = r.id` — **not tenant-scoped**, and defaulting to a hard-coded id `4`. | **CONFIRMED** | `user-assignments.service.ts:25-48, 92-112`; `user-assignments.repository.ts:36-67`; `auth.repository.ts:4-14, 32` |
| F-5 | **Employee create/update/bulk-upload is a second role-assignment path.** `data.role` (schema is `.passthrough()`) goes to `ensureRoleExists`, which resolves **any role by name in the tenant or in the shared `tenant_default`/`default` set** and **creates the role if absent**. `updateEmployee` applies `role` when sent. The only gate is `['admin','super_admin','hr'].includes(user.role)` on the **role name in the JWT** (`employees.controller.ts:47`) — so a user with the role *named* "hr" can set their own employee record's `role` to any role, including `admin`/`super_admin`. | **CONFIRMED** | `employees.service.ts:117, 201-202`; `employees.repository.ts:139-181`; `employees.controller.ts:44-60` |
| F-6 | **CORRECTED during HF-10.** `createEmployee` already refuses an e-mail that exists as a login or employee (`employees.service.ts` pre-checks), so the straightforward cross-tenant account overwrite I first described was **not** reachable that way. What was real: (a) the pre-checks were **unscoped** and their error text named other tenants' employees (id + name) and logins; (b) `createUserAccount` was still `ON CONFLICT (email) DO UPDATE SET password, role, role_id, is_active=true`, a latent overwrite for any race or any other caller; (c) the temporary password is e-mailed to the creator-supplied `personalEmail` (`emailService.ts:205`). | **CONFIRMED** (code); the overwrite was reachable only via a race, the disclosure directly | `employees.service.ts` pre-checks; `employees.repository.ts:86-97`; `emailService.ts:205` |
| F-7 | **Admin-over-user mutations have no "target outranks actor" rule.** `PUT /settings/users/:id/password`, `POST …/reset-password`, `PUT …/status`, `DELETE …`, `PUT …/role`, and `updateEmployee` (e-mail → `users.email`) act on *any* user id in the tenant — including a `super_admin` or a more-privileged admin — so settings access ≈ takeover of any account in the tenant. | **CONFIRMED** | `user-assignments.service.ts:77-120`; `employees.service.ts:194-198` |
| F-8 | **Permission grants are unbounded.** `PUT /settings/roles/:id/permissions` replaces a role's permissions with whatever strings are sent (any that exist in `permissions`), with no check that the actor holds them, no `is_system` protection, and the target may be a shared template role (`tenant_id IN (caller, 'tenant_default', NULL)`), i.e. **a role used by other tenants**. `updateRole` can change `dashboard_type` of shared system roles the same way. | **CONFIRMED** | `rbac.service.ts:85-97`; `rbac.repository.ts:62-72, 86-96` |
| F-9 | **Authorization changes take effect only at next token refresh, and JWT permissions are the only source.** Roles/permissions are read at login/refresh (`findRolePermissions`), carried in the JWT, never re-checked per request; deactivating a user or editing a role does not revoke an existing access token. | **CONFIRMED** | `auth.service.ts:42-52, 95-110`; `authorize.ts:33-40` |
| F-10 | **Two permission vocabularies; 4 permissions the HF-4/HF-5 code requires are granted to no seeded role.** See §4 — `claims:approve`, `organization:manage`, `employees:manage`, `employees:read` exist only in the startup seed (vocabulary B) and are in no seeded role's set, so today only `super_admin` / `dashboard_type='admin'` can use them. | **CONFIRMED** (seed files); effective production state **UNCONFIRMED — OW-4 REQUIRED** | §4 |
| F-11 | **Client-only role logic is widespread and several guards exist only in the browser** (admin-tab selection, `Topbar` admin menu, payroll `isAdmin`, timesheet `isManager`, profile ownership, the Roles tab's dashboard-type selector). The server authorizes the underlying endpoints on its own terms; these are display decisions but they currently disagree with the server (§8). | **CONFIRMED** | §8 |
| F-12 | **Identity-affecting self-service:** `PUT /users/profile` lets any user change their own login e-mail with no verification or uniqueness pre-check (the unique constraint is the only guard). Combined with the HF-3 reset flow (token sent to the account e-mail) this is an account-recovery surface. | **CONFIRMED** (code) | `users.repository.ts:4-17` |

The ▶ marker means reproduced by running `hasAccess()`; nothing else in this document was executed.

---

## 2. How authorization works today

### 2.1 Decision function (server)
`hasAccess(user, permissionOrRoles)` — `core/security/authorize.ts:82-125`:
1. `user.role === 'super_admin'` → allow. *(role = `roles.name` from the JWT)*
2. `user.dashboard_type === 'admin'` → allow.
3. Entry containing `:` → exact match in `user.permissions` (JWT).
4. Legacy role-name entry (`admin`, `hr`, `manager`, `employee`) → allow if the user holds **any** permission in `ROLE_TO_PERMISSIONS[entry]` (§2.2).
5. Otherwise → exact role-name equality.

### 2.2 `ROLE_TO_PERMISSIONS` (`authorize.ts:69-76`)
| Legacy guard name | Passes if the user holds ANY of |
|---|---|
| `super_admin` | (short-circuited) |
| `admin` | `settings:manage, employees:view, employees:create, employees:update, payroll:manage, reports:view` |
| `hr` | `employees:view, employees:create, employees:update, leave:approve, onboarding:manage, attendance:manage` |
| `manager` | `employees:view, leave:approve, reports:view, attendance:view` |
| `employee` | `attendance:view, attendance:check_in, leave:view, leave:apply, profile:view, profile:update, dashboard:view` |

### 2.3 Where the JWT claims come from
`auth.repository.ts:4-14` (login) and `:32` (refresh): `role` = `roles.name` of `COALESCE(users.role_id, 4)`; `dashboard_type` = that role's `dashboard_type` (default `'employee'`); `permissions` = `role_permissions` of `users.role_id`. The role join is **not tenant-scoped** and falls back to hard-coded role id `4`.
Startup runs only `seedPermissionsAndSuperAdmin()` (vocabulary B; `index.ts:78`). Vocabulary A + the seeded role→permission map are applied only by `npm run db:setup` (`schema.ts`).

### 2.4 ▶ Probe: which seeded actors pass which legacy guards
(`hasAccess` with the `schema.ts` `ROLE_PERMISSIONS_MAP` sets)

| Actor | `/settings` router | `POST /employees` | organization writes | governance writes |
|---|---|---|---|---|
| employee (seeded) | deny | deny | deny | deny |
| **manager (seeded)** | **PASS** | **PASS** | **PASS** | **PASS** |
| hr (seeded, `dashboard_type='admin'`) | PASS | PASS | PASS | PASS |
| custom role, only `employees:view` | **PASS** | **PASS** | **PASS** | **PASS** |
| custom role, only `reports:view` | **PASS** | **PASS** | **PASS** | **PASS** |
| custom role, only `payroll:manage` | **PASS** | **PASS** | **PASS** | **PASS** |
| custom role, no permissions, `dashboard_type='admin'` | PASS | PASS | PASS | PASS |
| role *named* `super_admin`, no permissions | PASS | PASS | PASS | PASS |

---

## 3. Roles

| Role | Where defined | Tenant | `dashboard_type` | Permissions | Tag |
|---|---|---|---|---|---|
| `super_admin` | `seedPermissions.ts` (startup, first tenant) | one tenant only | `admin` | **all rows of `permissions`** | CONFIRMED; effective bypass is by *name* (F-3) |
| `admin` | `schema.ts:448-455` + `ROLE_PERMISSIONS_MAP` | `tenant_default` | `admin` | all 41 vocabulary-A permissions | CONFIRMED (db:setup); presence in prod **UNCONFIRMED — OW-4** |
| `hr` | same | `tenant_default` | **`admin`** (`schema.ts:450`) | 22 (see §4) | CONFIRMED; dashboard_type=admin ⇒ full bypass (F-2) |
| `manager` | same | `tenant_default` | `manager` | 14 | CONFIRMED |
| `employee` | same | `tenant_default` | `employee` | 10 | CONFIRMED |
| custom roles | `POST /settings/roles`, or auto-created by employee create/update (`ensureRoleExists`: gets `view` of attendance/leave/timesheet/profile) | per tenant | caller-chosen (default `employee`) | caller-chosen | CONFIRMED mechanism; contents **UNCONFIRMED — OW-4** |
| Shared template visibility | role queries use `tenant_id = $1 OR 'tenant_default' OR NULL` | — | — | — | CONFIRMED (cross-tenant effect, F-8) |
| Backfill rule | `dashboard_type` set to `admin` where role name `LIKE '%admin%'` | — | — | — | CONFIRMED (`schema.ts:458-465`); effect on prod **UNCONFIRMED — OW-4** |

TypeScript `UserRole` enum knows only `super_admin, admin, hr, manager, employee` (`types/index.ts:12`); the legacy "payroll officer", "recruiter", "team lead" etc. do not exist as seeded roles (**MISSING** as built-ins; tenants would create them as custom roles).

---

## 4. Permission catalogue (every permission in either seed)

Vocabulary **A** = `db/schema.ts` `PERMISSIONS_LIST` (+ role map, via `db:setup`). Vocabulary **B** = `scripts/seedPermissions.ts` (runs at every startup). "Seeded" columns are `admin hr manager employee` (✓ = granted by the schema.ts map). `super_admin` gets every row in `permissions`. A permission that appears in the code but in neither list: **none** (checked).

| Permission | Defined in | admin · hr · manager · employee (seeded by schema.ts) | Server references (file:line) | Client references |
|---|---|---|---|---|
| `approvals:approve` | A | `✓···` | modules/approvals/approvals.policy.ts:52, modules/approvals/approvals.routes.ts:14 | — |
| `approvals:manage` | B | `····` | — none — | — |
| `approvals:manage_workflows` | A | `✓···` | — none — | — |
| `approvals:read` | B | `····` | — none — | — |
| `approvals:reject` | A | `✓···` | — none — | — |
| `approvals:view` | A | `✓···` | — none — | — |
| `attendance:check_in` | A | `✓·✓✓` | core/security/authorize.ts:74 | — |
| `attendance:manage` | A+B | `✓✓✓·` | core/security/authorize.ts:72, modules/approvals/approvals.policy.ts:50 | — |
| `attendance:read` | B | `····` | — none — | — |
| `attendance:regularize` | A | `✓✓··` | modules/approvals/approvals.policy.ts:50 | — |
| `attendance:view` | A | `✓✓✓✓` | core/security/authorize.ts:73, core/security/authorize.ts:74 | — |
| `audit:cleanup` | A | `✓···` | — none — | — |
| `audit:export` | A | `✓···` | — none — | — |
| `audit:read` | B | `····` | — none — | — |
| `audit:view` | A | `✓···` | modules/audit/read/read.routes.ts:11 | — |
| `claims:approve` | B | `····` | modules/approvals/approvals.policy.ts:41, modules/claims/claims.routes.ts:15, modules/claims/claims.routes.ts:16, modules/claims/claims.service.ts:28 | — |
| `claims:submit` | B | `····` | — none — | — |
| `dashboard:view` | A | `✓✓✓✓` | core/security/authorize.ts:74 | — |
| `documents:manage` | B | `····` | — none — | — |
| `documents:read` | B | `····` | — none — | — |
| `employees:create` | A | `✓✓··` | core/security/authorize.ts:71, core/security/authorize.ts:72 | — |
| `employees:delete` | A | `✓···` | — none — | — |
| `employees:manage` | B | `····` | modules/approvals/approvals.policy.ts:44, modules/approvals/approvals.policy.ts:45, modules/employees/employees.routes.ts:47, modules/employees/employees.routes.ts:50, modules/employees/employees.routes.ts:68, modules/employees/employees.routes.ts:71 …(+1) | — |
| `employees:onboard` | A | `✓···` | — none — | — |
| `employees:promote` | A | `✓···` | — none — | — |
| `employees:read` | B | `····` | modules/employees/employees.routes.ts:47 | — |
| `employees:terminate` | A | `✓···` | — none — | — |
| `employees:update` | A | `✓✓··` | core/security/authorize.ts:71, core/security/authorize.ts:72 | — |
| `employees:view` | A | `✓✓✓·` | core/security/authorize.ts:71, core/security/authorize.ts:72, core/security/authorize.ts:73, modules/reports/reports.access.ts:25, modules/reports/reports.access.ts:34 | — |
| `governance:manage` | B | `····` | — none — | — |
| `governance:read` | B | `····` | — none — | — |
| `leave:apply` | A+B | `✓✓✓✓` | core/security/authorize.ts:74 | — |
| `leave:approve` | A+B | `✓✓✓·` | core/security/authorize.ts:72, core/security/authorize.ts:73, modules/approvals/approvals.policy.ts:39, modules/leaves/leaves.routes.ts:37, modules/leaves/leaves.service.ts:44 | — |
| `leave:manage` | B | `····` | — none — | — |
| `leave:view` | A | `✓✓✓✓` | core/security/authorize.ts:74 | — |
| `onboarding:manage` | A+B | `✓✓··` | core/security/authorize.ts:72, modules/approvals/approvals.policy.ts:42 | — |
| `onboarding:view` | A | `✓✓··` | — none — | — |
| `organization:manage` | B | `····` | modules/approvals/approvals.policy.ts:44, modules/approvals/approvals.policy.ts:45, modules/organization/organization.routes.ts:11 | — |
| `organization:read` | B | `····` | — none — | — |
| `payroll:adjust` | A | `✓···` | — none — | — |
| `payroll:finalize` | A | `✓···` | — none — | — |
| `payroll:manage` | A+B | `✓✓··` | core/security/authorize.ts:71, modules/payroll/payroll.routes.ts:16 | — |
| `payroll:read` | B | `····` | — none — | — |
| `payroll:run` | A | `✓✓··` | modules/payroll/payroll.routes.ts:29 | — |
| `payroll:view` | A | `✓✓··` | modules/payroll/payroll.routes.ts:15, modules/payroll/payroll.routes.ts:19, modules/payroll/payroll.routes.ts:23, modules/payroll/payroll.routes.ts:24, modules/payroll/payroll.routes.ts:25, modules/payroll/payroll.routes.ts:26 …(+2) | — |
| `payroll:view_own` | A | `✓··✓` | modules/payroll/payroll.routes.ts:19 | — |
| `profile:edit` | B | `····` | — none — | — |
| `profile:read` | B | `····` | — none — | — |
| `profile:update` | A | `✓✓✓✓` | core/security/authorize.ts:74 | — |
| `profile:view` | A | `✓✓✓✓` | core/security/authorize.ts:74 | — |
| `reports:export` | A | `✓✓··` | — none — | — |
| `reports:view` | A+B | `✓✓✓·` | core/security/authorize.ts:71, core/security/authorize.ts:73, modules/reports/reports.routes.ts:13, modules/reports/reports.routes.ts:18, modules/reports/reports.routes.ts:21, modules/reports/reports.routes.ts:25 …(+1) | — |
| `settings:branding` | A | `✓···` | — none — | — |
| `settings:integrations` | A | `✓···` | — none — | — |
| `settings:manage` | A+B | `✓···` | core/security/authorize.ts:71, modules/approvals/approvals.policy.ts:48, modules/settings/index.ts:11 | — |
| `settings:security` | A | `✓···` | — none — | — |
| `timesheet:approve` | A+B | `✓✓✓·` | modules/approvals/approvals.policy.ts:40, modules/timesheets/timesheets.routes.ts:25, modules/timesheets/timesheets.routes.ts:30 | — |
| `timesheet:submit` | A+B | `✓✓✓✓` | — none — | — |
| `timesheet:view` | A | `✓✓✓✓` | — none — | — |

Reading the table:
- **A-only (32), B-only (18), both (9).** The seeds disagree on names (`employees:view` vs `employees:read`, `payroll:view` vs `payroll:read`, `audit:view` vs `audit:read`, `profile:view/update` vs `profile:read/edit`, `approvals:approve` vs `approvals:manage`, …).
- **Used by code but granted to no seeded role** (so reachable only through bypass today): `claims:approve`, `organization:manage`, `employees:manage`, `employees:read` — **CONFIRMED** from the seed files; actual production assignment **UNCONFIRMED — OW-4 REQUIRED**.
- **Defined but referenced nowhere** (`— none —` in the server column): not enforced anywhere (e.g. `employees:delete/promote/terminate/onboard`, `approvals:view/reject/manage_workflows`, `payroll:adjust/finalize`, `audit:export/cleanup`, `settings:branding/integrations/security`, all of B's `*:read`). They can be granted to a role with **no effect**.

### 4.1 Permissions referenced by HF-4 / HF-5 code (per record type)
| Decision path | Permission(s) checked | Defined in | Granted to a seeded non-bypass role? | Tag |
|---|---|---|---|---|
| leave decision | `leave:approve` | A+B | hr, manager | CONFIRMED |
| timesheet decision | `timesheet:approve` | A+B | hr, manager | CONFIRMED |
| claim decision | `claims:approve` | **B only** | **none** | CONFIRMED / prod UNCONFIRMED |
| onboarding decision | `onboarding:manage` | A+B | hr | CONFIRMED |
| department/team creation approval | `organization:manage` or `employees:manage` | **B only** | **none** | CONFIRMED |
| password-reset approval | `settings:manage` | A+B | (admin only) | CONFIRMED |
| generic approval | `approvals:approve` | A only | (admin only — also bypass) | CONFIRMED |
| attendance regularization | `attendance:regularize` or `attendance:manage` | A / A+B | hr (both), manager (`manage`) | CONFIRMED |
| payroll read / edit / run | `payroll:view` / `payroll:manage` / `payroll:run` | A (`view`,`run`), A+B (`manage`) | hr | CONFIRMED |
| payroll own history | `payroll:view_own` | A | employee | CONFIRMED |
| audit read | `audit:view` | A only | (admin only) | CONFIRMED |
| report aggregates | `reports:view` | A+B | hr, manager | CONFIRMED |
| employee profile / report keyed by id | `employees:view` | A only | hr, manager | CONFIRMED |

### 4.2 Permissions the future design needs that do not exist — **MISSING**
- **Own / team scope variants** (to retire "core modules always visible" and `requireSelfOrAdmin`): `attendance:view_own`, `leave:view_own`, `timesheet:view_own`, `profile:view_own`, `documents:view_own` (only `payroll:view_own` exists); `attendance:view_team`, `leave:view_team`, `timesheet:view_team`, `leave:approve_team`, `timesheet:approve_team`, `reports:view_team`.
- **Authorization administration** (so role assignment is itself a permission, not a role name): `roles:view`, `roles:manage`, `roles:assign`, `permissions:grant`, `users:manage`, `users:reset_password`, `users:deactivate`; plus a protected `platform:admin`/`tenant:owner` concept to replace role-name `super_admin`.
- **Scope-qualified HR/payroll**: `employees:view_compensation`, `employees:view_bank` (HF-12), `payroll:export`, `recruitment:*`, `assets:*`, `projects:*` (Workspace nav items with no backend yet).
- **Workspace feature**: `workspaces:customize`, `workspaces:share`, `workspaces:lock`, `workspaces:manage_templates`, `settings:workspace_policy`.
- **Navigation-only ids** needing a permission each: `dashboard:view` (A), `profile:view` (A) exist; `organization:view`, `approvals:view` (A), `audit:view` (A) exist but are not what the sidebar uses today.

---

## 5. Scope matrix (what the server actually enforces)

| Permission / capability | Intended scope | Tenant enforced | Team / department enforced | Self enforced | Tag |
|---|---|---|---|---|---|
| `leave:approve` | team/department | **yes** (HF-4/5) | **no** — any approver in the tenant decides any leave | self-approval blocked | CONFIRMED |
| `timesheet:approve` | team | yes | **no** | self-approval blocked | CONFIRMED |
| `claims:approve` | department/finance | yes | **no** | self-approval blocked | CONFIRMED |
| `attendance:regularize/manage` | team | yes | **no** | self-approval blocked | CONFIRMED |
| `onboarding:manage` | tenant | yes | n/a | n/a | CONFIRMED |
| `employees:view` (profile, report-by-id, dashboards) | team / tenant | yes (HF-6) | **no** (`reporting_manager_id` only filters *which rows a manager dashboard lists*, not who may request it) | own allowed | CONFIRMED |
| `payroll:view/manage/run` | tenant | yes | n/a | own via `payroll:view_own` | CONFIRMED |
| `reports:view` | tenant | yes | no | — | CONFIRMED |
| `audit:view` | tenant | yes | n/a | — | CONFIRMED |
| `settings:manage` / role admin | tenant | **partly** — role queries include shared `tenant_default`/NULL roles, so edits can reach roles other tenants use (F-8) | n/a | none | CONFIRMED |
| `employees:manage` (create/edit/delete) | tenant | partly — several queries accept `tenant_default`/`default` rows; user-account upsert is not tenant-checked (F-6) | no | own-profile branch (role-name based) | CONFIRMED |
| `organization:manage`, governance writes | tenant | partly (`tenant_default`/`default` literals) | n/a | n/a | CONFIRMED |
| `documents:*`, `performance:*` | team / tenant | not verified in this pass — HF-11 | no | partial | INFERRED |
| `global` scope | platform operators | **no concept exists**; `super_admin` is tenant-bound by data but global by guard (passes everything in any tenant, though queries still filter by `tenantId`) | — | — | CONFIRMED |

---

## 6. Server role-name guards and `dashboard_type` dependencies

| Location | Mechanism | Tag |
|---|---|---|
| `settings/index.ts:11` | `authorize(['admin','super_admin','hr','settings:manage'])` on the entire settings tree (users, roles, role permissions, config, test-email) | CONFIRMED (F-1) |
| `employees.routes.ts` | `GET /`: `['admin','super_admin','hr','manager','employee','employees:read','employees:manage']` (every role passes); `POST /`, `/bulk-upload`, `DELETE /:id`: `['admin','super_admin','hr','employees:manage']` | CONFIRMED |
| `employees.controller.ts:47,71,88,105` | `['admin','super_admin','hr'].includes(user.role)` (role *name*) decides who may edit others / skip own-profile field stripping | CONFIRMED (F-5) |
| `organization.routes.ts:11` | `adminOnly = authorize(['admin','super_admin','organization:manage','employees:manage'])` | CONFIRMED |
| `governance*.routes.ts` | `authorize(['admin','hr','super_admin'])` on sync / node update | CONFIRMED |
| `documents.routes.ts` | verify/delete: `[UserRole.HR, ADMIN, SUPER_ADMIN]` enum (role name) | CONFIRMED |
| `performance*.routes.ts`, `*.service.ts:27` | create: `[MANAGER, HR, ADMIN, SUPER_ADMIN]`; delete: `[ADMIN, SUPER_ADMIN]`; service compares `role !== ADMIN && !== SUPER_ADMIN` | CONFIRMED |
| `authorize.ts:176-224` `requireSelfOrAdmin` | `ELEVATED_ROLES = {super_admin, admin, hr, manager}` by role name — a manager may read any user's attendance/leave-balance/timesheet by `?userId=` | CONFIRMED |
| `authorize.ts:95` | `dashboard_type === 'admin'` ⇒ pass-all | CONFIRMED (F-2) |
| `notifications/templates` | `notifyByRole(['admin','hr','manager'])` (recipient selection by role name) | CONFIRMED |
| JWT `role` source | `roles.name` (custom role names become the JWT role; name collisions with `super_admin`/`admin`/`hr` matter) | CONFIRMED |

## 7. Authorization-state mutation inventory

Search terms used: `role`, `role_id`, `permission(s)`, `dashboard_type`, `is_admin`, `is_system`, `super_admin`, `adminOnly`, `hasAnyRole`, `assignRole`, `updateRole`; every `UPDATE/INSERT/DELETE` against `users`, `roles`, `role_permissions`, `permissions`, `employees` (role-bearing columns), plus every other mutation that changes *who an account is or can become* (password, e-mail, status, reporting line). Dead code `settings/settings.routes.ts` (unmounted) duplicates paths M-01…M-09 and is excluded.

| ID | Endpoint → function (file:line) | What it changes | Server guard today | Missing control (found) | HF-10? |
|---|---|---|---|---|---|
| M-01 | `POST /settings/roles` → `rbac.service.createRole` (`:51`) | creates role incl. `dashboard_type`, initial permissions | settings tree (F-1) | no reserved names; `dashboard_type='admin'` allowed; permissions not bounded by actor's | **yes** |
| M-02 | `PUT /settings/roles/:id` → `updateRole` (`:71`) | name, description, **`dashboard_type`** (also on system/shared roles) | settings tree | no `is_system`/shared protection for `dashboard_type`; no escalation check | **yes** |
| M-03 | `PUT /settings/roles/:id/permissions` → `updateRolePermissions` (`:85`) | replaces a role's permission set (shared/system roles included) | settings tree | actor may grant permissions they don't hold; shared-template edits cross tenants; no `is_system` guard | **yes** |
| M-04 | `DELETE /settings/roles/:id` → `deleteRole` (`:78`) | deletes custom role | settings tree | `is_system=false` + no assigned users (adequate); shared-template reach only | no (note) |
| M-05 | `POST /settings/users` → `user-assignments.createUser` (`:25`) | creates user with `role`, `role_id` | settings tree | `role_id` not validated (existence/tenant/grantability); privileged role grantable; unscoped email check | **yes** |
| M-06 | `PUT /settings/users/:id/role` → `updateUserRole` (`:92`) | `users.role`, `users.role_id` | settings tree | same as M-05 + self-assignment, `super_admin`, target outranking actor | **yes** |
| M-07 | `PUT /settings/users/:id/password`, `POST …/reset-password`, `POST …/send-welcome` (`:56-90`) | sets/resets any user's password (plaintext copy kept — H1) | settings tree | target outranking actor (takeover, F-7) | **yes** (dominance rule) |
| M-08 | `PUT /settings/users/:id/status`, `DELETE /settings/users/:id` (`:114-123`) | deactivate/reactivate/soft-delete any user | settings tree (delete has self-guard) | target outranking actor; deactivating self/last admin | **yes** (dominance rule) |
| M-09 | `POST /employees`, `POST /employees/bulk-upload` → `createEmployee` (`employees.service.ts:41-140`, `:311`) | creates employee **and user account**; `role` from body → `ensureRoleExists`; `ON CONFLICT (email) DO UPDATE` password/role/active | `['admin','super_admin','hr','employees:manage']` (F-1) | role assignment unauthorized/unbounded; auto-creates roles; cross-tenant account overwrite (F-6) | **yes** |
| M-10 | `PUT /employees/:id` → `updateEmployee` (`:166-202`) | employee fields; `users.role/role_id`; `users.email` (login identity); `reporting_manager_id` (approval chain) | controller role-name check (F-5) | role & e-mail changes by anyone passing the name check, including on own record; target outranking actor | **yes** |
| M-11 | `PUT /users/profile` (`users.repository.ts:4`) | own name/e-mail/phone | authenticate | own e-mail change unverified (F-12) | adjacent — decide in HF-10 review |
| M-12 | `PUT /auth/me`, `/me/preferences`, `/me/password`, `PUT /auth/status` | own profile/preferences/password/availability | authenticate | none escalating; `preferences` is a free JSON blob (not authorization) | no |
| M-13 | `POST /approvals/:id/action` (department/team creation, onboarding, regularization) | creates org units / onboarding state | per-type permission (HF-4) | none new | no |
| M-14 | `PUT /organization/*`, `/governance/*` writes | org tree, owners (`org_governance.owner_id`), team leads | `adminOnly` / role-name (F-1) | owners/leads affect approval routing in future; guard is the F-1 legacy | HF-9B |
| M-15 | `PUT /documents/:id/verify`, `POST /performance` … | not authorization state | role-name enum | HF-9B/HF-11 | no |
| M-16 | DB seeds (`index.ts:78`, `schema.ts` initializer, `initDb.ts`) | permissions, super_admin role (all perms), system roles, `dashboard_type` backfill by name pattern | n/a (operator) | the `LIKE '%admin%'` backfill and `hr → dashboard_type admin` are design defaults | OW-4 / HF-9A |
| M-17 | Token layer | permissions/role/dashboard_type baked into JWT at login/refresh | — | no revocation on role change (F-9) | HF-10 note (design) |

No other writers of `users.role`, `users.role_id`, `roles.*`, `role_permissions.*` exist outside M-01…M-10 and the seeds (searched).

---

## 8. Client-only role references (display decisions; not security)

| File | Reference | Disagreement with the server |
|---|---|---|
| `components/layout/Sidebar.tsx` | per-item `roles[]` + `hasAnyRole` + `coreModules` | server uses permissions; "Approvals/Employees" visible to roles the server may refuse and vice-versa |
| `App.tsx` (~10 routes) | `ProtectedRoute allowedRoles` | same |
| `store/authStore.ts` | `hasPermission`/`hasModule` admin bypass by role name or `dashboard_type`; `hasAnyRole` includes name `'System Admin'` / e-mail `admin@company.com` fallback | e-mail/name special-case exists only client-side |
| `modules/dashboard/pages/Dashboard.tsx:53-55` | picks Admin/Manager/Employee dashboard by `dashboard_type` / role | — |
| `components/layout/Topbar.tsx:342` | admin menu by role name / `dashboard_type` | — |
| `modules/payroll/pages/GeneratePayroll.tsx:30` | `isAdmin = role==='admin' \|\| 'hr'` (excludes `super_admin`, custom roles with `payroll:*`) | server uses `payroll:*` |
| `modules/timesheet/pages/Timesheets.tsx:126` | `isManager` by role name | server uses `timesheet:approve` |
| `modules/profile/pages/Profile.tsx:92` | ownership by role name | server uses owner / `employees:view` (HF-6) |
| `modules/settings/components/RolesTab.tsx`, `PermissionMatrix.tsx` | role **dashboard_type selector** and permission editor | the selector controls the F-2 bypass |
| `modules/settings/components/UsersTab.tsx`, `AddEmployeeModal.tsx`, `EditEmployeeModal.tsx` | free role selector (list from `GET /employees/roles`, plus "create if missing") | no client or server restriction on privileged roles (F-4/F-5) |
| `modules/auth/components/Can.tsx` | permission component, with optional role match | — |

---

## 9. Unconfirmed — OW-4 REQUIRED (what the production export must answer)

1. Which seeds actually ran in production: vocabulary A (`db:setup`) , B (startup), or both — i.e. the real `permissions` table.
2. `roles`: every row (`tenant_id`, `name`, `is_system`, `dashboard_type`) — especially roles with `dashboard_type='admin'`, roles named like `%admin%`, any role named `super_admin`, roles in `tenant_default`/NULL tenants.
3. `role_permissions` for each role — does any non-bypass role hold `claims:approve`, `organization:manage`, `employees:manage`, `approvals:approve`, `audit:view`, `payroll:run`?
4. `users`: for each user `role`, `role_id`, tenant, and whether `role_id` points at a role of another tenant or at id `4` by default; users with NULL `role_id`.
5. Which users are in effect super admins today (role name or `dashboard_type='admin'`).
6. Whether `users.email` is genuinely unique in production (constraint `users_email_unique`).

## 10. Implications for HF-10 (review result — design principles, no code yet)

1. **Authorize the act, not a name.** Role/permission administration becomes its own permissions (`roles:assign`, `roles:manage`, `permissions:grant`, `users:manage`), checked via `hasAccess` with explicit permission strings; the settings-tree guard no longer relies on the legacy `admin`/`hr` expansion for these mutations.
2. **Dominance rule (server-side):** an actor may only grant, revoke, or act on (role / password / status / e-mail) a target whose effective permission set is a **subset of the actor's**; `super_admin` identity may be assigned or touched only by an existing `super_admin`; no self-assignment of a role with permissions the actor lacks.
3. **Role validity:** `role_id` must exist, belong to the caller's tenant (or be an explicitly allowed shared template), and not be reserved; role *names* are never the grant mechanism (resolve to `role_id` first).
4. **Protect the bypass flags:** `dashboard_type` becomes display-only metadata or is writable only through the same dominance rule; `super_admin` and system roles cannot be created, renamed or re-flagged by tenants; reserved names rejected.
5. **Close alternate paths** M-05…M-10 with the same shared service (one `assertMayAssignRole(actor, targetUser, role)` used by settings users, employee create/update/bulk-upload), and fix the `ON CONFLICT` account overwrite (M-09/F-6).
6. **Client**: remove the privileged choices the actor cannot grant (display only; the server remains authoritative).

Items **not** to fold into HF-10: replacing the legacy expansion across all routes (HF-9B), removing the `dashboard_type` pass-all (HF-9A, needs OW-4), own/team scope permissions (R3.5), `documents`/`performance` IDOR (HF-11), salary/bank exposure (HF-12).

---

## Appendix A — Route guard table (mounted routes at `9bc32db`)

"Kind": **permission** = `module:action` only; **legacy mix** = role names and/or permissions in one `authorize`; **role-name** = `UserRole` enum guard; **authenticate only** = signed-in user, ownership/scope enforced (if at all) in the service; **self-or-elevated-role** = `requireSelfOrAdmin`. Settings routes share one router-level guard (`authorize(['admin','super_admin','hr','settings:manage'])`).

| Route (module-relative) | Guard as coded | Kind | Notes |
|---|---|---|---|
| GET /approvals/ | — | authenticate only | approvals.routes.ts |
| POST /approvals/ | ['approvals:approve'] | permission | approvals.routes.ts |
| POST /approvals/:id/action | — | authenticate only | approvals.routes.ts |
| GET /attendance/today | — | self-or-elevated-role | attendance.routes.ts |
| GET /attendance/history | — | self-or-elevated-role | attendance.routes.ts |
| GET /attendance/weekly-hours | — | self-or-elevated-role | attendance.routes.ts |
| GET /attendance/summary/:userId | — | self-or-elevated-role | attendance.routes.ts |
| POST /attendance/check-in | — | authenticate only | attendance.routes.ts |
| POST /attendance/check-out | — | authenticate only | attendance.routes.ts |
| POST /attendance/regularize | — | authenticate only | attendance.routes.ts |
| GET /audit-logs/ | ['audit:view'] | permission | read.routes.ts |
| GET /auth/repair-identity | — | authenticate only | auth.routes.ts |
| POST /auth/login | — | authenticate only | auth.routes.ts |
| POST /auth/refresh | — | authenticate only | auth.routes.ts |
| POST /auth/forgot-password | — | authenticate only | auth.routes.ts |
| POST /auth/reset-password | — | authenticate only | auth.routes.ts |
| POST /auth/logout | — | authenticate only | auth.routes.ts |
| GET /auth/me | — | authenticate only | auth.routes.ts |
| PUT /auth/me | — | authenticate only | auth.routes.ts |
| PUT /auth/me/preferences | — | authenticate only | auth.routes.ts |
| PUT /auth/status | — | authenticate only | auth.routes.ts |
| PUT /auth/me/password | — | authenticate only | auth.routes.ts |
| POST /claims/ | — | authenticate only | claims.routes.ts |
| GET /claims/employee/:employeeId | — | authenticate only | claims.routes.ts |
| GET /claims/ | ['claims:approve'] | permission | claims.routes.ts |
| PUT /claims/:id/status | ['claims:approve'] | permission | claims.routes.ts |
| GET /departments/ | — | authenticate only | departments.routes.ts |
| GET /documents/:employeeId | — | authenticate only | documents.routes.ts |
| POST /documents/ | — | authenticate only | documents.routes.ts |
| PUT /documents/:id/verify | '[UserRole.HR, UserRole.ADMIN, UserRole.SUPER_ADMIN]' | role-name | documents.routes.ts |
| DELETE /documents/:id | '[UserRole.HR, UserRole.ADMIN, UserRole.SUPER_ADMIN]' | role-name | documents.routes.ts |
| GET /employees/check-email | — | authenticate only | employees.routes.ts |
| GET /employees/roles | — | authenticate only | employees.routes.ts |
| GET /employees/me | — | authenticate only | employees.routes.ts |
| GET /employees/ | ['admin', 'super_admin', 'hr', 'manager', 'employee', 'employees:read', 'employees:manage'] | legacy mix | employees.routes.ts |
| POST /employees/ | ['admin', 'super_admin', 'hr', 'employees:manage'] | legacy mix | employees.routes.ts |
| GET /employees/:id/education | — | authenticate only | employees.routes.ts |
| PUT /employees/:id/education | — | authenticate only | employees.routes.ts |
| GET /employees/:id/experience | — | authenticate only | employees.routes.ts |
| PUT /employees/:id/experience | — | authenticate only | employees.routes.ts |
| GET /employees/:id/emergency-contacts | — | authenticate only | employees.routes.ts |
| POST /employees/:id/emergency-contacts | — | authenticate only | employees.routes.ts |
| PUT /employees/:id | — | authenticate only | employees.routes.ts |
| POST /employees/bulk-upload | ['admin', 'super_admin', 'hr', 'employees:manage'] | legacy mix | employees.routes.ts |
| DELETE /employees/:id | ['admin', 'super_admin', 'hr', 'employees:manage'] | legacy mix | employees.routes.ts |
| GET /governance*/tree | — | authenticate only | governance.routes.ts |
| POST /governance*/sync | ['admin', 'hr', 'super_admin'] | legacy mix | governance.routes.ts |
| GET /governance*/search | — | authenticate only | governance.routes.ts |
| GET /governance*/resolve/:nodeId | — | authenticate only | governance.routes.ts |
| PUT /governance*/:nodeId | ['admin', 'hr', 'super_admin'] | legacy mix | governance.routes.ts |
| GET /governance*/tree | — | authenticate only | org-tree.routes.ts |
| GET /governance*/search | — | authenticate only | org-tree.routes.ts |
| PUT /governance*/:nodeId | ['admin', 'hr', 'super_admin'] | legacy mix | org-tree.routes.ts |
| GET /governance*/resolve/:nodeId | — | authenticate only | shared.routes.ts |
| POST /governance*/sync | ['admin', 'hr', 'super_admin'] | legacy mix | sync.routes.ts |
| GET /leave/types | — | authenticate only | leaves.routes.ts |
| POST /leave/apply | — | authenticate only | leaves.routes.ts |
| GET /leave/ | — | authenticate only | leaves.routes.ts |
| GET /leave/requests | — | authenticate only | leaves.routes.ts |
| DELETE /leave/requests/:id | — | authenticate only | leaves.routes.ts |
| PUT /leave/requests/:id | — | authenticate only | leaves.routes.ts |
| GET /leave/balance | — | self-or-elevated-role | leaves.routes.ts |
| PUT /leave/:id/approve | ['leave:approve'] | permission | leaves.routes.ts |
| PUT /leave/:id | — | authenticate only | leaves.routes.ts |
| DELETE /leave/:id | — | authenticate only | leaves.routes.ts |
| GET /notifications/ | — | authenticate only | core.routes.ts |
| PUT /notifications/read-all | — | authenticate only | core.routes.ts |
| PUT /notifications/:id/read | — | authenticate only | core.routes.ts |
| GET /notifications/ | — | authenticate only | notifications.routes.ts |
| PUT /notifications/read-all | — | authenticate only | notifications.routes.ts |
| PUT /notifications/:id/read | — | authenticate only | notifications.routes.ts |
| GET /organization*/team-status | — | authenticate only | organization.routes.ts |
| GET /organization*/departments | — | authenticate only | organization.routes.ts |
| POST /organization*/departments | — | legacy mix | organization.routes.ts |
| PUT /organization*/departments/:id | — | legacy mix | organization.routes.ts |
| DELETE /organization*/departments/:id | — | legacy mix | organization.routes.ts |
| GET /organization*/teams | — | authenticate only | organization.routes.ts |
| POST /organization*/teams | — | legacy mix | organization.routes.ts |
| PUT /organization*/teams/:id | — | legacy mix | organization.routes.ts |
| DELETE /organization*/teams/:id | — | legacy mix | organization.routes.ts |
| GET /payroll/employees | ['payroll:view'] | permission | payroll.routes.ts |
| PUT /payroll/employees/:id | ['payroll:manage'] | permission | payroll.routes.ts |
| GET /payroll/history/:employeeId | ['payroll:view', 'payroll:view_own'] | permission | payroll.routes.ts |
| GET /payroll/runs | ['payroll:view'] | permission | payroll.routes.ts |
| GET /payroll/activity | ['payroll:view'] | permission | payroll.routes.ts |
| GET /payroll/pending-approvals | ['payroll:view'] | permission | payroll.routes.ts |
| GET /payroll/live-summary | ['payroll:view'] | permission | payroll.routes.ts |
| GET /payroll/deadlines | ['payroll:view'] | permission | payroll.routes.ts |
| GET /payroll/tax-summary | ['payroll:view'] | permission | payroll.routes.ts |
| POST /payroll/process | ['payroll:run'] | permission | payroll.routes.ts |
| GET /performance/ | — | authenticate only | performance.routes.ts |
| POST /performance/ | '[UserRole.MANAGER, UserRole.HR, UserRole.ADMIN, UserRole.SUPER_ADMIN]' | role-name | performance.routes.ts |
| PUT /performance/:id | — | authenticate only | performance.routes.ts |
| DELETE /performance/:id | '[UserRole.ADMIN, UserRole.SUPER_ADMIN]' | role-name | performance.routes.ts |
| GET /performance/ | — | authenticate only | reviews.routes.ts |
| POST /performance/ | '[UserRole.MANAGER, UserRole.HR, UserRole.ADMIN, UserRole.SUPER_ADMIN]' | role-name | reviews.routes.ts |
| PUT /performance/:id | — | authenticate only | reviews.routes.ts |
| DELETE /performance/:id | '[UserRole.ADMIN, UserRole.SUPER_ADMIN]' | role-name | reviews.routes.ts |
| GET /realtime*/stream | — | authenticate only | connections.routes.ts |
| GET /realtime*/stream | — | authenticate only | realtime.routes.ts |
| GET /reports/admin | ['reports:view'] | permission | reports.routes.ts |
| GET /reports/manager | — | authenticate only | reports.routes.ts |
| GET /reports/employee | — | authenticate only | reports.routes.ts |
| GET /reports/dashboard | ['reports:view'] | permission | reports.routes.ts |
| GET /reports/dashboard/manager | — | authenticate only | reports.routes.ts |
| GET /reports/dashboard/employee | — | authenticate only | reports.routes.ts |
| GET /reports/departments | ['reports:view'] | permission | reports.routes.ts |
| GET /reports/profile/:employeeId | — | authenticate only | reports.routes.ts |
| GET /reports/analytics | ['reports:view'] | permission | reports.routes.ts |
| GET /reports/summary | ['reports:view'] | permission | reports.routes.ts |
| GET /settings/config | router.use: authorize(['admin','super_admin','hr','settings:manage']) | legacy mix (router-level) | configuration.routes.ts |
| PUT /settings/config | router.use: authorize(['admin','super_admin','hr','settings:manage']) | legacy mix (router-level) | configuration.routes.ts |
| POST /settings/test-email | router.use: authorize(['admin','super_admin','hr','settings:manage']) | legacy mix (router-level) | configuration.routes.ts |
| GET /settings/permissions | router.use: authorize(['admin','super_admin','hr','settings:manage']) | legacy mix (router-level) | rbac.routes.ts |
| GET /settings/roles | router.use: authorize(['admin','super_admin','hr','settings:manage']) | legacy mix (router-level) | rbac.routes.ts |
| POST /settings/roles | router.use: authorize(['admin','super_admin','hr','settings:manage']) | legacy mix (router-level) | rbac.routes.ts |
| PUT /settings/roles/:id | router.use: authorize(['admin','super_admin','hr','settings:manage']) | legacy mix (router-level) | rbac.routes.ts |
| DELETE /settings/roles/:id | router.use: authorize(['admin','super_admin','hr','settings:manage']) | legacy mix (router-level) | rbac.routes.ts |
| PUT /settings/roles/:id/permissions | router.use: authorize(['admin','super_admin','hr','settings:manage']) | legacy mix (router-level) | rbac.routes.ts |
| GET /settings/users | router.use: authorize(['admin','super_admin','hr','settings:manage']) | legacy mix (router-level) | user-assignments.routes.ts |
| POST /settings/users | router.use: authorize(['admin','super_admin','hr','settings:manage']) | legacy mix (router-level) | user-assignments.routes.ts |
| POST /settings/users/:id/send-welcome | router.use: authorize(['admin','super_admin','hr','settings:manage']) | legacy mix (router-level) | user-assignments.routes.ts |
| POST /settings/users/:id/reset-password | router.use: authorize(['admin','super_admin','hr','settings:manage']) | legacy mix (router-level) | user-assignments.routes.ts |
| PUT /settings/users/:id/password | router.use: authorize(['admin','super_admin','hr','settings:manage']) | legacy mix (router-level) | user-assignments.routes.ts |
| PUT /settings/users/:id/role | router.use: authorize(['admin','super_admin','hr','settings:manage']) | legacy mix (router-level) | user-assignments.routes.ts |
| PUT /settings/users/:id/status | router.use: authorize(['admin','super_admin','hr','settings:manage']) | legacy mix (router-level) | user-assignments.routes.ts |
| DELETE /settings/users/:id | router.use: authorize(['admin','super_admin','hr','settings:manage']) | legacy mix (router-level) | user-assignments.routes.ts |
| GET /timesheets/week | — | self-or-elevated-role | timesheets.routes.ts |
| GET /timesheets/history | — | self-or-elevated-role | timesheets.routes.ts |
| GET /timesheets/pending | ['timesheet:approve'] | permission | timesheets.routes.ts |
| PUT /timesheets/:id/entries | — | authenticate only | timesheets.routes.ts |
| PUT /timesheets/:id/submit | — | authenticate only | timesheets.routes.ts |
| PUT /timesheets/:id/approve | ['timesheet:approve'] | permission | timesheets.routes.ts |
| GET /users/ | — | authenticate only | users.routes.ts |
| PUT /users/profile | — | authenticate only | users.routes.ts |
| GET /workspace/ | — | authenticate only | workspace.routes.ts |


---

## Appendix B — Status after HF-10 (branch `fix/HF-10-prevent-role-escalation`)

| Finding | Status |
|---|---|
| F-1 (legacy expansion lets a Manager into `/settings`) | **Mitigated for authorization-state mutations only**: every role / permission / user-management mutation now needs its own permission (`roles:manage`, `permissions:grant`, `roles:assign`, `users:manage`), checked by exact string, no legacy expansion. The settings router guard itself, and the other legacy guards (employees, organization, governance), are unchanged -> HF-9B. |
| F-2 (`dashboard_type='admin'` editable) | **Closed for mutation**: only an unbounded actor can create, set or touch a bypass role. The bypass itself is **kept** (temporary compatibility, `authorize.ts`), removal is HF-9A. |
| F-3 (`super_admin` is a name) | **Mitigated**: the name can never be created or renamed to; only a super admin identity can assign or modify it. The bypass-by-name remains until HF-9A. |
| F-4 (role assignment trusted the request) | **Closed** (settings users). |
| F-5 (employee flow assigned/created roles) | **Closed** (create, update, bulk). Roles are never created from the employee flow. |
| F-6 (corrected) | **Closed**: pre-checks tenant-aware with a generic message for other tenants; `createUserAccount` is `ON CONFLICT DO NOTHING`. |
| F-7 (no target-outranks-actor rule) | **Closed** for settings users (password, reset, welcome-with-password, status, delete, role) and employee login e-mail / role changes. |
| F-8 (unbounded permission grants, shared-template edits) | **Closed**: grants bounded by what the actor holds; shared templates read-only to other tenants. |
| F-9 (token-only authorization, no revocation) | **Open** (design note; not changed). |
| F-10 (two vocabularies; four HF-4/5 permissions granted to no role) | **Open** (OW-4 / HF-9B). HF-10 adds four permissions to both seeds. |
| F-11 (client-only role logic) | **Open** (HF-9B / Workspace). |
| F-12 (own e-mail change unverified) | **Open**, deliberately not in HF-10. |
