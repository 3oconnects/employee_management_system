# EMS — Supplementary Audits (Workflow, Data Integrity, UX, Operations, Enterprise)

**Companion to:** [PRODUCTION_READINESS_AUDIT.md](PRODUCTION_READINESS_AUDIT.md)
**Date:** 2026-10-01 · **HEAD:** `83c1e84`
**Method:** Static code reading only. No running instance or live database was inspected.

**Evidence labels:** **[C]** Confirmed in code (file:line cited) · **[I]** Inferred from code, needs a runtime check · **[U]** Unknown.

> **Headline:** These audits found problems that are as serious as the security findings.
> - **Deleting an employee hard-deletes their payroll, leave, timesheet and claim history** (A2-1).
> - **Leave requests created through the current UI probably never reach the Approvals inbox** (A1-3).
> - **Payroll ignores attendance and leave, pays terminated employees, and can be run twice for the same month** (A2-3).
>
> These items join the launch-blocker list.

---

## AUDIT 1 — Business Workflow Audit

**Can HR run the company on EMS today?** Partly. HR can maintain the employee master data, onboard with offer letters, and track attendance and timesheets. HR **cannot** run probation, transfers, exits or payroll end-to-end without Excel and manual steps.

### 1.1 Employee lifecycle coverage

| Stage | What exists | Gap | Evidence |
|---|---|---|---|
| **Joining / Offer** | Candidate pipeline; offer-letter PDF and email | Offer acceptance is not tracked (no accept/decline state) [I] | `services/offer-letter/*`, `modules/onboarding` [C] |
| **Onboarding** | `status='onboarding'` → approval → `active`; welcome email with temp password | No checklist (documents, assets, IT accounts) | `approvals.service.ts:31-60` [C] |
| **Probation** | `probation_end_date` column; editable field | Nothing tracks it at runtime. Confirmation was only ever set by a **one-off migration backfill**. No reminders, no review, no extension. | `db/migration_v3.ts:237-253` [C] |
| **Confirmation** | `confirmation_date` column | No workflow and no letter. `confirmation_date` is never written by any module [C] (only the field map) | `employees.submodels.ts:143-144` |
| **Promotion** | Detected when HR edits position, role or CTC; an email is sent | **No approval step, no effective date, no stored history.** The change overwrites the employee row, and only an email records it. There is no `employee_history` / `job_history` table. | `employees.service.ts:227-304` [C]; grep for history table: none [C] |
| **Transfer** | Department change is detected and emailed | Same as promotion. In addition, the reporting manager is stored in **two columns** (`manager_id` vs `reporting_manager_id`), see A1-4 | [C] |
| **Increment / Appraisal** | CTC change is emailed | No appraisal cycle UI (the performance backend has no UI) | [C] |
| **Exit / Resignation** | `exit_date`, `exit_reason`, `exit_type`, `notice_period_days` columns; Exit Date shown on profile | **No resignation request, notice tracking, clearance, or exit interview.** `resign`/`offboard`: 0 code references. | `migration_v3.ts:55-60`; `JobTab.tsx:29` [C] |
| **Relieving / F&F** | Experience-letter and certificate templates exist as **static PDF/DOCX** | No generation, no full-and-final settlement (leave encashment, recoveries), no relieving letter. `relieving`/`fnf`: 0 references. | `server/public/Company_Offer_latter_and_certificate/*` [C] |
| **Deletion** | "Delete employee" | **Destroys statutory history** (A2-1) | [C] |

### 1.2 Broken or likely broken workflows

