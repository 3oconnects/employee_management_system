# D-8 — Widget feed decomposition (design only)

Status: **DESIGN ONLY. No code, route or authorization change.** Hard gate for Workspace Foundation (owner decision D-8), and the first Foundation task.
Source: `0b9ce1a`. Related: `WORKSPACE_FOUNDATION_PHASE0.md` (§2.2, D-8), `PERMISSION_MATRIX.md`.

## 0. The boundary rule
```
Current aggregate endpoint -> field classification -> permission ownership -> new feed boundaries
 -> /api/v1/dashboard/* -> compatibility strategy -> authorization tests -> mutation tests -> data-leak regression tests
```
**Hiding a widget is not a security control.** A widget MUST NOT obtain sensitive data from a broader endpoint merely because the widget itself is hidden for the user: the server must stop returning data the caller may not see. `requires` (widget) = the permission enforced on `dataSource` (feed), and the feed returns only that domain.

## 1. The problem, in the code

`AnalyticsService.getAdminDashboard(tenantId)` builds **one** object from 19 queries and returns it whole. Four endpoints expose it (or most of it), all guarded only by `reports:view`:

| Endpoint | Guard | Returns |
|---|---|---|
| `GET /reports/admin`, `/reports/dashboard` | `reports:view` | the whole `AdminDashboardData` |
| `GET /reports/summary`, `/reports/departments` | `reports:view` | re-shaped subset: `avgSalary`, `payroll.monthlyPayout`, `payrollTrend`, `salaryDistribution`, `genderDistribution`, `todayAttendanceLog`, … plus a hard-coded `recentReports` list (**fabricated file names and sizes**, not real reports) |
| `GET /reports/analytics` | `reports:view` | attendance / leave / timesheet utilisation percentages |
| `GET /reports/dashboard/manager`, `/employee` | own id, or `employees:view` (HF-5/6) | team and personal data |

**Who passes `reports:view` today (CONFIRMED from the seed files):** `hr` **and `manager`** (and `admin`). So a seeded Manager can read, in one call, company-wide payroll cost, average salary, the salary distribution (CTC totals per level), the payroll trend, gender distribution, a named list of who checked in today, and recent audit-log entries with user names. Production role contents are **UNCONFIRMED — OW-4 REQUIRED**.

This is the reason a widget's `requires` cannot be honest today: the permission that unlocks the endpoint (`reports:view`) is weaker than the permission the data deserves.

## 2. Field-by-field classification

Every field of `AdminDashboardData` (and of the summary re-shape), with the permission its content should require.

| Domain | Fields | Content class | Required permission (anyOf) | Status of that permission |
|---|---|---|---|---|
| **Workforce** | `totalEmployees, activeEmployees, inactiveEmployees, newHiresThisMonth, exitedThisMonth, attritionRate, headcountGrowth, departmentDistribution, employmentTypeBreakdown, monthlyHiringTrend` | HR aggregates | `employees:view` | exists (A) |
| Workforce — demographics | `genderDistribution` | protected attribute | `employees:view` **plus** a dedicated sensitivity flag (decision F-2) | `employees:view_demographics` MISSING |
| **Payroll (compensation)** | `totalPayrollCost, avgSalary, payrollTrend, salaryDistribution` (+ summary `avgSalary`, `payroll.monthlyPayout`) | pay | `payroll:view` | exists (A); granted to `hr`, not to `manager` |
| **Approvals** | `pendingLeaves, pendingTimesheets` (counts) | workload | per item: `leave:approve` for leaves, `timesheet:approve` for timesheets (the feed returns only the counts the caller may act on) | exists |
| **Attendance (org)** | `todayPresent, onLeaveToday, avgAttendanceRate`, summary `attendanceTrend` | operational | `attendance:view` | exists (A); unscoped (no team variant yet) |
| Attendance — people list | `todayAttendanceLog` (names, department, check-in time, location) | personal | `attendance:view` (people-level) | exists |
| **Audit** | `recentActivities` (audit rows with user names) | audit trail | `audit:view` | exists (A); granted to no seeded non-bypass role |
| **Organization** | `orgMetrics` (units, locations) | structure | `organization:view` | **MISSING in A** (B has `organization:read`) |
| **Calendar** | `upcomingHolidays` | public to the tenant | `dashboard:view` | exists (A) |
| Placeholder | summary `recentReports` | fabricated | remove | — |

Manager feed (`getManagerDashboard`): team members, team attendance, pending leaves, late check-ins, timesheet counts → today gated by "own id or `employees:view`". Target: `employees:view_team`, `attendance:view_team`, `leave:approve`, `timesheet:approve` (team-scope permissions are MISSING; until they exist, keep the HF-5/6 rule: own id, or `employees:view` inside the tenant).
Employee feed (`getEmployeeDashboard`): own attendance, monthly summary, leave balances, holidays, payslip, notifications, weekly hours → own scope (`attendance:view_own`, `leave:view_own`, `payroll:view_own`; the first two MISSING; today: identity check).

## 3. Target feeds

Neutral name `/api/v1/dashboard/<feed>` (the `reports` module stays the Reports screens). One feed = one domain = one guard = its own queries. No feed ever contains a field from another domain.

