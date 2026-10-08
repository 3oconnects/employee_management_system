# Ozofi Nexus — Permission-Driven Workspace Architecture (design)

Status: DESIGN ONLY. No code changed. Proposed slot: **R3.5-UI**, after HF-9A/HF-9B (see §9).
Grounded in the source at `7badcfb` (branch `fix/HF-6-tenant-isolation`).

## 1. What the code does today (evidence)

| Area | Today | Where |
|---|---|---|
| Sidebar | Static `sidebarSections` array; each item has a hard-coded `roles: ['admin','hr','manager',…]` plus a `module` string. Visibility = `hasAnyRole(...)` AND (`hasModule(module)` unless a hard-coded `coreModules` list says "always show"). | `client/src/components/layout/Sidebar.tsx:34-83, 108-118` |
| Route guards | `ProtectedRoute allowedRoles={[…]}` on ~10 routes. No permission check. | `client/src/App.tsx:58-130` |
| Dashboards | Three components chosen by `dashboard_type` / role: `AdminDashboard`, `ManagerDashboard`, `EmployeeDashboard`. | `client/src/modules/dashboard/pages/Dashboard.tsx:53-55` |
| Client auth helpers | `hasPermission` and `hasModule` return true for admin/super_admin/`dashboard_type==='admin'`. `hasAnyRole` contains a name/e-mail safety net (`'System Admin'`, `admin@company.com`) and maps `dashboard_type` onto roles. | `client/src/store/authStore.ts:90-135` |
| Permission data | `/auth/me` already returns `permissions[]` and `dashboard_type`. | `server/src/modules/auth/auth.service.ts:120` |
| User preferences | `users.preferences` JSONB, written whole by `PUT /auth/me/preferences` with schema `z.any()`. Holds notification settings. | `server/src/db/schema.ts:100`, `auth.schema.ts:21` |
| Naming collision | `useWorkspace()` / `GET /workspace` mean the **organisation identity** (name, logo), not a layout. | `client/src/hooks/useWorkspace.ts` |
| Reusable widgets | 17 widget components already exist (`modules/dashboard/components/widgets/*`). | |

Consequences:
1. Authorization knowledge lives in the client in four places (Sidebar roles, route `allowedRoles`, `hasAnyRole` mapping, `Dashboard.tsx`). Requirement 9 ("no hardcoded role checks in the frontend") is currently violated everywhere.
2. Self-service is expressed as "always visible core modules" (`attendance, leave, timesheet, payroll, profile`), not as permissions. A pure permission sidebar cannot reproduce it until **own-scope permissions** exist (§8, P-1).
3. `users.preferences` must not be reused for layouts: it is overwritten wholesale, unvalidated, and shared with notification settings.

## 2. Principles

1. **Permissions decide what exists for you; preferences decide how it is arranged.** Preferences can only select from the intersection of the catalogue and the caller's current permissions.
2. **The backend is the only source of truth.** The server computes the catalogue filtered by the caller's permissions; the client ships no role or permission knowledge of its own. Every widget's data endpoint and every route is independently authorized (already true for the data endpoints after HF-4/5/6; the rest lands with HF-9B).
3. **Preferences store ids, never capabilities.** A stored id for something you cannot (now) access is kept but filtered on read, so a re-granted permission restores the layout; a write that names a forbidden id is rejected.
4. **Existing UI is preserved**: today's three dashboards become templates built from the same components; old URLs keep working.
5. **Additive and flag-gated**: no destructive migration; a per-tenant flag; a parity report before cut-over.

## 3. Architecture

```
            ┌───────────────────────── backend (source of truth) ─────────────────────────┐
 Layer 1    │ permissions (roles → permission catalogue, JWT)       enforced per endpoint │
 Layer 2    │ Registry (code): nav items + widgets, each `requires` permissions           │
            │ Catalogue API = Registry ∩ caller permissions                               │
 Layer 3    │ Templates (code defaults + tenant overrides): starter nav/dashboard         │
 Layer 4    │ user_workspaces (per user, many): ordered ids + widget settings             │
            │ Resolver: stored ids ∩ catalogue → what the UI renders                      │
            └──────────────────────────────────────────────────────────────────────────────┘
 client: Sidebar and Dashboard render only what the resolver returns; routes derive from the registry.
```

### 3.1 Registry (single definition, shared by server and client build)

```ts
// shared/workspace.registry.ts  (kept in server; client receives it through the catalogue API)
NavItem   { key: 'employees', label, icon, path, section, requires: Perm[] /* ANY-of */, order }
WidgetDef { key: 'pending_approvals', label, component: 'PendingApprovalsWidget',
            requires: Perm[], dataSource: '/approvals', sizes: ['s','m','l'], settingsSchema?: ZodSchema }
```
- `requires` replaces every `roles: [...]` array. `Dashboard` (`dashboard`) and `My Profile` require `profile:view_own` (granted to every role by the seed).
- `legacyRoles` is kept ONLY in the migration parity test (§6) — it is deleted after cut-over.

### 3.2 Templates

