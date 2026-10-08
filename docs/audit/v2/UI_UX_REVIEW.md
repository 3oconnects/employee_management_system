# UI/UX Review (v2 delta)

Baseline: `docs/audit/_raw/track-b-frontend-ux.md` at commit 06dc08f. Current HEAD is 42aaace plus uncommitted changes (14 client files modified, `NewRequestModal.tsx` added). Baseline claims were re-checked against the working tree.

Evidence tags: **Confirmed** (file:line), **Inferred**, **Assumption**, **Unknown** ("Not enough evidence found in repository."). This is a static code review: no browser, screen reader, or contrast tool was run, so visual and contrast statements are inferred from class names.

## 1. Executive summary

Since the baseline, permission-aware UI has improved in three places: the Approvals request categories (`ApprovalSidebar.tsx:40-76`), global search (`Topbar.tsx:57-58`, `utils/searchAccess.ts`) and the profile view (commit 42aaace). `useSessionSync` (new) keeps the role and permissions current without re-login. Accessibility basics have improved only where new components were written (`ConfirmDialog`, `Alert`, form primitives). The application shell is still not mobile-capable, hand-rolled modals are still the norm, route and menu rules are still hard-coded role lists, and most action buttons are still ungated.

| Area | Rating | Change since baseline |
|---|---|---|
| Routing structure | Good, with duplication | Unchanged |
| Component hierarchy and reuse | Weak in large modules | Unchanged (new `ConfirmDialog`, `Alert`, form kit are good) |
| State management | Adequate (Zustand for auth, local state elsewhere) | Unchanged; no server-state cache |
| Accessibility | Weak | Slightly better (ConfirmDialog, 2 new settings files with ARIA) |
| Responsive | Weak for the shell | Unchanged |
| Design consistency | Mixed (Nexus auth screens vs legacy modules) | Unchanged |
| Permission-based UI gating | Partial | Improved in approvals, search, profile |

## 2. Routing structure

- Single `Routes` table in `client/src/App.tsx:36-168`. Layout route `MainLayout` wraps all authenticated pages through `<Outlet>` (`MainLayout.tsx:26-28`). `/login` and the 404 page sit outside the layout. [Confirmed]
- 14 pages are lazy loaded (`App.tsx:12-27`). [Confirmed]
- Each route repeats `<ProtectedRoute allowedRoles={[...]}><PageLoader>...</PageLoader></ProtectedRoute>` (about 15 copies). Fix: a small `guarded(Page, roles)` helper or a layout route with `allowedRoles` in `handle`/props. [Confirmed duplication]
- Route guards use literal role names: for example `/employees` and `/approvals` allow `admin, hr, manager, super_admin` (`App.tsx:60-64`, `:96-99`), `/payroll` allows `admin, hr, employee, super_admin` (`App.tsx:87-91`, notably excluding `manager`, which looks accidental since managers are employees too [Inferred]). The server decides by permissions, so a custom role with `employees:view` but a non-listed role name cannot open the page. `ProtectedRoute.tsx:27` only calls `hasAnyRole`. [Confirmed]
- The sidebar duplicates the same role arrays (`Sidebar.tsx:44-80`) and adds a module check (`hasModule`) that routes do not apply (`Sidebar.tsx:99-111` vs `ProtectedRoute.tsx`). A user who loses module access still reaches the URL directly. Single source of truth needed: one route manifest (`path, label, icon, roles/permissions, module, lazy component`) feeding Routes, Sidebar and global search (`utils/searchAccess.ts`). [Confirmed divergence risk]
- `/unauthorized` (inline JSX in `App.tsx:131-153`) and the 404 (`App.tsx:155-168`) are inline anonymous components; the 404 uses `h-screen` and is outside the layout. `navigate('/')` for "Return Home" sends authenticated users through `RootRedirect`. Fine. [Confirmed]
- `/profile` and `/profile/:id` both mount the same lazy component (`App.tsx:75-80`). Per-viewer visibility (commit 42aaace) is server-driven. [Confirmed]
- `usePageTitle` is called by only two pages (`LoginPage.tsx:26`, `ChangePasswordPage.tsx:10`; grep). Every authenticated page leaves the previous title, so browser history and screen-reader page announcements are uninformative. Add it to a route manifest so it is free. [Confirmed]
- No route-level error boundary (Sentry boundary is optional and only at the root, `main.tsx:65-70`); a render error in any page blanks the whole app when `VITE_SENTRY_DSN` is unset. [Confirmed]
- `ProtectedRoute` redirects an unauthorized user to `/unauthorized` rather than preserving the intended location. Unauthenticated users keep `state.from` (`ProtectedRoute.tsx:15`). Good. [Confirmed]