| Feed | Guard (exact permission string, no legacy expansion) | Widgets it serves |
|---|---|---|
| `GET /dashboard/workforce` | `employees:view` | kpi_workforce, workforce_by_department, hiring_vs_attrition, org_new_hires |
| `GET /dashboard/workforce/demographics` | `employees:view` + `employees:view_demographics` (F-2) | gender / diversity widgets |
| `GET /dashboard/payroll` | `payroll:view` | kpi_monthly_payroll, payroll_summary, salary distribution |
| `GET /dashboard/approvals` | anyOf `leave:approve`, `timesheet:approve`, `claims:approve`; returns only the counts the caller holds | kpi_action_required, approval widgets |
| `GET /dashboard/attendance` | today `attendance:view` (org-wide). Target after the canonical catalogue: `attendance:view_team` or the org-wide permission; own data stays on `me/attendance` with `attendance:view_own`. Names come from OW-4, not from this document | operational_pulse, todays_pulse, attendance trend |
| `GET /dashboard/attendance/log` | `attendance:view` | named check-in list |
| `GET /dashboard/audit` | `audit:view` | recent_activity |
| `GET /dashboard/organization` | `organization:view` | org units / locations |
| `GET /dashboard/calendar` | `dashboard:view` | upcoming_holidays, org_calendar (**fixes the missing `/reports/holidays` route**) |
| `GET /dashboard/me/{attendance,leave,hours,payslip}` | identity (own) → `*:view_own` later | my_* widgets |
| `GET /dashboard/team/{members,leaves,timesheets,attendance}` | `employees:view_team` / `leave:approve` / `timesheet:approve` / `attendance:view_team` (until those exist: own report-to chain or `employees:view`) | manager widgets |
| `GET /dashboard/policies` | `dashboard:view` (read-only subset of `app_config`) | policies widget (**fixes the 403 employees get today**) |

Rules for every feed:
1. Tenant and user come only from the JWT (HF-6).
2. Response is a fixed, documented shape (zod), computed by its own queries, never by slicing a larger payload.
3. Guard string equals the widget registry's `requires` for each widget it serves (checked by a test, §6).
4. Cheap to cache per tenant + permission for a short TTL; invalidation not required for dashboards.

## 4. Compatibility and cut-over

1. Add the feeds beside the old endpoints (additive, no client change).
2. Make the old aggregate endpoints **field-filtered**: same shape, but a group the caller lacks the permission for is omitted and listed in `withheld: ["payroll","audit",…]`. This alone closes the leak for current clients, which must be updated to tolerate missing groups (the admin dashboard renders cards from these fields).
3. Switch the client widgets to the feeds one group at a time (Foundation's widget registry names the feed in `dataSource`).
4. Remove the aggregate endpoints once nothing calls them; `reports:view` then means "may open the Reports screens" only.
5. Delete the fabricated `recentReports` list in step 2 (or replace with real report definitions).

## 5. Interim hardening (recommended, separate small item — needs the owner's go)

Step 2 can ship **before** Foundation and before HF-9A, because feeds use exact-string `authorize([...])`, which behaves identically under the current bypass. Proposed branch `fix/HF-12A-dashboard-field-filter` (the dashboard half of HF-12): strip compensation, demographics and audit fields from `/reports/{admin,dashboard,summary,departments}` unless the caller holds `payroll:view` / `audit:view` / `employees:view`, with deny-path tests. It removes today's exposure without waiting for the rest of the workspace work. Not started.

## 6. Verification plan (for when this is built)
Three layers, named so none is skipped:
- **Authorization tests:** the per-feed deny matrix below.
- **Mutation tests (sabotage):** remove each feed's guard, move a field into the wrong feed, widen a widget's `requires`, restore a field to the legacy aggregate; every one must fail a test.
- **Data-leak regression tests:** a Manager holding only `reports:view` calling every legacy aggregate endpoint must receive no payroll, demographic or audit field (and `withheld` lists them); a static check fails the build if any response schema mixes domains.

Detail:

- **Per-feed deny matrix:** for each feed, an actor with every *other* permission but not this one → 403; with it → 200 and only that domain's fields; another tenant's data never appears.
- **No shared payloads (static check):** a test asserts no response schema mixes domains (field→domain table in §2 is the source).
- **Registry ↔ guard parity:** for every widget in the registry, the guard on its `dataSource` equals its `requires`; a mismatch fails CI.
- **Sabotage:** drop each guard, mix a field into the wrong feed, widen a `requires`; all must fail tests.
- **Old-endpoint filtering:** a Manager with `reports:view` only receives no compensation/audit fields and sees `withheld`.

## 7. Dependencies and decisions

| Item | Notes |
|---|---|
| Independent of HF-9A/9B | Feeds use exact permission strings, so they work with the current guard. They do *not* depend on removing the bypass, but admin-bypass users still see everything (expected until HF-9A). |
| `organization:view` | missing; needs seeding (A/B vocabulary decision, OW-4) |
| Team / own scope permissions | missing (P-1); feeds keep identity checks until they exist |
| **F-1** one feed per domain, or finer? | proposed: per domain as in §3; split further only if a group needs a different permission |
| **F-2** gender / diversity data | needs its own permission, or stays under `employees:view` (owner decision) |
| **F-3** where the field-filter (§5) is allowed to run before the feeds exist | yes (recommended), as HF-12A |
| Not in scope here | payroll payslip/CTC/bank fields on employee payloads (HF-12), documents/performance IDOR (HF-11) |