| # | Workflow | Finding | Evidence | Severity |
|---|---|---|---|---|
| A1-1 | Settings → Approvals tab | Calls `GET /approvals/pending` and `PUT /approvals/:id/:action`. **Neither route exists**; the backend exposes only `GET /`, `POST /`, `POST /:id/action`. | `client/.../settings/components/ApprovalsTab.tsx:33,49` vs `approvals.routes.ts:12-14` [C] | High |
| A1-2 | Payroll → Approvals (claims) | Calls `PUT claims/:id/approve`. The backend has only `PUT /claims/:id/status`, so this returns 404. | `client/.../payroll/sections/Approvals.tsx:43` vs `claims.routes.ts:15` [C] | High |
| A1-3 | **Leave approval** | `POST /leave/apply` inserts `user_id, leave_type_id` and leaves `employee_id` NULL (`leaves.repository.ts:11`). The Approvals inbox selects leaves with `JOIN employees e ON l.employee_id = e.id` and reads the legacy column `l.type` (`approvals.repository.ts:44-57`). Rows with a NULL `employee_id` are dropped by the inner join. The leave page itself has no approve UI. **Net effect: new leave requests probably cannot be approved from the UI.** | [C] code paths; [I] outcome, since a DB trigger or backfill could exist (none found in repo) | **Critical** (verify with one test) |
| A1-4 | Manager approval scoping | The UI saves `reportingManagerId` → `reporting_manager_id` (`AddEmployeeModal.tsx:695`). The Approvals inbox scopes managers by `employees.manager_id` (`approvals.repository.ts:14,34,52`). A manager whose team was set up in the current UI probably sees none of the team's requests. | [C] code; [I] outcome | High |
| A1-5 | Approve via Approvals page vs via `/leave/:id/approve` | Two paths with different side effects. The Approvals path does not set `approved_by` and sends no notification (`approvals.repository.ts:183-185`). The leave path does both (`leaves.service.ts:38-52`). | [C] | Medium |
| A1-6 | Holidays | The `holidays` table is read by dashboards, but **there is no API to create or edit holidays** (grep for `INSERT INTO holidays` in modules: none) | `analyticsService.ts:227` [C] | Medium |
| A1-7 | Employee export / report export | The "Export" (`EmployeeTable.tsx:325`), "Export PDF" and "Filter" (`Reports.tsx:126-131`) buttons have **no `onClick`** | [C] | Medium |
| A1-8 | Dashboard announcements | Hard-coded `MOCK_ANNOUNCEMENTS`; there is no way to publish an announcement | `AnnouncementsWidget.tsx:6,19` [C] | Low |

### 1.3 Manual/Excel processes still required [I]

1. The **payroll inputs** that matter (LOP days, mid-month joiners and leavers, arrears, reimbursements) are not computed, so HR must prepare them outside the system.
2. **Statutory outputs**: PF ECR, ESI returns, Form 16 / 24Q. None are generated.
3. **Leave policy**: accrual, carry-forward, encashment, half-days and sandwich rules are absent. A balance is simply `annual_quota − approved calendar days` (`leaves.repository.ts:69-80`).
4. **Holiday calendar** maintenance (A1-6).
5. **Exit / F&F** and relieving letters.
6. **Org history and reporting** on past promotions or transfers (no history table).

---

## AUDIT 2 — Data Integrity Audit

### 2.1 Can the data be trusted?

| Domain | Verdict | Why |
|---|---|---|
| **Payroll** | **No** | Fixed-component calculation that ignores attendance and leave; terminated staff included; duplicate runs possible; history overwritten; flat TDS percentage |
| **Attendance** | **No** | Self-service regularization writes directly as `present` with no approval; time-zone issues; duplicate rows possible |
| **Approvals** | **No** | No authorization (main report S3), no state-transition guards, last write wins |
| **Leave balances** | **Partially** | Formula is consistent, but it counts weekends and holidays, has no apply-time balance check, and cross-year leaves count against one year |
| **Employee master** | **At risk** | Hard delete, email-based joins, two manager columns |

### 2.2 Findings

