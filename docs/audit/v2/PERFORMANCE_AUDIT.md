# Performance Audit (v2 delta)

Baseline: `docs/audit/_raw/track-b-frontend-ux.md` (Phase 8a) and `track-d-security-perf-infra.md` (Phase 8) at commit 06dc08f. Current HEAD is 42aaace plus 24 modified and several untracked files. Every baseline claim below was re-checked against the current working tree.

Evidence tags: **Confirmed** (file:line seen), **Inferred**, **Assumption**, **Unknown** ("Not enough evidence found in repository."). No code was run, no build was executed, no database was queried, so all runtime numbers are static estimates unless a measured file size is given.

## 1. Summary

| # | Finding | Severity | Status vs baseline |
|---|---|---|---|
| P1 | Three DB pools per process (23 connections max per instance) | High on Vercel | Unchanged |
| P2 | Admin dashboard issues many parallel queries against a 10-connection pool | Medium | Unchanged, count re-verified |
| P3 | PDF generation and SMTP awaited inside the employee-create DB transaction | High | Unchanged |
| P4 | Payroll run does 2 sequential INSERTs per employee inside one transaction | Medium | Unchanged |
| P5 | Bulk upload inserts rows one at a time, each in its own transaction plus email | Medium | Unchanged |
| P6 | Employee list query: no `limit` cap, wide `SELECT e.*`, base64 avatars in list rows | High | Unchanged, `e.*` plus avatar confirmed |
| P7 | Five dashboard widgets each fetch `/employees?limit=500` | High | Unchanged |
| P8 | Timers in page roots re-render whole pages once a second | Medium | Unchanged |
| P9 | Zero `React.memo`, 22 `useMemo`, 24 `useCallback`; 19 whole-store `useAuthStore()` subscriptions | Medium | Slightly changed (memo counts rose from 18/14) |
| P10 | Polling ignores tab visibility (notifications 60 s, team status 30 s) | Low-Medium | Unchanged |
| P11 | `client/dist` is stale (built 2026-10-01, before the Nexus brand and Sentry work) | Info | New |
| P12 | Render-blocking Google Fonts `@import` inside the main CSS | Low-Medium | New |
| P13 | Seeding runs on every server start (N+1 upserts) | Medium on Vercel | Unchanged |
| P14 | No caching layer, no compression middleware, no `Cache-Control` | Medium | Unchanged, re-verified |
| P15 | SSE: token in query string, no reconnect, in-memory client list | Medium | Unchanged |
| P16 | Approvals list: new heavy UNION ALL query plus a second per-request query (uncommitted code) | Medium | New (uncommitted) |
| P17 | Login and join lookups use `LOWER(email)` against a plain `email` index | Medium | Unchanged (live schema Unknown) |

## 2. Bundle size and code splitting

### 2.1 Configuration (Confirmed)
- `client/vite.config.ts:1-27` contains only the React plugin, the `@` alias and dev-server settings. It has no `build.rollupOptions.output.manualChunks`, no `build.chunkSizeWarningLimit`, no visualizer plugin and no compression plugin.
- Route-level splitting is in place: 14 `React.lazy` pages (`client/src/App.tsx:12-27`), each wrapped in `Suspense` (`App.tsx:39-43`) plus a second `Suspense` in the layout (`MainLayout.tsx:26-28`). `LoginPage` and `MainLayout` are eager (`App.tsx:4-6`).
- `EmployeeTable.tsx:11` imports `lodash/debounce` (per-method import), not the whole of lodash. It is the only lodash import (grep). The `lodash` dependency can be replaced by a 10-line debounce.

### 2.2 Measured asset sizes (`client/dist/assets`, 63 files, 1,257,714 bytes total) (Confirmed, measured with `wc -c` and `gzip -c`)

