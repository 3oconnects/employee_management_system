# Workspace Foundation — Phase 0 (design and metadata plan)

Status: **DESIGN ONLY.** No runtime activation, no route changes, no authorization changes, no migration, no code.
Builds on `WORKSPACE_ARCHITECTURE.md` (decisions §10) and `PERMISSION_MATRIX.md`. Source state: `0b9ce1a` (HF-10).
Implementation does not start before OW-4 → HF-9A → HF-9B (owner decision). This document is what the implementation will be built from.

## 0. Status board (owner review, authoritative)
```
WORKSPACE FOUNDATION
  Design ............................ PASS (approved with corrections, applied below)
  Metadata model .................... PASS
  Resolution model .................. PASS (single canonical pipeline, section 5)
  Security boundary ................. PASS
  Registry architecture ............. PASS
  D-8a widget feed design ........... DONE (WIDGET_FEED_DECOMPOSITION.md), awaiting review
  Implementation .................... NOT STARTED
Prerequisites (all required before Foundation):
  OW-4 export ....................... PENDING
  HF-9A ............................. PENDING (blocked on OW-4)
  HF-9B ............................. PENDING
  Canonical permission catalogue .... PENDING (names come from OW-4, not invented here)
  Own / team scoped permissions ..... PENDING
  D-8 widget feeds (built) .......... PENDING
  Department health ................. PENDING (report is in the OW-4 export)
  Parity report ..................... PENDING
Foundation implementation: BLOCKED BY GATES
```
Role is not UI: **Role ≠ Sidebar, Role ≠ Dashboard, Role = permissions.**

## 1. Target model

```
Permissions            (server decides "can this person access it?")
      ↓
Module Registry        (every module, with the permission it requires)
      ↓
Widget Registry        (every widget, with the permission its data requires)
      ↓
Organization default   (admin-defined starter workspace)
      ↓
Department default     (e.g. HR, Finance, Operations)   <- added after owner review
      ↓
User workspace         (what this person chooses to see)
      ↓
Rendered UI            (sidebar, dashboard, favorites, pinned)
```
A role is only a bag of permissions; it never selects a screen. Defaults are *starting points* chosen by organisation and department, so new joiners need no manual set-up; the user can then adapt them within the tenant's policy.

**Reconciling "purely user-defined" with defaults (owner review):** the user's own choice is primary. Defaults exist only so a person with *nothing activated yet* sees something useful on day one; the moment they activate or build a workspace, the defaults stop applying to them (unless the organization has locked one). People wear several hats, so what a user activates is not "a role dashboard" but one or more **workspace templates** (§5.1) that they can then customize.
No role-specific React pages, no hard-coded sidebars, no `if role === …` in the client. A role is only a bag of permissions plus (optionally) a default workspace.

## 2. What exists today (inventory)

### 2.1 Sidebar — 13 items, each with a hard-coded `roles[]` (`Sidebar.tsx:34-83`)
| Item id (proposed) | Label | Route | Today: client visibility | Today: server guard on its data | Proposed `requires` | Permission exists? |
|---|---|---|---|---|---|---|
| `dashboard` | Dashboard | `/dashboard` | everyone | per widget (see 2.2) | `dashboard:view` — **permanent** | A only; granted to all seeded roles |
| `profile` | My Profile | `/profile` | admin, hr, manager, employee, super_admin | own / `employees:view` (HF-6) | `profile:view` — **permanent** | A only (B has `profile:read`) |
| `approvals` | Approvals | `/approvals` | admin, hr, manager, super_admin | `GET` authenticated only; actions per record type (HF-4) | `approvals:view` | A only; **server does not enforce it** |
| `employees` | Employees | `/employees` | admin, hr, manager, super_admin | list open to every role (legacy `employee` entry) | `employees:view` | A only (B: `employees:read`) |
| `onboarding` | Onboarding | `/onboarding` | admin, hr, super_admin | `onboarding:manage` for actions | `onboarding:view` | A only |
| `organization` | Hierarchy | `/organization` | admin, hr, super_admin | org writes legacy-guarded; reads authenticated | `organization:view` | **MISSING in A**; B has `organization:read` |
| `attendance` | Attendance | `/attendance` | admin, hr, manager, employee, super_admin | self, or elevated role by name (`requireSelfOrAdmin`) | `attendance:view_own` (+ `attendance:view_team`) | **MISSING** (`attendance:view` exists, unscoped) |
| `leave` | Time Off | `/leave` | same | self; approve = `leave:approve` | `leave:view_own` | **MISSING** (`leave:view` exists) |
| `timesheet` | Timesheets | `/timesheet` | same | self; approve = `timesheet:approve` | `timesheet:view_own` | **MISSING** (`timesheet:view` exists) |
| `payroll` | Payroll | `/payroll` | admin, hr, employee, super_admin | `payroll:view/manage/run`, own history `payroll:view_own` | `payroll:view` or `payroll:view_own` | exists (A) |
| `reports` | Reports | `/reports` | admin, hr, super_admin | `reports:view` | `reports:view` | exists (A+B) |
| `audit` | Audit Log | `/audit-logs` | admin, super_admin | `audit:view` | `audit:view` | A only (B: `audit:read`) |
| `settings` | Settings | `/settings` | admin, super_admin | legacy router guard + HF-10 permissions for mutations | `settings:manage` | exists (A+B) |