| # | Finding | Evidence | Impact | Severity |
|---|---|---|---|---|
| **A2-1** | **Employee delete is a hard delete of all history.** Within one transaction it deletes rows from `payroll_entries`, `payroll_history`, `payroll_profiles`, `leave_requests`, `timesheets`, `approvals`, `claims`, `reimbursement_claims`, `loans`, `performance_reviews`, `employee_documents`, and the employee row itself. These child deletes are **not tenant-scoped** (they filter on `employee_id` only). Soft delete is used only as a fallback when the hard delete fails. | `employees.repository.ts:331-380` [C] | Permanent loss of payroll and statutory records (Indian payroll records must be retained for years), broken audit trail, irreversible mistakes | **Critical** |
| A2-2 | Approvals have no state guard. `approveLeave`, `approveTimesheet`, `updateClaimStatus`, `updateLeaveStatus` and `updateApprovalStatus` update rows without `AND status='pending'`. An approved leave can be re-rejected, and two managers acting at the same time produce last-write-wins. | `leaves.repository.ts:37-44`; `timesheets.repository.ts:54-61`; `claims.repository.ts:25-28`; `approvals.repository.ts:183-203` [C] | Approval history cannot be relied on | High |
| **A2-3** | **Payroll correctness.** (a) Gross = fixed components; **attendance, LOP and leave are ignored**. (b) No proration for mid-month joiners or leavers. (c) `getAllPayrollProfiles` selects every profile in the tenant **regardless of employee status**, so terminated staff are paid. (d) TDS is a flat `gross × 5%/15%`, not slab-based; the `tax_regime` field is ignored; TDS is not rounded. (e) `payroll_runs.id = RUN-…-Date.now()` and there is no uniqueness on `(tenant, month, year)`, so **two runs for one month both succeed**, `payroll_entries` are duplicated, and `payroll_history` is upserted to `'paid'` immediately with no approve/finalize step. (f) Month and year are stored as `TEXT`. | `payroll.service.ts:200-240`; `payroll.repository.ts:66-98`; `initDb.ts:29-46` [C] | Wrong salaries, duplicate payouts, bad statutory filings | **Critical** |
| A2-4 | Attendance regularization is applied immediately: `INSERT … status='present'` for **any date (past or future)**, with no approval and no duplicate check. | `attendance.repository.ts:124-131`; `attendance.service.ts:101-107`; schema accepts any string (`attendance.schema.ts`) [C] | Attendance can be forged | High |
| A2-5 | Check-in race: the "already checked in" check and the insert are separate queries, and there is no `UNIQUE(employee_id, date)` or partial unique index on open sessions. A double-click can create two open sessions. | `attendance.service.ts:46-49`; table `initDb.ts:91-98` [C] | Duplicate rows, inflated hours | Medium |
| A2-6 | Time-zone handling: `date = CURRENT_DATE` in the DB session time zone (likely UTC on Supabase [I]) and `TIMESTAMP` without time zone. For IST users, check-ins between 00:00 and 05:30 land on the previous date. Check-out only matches today's row, so a forgotten check-out or a night shift leaves a permanently open session. | `attendance.repository.ts:22-69`; no TZ configuration found [C] | Wrong daily records | Medium |
| A2-7 | Leave apply validates nothing: no `end_date ≥ start_date` check, no balance check, no overlap check. Day counting uses calendar days (`end−start+1`) and ignores weekends, holidays and half-days. A leave spanning Dec→Jan is counted entirely in the start year. | `leaves.service.ts:16-30`; `leaves.schema.ts`; `leaves.repository.ts:69-80` [C] | Negative balances, overlapping leave | High |
| A2-8 | `GET /leave/types` is **not tenant-scoped** (`SELECT * FROM leave_types`) | `leaves.repository.ts:4-7` [C] | Cross-tenant leakage once multi-tenant | Medium |
| A2-9 | Dual leave schema: legacy (`employee_id`, `type`) vs current (`user_id`, `leave_type_id`). Employee delete removes leave by `employee_id`, which orphans current rows (keyed by `user_id`). | `initDb.ts:115-124, 333-336`; `employees.repository.ts:344` [C] | Orphaned and invisible records (feeds A1-3) | High |
| A2-10 | Two manager columns (`manager_id`, `reporting_manager_id`): 21 vs 8 references in `modules/`. Delete unlinks only `manager_id`. | `employees.repository.ts:350` [C] | Wrong hierarchy, wrong approvers | High |
| A2-11 | `users ↔ employees` are linked by email string in many queries. Changing an employee's email updates `users` by the old email inside the same transaction, which is fine, but any mismatch in case or whitespace splits the identity. | `auth.repository.ts:10`; `employees.service.ts:196-198` [C] | Login/profile mismatch | Medium |
| A2-12 | The DB retry wrapper retries **any** query whose error message contains "timeout", including non-idempotent inserts | `config/db.ts:67-82` [C] | Duplicate writes under load | Medium |
| A2-13 | No job history: promotions, transfers and CTC changes overwrite in place | §1.1 [C] | Historical reports impossible | High |
| A2-14 | Audit coverage: only **login, logout and own-profile update** publish audit events. Payroll runs, approvals, employee CRUD, role and permission changes, and deletes are **not audited**. | grep `AUDIT_LOG_REQUESTED`: 3 call sites, all in `auth.controller.ts` [C] | Cannot answer "who changed this salary?" | **High** |