| Asset | Raw | Gzip |
|---|---|---|
| `index-CmzRkr3F.js` (entry: React, router, axios, zustand, layout, ui, login) | 287,863 B | 90,039 B |
| `index-Dhmur6yh.css` (Tailwind output) | 111,544 B | 16,970 B |
| `Dashboard-BbI_BQtm.js` | 113,029 B | 24,206 B |
| `ApplyLeave-DWQo0esa.js` (largest page chunk) | 101,875 B | 27,083 B |
| `Settings-Dc3e5dym.js` | 95,974 B | 19,327 B |
| `Profile-HUJ3Cwdz.js` | 93,249 B | 22,314 B |
| `GeneratePayroll-V0IOLr3y.js` | 85,205 B | 16,866 B |
| `OrganizationPage-B0kqHZQ6.js` | 54,685 B | not measured |
| `BulkUploadModal-kxdg9cTo.js` | 48,495 B | not measured |
| ~40 lucide icon chunks | 288-979 B each | n/a |

First-load cost for an authenticated user is about 90 KB gzip entry JS plus 17 KB gzip CSS plus one page chunk (20-27 KB gzip), roughly 130-135 KB gzip before data. That is acceptable for an internal HR tool. It is not an urgent problem.

### 2.3 Caveats
- **Stale build (P11, Confirmed):** `dist/index.html` has the old title "Employee Management System | Pro" and the old favicon `/vite.svg`, whereas `client/index.html:4-12` now has the Nexus title and `/brand/nexus-icon.svg`. The entry chunk contains zero occurrences of the string "Sentry", although `main.tsx:5-51` now imports `@sentry/react`. So the numbers above predate Sentry. `@sentry/react` v11 adds a sizeable amount to the eager entry chunk; the amount is **Unknown** until `npm run build` is re-run. Recommendation: rebuild, diff entry-chunk size, and if Sentry is more than about 25 KB gzip, load it with dynamic `import()` only when `VITE_SENTRY_DSN` is set (it is already gated at runtime, `main.tsx:15-16`, but a static import is bundled regardless).
- Several page chunks are large (ApplyLeave 101 KB for a leave page, Dashboard 113 KB). Hand-written monolith components (`Timesheets.tsx` 1,316 lines, `EmployeeTable.tsx` 909 lines, `Dashboard.tsx` 422 lines, `Profile.tsx` 657 lines) explain the sizes. `BulkUploadModal`, `AddEmployeeModal` (762 lines per the baseline), and Settings tabs are not lazily loaded inside their parents [Inferred from the separate `BulkUploadModal` chunk appearing as a shared chunk, so it is split at least once, but `AddEmployeeModal` and `EditEmployeeModal` are imported statically by the 909-line `EmployeeTable`].
- No `manualChunks`, so the React, router and axios vendor code is inside the entry chunk and invalidates on every app deploy. Splitting `react`/`react-dom`/`react-router-dom` into a `vendor` chunk gives long-term cache hits for roughly 45-55% of the entry bytes [Assumption: typical React 18 plus router 6 gzip footprint, not measured here].
- **Fonts (P12, Confirmed):** `client/src/index.css:1` is `@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@100..900&family=Inter:wght@100..900&family=JetBrains+Mono:...')`. An `@import` in CSS is discovered only after `index-*.css` downloads, adding a serial round trip to a third-party origin before text can render with the right font. Three full-weight-axis variable families are requested. Recommendation: self-host with `@fontsource-variable/*` or use `<link rel="preconnect">` plus `<link rel="stylesheet">` in `index.html`, and limit weights actually used (the code uses `font-black`, 753 occurrences, and `font-bold`; check which axes are needed).
- No images in `public/` beyond a 380-byte SVG (`client/public/brand/nexus-icon.svg`), so static media is not a concern. Avatars are the media issue (see 4.3).

### 2.4 Recommendations (bundle)
1. Rebuild and record a baseline: `npm run build` and attach `rollup-plugin-visualizer` output. Target: entry chunk below 80 KB gzip, largest page chunk below 20 KB gzip.
2. Add `manualChunks` for `react`, `react-dom`, `react-router-dom` and `@sentry/react`.
3. Lazy-load rarely-opened modals (AddEmployee, EditEmployee, BulkUpload, NewRequest) with `React.lazy`.
4. Self-host fonts and remove the CSS `@import`.
5. Enable Brotli or gzip at the host. Static asset caching headers on Vercel are automatic for hashed files; `render.yaml` static site headers are **Unknown** (the file defines no `headers`, per Track D).