Sidebar sections today (`Overview, Workforce, Organization, Operations, Finance & Systems, Administration`) become registry **categories**.

### 2.2 Dashboard — three role-selected components (`Dashboard.tsx:53-55, 363-364`)
| Widget id (proposed) | Appears today in | Data source (endpoint) | Guard on that endpoint | Proposed `requires` | Needs a data split first? |
|---|---|---|---|---|---|
| `kpi_workforce` | Admin | `GET /reports/dashboard` | `reports:view` | `employees:view` | yes — one aggregate payload feeds many widgets |
| `kpi_monthly_payroll`, `payroll_summary` | Admin | same | `reports:view` | `payroll:view` | **yes — a `reports:view` holder currently receives payroll totals** |
| `kpi_operations_health`, `kpi_action_required` | Admin | same | `reports:view` | `approvals:view` | yes |
| `operational_pulse`, `todays_pulse` | Admin / Manager | same / `GET /reports/dashboard/manager` | `reports:view` / own-or-`employees:view` | `attendance:view` (admin) / `attendance:view_team` (manager) | yes |
| `workforce_by_department`, `hiring_vs_attrition` | Admin | same | `reports:view` | `employees:view` + `reports:view` | yes |
| `recent_activity` | Admin | same (audit rows inside the payload) | `reports:view` | `audit:view` | **yes — audit content is reachable with `reports:view`** |
| `command_shortcuts` | Admin | n/a (links) | per link | each link's own permission (see quick actions) | no |
| `team_leave_requests` | Manager | `GET /reports/dashboard/manager` | own / `employees:view` | `leave:approve` | yes |
| `team_timesheets` | Manager | same | same | `timesheet:approve` | yes |
| `team_kpis` | Manager | same | same | `employees:view_team` | **MISSING permission** |
| `my_attendance` (check-in card) | Employee | `/attendance/*` | self | `attendance:check_in` | no |
| `my_leave_balance` | Employee | `GET /reports/dashboard/employee` | self | `leave:view_own` | partly |
| `my_weekly_hours` | Employee | same | self | `attendance:view_own` | partly |
| `upcoming_holidays` | Employee | `upcomingHolidays` inside `GET /reports/dashboard/employee` (tenant-scoped since HF-6) | self | `dashboard:view` | partly (shares the employee payload) |
| `quick_access` | Employee | n/a (links) | per link | each link's permission | no |
| `org_employee_tree`, `org_dept_tree`, `org_dept_directory`, `org_new_hires`, `org_birthdays`, `team_status` | Admin/Manager (OrgSubNav sections) | `/organization/*`, `/governance/*` | authenticated / legacy | `organization:view` (+ `employees:view` for people lists) | no |
| `org_calendar` | Admin/Manager (OrgSubNav) | `GET /reports/holidays` | **route does not exist** (one of the 18 known unmatched client calls) | `dashboard:view` | **defect today: the widget cannot load; needs a real endpoint first** |
| `announcements`, `policies` | org widgets | `GET /settings/config` | **settings router (admin/hr/settings:manage)** | `dashboard:view` | **defect today: ordinary employees get 403 for `PoliciesWidget`'s call**; needs a read-only policies endpoint |