### 2.3 Scenario matrix

| Scenario | Current behaviour | Expected |
|---|---|---|
| Two managers approve and reject the same leave at once | Last write wins; both succeed | First wins; the second gets 409 |
| Payroll run clicked twice for October | Two runs, duplicate entries, history overwritten | Second run rejected, or a single draft reused |
| Employee transfers department mid-month | Row overwritten; old department lost; payroll unaware | Effective-dated history row; payroll split if needed |
| Employee deleted after 2 years | All payroll, leave and timesheet history deleted | Soft delete / status `exited`; records retained |
| Employee terminated (status) but profile retained | Still paid in the next run | Excluded from runs after `exit_date` |
| Employee regularizes last Sunday as present | Accepted immediately | Pending approval; validated against roster and holidays |
| Leave Dec 30 – Jan 3 | 5 days charged to the old year, including the weekend | Days split by year; working days only |
| Manager set via the current Add Employee UI | Manager probably cannot see the team's requests (A1-4) | Single manager column drives scoping |

---

## AUDIT 3 — UX & Product Experience Audit

### 3.1 Information architecture and navigation

- The sidebar groups (Main / People / Organization / Workspace / Finance / Admin) are sensible (`Sidebar.tsx:36-73`) [C].
- Three different "Approvals" surfaces exist: the `/approvals` page, the Settings → Approvals tab (broken, A1-1), and Payroll → Approvals (broken, A1-2). Users will not know where to act. **Recommendation:** keep `/approvals` as the single inbox, and turn the others into filtered links to it.
- The Leave page has no approver view; approvers must know to go to `/approvals` [C].
- `/payroll` is one route that serves both an admin console and the employee payslip view, chosen by role (`GeneratePayroll.tsx:32-40`). This is acceptable, but it depends on the role-name checks flagged in the main report.

### 3.2 State coverage per page

The counts below come from grepping each page for loading, empty and error patterns. They indicate presence only, not quality.

| Page | Loading | Empty state | Error feedback | Note |
|---|---|---|---|---|
| ApplyLeave | **none** | **none** | toast only | Balances and history pop in with no indicator |
| GeneratePayroll (shell) | **none** | **none** | **none** | Sections handle their own states |
| OrganizationPage | yes | **none** | **none** | |
| AuditLogPage | yes | **none** | minimal | Empty logs render a blank table |
| Dashboard | yes | **none** | minimal | Widgets fail silently |
| EmployeeTable | yes | partial | **swallowed**: `catch{}` (`EmployeeTable.tsx:102`) | A failed fetch looks like "0 people" |
| Onboarding, Profile, Approvals | good | good | good | Use these as the reference pattern |

29 places in `modules/` use an empty `catch` or log-only error handling [C].

### 3.3 Mobile responsiveness