## 3. Frontend runtime: renders, timers, listeners, leaks

### 3.1 Re-render hotspots
- **Dashboard page root (Confirmed):** `Dashboard.tsx:124-128` sets `setElapsed` every 1000 ms while `att.status === 'IN'`. State lives in the page component, so the entire 422-line page and all child widgets re-render every second while the user is clocked in, which is the normal state during the working day. `LiveClock` (`Dashboard.tsx:40`) correctly isolates its own timer. Fix: move elapsed into a leaf `<ElapsedTimer checkIn=...>` (same pattern as `LiveClock`). Expected effect: from about 3,600 root renders per hour to 0, and each child tree stops being re-evaluated once a second.
- **Attendance page root (Confirmed):** `Attendance.tsx:331-338` same pattern with a 1 s interval in the 509-line page root, and `liveWeeklyDays` (`:341`) is memoized on `attendance` but `elapsed` changes still re-render the page.
- **No `React.memo` anywhere (Confirmed, 0 matches).** `useMemo` 22, `useCallback` 24 (increase from baseline 18/14). List item components (`EmployeeCard`, `TreeNode`, approval cards) re-render with their parent on every keystroke and every SSE status update.
- **Whole-store subscriptions (Confirmed):** 19 sites use `= useAuthStore()` with no selector (for example `Sidebar.tsx:82`, `Topbar.tsx:38`, `Dashboard.tsx:44`, `ProtectedRoute.tsx:11`); about 7 sites use a selector function (for example `ApprovalSidebar.tsx:40`, `NewRequestModal.tsx:23`, `useSessionSync.ts:13`). These components re-render on any store change: `updateUser` during `syncSession` (`sessionSync.ts:44-60,72`) re-renders every subscriber on every focus sync that finds a harmless name/avatar change, not only on access changes. Fix: selectors (`useAuthStore(s => s.user?.role)`) or `useShallow`.
- **`useAuthStore` selector bug risk (Inferred):** `hasAnyRole`/`hasPermission` are functions on the store, so components that call them in render do not re-render on a role change unless they also subscribe to `user` (the sidebar does, via `user`). Works today, fragile.
- **Employee list debounce (Confirmed defect):** `EmployeeTable.tsx:104` is `useCallback(debounce(fn, 400), [])`. The closure captures the first render's `fetchEmp`, whose `view` is the initial `'card'` and whose filters are stale. Searching while in tree view fetches 16 rows with page=1 instead of the tree set [Inferred from `fetchEmp(v,1)` using captured `view`; `fetchEmp` takes an optional `v` argument that the debounced call does not pass].
- **Double fetch on mount (Confirmed):** `EmployeeTable.tsx:105` (`[page, refreshKey]`) and `:108-114` (`[view]`) both run on first mount, so `/employees` is requested twice immediately (two network calls, one result discarded).
- **Client-side filtering of a single page (Confirmed):** `EmployeeTable.tsx:272` builds the department list from the current 16 rows. Counts shown for Active/Onboarding come from the page (baseline finding still holds). This is a correctness and a performance problem, because the right fix is server-side filtering, which the repository partially supports (`employees.repository.ts:5` destructures `status`, `departmentId`, `teamId`).

### 3.2 Timers, listeners and subscriptions (leak review)