Observations that become Phase 1 prerequisites:
1. **A widget's `requires` must equal the permission enforced on its data endpoint.** Today several widgets are fed by aggregate endpoints guarded more loosely than the widget's content (payroll totals and audit rows are reachable with `reports:view`). The registry must not paper over that; per-widget data endpoints (or a field-filtered aggregate) come first. Same rule HF-12 follows for CTC/bank fields.
2. Own/team scope permissions (`*:view_own`, `*:view_team`) do not exist; without them the registry cannot express "employee sees Attendance" without a hard-coded "core modules" list. (P-1 in the matrix.)
3. Two seeded vocabularies (`organization:read` vs a needed `organization:view`, `employees:read` vs `employees:view`, …). The registry must reference one canonical name each; the OW-4 export decides which names exist in production.

## 3. Registries (code is the single source; versioned with the product)

Registries live in code, not in editable database tables. Reason: each entry carries authorization semantics (`requires`), so changing it must go through review, tests and a release, never through a runtime edit that could widen access. The database holds only *layouts, assignments and policies* (§4). If tenants later need their own links, a separate, permission-bound `workspace_custom_links` table is added (Phase 3); it can never reference a module the user lacks.

```ts
type Perm = string;                                   // canonical "module:action"
type Requires = { anyOf?: Perm[]; allOf?: Perm[] };

interface NavItem {
  id: string;            // IMMUTABLE. Layouts store this. Renaming a module keeps its id.
  aliases?: string[];    // old ids, resolved on read so renames never break a saved layout
  label: string; icon: string; route: string;
  category: CategoryId;  order: number;
  requires: Requires;    // evaluated by the server for the caller
  permanent?: boolean;   // dashboard, profile, notifications, help: cannot be hidden or removed
  legacyRoles?: string[];// used ONLY by the parity test, deleted after cut-over
}
interface CategoryDef { id: CategoryId; label: string; order: number }
interface WidgetDef {
  id: string; aliases?: string[]; title: string;
  component: string;     // key into a client component map (no code from data)
  requires: Requires;    // MUST equal the permission enforced on dataSource. A widget MUST NOT read sensitive data from
                           // a broader endpoint merely because the widget itself is hidden: the server stops returning it.
  dataSource: string;    // endpoint that serves ONLY what `requires` allows
  sizes: ('s'|'m'|'l')[]; settingsSchema?: ZodSchema; category: CategoryId; order: number;
}
interface QuickActionDef {
  id: string; label: string; icon: string;
  kind: 'navigate' | 'command';   // command = a named, server-authorized action (check_in, apply_leave)
  target: string;  requires: Requires;
}
```

