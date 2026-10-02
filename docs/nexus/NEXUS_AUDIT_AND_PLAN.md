# Ozofi Nexus — Audit & Implementation Plan

**Product:** Ozofi Nexus · *Workforce Management Platform* · by Ozofi
**Status:** READ-ONLY AUDIT. **No source code has been modified for this program.** Implementation starts only after the plan (§E) and the decisions (§G) are approved.
**Audited:** `83c1e84` plus the uncommitted Release 0 work on `release-0/safety-net` · 2026-10-02
**Companion documents (not repeated here):** [`PRODUCTION_READINESS_AUDIT.md`](../audit/PRODUCTION_READINESS_AUDIT.md) (backend, security, DB), [`SUPPLEMENTARY_AUDITS.md`](../audit/SUPPLEMENTARY_AUDITS.md) (workflows, data integrity, UX, ops, enterprise), [`EMS_REMEDIATION_BASELINE.md`](../audit/EMS_REMEDIATION_BASELINE.md) (remediation plan, Releases 0–7).

Evidence labels: **[C]** confirmed in code · **[I]** inferred · **[U]** unknown.

---

## A. Current Architecture Report (summary; details in the companion reports)

| Area | Current state | Key evidence |
|---|---|---|
| **Stack** | React 18 + Vite + Tailwind + Zustand + Axios (client); Express 4 + TypeScript + `pg` on Supabase Postgres (server); deployed via Vercel (`vercel.json`) or Render (`render.yaml`) | [C] |
| **Backend style** | Modular monolith: 17 modules, each with routes → controller → service → repository → Zod schema; in-process event bus for audit, notifications and realtime | `server/src/modules/*` [C] |
| **Data model** | About 30 tables, defined by 4 overlapping, silently failing scripts. **The repo cannot rebuild the schema its code expects** (Release 0 finding). Production schema truth is pending B0-01 | `RELEASE_0_VERIFICATION.md` [C] |
| **Authentication** | JWT access (15 min) + refresh (7 d). Tokens are stored in `sessionStorage`. **Hard-coded master password** (S1). Refresh is not checked against the DB. **Logout is client-only**: `Topbar.tsx:118` never calls `/auth/logout`, so the server-side refresh token survives | `auth.service.ts:23`, `Topbar.tsx:118` [C] |
| **Authorization** | Mixed paradigms: role-name guards, a legacy role→permission map, `module:action` permission strings, and a `dashboard_type=admin` bypass. **Most mutating APIs have no permission check** (S3). Managers can escalate to super_admin (S4) | `core/security/authorize.ts` [C] |
| **RBAC data** | `roles`, `permissions(module, action)`, `role_permissions`; custom roles supported; **two conflicting permission vocabularies** are seeded (`employees:read/manage` vs `employees:view/create/update/delete`) | `seedPermissions.ts:26`, `db/schema.ts:306` [C] |
| **Tenancy** | **Partially multi-tenant**: `tenant_id` on most tables and a `tenants` table, but 37 repository queries fall back to `'tenant_default'`/`'default'`, there is no tenant provisioning, and login has no tenant discriminator. Effectively single-tenant today | §D, baseline T-1 [C] |
| **Frontend architecture** | Feature folders under `client/src/modules/*` (16 modules, about 150 TSX files); lazy routes; one Axios client; one Zustand auth store | [C] |
| **UI system** | Two disagreeing token systems; tokens used 28× vs >5,600 raw colour classes; the shared UI library is imported by only 10 files (§C) | [C] |
| **Background jobs** | None (no queue/cron); emails are sent inline | [C] |
| **Integrations** | SMTP/Gmail (nodemailer), PDFKit (offer letters), Supabase Postgres; Sentry (Release 0, off unless a DSN is set) | [C] |
| **Production risks** | Release 0 gate **BLOCKED**; Release 1 security blockers (S1–S6, H1, H4, R0-F4, R0-F5) open; the payroll UI calls 9 non-existent endpoints | `release1_handoff.json` [C] |

---

## B. Branding Audit