| Site | Cleanup? | Verdict |
|---|---|---|
| `hooks/useSessionSync.ts:30-36` `focus` and `visibilitychange` listeners | Yes, both removed in cleanup; effect keyed on `isAuthenticated` | No leak. Throttled: module-level `inflight` promise and 60 s minimum interval (`services/sessionSync.ts:21-28`), so focus plus visibilitychange firing together causes 1 request, not 2. Confirmed. |
| `lastNoticeAt` module variable (`useSessionSync.ts:9`) | n/a | Intentional dedupe of the toast for StrictMode double-mount. Fine. |
| `Topbar.tsx:87` notifications `setInterval(60000)` | Yes (`:88`) | No leak; polls while the tab is hidden (P10). 60 requests/hour/user, each running 2 SQL queries (see `notifications/core/core.repository.ts:5-20`). |
| `Topbar.tsx:97,111` document `mousedown`/`keydown` | Yes | OK |
| `TeamStatusWidget.tsx:30` `setInterval(30000)` | Yes | No leak; polls while the tab is hidden. 120 requests/hour/user. |
| `Dashboard.tsx:127` and `Attendance.tsx:336` 1 s intervals | Yes | OK, but see re-render cost above. |
| `ui/index.tsx:411` ToastCard 50 ms interval | Yes (also self-clears at 0%) | 20 state updates per second per visible toast; use a CSS animation on `width` instead. Low. |
| `EmployeeTable.tsx:126` `EventSource` | Closed in cleanup (`:147`) | No leak, but on `onerror` it closes permanently (`:142-145`) with no reconnect, so live status silently stops after any network blip. Token is in the URL query string (`?token=`), which appears in server and proxy logs (also noted in `main.tsx:10-12` comment). |
| `ManagerPicker.tsx:25`, `ProfileHeader.tsx:112`, `Dashboard.tsx:76` `mousedown` | Dashboard and ProfileHeader remove them. `ManagerPicker.tsx:25` removal not re-checked in this pass. | Unknown for ManagerPicker (not enough evidence; file was modified uncommitted). |
| `ForgotPasswordModal.tsx:58-77` poll (3.5 s) | Per baseline | Not re-verified this pass; baseline says no visibility pause. |

Net: the useSessionSync work (uncommitted) is clean, with listener cleanup, in-flight coalescing, a 60 s throttle and a single `/auth/me` call per sync. One refinement: `run(true)` at start plus the first visibility event could both fire; the 60 s window and `inflight` guard make that safe (Confirmed `sessionSync.ts:23-24`).

### 3.3 Request patterns (client)
- **No request cache or deduplication (Confirmed):** `package.json` has no React Query or SWR. Only `useWorkspace.ts:16-31` has a hand-rolled per-tenant promise cache (good pattern, only one in the codebase).
- **Five widgets, same query (Confirmed):** `BirthdayWidget.tsx:14`, `DeptDirectoryWidget.tsx:16`, `DeptTreeWidget.tsx:120`, `EmployeeTreeWidget.tsx:67`, `NewHiresWidget.tsx:14` each call `GET /employees?limit=500`. With the `SELECT e.*` plus avatar base64 payload (4.3), opening the Dashboard org view can move several MB. Fix: one shared fetch (hook with a module-level promise like `useWorkspace`), a slim server projection (id, name, department, birth date, join date, avatar thumbnail URL), and a hard server cap.
- **Approvals page (Confirmed, uncommitted):** `Approvals.tsx:39-40` fires two requests (`pending` and `completed`) in parallel for the "mine" tab and filters client-side; each of the two server calls runs the full UNION ALL query plus a manager lookup (6 requests worth of SQL per tab open, see 4.2). Fix: `?scope=mine` server-side.
- **Payroll tabs (baseline, not re-verified this pass):** each tab unmounts on switch and refetches (`GeneratePayroll.tsx`, `FinancialAnalysis.tsx:37-40`); `GeneratePayroll.tsx` and `EmployeePayroll.tsx` are modified uncommitted.

### 3.4 Large lists
No virtualization. Lists are paginated at 16 (employees) but tree view requests `limit: 1000` (`EmployeeTable.tsx:96`), audit log requests `limit=500` (`AuditLogPage.tsx:27`), and widgets request 500. Rendering 1,000 tree nodes fully expanded is [Inferred] to cost a few hundred ms on mid-range hardware. Use windowing (`@tanstack/react-virtual`) or lazy child expansion (the `TreeNode` already renders children only when open, `EmployeeTable.tsx:74`, which mitigates this).

## 4. Backend and database

### 4.1 Connection pools (P1, Confirmed)
Three `pg` pools: `server/src/config/db.ts:24` (`pool`, max 10, line 27), `config/db.ts:37` (`directPool`, max 3, line 40), `database/client.ts:16` (`pool`, max 10, line 19). Up to 23 connections per process. `db/connection.ts:1-6` re-exports `config/db` pools, so it adds none. On Vercel each lambda instance has its own set (baseline claim [Inferred]). Recommendation: one shared pool, `max` 5-10 on serverless, route traffic through the Supabase transaction pooler (port 6543), close all pools on shutdown (baseline: only one closed).