Initial quick actions (from the dashboards' shortcut blocks): `check_in/out` (`attendance:check_in`), `apply_leave` (`leave:apply`), `submit_timesheet` (`timesheet:submit`), `approve_requests` (`approvals:view`), `add_employee` (`employees:create`), `run_payroll` (`payroll:run`), `view_audit` (`audit:view`).

### 3.0.2 Saved views (a third layer under modules; reserved now, built in Phase 3)
A **saved view** is a named, structured filter over one module's list, for example Employees → *New Joiners*, *Probation*, *Expiring Documents*; Payroll → *Pending Review*; Claims → *Awaiting my approval*. A workspace can pin a view the way it pins a module, so HR, payroll, recruitment, attendance and claims get operational shortcuts without new modules.
- A view stores only `{module_id, filter}`; `filter` is validated by a per-module schema (field, operator, value from a fixed list), never free SQL, a route or a permission.
- Opening a view calls the module's normal endpoint with the caller's permissions. A view can therefore only narrow what the module already allows, never widen it, and it disappears for anyone who loses the module's permission.
- Table (design only): `saved_views ( id, tenant_id, owner_user_id, module_id, name, filter JSONB, is_shared BOOL )`; shared views follow the `workspaces:share` rule below.

### 3.0 Permanent modules
`dashboard`, `profile` (owner decision 3) and, added after owner review, `notifications` and `help`. State of each today: `dashboard` and `profile` exist as routes; **`notifications` exists only as the Topbar bell and `/notifications` API (no page)**, so it is a small page or a drawer to be built in Foundation; **`help` (Help & Support) does not exist at all** (MISSING: needs content, route, and an owner decision on what it links to). **Permanent means authenticated-accessible, not authorization-exempt.** The module is always *visible* and reachable for any signed-in user, and cannot disappear because a role changed; the data behind it still goes through its normal server authorization (for example `/profile` shows your own record, and another person's profile still needs `employees:view`; `/help` is visible to everyone while contact data stays appropriately scoped). Permanent never bypasses a check.

### 3.0.1 Widget catalogue (replaces "Admin / Manager / Employee dashboard")
The three role dashboards become *no screens at all*; they are re-expressed as widgets grouped by domain. A user's workspace is a selection from this catalogue.

| Group | Widgets (ids from §2.2) | Typical default for |
|---|---|---|
| Workforce | `kpi_workforce` (Headcount), `org_new_hires` (New Joiners), `hiring_vs_attrition` (Attrition), `workforce_by_department`, `org_birthdays` | HR |
| Payroll | `kpi_monthly_payroll`, `payroll_summary`, *(Pending Payroll, Salary Trend: new, need data)* | Finance |
| Attendance | `operational_pulse` / `todays_pulse` (Present Today), *(Late Arrivals, Absentees: new, derivable from the same data)*, `my_attendance`, `my_weekly_hours` | Operations, everyone |
| Approvals | `team_leave_requests` (Leave Requests), `team_timesheets` (Timesheet Requests), *(Claims Requests: new, uses `claims:approve`)*, `kpi_action_required` | managers, HR, Finance |
| Self-service | `my_leave_balance`, `upcoming_holidays`, `quick_access` | everyone |
| Organization | `org_employee_tree`, `org_dept_tree`, `org_dept_directory`, `org_calendar`, `team_status`, `announcements`, `policies` | HR, everyone |
| Audit and system | `recent_activity` | admins |

"New" widgets are not built in Phase 0; they are listed so the registry has room for them. Every widget still obeys §2.2: `requires` equals the permission its data endpoint enforces.

### 3.1 Catalogue API (filtered by the server)
`GET /me/workspace-catalog` returns `{categories, nav, widgets, quickActions}` already reduced to what the caller's effective permissions allow (the same `hasAccess` decision used for routes). The client ships no permission knowledge; an item the server does not return does not exist for that user.

## 4. Metadata (design; NOT migrated in Phase 0)

```sql
-- layouts: org defaults (owner_user_id NULL) and personal layouts (owner_user_id set)
workspace_layouts (
  id UUID PK, tenant_id TEXT NOT NULL, owner_user_id INT NULL,
  kind TEXT CHECK (kind IN ('org_default','personal')),
  name VARCHAR(60) NOT NULL,
  layout_version SMALLINT NOT NULL DEFAULT 1,
  -- ONLY registry ids and presentation flags are stored (owner decision, restated):
  --   module_id, widget_id, order (array position), hidden, favorite, pinned
  navigation JSONB,            -- [{module_id, pinned?}]   array order = sidebar order
  hidden     JSONB,            -- [module_id | widget_id]   (never applies to permanent items)
  favorites  JSONB,            -- [module_id]
  quick_actions JSONB,         -- [quick_action_id]
  dashboard  JSONB,            -- [{widget_id, size}]       array order = widget order; size is 's' | 'm' | 'l'
  views      JSONB,            -- [{saved_view_id}]         pinned saved views (Phase 3, reserved now)
  -- Every JSON column has a STRICT runtime schema (below); nothing is free-form.
  -- NEVER stored: route, permission, component, role, label, icon, path
  -- 'size' is presentation only and is validated against the sizes the widget's own definition allows
  is_locked  BOOLEAN DEFAULT false,   -- org default users may not override
  shared_from UUID NULL,              -- Phase 2: shared workspaces
  created_at, updated_at, UNIQUE (tenant_id, owner_user_id, name),
  CHECK (octet_length(navigation::text)+octet_length(dashboard::text) <= 16384)
)
-- which default a person starts from. Scope is a department or a role (a bag of permissions), never a role NAME
workspace_assignments (
  tenant_id TEXT, scope_type TEXT CHECK (scope_type IN ('department','role')), scope_id INT, layout_id UUID,
  PRIMARY KEY (tenant_id, scope_type, scope_id)
)
-- which personal layout is active
user_workspace_state ( user_id INT PRIMARY KEY, tenant_id TEXT, active_layout_id UUID )
-- tenant policy switches (owner decision 2)
workspace_policies ( tenant_id TEXT PRIMARY KEY,
  allow_sidebar_customization BOOL, allow_dashboard_customization BOOL,
  allow_workspace_creation BOOL, allow_workspace_sharing BOOL, allow_workspace_locking BOOL )
```
Stored layouts reference registry ids only: no paths, labels, permissions or component names (owner decision 5). Unknown ids are dropped on read; ids with no current permission are kept but not rendered.

### 4.1 Layout schemas (zod, enforced on write AND on read, tested before anything reaches React)
```ts
const Id = z.string().regex(/^[a-z][a-z0-9_]{1,39}$/);        // registry ids only
navigation:    z.array(z.object({ module_id: Id, pinned: z.boolean().optional() }).strict()).max(64)
hidden:        z.array(Id).max(128)
favorites:     z.array(Id).max(32)
quick_actions: z.array(Id).max(12)
dashboard:     z.array(z.object({ widget_id: Id, size: z.enum(['s','m','l']) }).strict()).max(40)
views:         z.array(z.object({ saved_view_id: z.string().uuid() }).strict()).max(16)   // Phase 3
```
Normalization rules, all deterministic: unknown key -> rejected on write, dropped on read; unknown id -> dropped; alias -> mapped to the current id; duplicate -> first occurrence wins; permanent module -> forced present and never hidden; unauthorized id -> removed at resolution (kept in storage, see below); payload over the size cap -> rejected. A stored layout can therefore never carry a route, permission, component, role or label, and a malformed row cannot crash or widen the UI.

## 5. Resolution (server, on every read): the ONE canonical pipeline

```
Sources -> Merge -> Personal overrides -> Locked constraints -> Registry validation
        -> Permission intersection -> Permanent enforcement -> Append newly accessible -> Resolved workspace
```
1. **Sources.** If the user has activated templates (section 5.1): those, in activation order. Otherwise the default chain, first non-empty wins: department default -> role default -> organization default -> platform default -> (nothing: permanent modules only). Defaults exist only for people who have activated nothing.
2. **Merge.** Union in source order, de-duplicated (first occurrence keeps its position; `pinned` and `favorite` from any source stick).
3. **Personal overrides.** The user's own layer: reorder, hide, favorite, pin, widget size. The user's `hidden` beats a template or default.
4. **Locked constraints.** A locked organization workspace forces its items in and prevents the user hiding them. **A lock never grants access:** it only constrains arrangement, and step 6 still applies to everything it forces.
5. **Registry validation.** Map aliases to current ids, drop unknown ids, apply the section 4.1 schemas and dedupe.
6. **Permission intersection (authoritative).** Keep only items the caller's effective permissions allow, evaluated by the same `hasAccess` decision the routes use. This is a gate on the whole result, not a low-priority layout layer, and nothing earlier can override it. Items lost here are kept in storage and reported in `dropped:[{id, reason:'permission'}]`, so a re-granted permission restores them.
7. **Permanent enforcement.** `dashboard`, `profile`, `notifications`, `help` are forced present, in registry order, and cannot be hidden (they remain subject to their own data authorization, section 3.0).
8. **Append newly accessible.** Accessible items the layout never mentioned are appended unless the user explicitly hid them, so newly granted permissions appear.
Output: `{navigation, favorites, quickActions, dashboard, dropped, policy}`.

Conflict priority, for reading the stages together (this is decision D-5 expressed as the pipeline): Permanent > Locked workspace > User overrides > Activated templates > Defaults; permission intersection overrides all of them.

**Routes stay code-defined (owner review).** The client keeps a static `routeRegistry` (React route definitions written in code and reviewed), beside the `moduleRegistry` and `widgetRegistry`. The module registry only decides *visibility and guarding*: each module id points at a route in the static map, and the route guard is the module's `requires` evaluated against the server-provided catalogue, never a role. React routes are never created from database metadata, and a layout can never introduce a route.

### 5.1 Workspace templates and multiple activation
A **template** is a named composition of registry ids (modules, widgets, quick actions) with no authorization meaning of its own; the permission filter in step 3 applies to everything it contains, so activating a template can never reveal something the user may not access. Templates are composition data, not authorization data, so unlike the registries they may live in the database (platform templates ship in code; tenants add their own).

Starter templates (names are job-to-be-done, not roles): *People Operations, Payroll Operations, Recruitment, Attendance Control, Executive View, Finance View, Project Delivery, My Day (self-service)*. Each is only a list of ids; a template whose modules the user cannot access simply shrinks to what they can.

A user may **activate several templates** at once (for example *My Day* + *Recruitment* + *Payroll Operations* for someone who is an employee, a recruiter and a payroll reviewer). Activated templates are simply stage 1 of the pipeline in section 5; there is no second algorithm. Conflicts are resolved by activation order, never by role, and the result is deterministic and previewable ("what my workspace will look like"). Templates are composition only: they never contain a permission, role, authorization rule, route, SQL or component code.

Schema consequence (still design only): one `workspace_layouts.kind` gains `'template'` (platform/tenant composition) alongside `'org_default'` and `'personal'`; `user_workspace_state` is replaced by `user_workspace_activations ( user_id, tenant_id, layout_id, position, PRIMARY KEY (user_id, layout_id) )`. Personal adjustments live in the user's single `personal` layout. Limits: at most 8 active templates, 16 KB per layout.

## 6. Plan

Phase 0 (this document, no code): inventory (done), registry shapes (done), schema (done), resolution rules (done), parity-test specification (§7), prerequisite list (§8). **Exit criterion:** owner approves §3–§5.

Gates before any implementation (Foundation, owner label "R5"):
1. OW-4 export received and reviewed (`OW4_PERMISSION_EXPORT.sql`).
2. HF-9A and HF-9B done (no bypass, no role-name guards on the server).
3. Canonical permission names chosen; own/team scope permissions added (P-1).
4. **Widget feed separation (D-8):** per-widget data endpoints (or field-filtered aggregates) so `requires` equals the endpoint guard (§2.2). Hard gate.
5. Parity report (§7) has no unexplained differences.
6. Department health report acceptable for each tenant that will use department defaults (D-3).

Phasing (owner review). Labels R5/R6 below follow the owner's wording and must be renumbered against the existing R5 in `MASTER_COMPLETION_PLAN.md` when scheduled.
- **Phase 1 (Foundation, "R5"):** module + widget registries, server-filtered catalogue API, resolver, personal layout; dynamic permission-filtered sidebar and generated routes; hide/show, reorder, favorites, pin; personal dashboard widget visibility; permanent modules; default chain for people with nothing activated. Flag `workspace_v2` per tenant, shadow mode first.
  **Phase 1 deliberately excludes:** drag-and-drop, template marketplace, workspace sharing, saved-views implementation, custom links, import/export, collaboration.
  **Shadow mode (required before any cut-over):** the legacy sidebar renders as today while the v2 resolver runs beside it; for each session the *set of module ids* from both is compared and only counts and ids are logged (no personal data): `legacy_only`, `v2_only`, `same`. Every difference is investigated; `workspace_v2` becomes active for a tenant only when the diff is clean (or every remaining difference is an approved, documented one).
- **Phase 2 (Builder, "R6"):** activate multiple templates and customize them; department templates and assignments; workspace sharing; locked company workspaces; tenant policy switches in the admin UI; drag-and-drop.
- **Phase 3:** team workspaces; saved operational views; tenant custom links (permission-bound, never granting access); template marketplace/library; workspace export / import / clone (D-10; may move to Phase 2).

## 7. Parity test (specified now, run when OW-4 data exists)

For every seeded role and every role found in the production export: compute (a) today's sidebar (the `roles[]`/`coreModules`/`hasModule` logic) and (b) the registry sidebar from that role's permission set; fail on any difference. Expected, to be resolved before cut-over:
- Employee sees Attendance/Leave/Timesheets/Payroll today through "core modules" → needs `*:view_own` (P-1).
- Manager sees Approvals/Employees/Attendance/Time Off today → needs `approvals:view`, `employees:view` (A-only names) in the manager role.
- `hr` role is `dashboard_type='admin'` today and sees admin items only because of the bypass → after HF-9A it needs explicit permissions, which is exactly what OW-4 shows.
- Payroll item for `hr` vs `employee` (different data, same route) → `payroll:view` vs `payroll:view_own`.

## 8. Risks and open questions
1. **Default assignment key**: by `role_id` (recommended) rather than template name, because roles are custom per tenant; a user with several roles does not exist today (one `role_id`).
2. **Org-default locking vs user freedom**: policy switches (§4) cover it; a locked default still lets users reorder favorites only if `allow_*` flags say so (decide in Foundation).
3. **Widget data splitting** is the largest piece of Foundation work (see §2.2 observation 1); sizing needs a pass over `analyticsService` once HF-12 is decided.
4. **Cache/consistency**: the catalogue is computed from JWT permissions; a permission change shows up at the next refresh (known F-9). Foundation should not make that worse; consider a short server-side permission lookup for the catalogue call.
5. **Terminology**: "workspace" now means the saved layout; the organization-identity hook is renamed `useOrganization` (owner decision 1) as the first, behaviour-free change.

## 8.1 Decisions (owner, FINAL)
| # | Decision |
|---|---|
| D-1 | **Department default sits above the role default.** Order: User workspace → Department default → Role default → Organization default → Platform default (→ permanent modules only). A Finance Manager starts from Finance, not from a generic Manager. |
| D-2 | **Widget size is kept** as presentation only: `{widget_id, size: 's'\|'m'\|'l'}`. Workspace data never carries permissions, routes or components. |
| D-3 | **Department health gate.** Before Foundation, run a department health report (counts): employees with `department_id` NULL, with an **invalid** `department_id` (no such department), and with a free-text `department` that does not match the department's name. Added to the OW-4 export (section 10). Department defaults are not enabled for a tenant until its report is clean enough to rely on. |
| D-4 | **Foundation ships a minimal `/help` page** (permanent module): Contact HR, Contact Admin, Knowledge Base, FAQ, Support e-mail. It does not delay the workspace launch; contents are configuration, not code. |
| D-5 | **Merge priority:** Permanent → Locked workspace → User overrides → Activated templates → Defaults. The user's own hidden state beats a template (never a permanent module or a locked workspace). |
| D-6 | **New permissions, separate from `settings:manage`:** `workspaces:create`, `workspaces:manage`, `workspaces:share`, `workspaces:manage_templates`. (`workspaces:lock` and the tenant policy switches are covered by `workspaces:manage_templates` plus the policy table.) All MISSING today; seeded in Foundation, granted by the same "whoever holds the related capability" rule HF-10 used, never inferred from role names. |
| D-7 | **Saved Views** added as a layer under modules (§3.0.2), reserved in the schema now, built in Phase 3. |
| D-8 | **Hard implementation gate: widget feeds.** `GET /reports/dashboard` (and the manager/employee dashboard payloads) must be decomposed into permission-safe feeds before any workspace implementation, so `reports:view` no longer carries payroll aggregates, audit rows or finance metrics. This is a gate on the same level as HF-9A and HF-9B. |

| D-9 | **Registry ids are immutable forever.** Once released, an id is never renamed and never reused. A rename keeps the old id as an alias (`employees` with `aliases: ['staff']`) so saved layouts keep working. A removed module keeps its id reserved. A CI check compares the registry with a committed snapshot (`registry.lock.json`) of the last release. **Immutable:** `id` (a removed, reused or changed id fails CI). **Reviewed, versioned:** `requires`, `route`, `component`, `dataSource` (a change fails CI unless the snapshot is updated in the same reviewed change, so a permission or route can never move silently). **Mutable:** `label`, `icon`, `order`, `category`. |
| D-10 | **Workspace export / import / clone** (Phase 2/3): a workspace can be exported as a JSON file of registry ids and presentation flags, imported into another workspace or tenant, or cloned. Import runs the normal validation (unknown ids dropped, permission filter applied at read), carries no permissions, routes or components, and is gated by `workspaces:share` / `workspaces:manage_templates`. |
| D-8a | **D-8 is the first Foundation task**, designed in `WIDGET_FEED_DECOMPOSITION.md` (field classification, per-domain feeds `/api/v1/dashboard/*`, compatibility plan, tests). It can start before HF-9A because feeds use exact permission strings. |

Implementation gates, complete list (all must be true before Foundation starts): **HF-9A, HF-9B, canonical permission catalogue, own/team-scoped permissions (`*:view_own`, `*:view_team`), widget feed separation (D-8), department health acceptable (D-3), parity report clean (§7).**

## 9. What Phase 0 explicitly does not do
No tables created, no routes added or changed, no Sidebar/Dashboard edits, no permission seeded, no flag, no client or server code. Nothing here is activated by merging anything.