Starter layouts only: `employee`, `manager`, `hr`, `payroll`, `recruitment`, `executive`, `admin`. Today's `AdminDashboard/ManagerDashboard/EmployeeDashboard` are re-expressed as widget lists (phase 1 wraps each existing dashboard as one "legacy" widget group so nothing visually changes on day one; they are split into individual widgets in phase 2).
Selecting a user's first template: `roles.default_template_key` (set by tenant admins in role settings); fallback `employee`. `dashboard_type` becomes only a hint for that default, never an authorization input.

### 3.3 Resolver rules (server, on every `GET`)

1. Load the user's active workspace (create from template if none: idempotent `INSERT … ON CONFLICT DO NOTHING`).
2. `visibleNav = stored.nav.order ∩ catalogue.nav`, then append catalogue items the user has but the workspace never listed, in registry order, **unless** the user hid them explicitly (`nav.hidden[]`) — so newly granted permissions appear automatically.
3. `visibleWidgets = stored.dashboard.widgets ∩ catalogue.widgets`.
4. Return `dropped: [{key, reason:'permission'|'removed'}]` so the UI can show "2 items are unavailable".
5. Routes: the client router is generated from the registry; a route's guard is `requires` (permission) — never a role. A deep link to a forbidden page → `/unauthorized`; the API call would be refused regardless.

## 4. Database schema (additive)

```sql
CREATE TABLE user_workspaces (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name           VARCHAR(60) NOT NULL,
  template_key   VARCHAR(40),
  is_active      BOOLEAN NOT NULL DEFAULT false,
  nav            JSONB NOT NULL DEFAULT '{"order":[],"hidden":[]}',
  dashboard      JSONB NOT NULL DEFAULT '{"widgets":[]}',   -- [{key,size,settings}]
  schema_version SMALLINT NOT NULL DEFAULT 1,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, name),
  CHECK (octet_length(nav::text) + octet_length(dashboard::text) <= 16384)
);
CREATE UNIQUE INDEX one_active_workspace ON user_workspaces (user_id) WHERE is_active;
CREATE INDEX user_workspaces_tenant ON user_workspaces (tenant_id, user_id);

CREATE TABLE workspace_templates (            -- tenant overrides of code defaults
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  key       VARCHAR(40) NOT NULL,
  label     VARCHAR(60) NOT NULL,
  nav       JSONB NOT NULL, dashboard JSONB NOT NULL,
  updated_by INTEGER, updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, key)
);
ALTER TABLE roles ADD COLUMN IF NOT EXISTS default_template_key VARCHAR(40);
```
Limits: ≤ 10 workspaces/user (service-enforced), ≤ 16 KB payload. `users.preferences` is untouched.

## 5. API contract (`/api/v1`, all `authenticate`; tenant and user come only from the JWT)

| Method & path | Purpose | Auth |
|---|---|---|
| `GET /me/workspace-catalog` | Registry ∩ my permissions: `{nav[], widgets[], templates[]}` | any user (the name avoids the existing `GET /workspace`, which stays = organisation identity) |
| `GET /me/workspaces` | My workspaces (ids, names, active) | own rows only |
| `GET /me/workspaces/active` | **Resolved** workspace + `dropped[]` | own |
| `POST /me/workspaces` `{name, fromTemplate? , cloneOf?}` | Create | own; ≤10 |
| `PUT /me/workspaces/:id` `{name?, nav?, dashboard?}` | Save; unknown or forbidden ids → `422 {invalid:[…]}` | own; 404 for someone else's id |
| `POST /me/workspaces/:id/activate` · `/reset` · `DELETE /me/workspaces/:id` | Switch / back to template / delete (not the last) | own |
| `GET/PUT /admin/workspace-templates[/:key]` | Tenant starter layouts | `settings:manage`; audited |

Validation: zod; keys must exist in the registry; widget `settings` validated by the widget's own schema; no free-form HTML/URLs.
Rate limit and per-user write cap as for other mutation routes.

## 6. Migration and rollout (non-breaking)