### 4.2 Heavy or N+1 query patterns
- **Admin dashboard fan-out (P2, Confirmed):** `services/analyticsService.ts` (703 lines) has 33 `safeQuery`/`Promise.all` references. The request issues its queries concurrently against a pool with max 10, so concurrent dashboard loads queue on the pool. `safeQuery` catches and hides failures (`analyticsService.ts:~56-60`), so slow or failing queries return fallbacks silently. Recommendation: per-tenant in-memory TTL cache (30-60 s) for the admin dashboard payload; materialize rollups for trends.
- **Payroll processing (P4, Confirmed):** `payroll.service.ts:203-246`. Loops `for (const p of profiles)` and awaits `insertPayrollEntry` and `upsertPayrollHistory` per employee, sequentially, inside one transaction. Cost is 2 round trips per employee: 1,000 employees means about 2,000 sequential queries, which at 2-5 ms each is 4-10 s [Assumption on latency; Supabase cross-region latency can be 20-50 ms, which would be 40-100 s]. Fix: compute rows in memory, then one multi-row `INSERT ... SELECT unnest(...)` for both tables.
- **Employee create (P3, Confirmed):** `employees.service.ts:49` opens `withTransaction`; `:140` awaits `sendCandidateWelcomeAndOffer` (PDF + SMTP) before the transaction completes. A slow SMTP server holds a pooled connection and row locks. Fix: collect the email payload inside the transaction and send after commit (or enqueue).
- **Bulk upload (P5, Confirmed):** `employees.service.ts:430-445` comment states each row runs `createEmployee` in its own transaction and sends email; 200 rows means 200 sequential transactions, 200 PDFs, 200 SMTP sends in one HTTP request. Vercel function timeouts (10 s default on Hobby, longer on Pro, **Unknown** for this deployment, `vercel.json` sets no `maxDuration` per Track D) make this likely to time out. Fix: queue.
- **Approvals (P16, Confirmed uncommitted):** `approvals.repository.ts:56-149` builds a CTE of four `UNION ALL` branches over `approvals`, leave, onboarding and others, then `LEFT JOIN employees subj`, filters in the outer query (`filterClause` applied after `all_pending`, so every branch is computed for the tenant and only then filtered by viewer), and orders by `department, created_at`. Index usage is limited because filtering on `ap.requested_by`, `LOWER(ap.requested_by)`, `subj.reporting_manager_id` occurs after the union. For managers and employees, the viewer filter could be pushed down into each branch. The service then makes a second query `getReportingManagerUserIds` (`approvals.service.ts:34`, repository `:13-26`) using `LOWER(mu.email) = LOWER(me.email)` in a join condition (not indexable). Result: 3 queries per list call (resolve employee id, union, manager lookup), 4 per "mine" tab load on the client counting both status calls. There is no `LIMIT` on the approvals query (`approvals.repository.ts` has no LIMIT). Recommendation: push the viewer filter into each branch, add `LIMIT/OFFSET`, and cache `resolveEmployeeIdForUser`.
- **Employee list (P6, Confirmed):** `employees.repository.ts:5-30`. `SELECT e.*` plus joins to departments, users (twice), roles and attendance, with the join `LEFT JOIN users u ON e.email = u.email AND (e.tenant_id = u.tenant_id OR u.tenant_id='tenant_default' OR u.tenant_id='default')`. The `OR` inside the join condition and the `a.check_in::date = CURRENT_DATE` cast defeat index use. Search uses four `ILIKE '%term%'` conditions (`:34`), which cannot use a b-tree index; use `pg_trgm` GIN indexes. The controller applies `Number(limit)` with no cap (`employees.controller.ts:11-17`, Confirmed), so `?limit=100000` returns everything. `rbac.service.ts:34` is the only place that clamps limit in the codebase (grep for `Math.min(...limit)` found just that one). Fix: clamp to 100 in the controller, replace `e.*` with explicit columns, serve avatars via URL.
- **Notifications (Confirmed):** two queries per poll (`core.repository.ts:5-20`), `SELECT *`. At 60 polls/hour/user and 500 concurrent users that is 60,000 requests/hour, 120,000 queries/hour. Fix: a lightweight `GET /notifications/unread-count`, pause on hidden tab, or push via SSE.
- **Login/lookup indexes (P17, Confirmed query text, live schema Unknown):** baseline Track D 8.4 finding `LOWER(u.email)=LOWER($1) OR LOWER(e.personal_email)=LOWER($1)`. New uncommitted code adds more `LOWER(email)` comparisons (`approvals.repository.ts:19,248`, `employees.repository.ts:293,314`). 33 `CREATE INDEX` statements exist in the repo (grep across `server/src` for `CREATE INDEX`); none was found creating a `lower(email)` expression index (grep for `lower(` in `db/schema.ts` and `db/migration_v3.ts` shows only `CASE WHEN LOWER(name) LIKE` and a department join, no index). Fix: `CREATE INDEX ON users (lower(email))` and `employees (lower(email))`, and normalise email to lowercase on write so plain equality works.
- **Role change and welcome email in request path:** baseline `user-assignments.service.ts:47,68,110` (SMTP awaited in the request). Not re-verified this pass.