- `MainLayout` is a fixed two-column grid, and the sidebar is always rendered at **240px, or 68px collapsed**. There is **no mobile drawer or hamburger and no breakpoint that hides it** (`MainLayout.tsx:20`, `Sidebar.tsx`) [C]. On a 375px phone, at least 18% of the width is permanently taken.
- `Timesheets.tsx` (1,316 LOC) has a weekly grid with 13 responsive classes [C]; whether it works on phones is [U] (it needs a device test).
- Check-in/out and leave apply are the most common mobile tasks, and they are the ones most hurt by this.

### 3.4 Readability and accessibility

- **597** uses of 8–10px text (`text-[8px]`, `text-[9px]`, `text-[10px]`) [C]. This is below comfortable reading size and fails most enterprise accessibility reviews.
- **Zero** `aria-*` / `role=` attributes in `modules/` and `components/ui` [C]. Icon-only buttons (collapsed sidebar, table actions) have no accessible names.
- Several buttons are **decorative**: Export, Export PDF and Filter (A1-7). The Settings → Security page shows **MFA Enforcement** and password-complexity toggles (`SecurityTab.tsx:18,155`), but **nothing on the server reads them**: 0 references to `mfa_enabled` or `require_*` in `server/src` [C]. That is worse than leaving the feature out, because admins believe they are protected.

### 3.5 Dashboard usefulness

- The admin dashboard surfaces headcount, pending leaves, attendance and holidays (`analyticsService.ts`) [C], which is useful.
- The announcements widget is mock data [C]. The pending-leave count likely undercounts if A1-3 holds [I].
- Dashboard choice depends on `dashboard_type`, not permissions (main report §4).

### 3.6 UX recommendations (non-breaking)

1. Wire up or remove dead controls (Export, Filter, MFA, password policy). Hide them behind a "coming soon" state rather than leaving fake toggles.
2. Add a shared `<PageState loading empty error>` wrapper; adopt it first in ApplyLeave, AuditLog, Organization and EmployeeTable.
3. Add a mobile sidebar drawer (below the `md:` breakpoint). Prioritise the attendance check-in and leave-apply flows on mobile.
4. Set a 12px minimum body text and 11px minimum labels. Add `aria-label` to icon buttons.
5. Consolidate approvals into one inbox.

---

## AUDIT 4 — Production Operations Audit

| Capability | State | Evidence | Gap / Action |
|---|---|---|---|
| Monitoring / APM | **None** | No Sentry/OTel/Datadog dependency (`server/package.json`, `client/package.json`) [C] | Add Sentry (server and client) and Vercel/Render log drains |
| Alerting | **None** | n/a [C] | Uptime check on a DB-aware `/health`; alerts on 5xx rate and payroll-run failures |
| Health checks | Static OK, version hard-coded `2.0.0` | `index.ts:86-93` [C] | `/health` (liveness) plus `/ready` (DB `SELECT 1`, timeout) |
| Logging | `console.*`, no request ID, PII in 403 logs | `authorize.ts:119-124` [C] | pino with request ID; redact emails and tokens |
| Incident management | No runbook, on-call or status page | No ops docs in `docs/` beyond the handover guide [I] | One-page runbook: rollback, DB restore, secret rotation, contacts |
| Backups | Not in repo | [U] Supabase plan-dependent | Confirm daily backups and PITR; **run one test restore** |
| Disaster recovery | Not defined | [U] | Set RPO/RTO targets (e.g. RPO ≤ 24h, RTO ≤ 4h for an SMB) |
| Rollbacks | App: Vercel/Render support instant rollback [I, platform feature]. **DB: no down-migrations**, and statements are wrapped in `.catch(()=>{})` | `schema.ts:419`, `initDb.ts:276-336` [C] | Versioned migrations; expand-then-contract changes only |
| Release process | No CI, no tests, no version tagging, no changelog. Two deployment descriptors (`vercel.json`, `render.yaml`) with no stated primary. | [C] | GitHub Actions: `tsc` + tests on PR; protected `main`; tag releases; pick one deploy target |
| Environment separation | One `.env`, no staging config | [C] | Staging project (separate Supabase DB), seeded with fake data |
| Startup side effects | Permission seed and the forced super-admin assignment run on **every boot / cold start** | `index.ts:194` [C] | Move to an explicit `db:setup` / release step |
| Process resilience | `uncaughtException` swallowed; process keeps serving | `index.ts:169-180` [C] | Log, flush, exit, and let the platform restart it |
| Secrets | History leak (main report S5); no secret manager usage documented | [C] | Platform env vars only; rotation runbook |