**Target identity:** Product = **Ozofi Nexus** (short: **Nexus**) · Descriptor = **Workforce Management Platform** · Company = **Ozofi** · Tenant/Organization = customer-configurable (today the only tenant is Ozofi's own organisation).

### B.1 Every occurrence and its treatment

| # | Location | Current text | Classification | Treatment |
|---|---|---|---|---|
| 1 | `client/src/modules/auth/pages/LoginPage.tsx:87` | `AURA CORE` (logo wordmark) | Product branding (stale, from another product) | → brand config `productName` |
| 2 | `LoginPage.tsx:232` | `© 2026 PRECISIONHUB INDUSTRIAL SYSTEMS` | Product/company branding (stale) | → `© {year} {companyName}` |
| 3 | `LoginPage.tsx:155` | placeholder `operator@auracore.io` | Product branding (stale) | → neutral `name@company.com` |
| 4 | `LoginPage.tsx:35,60` | "All protocols require valid credentials", "Authentication sequence failed" | Copy tone | → plain language |
| 5 | `LoginPage.tsx:93-118` | "Platform Active", "Sync Status: Operational", "Traceability: L3 Secure" | **Fabricated status claims** | Remove. Nothing measures them |
| 6 | `client/src/modules/public/pages/LandingPage.tsx:20,139,142` | `AURA CORE`, `PRECISIONHUB INDUSTRIAL SYSTEMS` | Product branding in **dead code** (not routed) | Leave untouched (or delete in a later cleanup); out of scope |
| 7 | `client/src/modules/audit/pages/AuditLogPage.tsx:232` | `auracore` | Product branding (stale) | → brand config |
| 8 | `client/src/modules/auth/pages/ChangePasswordPage.tsx:46` | `Ozofi` | Product name (partial) | → `productName` |
| 9 | `client/index.html:7` | `<title>Employee Management System \| Pro</title>` | Product metadata | → `Ozofi Nexus`; per-page titles `Page · Ozofi Nexus` |
| 10 | `client/index.html:5` | `<link rel="icon" href="/vite.svg">`; **the file does not exist** in `client/public` | Favicon (**broken asset**) | → `/brand/nexus-icon.svg` |
| 11 | `client/index.html` | No meta description, theme-color or manifest | Metadata (missing) | Add description, `theme-color`, `site.webmanifest` |
| 12 | `client/src/modules/settings/components/EmailTab.tsx:88` | placeholder `AURA EMS <noreply@company.com>` | Product branding (stale) | → `Ozofi Nexus <noreply@…>` placeholder |
| 13 | `server/src/modules/settings/configuration/configuration.service.ts:45` | email subject `✅ AURA EMS — Test Email` | Product branding (stale, **user-visible email**) | → `Ozofi Nexus — Test email` |
| 14 | `server/src/modules/settings/settings.routes.ts:436` | same subject | Dead code (router not mounted) | Leave; scheduled for removal (baseline debt #5) |
| 15 | `server/src/app.ts:127` | `EMS Backend API is running.` | Product (API root) | → `Ozofi Nexus API` |
| 16 | `server/src/index.ts:25` | startup banner `EMS BACKEND — SERVER STARTED` | Internal log | → `Ozofi Nexus API`. **Changes startup logs**, so the Release 0 log-equality baseline must be re-recorded (noted in the plan) |
| 17 | `server/src/utils/pdfGenerator.ts:18,108` | `Unified Employee Management System`, `Corporate Office, Bangalore` | Tenant letterhead in **dead code** (no importers) | Leave; record as dead code |
| 18 | `server/src/services/emailService.ts:56,77,92,212,327,490,503,585,613-614` | `Ozofi People Operations`, `Ozofi Personnel Hub`, `Ozofi Global Technologies`, `Ozofi` | **Tenant/organisation branding**: the employer sending HR mail. **Four inconsistent names** | → tenant settings `org_name` (+ `hr_team_name`), with product footer "Sent via Ozofi Nexus". **Needs the legal entity name (§G-2)** |
| 19 | `server/src/services/offer-letter/{email.template,html-document.template,pdf.generator,utils}.ts` (about 30 lines) | `Ozofi Technologies Private Limited`, `Ozofi`, `Ozofi_Offer_Letter_…` | **Tenant branding** (legal employer on a contract) | → tenant settings with the current value as default. **Legal wording is not changed.** Only the source of the name moves |
| 20 | `server/public/Company_Offer_latter_and_certificate/*.pdf/.docx` | `Ozofi_Premium_…` templates | Tenant documents | Untouched (customer assets) |
| 21 | Code comments `// EMS FRONTEND …`, `// EMS BACKEND …` (about 15 files) | `EMS` | Internal identifiers | Leave (not user-facing; avoids churn) |
| 22 | `server/package.json` `"description": "EMS Backend API"`; package names `employee-management-*`; `render.yaml` service names `ems-api`/`ems-client`; `vercel.json` `name` | Internal/technical identifiers | Leave for now. Renaming deploy services changes URLs and is an ops decision (§G-5) |
| 23 | `docs/01…11_*.md` | "Employee Management System" | Historical documentation | Leave; add a note that the product is now Ozofi Nexus |
| 24 | Seed data `admin@company.com`, `priya@company.com`, `alex.rivers@company.com` (`initDb.ts`, `LoginPage.tsx:11-15`) | Demo accounts on `company.com` | **Seed data / security issue** (S1 backdoor; public quick-login) | Quick-login: §G-3. Seeds: Release 1 (H4) |
| 25 | Tenant row `tenants.name='Default Organization'`, `domain='company.com'` (`db/schema.ts:407`) | Tenant data | Tenant/organisation data | Not changed by code; owner updates the org profile in Settings → General |
| 26 | `client/src/modules/payroll/components/OperationalStream.tsx:13-18` | fake "terminal" text: `0x… protocol_sync_init … OK` | Decorative fabrication | Remove |

#### B.1a Correction (found during PR 1)
The first scan matched only "AURA CORE" variants, so it missed standalone "AURA" and "Personnel Hub". Additional occurrences:

| # | Location | Current text | Classification | Treatment (PR 1) |
|---|---|---|---|---|
| 27 | `client/src/components/layout/Sidebar.tsx:138-139` | `AURA` / `Personnel Hub` (sidebar header on every signed-in page) | Product branding | → Nexus mark + "Ozofi Nexus" + workspace name |
| 28 | `server/src/modules/settings/user-assignments/user-assignments.service.ts:66` | email subject "Your AURA account is ready" | Product branding, **user-facing email** | → "Welcome to {org or Ozofi Nexus}" |
| 29 | `server/src/services/emailService.ts:259,289` | fallback "AURA Personnel Hub" (no caller passed `orgName`, so **every welcome email used it**) | Product/tenant | → org name, else product name |
| 30 | `server/src/modules/notifications/templates/templates.service.ts:94` | in-app "Welcome to AURA 🚀" | Product | → "Welcome to Ozofi Nexus" |
| 31 | `client/src/modules/settings/components/FeatureControlTab.tsx:26` | "AURA AI Assistant" | Product | → "AI Assistant" |
| 32 | `client/src/modules/settings/components/UsersTab.tsx:102` | temp password prefix `AURA-` (generated with `Math.random()`, H1) | Product in a credential | → `NEXUS-` (generator weakness stays H1) |
| 33 | `client/src/modules/settings/components/{GeneralTab,IntegrationsTab}.tsx` | placeholders `aura.ems.com`, webhook `/aura`; **"Your endpoint base URL: https://api.aura-ems.com/v1/…"** (a fabricated domain shown as fact) | Product + fabricated data | → neutral placeholders; real deployment origin `/api/v1` |
| 34 | `server/src/initDb.ts:445` | default tenant seeded as "AURA Default" | Seed/tenant data | Not changed (Release 1 H4 owns `initDb.ts`) |

### B.2 Existing tenant-branding capability (important for the architecture)

- **Settings → General** stores the organisation profile in `app_config` (category `general`): `org_name`, `org_email`, `org_phone`, `tax_id`, `registration_no`, `app_url`, `support_email`, `support_phone`, `logo_url` [C].
- **Settings → Branding** stores `primary_color`, `accent_color`, `sidebar_theme`, `font_family`, `border_radius`, `compact_mode` and `favicon_url` [C]. **Nothing in the client reads them.** Only `logo_url` is used, by emails (`emailService.ts:100-118`). These are **decorative settings**, the same category as the unenforced MFA toggle.
- `GET /settings/config` sits behind the admin settings guard, so **non-admin users cannot read their own organisation's name or logo** [C]. A narrow read endpoint is needed (§E Phase 1).
- There is no tenant discriminator before login, so **the login page can only carry product branding**. That is correct: workspace branding appears after sign-in.

---

## C. UX Audit

### C.1 Visual system

| Problem | Measure | Evidence |
|---|---|---|
| Two disagreeing token systems | Tailwind `primary=#2A2673`; CSS var `--color-primary=20,18,61`; plus `--color-accent` indigo-500 | `tailwind.config.js`, `index.css:9-24` [C] |
| Tokens effectively unused | `bg/text/border-primary`: **28** uses vs **5,678** raw colour classes (3,326 slate/gray, 1,267 indigo/violet/purple, 1,085 other hues) and **373** hard-coded hex values | grep [C] |
| "Fancy" styling | `font-black` **659**× in 95 files; `uppercase tracking-widest/[0.xem]` **387**× in 71 files; 8–10px text **600**× in 96 files; `shadow-2xl` 36; gradients 48; `backdrop-blur` 31; `animate-pulse` 37 (20 files); italics 16 | grep [C] |
| Fonts | Three families (Inter, Outfit, JetBrains Mono), each loaded at **all weights 100–900** via one Google Fonts request | `index.css:1` [C] |
| Shared library under-used | `components/ui/index.tsx` exports Button, Badge, Card, Modal, DataTable, LoadingSpinner, EmptyState, Toast, but only **10** files import it | [C] |
| Duplicated components | `StatCard` defined **4×**; `EmptyState` 2×; `PersonalTab` 2×; `AttendanceTab` 2× | [C] |
| Oversized screens | `Timesheets.tsx` 1,316 LOC; `ProfileHeader.tsx` 952; `EmployeeTable.tsx` 917; `AddEmployeeModal.tsx` 762 | [C] |

### C.2 Honesty of displayed data (**fabricated metrics**)

| Location | What is shown | Reality |
|---|---|---|
| `reports/pages/Reports.tsx:163-190` | Real headcount, salary, attrition and attendance **paired with hard-coded trends** `+4.2%`, `+1.5%`, `-0.8%`, `+2.1%` | Trends are invented [C] |
| `reports/components/OrganizationReport.tsx:64-67` | "Hiring Velocity **+18% MoM**: pipelines performing above target" | Invented [C] |
| `reports/components/DiversityMetricsCard.tsx:31` | "Diversity score improved by **12%** since last quarter" | Invented [C] |
| `organization/pages/StructuralDeepDivePage.tsx:195-197, 352-354`, `StructuralDeepDive.tsx:58` | "Unit Efficiency 94.2%", "Compliance Index Level 4", "Velocity 86.4%", "Resource 92.1%", "Health 100%", trend `+12%` | Invented [C] |
| `dashboard/components/widgets/AnnouncementsWidget.tsx:6` | `MOCK_ANNOUNCEMENTS` | Mock [C] |
| `LoginPage.tsx:105-121` | "Sync Status: Operational", "L3 Secure" | Invented [C] |
| `payroll/components/OperationalStream.tsx:13-18` | Random hex "terminal" log | Decorative fabrication [C] |

Fabricated trends next to real figures are the most serious UX defect: managers can act on numbers the system never measured. **All of these are removed or replaced with honest empty states in Phase 4.**

### C.3 Copy and tone

Sci-fi/industrial jargon in user-facing copy: "Protocol" (Timesheets ×6, SyncProtocolModal ×5, payroll ×5, onboarding, settings), "Decommission" (organisation ×9), "Personnel Force", "Operational Stream", "Fiscal Integrity Matrix", "Structural Deep Dive", "Allocation Index". Error copy: "Authentication sequence failed", "All protocols require valid credentials". These are replaced with plain HR language (e.g. "Decommission department" → "Archive department"), keeping the behaviour.

### C.4 Navigation and information architecture

Current sidebar (`Sidebar.tsx:36-73`): Dashboard · My Profile · Approvals · Employees · Onboarding · Hierarchy · Attendance · Time Off · Timesheets · Payroll · Reports · Audit Log · Settings.
- **Three approval surfaces**: `/approvals`, Settings → Approvals (**calls non-existent endpoints**), Payroll → Approvals (**claims endpoints do not exist**).
- "Hierarchy" leads to `/organization`; the naming is inconsistent.
- `/payroll` is one route that serves both an admin console and the employee payslip view.
- Sidebar visibility is driven by **role names**, not permissions (§D).

### C.5 States, responsiveness, accessibility

| Topic | Finding |
|---|---|
| Loading/empty/error | ApplyLeave, GeneratePayroll and OrganizationPage lack loading/empty/error states; `EmployeeTable.tsx:102` swallows errors (`catch{}`), so a failure looks like "0 employees"; 29 empty or log-only catches [C] |
| 403 / 404 | Inline in `App.tsx:132-171` with jargon copy and `font-black` 6xl headings; no shared error-page component [C] |
| Error boundary | Only the Sentry boundary, and only when a DSN is set; with no DSN a render error blanks the screen [C] |
| Mobile | Sidebar always rendered (240/68px); **no drawer or hamburger**; no breakpoint hides it (`MainLayout.tsx:20`) [C] |
| Accessibility | **0** `aria-*`, **0** `role=`; **106 labels but only 2 `htmlFor`**, so labels are not associated with inputs; 14 clickable `div`s that a keyboard cannot reach; 600 instances of 8–10px text [C] |
| Decorative settings | Branding tab (7 settings) and Security tab (MFA, password rules) are saved but have no effect [C] |
| Remember-me | Not supported; tokens are kept per tab in `sessionStorage` (design decision, §G-4) [C] |
| Registration | **No self-registration exists.** Users are created by admins (Settings → Users), with a welcome email and temp password. Adding public sign-up is not recommended (security); "invitation" = the existing admin-create + welcome flow [C] |

---

## D. RBAC Audit: Role → Permission → Resource → Action → API → UI

The permission vocabulary below is the **existing** `module:action` catalogue in `db/schema.ts:306-360` (the one the role seed uses). `seedPermissions.ts` adds a second, conflicting set (`read/manage`); both exist in the DB [C].

| Resource | Action | Permission(s) today | API enforcement (route) | UI gating today | Gap |
|---|---|---|---|---|---|
| Dashboard | view | `dashboard:view` | `/reports/*` analytics: **none** (any authenticated user, including `/reports/admin`) | `dashboard_type`/role name | API open (S3); UI by role |
| Employees | view list | `employees:view` (+ `employees:read`) | `GET /employees`: guard includes `'employee'`, so **anyone** passes | Route `allowedRoles` admin/hr/manager | Effectively open |
| Employees | create / bulk | `employees:create` / `employees:manage` | guard `['admin','super_admin','hr','employees:manage']`; the legacy map lets **managers** through | role-gated route | S4 |
| Employees | update | `employees:update` | `PUT /employees/:id`: **no guard**; controller checks role-name `['admin','super_admin','hr']` else own profile | role-gated | Custom roles cannot edit; role-name check |
| Employees | delete | `employees:delete` | guard (legacy map lets managers through); **hard-deletes history** | role-gated | S4 + B-10 |
| Employee sub-records | view | none | education/experience/emergency `GET`: **no guard, no tenant** | profile page | IDOR (H6) |
| Departments/Teams | view / manage | `organization:read/manage` (seedPermissions vocab only) | GET open; mutations guarded (`organization:manage`, legacy map) | role-gated route | Vocabulary split |
| Attendance | check-in / view own | `attendance:check_in`, `attendance:view` | authenticated; self-scoped | always visible | OK-ish |
| Attendance | regularize | `attendance:regularize` | **no guard; auto-approved** (B-14) | always visible | Data integrity |
| Leave | apply / view | `leave:apply`, `leave:view` | authenticated | always visible | — |
| Leave | approve | `leave:approve` | **no guard; `approved_by` taken from body** | via `/approvals` (role-gated) | S3; leaves likely not visible to approvers (A1-3) |
| Timesheets | approve | `timesheet:approve` | **no guard** | role-based | S3 |
| Approvals | approve | `approvals:approve` | `POST /approvals/:id/action`: **no guard, includes password resets** | role-gated route | **S2 account takeover** |
| Payroll | view / manage / run / finalize | `payroll:view/manage/run/finalize`, `payroll:view_own` | **no guards on any payroll route** | role-gated route (`employee` allowed) | S3; UI calls 9 missing endpoints |
| Reports | view / export | `reports:view/export` | **no guard** | role-gated | S3; export buttons dead |
| Audit log | view | `audit:view` | **no guard** | role-gated | S3 |
| Settings / Users / Roles / Permissions | manage | `settings:manage` | guard with legacy map, so **managers pass** | role-gated (admin) | **S4 escalation** |
| Documents | verify / delete | `documents:manage` (seedPermissions) | role-name guard (managers pass) | profile | S4 |
| Performance | create / delete | none defined | role-name guard; **every employee passes create** | no UI | S4 |
| Claims | approve | `claims:approve` (seedPermissions) | **no guard** | payroll tab (dead endpoints) | S3 |

**Dynamic behaviour today:** changing a role's permissions in the Admin Panel reaches the API only after the user's next token refresh (≤15 min), and **never reaches the UI until logout/login** (refresh does not return permissions; `/auth/me` is never fetched on load) [C].

**Implication for the Nexus program:** a permission-driven sidebar on top of today's API would *look* secure while most endpoints remain open. **Backend authorization (Release 1 S3/S4, then baseline W-5) must land before, or together with, the permission-driven UI.** Otherwise hiding a menu item implies protection that does not exist.

### D.1 Multi-tenant readiness
**Partially multi-tenant.** The schema is tenant-aware, but enforcement leaks (fallbacks to `'tenant_default'`, unscoped `leave_types` and child deletes), and there is no tenant provisioning or pre-login tenant resolution. No multi-tenancy rewrite is proposed. The branding architecture (§E Phase 1) separates **product** from **tenant** so that real tenancy (baseline Release 7) needs no rebranding work.

---

## E. Implementation Plan

### Guiding constraints
- **Incremental and behaviour-preserving.** No framework change and no rewrite. Existing routes, APIs and business logic are kept. Visual and copy changes are separated from behaviour changes.
- **Security precedes the security illusion.** UI permission gating (Phase 6) ships only alongside the matching backend guards (Release 1 S3/S4 and baseline W-5).
- **Release discipline still applies.** Release 0 stays untouched; backend security work follows the remediation baseline; no migrations before the B0-01 schema snapshot.
- Each phase is its own branch/PR with before/after screenshots, `typecheck`, unit tests, route-contract check and a production build.

### Phase 1 — Branding foundation
| Item | Detail |
|---|---|
| Product brand config | `client/src/config/brand.ts` + `server/src/config/brand.ts`: `productName: 'Ozofi Nexus'`, `shortName: 'Nexus'`, `companyName: 'Ozofi'`, `tagline: 'Workforce Management Platform'`, `description`, asset paths, `themeColor`. **Immutable product identity**; tenants cannot override it |
| Brand assets | `client/public/brand/`: Nexus mark (SVG), wordmark (SVG, light and dark), favicon SVG + PNG fallbacks, `site.webmanifest`. A clean geometric mark: no gradients, legible at 16px |
| Metadata | `index.html` title/description/theme-color/manifest; a `usePageTitle()` hook giving `Employees · Ozofi Nexus` |
| Tenant (workspace) branding | `useWorkspace()` reads the **existing** `app_config` keys (`org_name`, `logo_url`; later `primary_color`) through a **new, narrow, authenticated read endpoint** `GET /api/v1/workspace` (no secrets; available to any signed-in user). Additive; no DB changes |
| Server copy | Test-email subject, API root text and startup banner → product brand; HR emails and offer letters → tenant `org_name` with the current text as fallback, plus "Sent via Ozofi Nexus" |
| Replaces | Rows 1–5, 7–13, 15–16, 18–19, 26 of §B.1 |

### Phase 2 — Design system
| Item | Detail |
|---|---|
| Tokens (single source) | CSS variables in `index.css`, mapped into `tailwind.config.js` (`primary`, `surface`, `border`, `text`, `muted`, `success`, `warning`, `danger`, `info`), so a tenant accent can later override `--nx-primary` at runtime with a contrast check |
| Palette (light-first) | Neutral slate surfaces; **one** primary (Nexus blue, proposed `#2F5BEA`, AA on white); semantic colours green/amber/red/sky at controlled shades; no gradients, glass or glows |
| Typography | **Inter only**, weights 400/500/600/700, tabular numbers for data. Scale: 12 (caption, minimum) · 13 (small/table) · 14 (body) · 16 · 18 · 20 · 24 · 30. No `font-black`; uppercase only for small overline labels |
| Spacing, radius, elevation | 4px grid; radius 6/8/12 (no 24–40px pills on containers); two elevation levels (border plus subtle shadow) |
| Components | Consolidate into `components/ui/*`, extending the existing library rather than replacing it: Button, IconButton, Input, Textarea, Select, Combobox, Checkbox/Switch, FormField (label + `htmlFor` + inline error), Card, StatCard (**one**), Badge, Avatar, Tabs, Table (+ pagination), Modal, Drawer, ConfirmDialog, Dropdown/Menu, Tooltip, Toast, Alert, Breadcrumbs, Skeleton, EmptyState (**one**), ErrorState, PageHeader |
| Accessibility baseline | Focus rings, `aria-*` on icon buttons, label association, keyboard support in Menu/Modal/Tabs, colour contrast ≥ 4.5:1 |
| Docs | `docs/nexus/DESIGN_SYSTEM.md` plus a `/__design` route visible only in dev |

### Phase 3 — Application shell and authentication screens
- **Login:** Nexus logo, descriptor, email and password, show/hide password, forgot password, loading, error and validation states, mobile layout, short security note. No fake status panel, no marketing. Quick-login handling per §G-3. No remember-me (§G-4).
- **Forgot password / change password:** restyled; **flow unchanged** until the S2 fix (Release 1) changes the flow.
- **Shell:** sidebar with **mobile drawer**, topbar with workspace identity (tenant logo/name), user menu (profile, sign out), a shared 403/404/500 page, and a global error boundary that works without Sentry.
- **Logout:** call `POST /auth/logout` before clearing local state (fixes the client-only logout; an additive API call to an existing endpoint).
- **Navigation, based on the modules that actually exist** (no invented Workflows/Analytics/standalone Permissions pages):
  ```text
  Ozofi Nexus
  ─ Home:            Dashboard · Approvals
  ─ My work:         My profile · Attendance · Time off · Timesheets · Payslips*
  ─ Workforce:       Employees · Onboarding · Organization (departments & teams)
  ─ Finance:         Payroll
  ─ Insights:        Reports
  ─ Administration:  Settings (Users, Roles & permissions, Organization profile, Branding, Email, Policies) · Audit log
  ```
  \* "Payslips" is the employee view of `/payroll`. It splits into its own entry once the self-scoped payroll endpoint exists (Release 1 S3).
- The sidebar is generated from **one navigation registry** (`navigation.ts`) where each item declares a `permission`. During the transition, `can()` resolves through the existing role logic, so behaviour is unchanged. It switches to permission strings when W-5 lands (a one-line change).

### Phase 4 — Dashboard (real data only)
Rebuild the role dashboards from the `analyticsService` responses only. Remove every fabricated trend, mock and decorative element listed in §C.2. Where there is no comparative history, show the value without a trend. Where data is missing, show an honest empty state. Widgets: workforce overview, today's attendance, leave (pending and upcoming), pending approvals, upcoming holidays, birthdays and new hires, recent activity (audit, for those allowed).

### Phase 5 — Workforce modules (page by page; one PR each)
Order by usage: **Employees directory** (search, filters, pagination as the API supports; a shared `Table`; real loading, empty and error states; fix the swallowed error) → **Employee profile** (sections: Overview, Personal, Employment, Attendance, Leave, Documents, Activity; sensitive sections hidden unless permitted, while backend redaction stays in the security track) → Attendance → Time off → Timesheets → Approvals (single inbox) → Organization → Onboarding → Reports (remove fabricated metrics; make Export either work or disappear) → Payroll (restyle only; hide controls that call missing endpoints until Release 2/W-2) → Settings (hide or label the decorative Branding/Security settings until enforced; wire `primary_color` once the token system supports it) → Audit log.
Copy clean-up (§C.3) happens in each page's PR.

### Phase 6 — RBAC (joint with remediation Release 1 and baseline W-5)
Not a separate UI-only effort. Order:
1. Release 1 S4/S3: backend guards on every route in §D, with the authorization test matrix.
2. W-5: one permission vocabulary (reversible migration, after B0-01), permissions returned on refresh, `/auth/me` on load.
3. Then UI: navigation registry and `can()` switched to permissions; route guards switched from `allowedRoles` to `requiredPermission`; `<Can>` on actions.
Acceptance test: change a role's permissions in Settings → within one refresh cycle the sidebar, routes, buttons, dashboard widgets and API all agree.

### Phase 7 — Security (tracked in the remediation baseline; not duplicated)
S1, S2, S3, S4, S5/S6, H1, H4, R0-F4, R0-F5, IDOR (H6) and mass-assignment checks on profile updates. Nexus UI work must not widen exposure: no new unauthenticated endpoints, and the workspace endpoint returns no secrets.

### Phase 8 — Testing
Per PR: `npm run typecheck`, `npm test`, client `tsc` + `vite build`, route contract (no new mismatches), and screenshot comparison of the changed pages at 375/768/1280px. Program-level additions: component tests for the `ui/*` primitives (Vitest + Testing Library in the client), an accessibility lint (`eslint-plugin-jsx-a11y`), and a smoke run of the main flows on staging (after B0-05).

### Phase 9 — Production readiness
No stale branding (grep gate in CI for `AURA|PRECISIONHUB|auracore|AURA EMS`), no console errors on the main routes, Lighthouse accessibility ≥ 90 on login/dashboard/employees, a single font family, a bundle-size budget, and every fabricated metric removed (grep gate on the known literals).

### Sequencing against the remediation plan
```text
Remediation:  Release 0 (BLOCKED: owner) ─► Release 1 (security) ─► Release 2 (data safety) ─► … W-5 (unified RBAC)
Nexus UI:     Ph1 Brand ─► Ph2 Design system ─► Ph3 Shell+Auth ─► Ph4 Dashboard ─► Ph5 Pages ───────────┐
                                                                                   Ph6 RBAC UI ◄── needs S3/S4 + W-5
```
Phases 1–5 are frontend-heavy and can run **in parallel** with Release 0 owner actions. They touch backend code only for: the additive `GET /workspace` endpoint, server branding copy, and the logout call. Phase 6 waits for the backend.

---

## F. Change log

To be produced per phase during implementation: files changed, reason, behaviour change, tests executed, remaining risks. Nothing has been implemented yet.

---

## G. Decisions needed before implementation

| # | Decision | Recommendation |
|---|---|---|
| G-1 | **Where the work lives.** Release 0 is uncommitted on `release-0/safety-net`; that release forbids client-module edits | Commit Release 0 on its branch (as reviewed per-item commits), then create `feat/nexus-brand-foundation` **from it**, so Nexus inherits the `app.ts` split, test harness and Sentry wiring, and merge conflicts in `main.tsx`/`package.json` are avoided |
| G-2 | **Legal employer name for HR emails and offer letters** (four variants exist: "Ozofi Technologies Private Limited", "Ozofi Global Technologies", "Ozofi People Operations", "Ozofi Personnel Hub") | Set `org_name` = the registered legal name, and an HR sender name such as "Ozofi People Team", in Settings → General. Code reads them; current text is the fallback |
| G-3 | **Quick-login demo accounts** (fill real accounts, password `Admin@123`, including super-admin, on the public login page) | Show only in development builds (`import.meta.env.DEV`); never in production |
| G-4 | **Remember-me** | Not now. It changes token persistence (`sessionStorage` → `localStorage`) and belongs with the session hardening (W-6) |
| G-5 | **Rename deploy identifiers** (`ems-api`, `ems-client`, Vercel project name) | Not in this program; it changes URLs (ops decision) |
| G-6 | **Primary brand colour** | Nexus blue `#2F5BEA` with a neutral slate UI, unless Ozofi has a brand guide or hex value to use |
| G-7 | **Scope of the first implementation PR** | Phase 1 + Phase 2 tokens + Login/Forgot/Change-password (Phase 3 subset), shown for review before the shell and the pages |