## 3. Component hierarchy and reusability

### 3.1 Structure (Confirmed)
`src/components/{brand,layout,ui}` hold shared pieces; feature code is under `src/modules/<feature>/{pages,components,sections,hooks}` (about 160 source files). Good domain layout.

### 3.2 Shared primitives
- `components/ui/index.tsx` (470 lines): `Modal`, DataTable, Toast, spinner and other primitives. `Modal` (`:183-220`) has no `role="dialog"`, no `aria-modal`, no Escape handling, no focus trap or restore, and its close button (`:205-210`) has no accessible name. [Confirmed]
- `components/ui/ConfirmDialog.tsx` (new, tested): `role="alertdialog"`, `aria-modal`, `aria-labelledby`/`aria-describedby` (`:67`), initial focus on the safe button (`:37`), focus trap (`:51`) and focus restore (`:56`), `focus-visible` rings. This is the correct pattern, but the generic `Modal` and the many bespoke modals have not adopted it. [Confirmed]
- `components/ui/form.tsx` + `Alert.tsx`: context-based `FieldContext` with `useId`, `role="alert"/"status"` (`Alert.tsx:27`). Used by auth screens only [Inferred from the aria file list]. Modules still hand-roll inputs with one-letter state setters.
- Modal sprawl: 27 files contain `fixed inset-0` overlays and 14 import `createPortal` (grep, up from the baseline 24 and 24 counts, so the grep method differs slightly), and the only `role="dialog"` is `ForgotPasswordModal.tsx:138`. [Confirmed]
- `Can` (`modules/auth/components/Can.tsx:11-25`) exists but is imported nowhere (grep for `<Can` outside its file returns none). It also differs from the store (`hasPermission` in `authStore.ts:90-96` short-circuits true for admins; `Can` does not), so adopting it as-is would hide buttons from admins. [Confirmed]
- `usePermission(permission)` exists in `hooks/index.ts:116-119` and is unused (grep shows no `usePermission(` call sites in tsx). [Confirmed]
- Native `alert()` is still used in 3 places (`Approvals.tsx:72`, `Attendance.tsx:175,386`, `MySpaceProfile.tsx:78`) although `toast` and `ConfirmDialog` exist. [Confirmed]

### 3.3 Monoliths and naming
`Timesheets.tsx` 1,316 lines, `EmployeeTable.tsx` 909, `Profile.tsx` 657, `Attendance.tsx` 509, `Dashboard.tsx` 422 (wc -l). `Dashboard.tsx` and `EmployeeTable.tsx` use one-letter and compressed names and one-line component definitions (for example `Dashboard.tsx:40`: `function LiveClock(){const[t,setT]=useState(...` and `EmployeeTable.tsx:35` `const ini = ...`). They are hard to review and test. `EmployeeTable.tsx` is both the page and a component file (routed from `components/`, `App.tsx:15`), which breaks the `pages/` convention. [Confirmed]