**Operational readiness score: 2.5 / 10.** A first incident (a bad migration or a payroll double-run) would have no alert, no trace, no tested restore and no down-migration.

---

## AUDIT 5 — Enterprise Customer Readiness Audit

| Requirement | State | Evidence | Commercial impact |
|---|---|---|---|
| **Multi-company / tenant provisioning** | The data model is multi-tenant, but **no API or UI creates tenants**. They come only from seed scripts. Signup and invite flows do not exist. | `INSERT INTO tenants` only in `db/schema.ts:407`, `initDb.ts:444` [C] | Cannot onboard a second customer without a developer |
| **Tenant isolation** | Leaky: `'tenant_default'`/`'default'`/`NULL` fallbacks (37 sites), unscoped `leave_types`, unscoped child deletes | Main report H5; A2-1, A2-8 [C] | **Blocks multi-customer SaaS** |
| **Audit compliance** | Only auth events audited; no `audit:export` (`export.service.ts` is a placeholder that returns "Export job started."); read is unauthorised | A2-14; `audit/export/export.service.ts:2-5` [C] | Fails SOC 2 / ISO 27001 change-tracking expectations |
| **Data retention** | None: 0 references to retention, purge or anonymisation [C]. Hard delete is the default (A2-1), which is the opposite of what is needed for statutory records. | [C] | DPDP Act 2023 (India) / GDPR erasure and retention requests cannot be met correctly |
| **Export** | Employee and report export buttons are dead (A1-7). Payslip download exists (`DocumentsPayslips.tsx`) [C]. No bulk data export. | [C] | Customers expect CSV/XLSX export and data portability |
| **SSO (SAML/OIDC)** | None: 0 server references [C] | [C] | Required by most mid-market and enterprise buyers |
| **MFA** | **UI toggle only, not enforced** (§3.4) | `SecurityTab.tsx:155`; 0 server refs [C] | Fails security questionnaires, and the UI misrepresents the control |
| **User provisioning / SCIM** | Manual user creation in Settings; bulk CSV for employees. No SCIM, no deprovisioning hooks. | `user-assignments.routes.ts`; `BulkUploadModal.tsx` [C] | Manual joiner/leaver access management |
| **Password policy** | Minimum 6 characters, hard-coded; policy toggles not enforced | `auth.service.ts:123`; §3.4 [C] | Questionnaire fail |
| **Session controls** | 15-minute access token, 7-day refresh, **no server-side revocation** | Main report H2 [C] | No forced logout of a terminated employee's sessions |
| **Data residency / encryption** | Supabase-managed at rest [I]. DB TLS without certificate verification [C]. | `config/db.ts:26` | Needs documentation for buyers |
| **Configurable policies** | Payroll rates and leave rules are hard-coded | `payroll.service.ts:217-220` [C] | Each customer needs code changes |

**Enterprise readiness score: 2 / 10.** It is suitable today as a **single-company internal HRMS**, not as a commercial multi-tenant product.

---

## Consolidated Additions to the Launch-Blocker List

The main report's blockers (S1–S6, H1, H4, backups) still apply. Add the following:

| # | Blocker | Fix (low-risk, no rewrite) | Effort |
|---|---|---|---|
| B-10 | Hard delete destroys history (A2-1) | Make `DELETE /employees/:id` a **soft delete** (`status='exited'`, `deleted_at`, deactivate the user). Keep the hard-delete code path unreachable for now. | 0.5 d |
| B-11 | Leave approval probably unreachable (A1-3, A2-9) | **First run a 10-minute test** (apply leave as an employee, then check `/approvals` as admin). If confirmed: set `employee_id` in `applyLeave` (resolve from `user_id`) and select `leave_type_id → name` in the approvals query. | 0.5 d |
| B-12 | Payroll duplicate runs and terminated staff paid (A2-3c, e) | Unique `(tenant_id, month, year)` on runs (or reject if one exists); filter profiles to active employees not past `exit_date` | 0.5 d |
| B-13 | Approval state guards (A2-2) | Add `AND status='pending'` to every approval UPDATE; return 409 when 0 rows are affected | 0.5 d |
| B-14 | Attendance regularization auto-approved (A2-4) | Insert as `status='pending_regularization'` and route through approvals | 1 d |
| B-15 | Audit only covers auth (A2-14) | Publish `AUDIT_LOG_REQUESTED` from employee CRUD, role/permission changes, payroll process, and approval actions (the event plumbing already exists) | 1 d |
| B-16 | Fake security controls (MFA, password policy) | Hide the toggles until they are enforced | 1 h |
| B-17 | Dead approval and export endpoints (A1-1, A1-2, A1-7) | Point the UI at the existing routes, or hide the controls | 0.5 d |

**Not launch-blocking for a single-company pilot, but required before you charge customers:** payroll engine accuracy (LOP, proration, slab TDS), job history table, exit/F&F workflow, tenant provisioning and strict isolation, SSO/MFA, export, and a retention policy.

---

## Comments on the Proposed 5-Phase Plan

The plan is sound and consistent with both reports. Three adjustments are recommended:

1. **Move data-integrity blockers B-10 to B-15 into Phase 1**, alongside S1–S6. They are as cheap as the security fixes. Unlike security bugs, they **destroy or corrupt data irreversibly**, so every day in use adds cleanup cost.
2. **Bring backups, a test restore and Sentry forward to the start of Phase 1**, not Phase 3. Every Phase 1 fix touches auth, approvals and payroll. You want a restore point and error visibility *before* changing them.
3. **Treat payroll as its own track.** Phases 1–3 make payroll *safe* (authorised, idempotent, auditable). Making it *correct* (attendance-driven LOP, proration, slab-based TDS, statutory outputs) is a separate, domain-heavy effort. Until it is done, run EMS payroll in parallel with the current payroll process for at least 2 cycles, and reconcile.

**Revised outlook.** After main-report Phase 1 plus B-10 to B-17, the security and data-safety posture supports a **single-company production pilot (about 6/10)**. Reaching the projected **6–7/10 "Production-Ready SMB HRMS"** also needs operations (Audit 4) and payroll correctness. Commercial multi-tenant sale remains a Phase 4 outcome (tenant provisioning, isolation, SSO/MFA, export, retention).

### Updated scorecard (0–10)

| Area | Main report | After supplementary audits |
|---|---|---|
| Product features | 7 | 6.5 (lifecycle gaps, dead controls) |
| Architecture | 6.5 | 6.5 |
| UX | 7 | **5.5** (no mobile nav, missing states, accessibility, fake controls) |
| Security | 2 | 2 |
| Data integrity | n/a | **2.5** |
| Scalability | 4 | 4 |
| Operational readiness | 3 | **2.5** |
| Enterprise readiness | 3 | **2** |
| Production readiness | 3 | **2.5** |

### Items to verify at runtime (quick)

1. A1-3 / A1-4: apply leave as an employee whose manager was set in the current UI, then check `/approvals` as that manager and as admin.
2. Whether any DB trigger fills `leave_requests.employee_id` (run `\d+ leave_requests` in Supabase).
3. Supabase backup tier and PITR status.
4. The DB session time zone (`SHOW timezone;`).
5. Mobile behaviour of Attendance and Timesheets on a 375px viewport.