0. **Rename** the client hook `useWorkspace` → `useOrganization` (no behaviour change) so "workspace" means one thing.
1. Ship tables + registry + catalogue API behind tenant flag `workspace_v2` (default off). Nothing in the UI changes.
2. **Parity report (gate):** for every seeded role and every real custom role, compute the legacy sidebar (today's `roles`/`coreModules` logic) and the registry sidebar from that role's permissions. CI test fails on any diff. Expected diffs to resolve first: self-service items (`payroll`, `attendance`, `leave`, `timesheet`, `profile`) need own-scope permissions (P-1); "Approvals" for managers needs `approvals:view`; "Audit Log" ↔ `audit:view`; "Hierarchy" ↔ `organization:view`.
3. **Shadow mode:** with the flag on for internal tenants, render legacy UI, compute the new one, log diffs (no user impact).
4. Cut over per tenant: Sidebar reads the resolver; routes switch from `allowedRoles` to `requires`; delete `roles[]`, `coreModules`, `hasAnyRole` mapping, and the `'System Admin'`/`admin@company.com` client safety net.
5. Keep every existing URL; `/dashboard` renders the active workspace; `dashboard_type` stays in the JWT for one release for rollback, then is removed from UI logic.
6. Rollback = turn the flag off (legacy code still present until step 4 is stable for one release).

## 7. UX wireframes

Sidebar customise (inline edit mode, `Customize` button at the bottom of the sidebar):
```
┌ Customize navigation ─────────────────────┐
│ ⠿ ☑ Dashboard            (locked: always) │
│ ⠿ ☑ Employees                              │
│ ⠿ ☑ Attendance                             │
│ ⠿ ☑ Time Off                               │
│ ⠿ ☐ Reports            (hidden by you)     │
│ ░ Payroll   — not available (no permission)│  ← not draggable, not addable
│ [Reset to template]        [Cancel] [Save] │
└────────────────────────────────────────────┘
```
Dashboard editor (grid; add via a drawer that lists only catalogue widgets):
```
 Workspace: [ My Workspace ▾ ]  [+ New]  [Edit layout]
 ┌ Attendance today ┐ ┌ Pending approvals ┐
 │ …                │ │ …                 │
 └──────────────────┘ └───────────────────┘
 ┌ Team performance (M) ─────────────────┐   [⋯ remove · size]
 └───────────────────────────────────────┘
 ⓘ 2 saved items are unavailable (permission changed)  [details]
```

## 8. Prerequisites and risks

- **P-1 Own-scope permissions**: `*:view_own` (payroll, attendance, leave, timesheet, profile). Without them the permission sidebar cannot express self-service and would either hide it from employees or force a "core modules" hack back in.
- **P-2 One permission catalogue** (the two seeded vocabularies still differ) and the OW-4 production permission export.
- **P-3 Backend guards must be permission-based first** (HF-9A/HF-9B): settings, organization, employees, documents, performance and governance still check role names on the server. A permission-driven sidebar over role-guarded endpoints would show items that 403, or hide items users may legitimately use.
- **P-4 Widget data endpoints** must each be authorized by the same permission as the widget. Today's admin/manager/employee dashboard endpoints are aggregate calls; they are split per widget in phase 2.
- Risk: preference rows keep ids after permission loss → filtered on read (tested). Risk: drag-and-drop adds bundle size → lazy-load the editor only.
- Security tests required: another user's workspace id → 404; forbidden id on write → 422; revoked permission → widget disappears on next fetch without re-save; cross-tenant; size cap; the resolver never returns an item the caller cannot call.

## 9. Roadmap and sequencing

| Step | Content | Depends on | Exit gate |
|---|---|---|---|
| 0 | HF-7 → HF-9A → HF-10 → HF-9B (already planned) | OW-4 for 9A | role-name guards gone server-side |
| 1 | P-1/P-2: own-scope permissions + one catalogue (part of R3.5) | step 0 | parity report has no unexplained diffs |
| 2 | **Phase 1**: registry, catalogue API, resolver, tables, permission-driven Sidebar + route guards; sidebar order/hide; dashboard widget toggle/order over the existing widgets | step 1 | parity CI green; shadow mode clean for one release |
| 3 | **Phase 2**: multiple workspaces, drag-and-drop layouts, saved views, widget split, tenant templates | step 2 | deny-path + IDOR suites |
| 4 | **Phase 3**: team/department dashboards, AI-generated layouts (suggestion only; the output is validated by the same server rules) | step 3 | — |

Recommendation: do **not** start the UI work before HF-9B. HF-7 (credential exposure) is a security fix and should not wait for it. The one safe pre-step that can happen any time is step 0 of §6 (rename `useWorkspace`).

## 10. Decisions (owner, resolved)

1. Name: **Workspace** (saved layouts); the organisation hook is renamed `useOrganization`.
2. Tenant admins get **per-capability policy switches**, not all-or-nothing: allow sidebar customisation, dashboard customisation, workspace creation, workspace sharing, workspace locking (stored per tenant; enforced server-side on every write).
3. **Dashboard and My Profile are permanent** (cannot be hidden or removed).
4. Sequence: HF-7 → HF-9A → HF-10 → HF-9B first; **no workspace implementation before HF-9B is complete**. Then "Workspace Foundation" (permission registry, navigation registry, widget registry, workspace APIs, preference storage, sidebar personalisation), then "Workspace Builder" (drag-and-drop, multiple/shared/team/department workspaces). These are labelled R5/R6 by the owner and need renumbering against the existing R5 in MASTER_COMPLETION_PLAN.md when scheduled.
5. Stored layouts reference **registry ids**, never raw sidebar strings or paths: `{workspaceId, layoutVersion, navigation[], widgets[]}`, with a central registry entry `{id, permission, category}`. A renamed module keeps its id; unknown ids are dropped on read, so layouts do not break. (Matches the schema in §4; `layoutVersion` maps to `schema_version`; add `category` to registry entries; add tenant policy table `workspace_policies` and a `shared`/`locked` flag when sharing is built.)