### 3.4 Duplication
- The same role arrays appear in `App.tsx`, `Sidebar.tsx`, `utils/searchAccess.ts`, `Dashboard.tsx:47-49`, and the Approvals components (see 2).
- Five dashboard widgets each own a loading/error/empty block and their own fetch of the directory (see Performance Audit 3.3).
- Avatar-with-initials is re-implemented inline: `EmployeeTable.tsx:55-59`, `Topbar.tsx:315,345`, `ProfileHeader.tsx:320`, `OverviewTab.tsx:258`, `OrganizationTree.tsx:36`. One `Avatar` component would remove five copies and give a single place for `alt`, size, fallback colour, and lazy-loading. [Confirmed]

## 4. State management and context

- **Global state:** one Zustand store `store/authStore.ts` (145 lines) with `persist` under key `auth-storage`; `partialize` keeps user and auth flags in storage and keeps tokens out (`authStore.ts:133-136`, comment at 135). [Confirmed]
- **Context:** the only React context in the app is `FieldContext` in `components/ui/form.tsx:21`. There is no theme, toast, or workspace context; the toast is a module-level function (`toast.info(...)`, used by `useSessionSync.ts:21`) and workspace identity is a module-level promise cache behind `useWorkspace()` (`hooks/useWorkspace.ts:16-31`, a good lightweight pattern). [Confirmed]
- **Session freshness (new, uncommitted):** `useSessionSync` (`hooks/useSessionSync.ts`) and `services/sessionSync.ts` re-read `/auth/me` on app open and when the tab regains focus, at most once a minute, and refresh the token before updating the screen when access changed. The user sees "Your access was updated by an administrator." (toast with a 5 s dedupe, `useSessionSync.ts:9-10,21-23`). This closes the baseline problem that role changes needed a re-login. UX caveat: the screen re-renders in place, so a page the user is on can lose access without being redirected; `ProtectedRoute` does re-evaluate on store change because it subscribes with `useAuthStore()` (`ProtectedRoute.tsx:11`), so the user is sent to `/unauthorized` mid-task and any unsaved form is lost [Inferred]. Recommend a message ("Your access changed") instead of a bare Access Denied page.
- **Server state:** none of the data fetching goes through a cache (no React Query or SWR). Each page owns `useState` plus `useEffect` plus `api.get`, with `catch{}` swallowing errors in places (`EmployeeTable.tsx:101-102`). Results: duplicate fetches, stale data across tabs, inconsistent loading and error UI, and race conditions (no `AbortController`; only some effects use a `stale` flag, e.g. `Topbar.tsx:70-75`). [Confirmed]
- **Form state:** `react-hook-form` and `zod` are dependencies, but large forms use plain `useState` objects (`EmployeeTable.tsx:152-155` holds 28-field `addForm` in `useState`). [Confirmed]
- **Derived role flags:** `isEmployee = dashboard_type === 'employee' || hasAnyRole('employee')` is true for everyone (baseline 6a.4 claim, [Inferred]); relies on ordering of the `if/else` chain (`Dashboard.tsx:47-49`, `:108-110`). Replace with a single `viewerKind` derived once.
- **`hasAnyRole`/`hasPermission` as store functions** (`authStore.ts:90-119`) are not reactive by themselves; they work because callers subscribe to the whole store. Prefer selector hooks returning booleans. [Confirmed design smell]

## 5. Accessibility

### 5.1 What exists (Confirmed)
- `<html lang="en">` (`client/index.html:2`), landmarks `<header>` (`Topbar.tsx:134`), `<nav>` (`Sidebar.tsx:156`), `<main>` (`MainLayout.tsx:26`).
- ARIA attributes in 10 files: NexusLogo, Alert, ConfirmDialog, form, `ui/index.tsx`, AuthLayout, ForgotPasswordModal, LoginPage, plus the new `RoleMembers.tsx` and `RolesTab.tsx` (`role="tablist"`, `role="tab"`, `aria-selected`, `RolesTab.tsx:266-269`). 40 `aria-`/`role=` hits across `src` (baseline reported 34 in 8 files). `Alert.tsx:27` uses `role="alert"` for danger and `status` otherwise.
- `focus-visible` or `focus:ring` classes appear 48 times, against 122 `outline-none` uses. So many controls lose the default focus outline and replace it with nothing. [Confirmed counts, Inferred effect]