### 4.3 Payload size
- Avatars are stored as base64 data URIs in `employees.avatar_url`/`users.avatar_url` and returned inline in list payloads (`employees.repository.ts:8`, `COALESCE(e.avatar_url, u.avatar_url)`; client write path per baseline `Profile.tsx:238-256`). Body limit remains 50 MB (`app.ts:86-87`, Confirmed). A 100 KB compressed avatar times 500 rows is about 50 MB of list payload in the worst case [Assumption on avatar size; baseline marks the per-list size Inferred]. Every one of the five dashboard widgets fetching 500 rows multiplies it. Fix: store in object storage, serve a thumbnail URL, drop JSON limit to 1 MB (except bulk upload).
- **No compression (Confirmed):** `server/package.json` has no `compression` dependency and `app.ts` has no compression middleware (grep). Vercel compresses at the edge; Render web service does not by default [Assumption]. JSON list payloads typically compress 5-10x.
- **No HTTP caching (Confirmed):** no `Cache-Control` or `ETag` strategy on API routes (Track D 8.5 re-verified: no hits).

### 4.4 Blocking operations and startup
- **Seed on every start (P13, Confirmed):** `index.ts:78` awaits `seedPermissionsAndSuperAdmin()` on each start, after `SELECT NOW()`. On Vercel this repeats per cold start. Baseline (`seedPermissions.ts:76-135`) shows per-permission upserts (N+1). Fix: guard behind an env flag or a `seed_version` row; batch with a single `INSERT ... ON CONFLICT` using `unnest`.
- **CPU-bound work on the event loop:** bcrypt hashing and PDF generation run in-process (Track D 8.2, not re-verified).
- **Rate limiter store is in-memory** (`app.ts:46-61`), per-instance. Not a latency issue at present.

### 4.5 Realtime (SSE) (P15, Confirmed)
`modules/realtime/connections/connections.service.ts` keeps clients in a static array and writes `: keepalive` every 30 s per client (`:20-22`), cleans up on `close` (`:25-28`, no leak). Constraints: single-instance only, the stream shares the `apiLimiter` budget, and the browser client sends the JWT in the URL. Only `EmployeeTable` subscribes (`EmployeeTable.tsx:126`), so connection count equals the number of people on the Employees page, which is bounded. Because it permanently closes on first error, resilience is the problem, not scale.

## 5. Caching opportunities (ranked by effort to payoff)
1. Shared employee-directory fetch on the dashboard: removes 4 of 5 requests of up to 500 rows (about 80% of dashboard directory traffic). Effort: low.
2. 30-60 s server TTL cache for `getAdminDashboard(tenantId)`: collapses repeated 20+ query bursts. Effort: low.
3. Cache `resolveEmployeeIdForUser(tenantId, userId, email)` (called per approvals request, `approvals.service.ts:29`) with a short TTL. Effort: low.
4. `ETag`/`Cache-Control: private, max-age=30` on `GET /settings/config`, `/workspace` (client already caches `/workspace`, `useWorkspace.ts:16-31`), `/reports/holidays`, `/leave/types`. Effort: low.
5. Introduce TanStack Query for client data with `staleTime` (30-60 s) and automatic dedupe, which also fixes the payroll tab refetch and the approvals double call. Effort: medium.
6. JWT embeds permissions (acts as a permission cache, Track D 8.5). `syncSession` (60 s) now bounds staleness on the client. Server-side revocation lag is bounded by the 15-minute token life [Inferred from Track D].

## 6. Measurable recommendations and targets

| Action | Evidence | Target / expected effect |
|---|---|---|
| Move 1 s timers into leaf components (Dashboard, Attendance) | `Dashboard.tsx:124-128`, `Attendance.tsx:331-338` | Page-root renders while clocked in: 3,600/h to near 0 |
| One shared `/employees` call for widgets plus a slim projection | five call sites listed in 3.3 | Dashboard org-view requests: 5 to 1 (-80%) |
| Cap `limit` to 100 server-side | `employees.controller.ts:11-17` | Bounded response size |
| Poll only when visible; unread-count endpoint | `Topbar.tsx:87`, `TeamStatusWidget.tsx:30` | Idle-tab polling: 180 requests/h/user to 0 |
| Batch payroll inserts | `payroll.service.ts:208-246` | 2N queries to 2 statements; for N=1,000, seconds to sub-second [Assumption] |
| Email/PDF after commit | `employees.service.ts:140` | Transaction time no longer includes SMTP |
| Single DB pool | 3 pools, 23 connections | Max 10 connections per instance |
| Expression indexes on `lower(email)` | 6+ `LOWER(email)` predicates | Seq scan to index scan (verify with `EXPLAIN`, live schema Unknown) |
| Rebuild and add manualChunks/visualizer | `vite.config.ts:1-27`, stale dist | Entry below 80 KB gzip (current 90 KB, pre-Sentry) |
| Self-host fonts | `index.css:1` | Removes a serial third-party round trip from first paint |
| gzip/brotli on API | no `compression` | 5-10x smaller JSON [Assumption] |

## 7. Unknowns (Not enough evidence found in repository.)
- Production database indexes, table sizes and query plans (`server/db/baseline/0000_live_schema.sql` is absent, per Track D).
- Real latency to Supabase, Vercel function duration limits and memory settings.
- Actual Sentry bundle contribution (dist predates it).
- Lighthouse / Web Vitals measurements: none in repository.
- Whether `ManagerPicker.tsx:25` removes its `mousedown` listener (file is mid-edit; the added listener at line 25 was seen, the removal line was not read).

## 8. Files opened
- docs/audit/v2/README.md; docs/audit/_raw/track-b-frontend-ux.md and track-d-security-perf-infra.md (targeted grep, not read end to end)
- client: vite.config.ts, package.json, index.html, dist/index.html, dist/assets (directory listing, size and gzip measurements), src/index.css (grep), src/main.tsx, src/App.tsx, src/hooks/useSessionSync.ts, src/services/sessionSync.ts, src/hooks/useWorkspace.ts, src/hooks/usePageTitle.ts, src/services/api.ts, src/store/authStore.ts (partial), src/components/layout/MainLayout.tsx, Topbar.tsx (partial), Sidebar.tsx (partial), src/components/ui/index.tsx (partial), src/modules/employees/components/EmployeeTable.tsx (partial), src/modules/dashboard/pages/Dashboard.tsx (partial), src/modules/attendance/pages/Attendance.tsx (partial), src/modules/dashboard/components/widgets/TeamStatusWidget.tsx (partial), src/modules/approvals/pages/Approvals.tsx (partial), plus greps over src/
- server: src/app.ts, src/index.ts, src/config/db.ts, src/database/client.ts, src/db/connection.ts, src/modules/employees/employees.service.ts (partial), employees.repository.ts (partial), employees.controller.ts, src/modules/payroll/payroll.service.ts (partial), src/modules/approvals/approvals.repository.ts (partial), approvals.service.ts (partial), src/modules/notifications/core/core.repository.ts, src/modules/realtime/connections/connections.service.ts (partial), src/services/analyticsService.ts (partial), plus greps over src/ and package.json