### 5.2 Gaps (Confirmed unless stated)
| Gap | Evidence | Impact |
|---|---|---|
| Generic `Modal` is not a dialog: no role, no `aria-modal`, no Escape, no focus trap/restore, unlabeled close button | `components/ui/index.tsx:183-220` | Keyboard and screen-reader users cannot use or leave modals reliably. |
| 26 other overlays hand-rolled | `fixed inset-0` in 27 files, 1 `role="dialog"` | Same. |
| Icon-only buttons without names | Sidebar collapse buttons, Topbar help/bell; the only `aria-label`/`title` hits in Sidebar/Topbar are `title=` on collapsed items (`Sidebar.tsx:214,261`) and a tooltip title (`:141`), none `aria-label`. Other counts: 528 `<button`, only 40 aria/role attributes overall. | Buttons announced as "button". |
| Clickable `div`s | 15 `<div ... onClick>` (grep) | Not keyboard operable. |
| Tab/accordion semantics | `role="tab"` only in `RolesTab`; other tab bars (Approvals, Settings, Payroll, Profile) not checked individually; baseline said none | Unknown per file. |
| No skip link; focus not moved on route change; page title not updated | No `skip` in `components/layout`; `usePageTitle` on 2 pages | Screen-reader users cannot tell navigation happened. |
| Tables without semantics review | 89 `<table|<th|scope` matches; `scope=` use not verified | Unknown. |
| Images | 14 `<img>`; all 5 grep-matched files with `<img` without `alt=` on the same line need checking: `Topbar.tsx:315,345`, `OrganizationTree.tsx:36`, `OverviewTab.tsx:258`, `ProfileHeader.tsx:320` (multi-line tags, so `alt` may be on the next line) | Unknown; manually verify. |
| Colour contrast | 604 uses of `text-slate-400`/`text-gray-400`; 528 uses of `text-[9px]`/`text-[10px]`; sidebar section labels `text-white/30` at 10 px (`Sidebar.tsx:164`) and role caption `text-white/25` (`:295`) | Slate-400 (#94A3B8) on white is about 2.6:1, below WCAG AA 4.5:1; 25-30% white on near-black is about 2:1 [Inferred from Tailwind palette values, not measured]. 9-10 px body text fails size guidance regardless. |
| Motion | No `prefers-reduced-motion` handling (grep over `src`); `animate-pulse`, `animate-in`, `animate-spin`, toast progress | Vestibular users; add a global media query. |
| Typography | `font-black` 753 times with tracking and uppercase | Reduces legibility on dense screens; consistency issue as well. |
| Live regions for async results | Only `Alert`; toasts have no `role` verified in this pass | Unknown for `ToastContainer`. |
| Errors | `alert()` used in 3 places | Not accessible and inconsistent. |

### 5.3 Keyboard
- Global search shortcut Cmd/Ctrl+K and Escape (`Topbar.tsx:105-117`). [Confirmed] Search results list keyboard navigation (arrow keys) was not found. [Unknown, not verified in the 392-line file beyond lines 57-117]
- `ConfirmDialog` and `ForgotPasswordModal` are keyboard-complete (focus handling and Escape at `ForgotPasswordModal.tsx:63`).
- Hover-driven sidebar tooltips (`hoveredItem` state, `Sidebar.tsx:79`) probably do not appear on keyboard focus [Inferred].

## 6. Responsive behaviour

- **Shell (Confirmed):** `MainLayout.tsx:20` is `grid grid-cols-[auto_1fr] h-screen overflow-hidden`. `Sidebar.tsx` is always visible at 240 px or 68 px (`:119`, `w-[68px]` or `w-[240px]`, remembered in `localStorage` `sidebar_collapsed`, `:84-93`). No breakpoint classes or drawer in `MainLayout`, `Sidebar` or `Topbar` (grep for `sm:`/`md:`/`lg:` in `components/layout`: none). On a 375 px phone the content column is 135 px or 307 px wide [Inferred arithmetic]. Also `localStorage.setItem` (`Sidebar.tsx:94-96`) is not wrapped in try/catch, unlike the read at `:84-92` [Confirmed]; it throws in blocked-storage browsers.
- **Pages:** responsive utilities are used (about 35 `sm:`, 79 `md:`, 81 `lg:`, 3 `xl:` occurrences by regex count; top files Timesheets, StructuralDeepDivePage, Settings tabs, Reports, LandingPage, Profile). The main operational pages (Dashboard, Employees, Approvals, Attendance) rely on fixed-width grids and one-line compressed class strings and were not checked individually. [Unknown per page]
- `Approvals.tsx:25` keeps `isSidebarCollapsed` state for its own inner sidebar, a second sidebar inside a page that already has a shell sidebar; on small screens this is two stacked navigations [Inferred].
- Tables (`EmployeeTable` table view, payroll, timesheets) have no mobile card fallback verified. The employee page offers a card view as the default (`EmployeeTable.tsx:90`, `view` initial `'card'`), which is the right default for narrow screens.
- No `viewport-fit` or safe-area handling; PWA manifest present (`public/site.webmanifest`) but no service worker or offline behaviour found. [Unknown for service worker; no match in grep of `public/`]

## 7. Design consistency

- Two visual systems coexist. Auth screens use the "Nexus" primitives (`components/brand`, `components/ui/form.tsx`, `Alert`, tokens in `config/brand.ts`); product pages use legacy utility styling with hard-coded hex and Tailwind palette colours (`MainLayout.tsx:15,23` `#F4F5F8`, `#F6F7FB`; `Sidebar.tsx:123-127` gradient `#0D1117`/`#0F172A`; brand blue `#2F5BEA` in `config/brand.ts` vs `indigo-600` used for primary actions in `Modal`/`ConfirmDialog`). [Confirmed]
- Type scale is ad hoc: arbitrary pixel sizes (`text-[9px]`, `[10px]`, `[11px]`, `[12px]`, `[13px]`, `[17px]`), mixed `font-black`/`font-bold`/`font-semibold`, tracking from `0.2em` to `0.28em`. [Confirmed by grep counts above]
- Feedback is inconsistent: `toast`, `alert()`, inline `Alert`, and swallowed errors all occur. Confirmation uses `ConfirmDialog` in some flows, bespoke modals in others (baseline Table row 5: delete and reach-out modals).
- Placeholder features remain: "Coming soon" toasts on call/text/mail (`EmployeeTable.tsx:241-245`) and an inert Export button (`:325`), per baseline (not re-opened in this pass, line numbers from baseline; the file was modified uncommitted since).
- Empty/loading/error states: `LoadingSpinner`, `PageSkeleton` (`MainLayout.tsx:7-17`), per-widget spinners, and 36 `animate-pulse` uses. Not unified.
- Branding, titles, favicon: updated to Nexus in `client/index.html`; stale `dist` still shows the old ones (see Performance Audit P11).

## 8. Permission-based UI gating

### 8.1 Mechanisms present (Confirmed)
1. **Route guard by role names** (`ProtectedRoute.tsx:27`, `App.tsx`).
2. **Sidebar filter by role and module** (`Sidebar.tsx:99-111`): `roles: []` means everyone; otherwise `hasAnyRole`, admin bypass, a hard-coded list of core modules always visible to non-admins, then `hasModule`.
3. **Search filter** (`utils/searchAccess.ts`, `Topbar.tsx:57-58`): pages offered only if the role can open them; employee search only for roles that can use the Employees page (`canSearchEmployees`, tested in `Topbar.test.tsx:37,65-68`). Good alignment: UI rule equals route rule.
4. **Approvals** (uncommitted): server tags each row with `is_mine` and `can_act` (`approvals.service.ts:20-50`); the client shows "Action Needed" only for `can_act` rows (`Approvals.tsx:50`), and the category list is trimmed by permission (`ApprovalSidebar.tsx:40,76`: `needed.some(hasPermission) || count > 0`). `NewRequestModal.tsx:23-25` offers organisation-level request kinds only with `organization:manage` or `employees:manage`. This is the best-practice pattern: **the server decides, the client renders the decision**.
5. **Profile** (42aaace): another person's profile shows only what the viewer may see (server-side).
6. **Dashboard** chooses a layout from `dashboard_type` or role (`Dashboard.tsx:47-49`).
7. **Live refresh** of role and permissions (`useSessionSync`).

### 8.2 Gaps (Confirmed)
- Only one component consults `hasPermission` for rendering decisions in modules (`ApprovalSidebar`, `NewRequestModal`; grep counts 35 role/permission calls overall, most role-based or tests). `EmployeeTable.tsx` has no `hasPermission`/`hasAnyRole`/`can_act` call (grep), so Export, Bulk Upload, Add, Edit and Delete show for managers who can open the page (baseline finding still holds). Leave and payroll pages (modified uncommitted) have no hits in the grep either. Authorization is by server 403 and the user learns by failure. [Confirmed absence]
- `Can` and `usePermission` exist unused (3.2).
- Route-level rules and sidebar rules can diverge (module rule applies in the sidebar only).
- Admin bypass is client-side in two places: `authStore.ts:94,123` (`role === 'administrator'` or `dashboard_type === 'admin'` returns true); UI-only, harmless if the server enforces, but a user with `dashboard_type='admin'` and a restricted role would be shown actions the server refuses. [Inferred]
- Dashboard org widgets (announcements, policies, directory, birthdays) are shown to every role with no gating (baseline). Whether the server allows `/employees` for the employee role is **Unknown** here (a role with `GET /employees` denied would see five failed widgets).
- Stale-while-open: after `syncSession` changes access, only `ProtectedRoute` reacts; open widgets that fetched with the old role keep their data until reload [Inferred].

## 9. Recommendations (prioritised)

### P0, correctness and safety of the experience
1. **Make the shell responsive.** Below `lg`, render the sidebar as an off-canvas drawer with a hamburger in the Topbar, collapse global search to an icon, and wrap the `localStorage.setItem` in `try/catch` (`Sidebar.tsx:94`). Effort: M. Success test: usable at 375 px without horizontal scroll.
2. **One accessible dialog.** Rebuild `ui/index.tsx` `Modal` on the `ConfirmDialog` mechanics (role, `aria-modal`, labelled title, focus trap and restore, Escape, named close button) and migrate the 26 hand-rolled overlays opportunistically. Effort: M. Success test: axe finds no dialog violations; Tab cycles inside the dialog.
3. **Gate actions by permission.** Introduce `useCan(permission)` returning a boolean via a store selector (include the admin bypass the store already has), delete or fix `Can`, and gate Employees Export/Add/Bulk/Edit/Delete, Leave and Payroll actions. Prefer server-provided flags (`can_act` style) for row-level actions. Effort: M. Success test: a manager opening `/employees` sees only actions the API allows.
4. **Role-change UX.** When `syncSession` reports a change, show a persistent notice with what changed, and redirect with an explanation instead of a bare `/unauthorized` when the current page is no longer allowed.

### P1, high-value consistency and quality
5. **Route manifest.** One array of `{path, element, roles|permission, module, title, navLabel, icon}` driving `Routes`, `Sidebar`, search (`searchAccess.ts`) and `usePageTitle`. Removes about 15 repeated wrappers and the three divergent rule sets. Effort: M.
6. **Route-level `errorElement`/ErrorBoundary** that does not depend on Sentry; also a visible 404/403 inside the layout.
7. **Accessible names for icon-only buttons** (Sidebar collapse, Topbar help and bell, modal close), `aria-label`s on search input and results (`role="combobox"`/`listbox`), skip link, focus to `<h1>` or `<main>` on route change, page titles on every page.
8. **Contrast and size pass.** Replace `text-slate-400` on white with `text-slate-500` or darker for body text, lift `text-white/25-30` to at least 60% white on the dark sidebar, set a minimum 12 px for text, add global `prefers-reduced-motion` handling. Verify with an automated contrast checker (axe or Lighthouse); numbers above are estimates.
9. **Replace `alert()` with `toast`/`Alert`** (4 occurrences, see 3.2) and stop swallowing errors with `catch{}` in `EmployeeTable.tsx:101`; show a retry state.
10. **Server-side filtering/sort/pagination in Employees**, so department list, counts and filters are correct across pages (baseline row 5, still present: `EmployeeTable.tsx:272`).

### P2, structural improvements
11. **Server-state layer** (TanStack Query): shared employees directory, request deduplication, `staleTime`, retry, loading/error primitives; collapses the dashboard's five directory fetches.
12. **Split monoliths** (`Timesheets`, `EmployeeTable`, `Profile`, `Attendance`, `Dashboard`) into page + feature components + hooks; rename one-letter identifiers; move `EmployeeTable` to `pages/`.
13. **Shared components:** `Avatar`, `EmptyState`, `PageHeader`, `StatusBadge`, `Table`/`DataTable` with real header semantics and sort; use `react-hook-form` plus zod for large forms (Add Employee 28 fields).
14. **Design tokens.** Move the hex values in `MainLayout`/`Sidebar` into the Tailwind theme (`brand`, `surface`, `sidebar`), settle on a small type scale (for example 12/13/14/16/20/28) and a primary colour (`#2F5BEA` vs indigo), then restyle legacy modules gradually.
15. **Fix `EmployeeTable` search and fetch logic:** debounce with a stable ref, one fetch per state change, reconnect SSE with backoff, and send the token via a header-capable transport (fetch-based SSE) rather than the query string.
16. **Pause polling when the tab is hidden** and prefer an unread-count endpoint (see Performance Audit).

## 10. Unknowns (Not enough evidence found in repository.)
- Actual rendered contrast, focus order and screen-reader output; no automated accessibility test (axe or jest-axe) exists in `client/package.json`. [Confirmed absence of the dependency]
- Mobile behaviour of Dashboard, Employees, Approvals, Attendance and Payroll pages.
- Whether `ToastContainer` sets `role="status"`/`aria-live`.
- Whether employee-role users receive 403 for dashboard widget endpoints.
- Per-file tab semantics outside `RolesTab`.
- Any user research, analytics or usability data.

## 11. Files opened
- docs/audit/v2/README.md; docs/audit/_raw/track-b-frontend-ux.md (grep excerpts)
- client/index.html, vite.config.ts, package.json
- src/App.tsx, src/main.tsx, src/config/brand.ts, src/hooks/{useSessionSync,useWorkspace,usePageTitle}.ts, src/hooks/index.ts (grep), src/services/{sessionSync,api}.ts, src/store/authStore.ts (partial), src/utils/searchAccess.ts (partial)
- src/components/layout/{MainLayout,Sidebar,Topbar}.tsx (Sidebar and Topbar partial), src/components/ui/{index,ConfirmDialog,Alert,form}.tsx (partial)
- src/modules/auth/components/{ProtectedRoute,Can}.tsx, src/modules/employees/components/EmployeeTable.tsx (partial), src/modules/dashboard/pages/Dashboard.tsx (partial), src/modules/attendance/pages/Attendance.tsx (partial), src/modules/approvals/pages/Approvals.tsx (partial), src/modules/approvals/components/{ApprovalSidebar,NewRequestModal}.tsx (grep), src/modules/settings/components/RolesTab.tsx (grep), plus greps across client/src
- server/src/modules/approvals/approvals.service.ts (partial) for the `is_mine`/`can_act` contract
