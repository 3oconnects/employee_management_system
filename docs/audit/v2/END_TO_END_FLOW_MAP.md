# End-to-End Flow Map (v2 delta)

Repository: `employee_management_system`, HEAD `42aaace` plus uncommitted work (approvals self-service, leave/payroll/employee UI rework). Baseline: `docs/audit/_raw/track-*.md` @ `06dc08f`.
Method: static reading of the client component that triggers the action, the axios call, the Express route chain, controller, service, repository SQL, side effects and response. No server was started; no database was queried.

Evidence legend: **Confirmed** (cited `file:line`; `S/` = `server/src/`, `C/` = `client/src/`), **Inferred**, **Assumption**, **Unknown** ("Not enough evidence found in repository.").
Conventions used in every flow: `authenticate` = JWT verify from `Authorization: Bearer` or `?token=` (`S/core/security/authorize.ts:5-55`); the verified `req.user` is `{userId,email,tenantId,role,dashboard_type,permissions}` taken from the token, never from the database. `authorize([...])` is evaluated by `hasAccess` (`authorize.ts:94-131`). "Audit" means a row in `audit_logs`; "Notify" means a row in `notifications`.

---

## 0. Global request pipeline (applies to every journey below)

```
User action in React component
  ↓ axios instance C/services/api.ts (adds Bearer from authStore; 401 → one POST /auth/refresh then retry; refresh failure → logout + hard redirect /login)
  ↓ HTTP → Express S/app.ts
      cors (allow-list + *.vercel.app) → json/urlencoded (50 MB) → /public static → rate limiter
      (/auth: 10 per 15 min per IP; other mounts: 300 per min per IP)
  ↓ Router: authenticate → [authorize | requireSelfOrAdmin] → [validateRequest(zod)] → asyncHandler(controller)
  ↓ Controller → Service → Repository (raw SQL via pg pool; transactions via S/database/transaction.ts)
  ↓ Errors → S/core/errors/errorHandler.ts (AppError, ZodError, PG 23505/23503/23502 mapped; other errors 500; Sentry if enabled)
  ↓ Response (envelope is NOT uniform: {success,data} | {items,total} | bare array/object | {success,accessToken,...})
```
Known global rules and gaps (Confirmed unless noted):
- The error handler echoes PG unique-key detail to the client for 23505 (`S/core/errors/errorHandler.ts:25-32`).
- Rate limiter is in-memory per process and also covers `/auth/refresh`, `/auth/me`, `/auth/status` (limiter mounted on the whole `/auth` router, `S/app.ts:106`), so session sync shares the 10/15-min budget (Inferred from mount).
- Authorization uses token claims only. A role change takes effect at token expiry (15 min) or when `syncSession` refreshes (`C/services/sessionSync.ts`).
- Forced password change (`mustChangePassword`) is enforced only in the browser (`C/modules/auth/components/ProtectedRoute.tsx`); the server's `authenticate` does not look at `is_password_temp` (Confirmed by reading `authorize.ts`).
- Audit rows exist only for login, logout, `PUT /auth/me`, and approval decisions (`AUDIT_LOG_REQUESTED` publishers: `S/modules/auth/auth.controller.ts:15,72,91`, `S/modules/approvals/approvals.audit.ts:12`).

---

## 1. Authentication

### 1.1 Sign in
```
ACTION: User submits email + password on /login
  ↓ C/modules/auth/pages/LoginPage.tsx handleLogin (client check: email pattern, password non-empty)
  ↓ POST /api/v1/auth/login {email,password}            [authLimiter 10/15 min per IP]
  ↓ S/modules/auth/auth.routes.ts:16 → validateRequest(loginSchema: email, password min 1)
  ↓ Controller S/modules/auth/auth.controller.ts:10 login (trims both fields)
  ↓ Service S/modules/auth/auth.service.ts:33 AuthService.login
  ↓ DB S/modules/auth/auth.repository.ts:4 findUserByEmail:
        users LEFT JOIN employees (by e-mail, same tenant) LEFT JOIN roles
        WHERE (users.email = input OR employees.personal_email = input) AND is_active AND deleted_at IS NULL
  ↓ Check: bcrypt.compare(password, users.password) OR users.temp_password === password (plaintext)    [auth.service.ts:36-40]
  ↓ DB findRolePermissions(role_id) → permission strings "module:action"
  ↓ Token: access 15 min {userId,email,tenantId,role,dashboard_type,permissions}; refresh 7 days {userId,tenantId}  [jwt.service.ts:5-15]
  ↓ DB UPDATE users SET refresh_token, last_login
  ↓ Notify: none
  ↓ Audit: AUDIT_LOG_REQUESTED LOGIN (ip from x-forwarded-for, user agent) → audit_logs (async, failure swallowed)
  ↓ Response {success, accessToken, token, refreshToken, mustChangePassword, user{...,dashboard_type,availability_status,permissions}}
  ↓ C LoginPage.tsx:68-80 setAuth(user, access, refresh, mustChangePassword) into Zustand → sessionStorage
  ↓ navigate: mustChangePassword → /change-password, else /dashboard
```
Business rules: inactive or soft-deleted users cannot sign in; user must have a tenant (`auth.service.ts` "User does not belong to any tenant"); role name shown comes from `roles.name` when present.
Side effects: `users.refresh_token` and `last_login` change.
Gaps (Confirmed): plaintext temp password accepted; personal e-mail works as a login alias; the user object saved by `LoginPage.tsx:68-80` omits `dashboard_type` and `availability_status` that the response carries (Inferred consequence: first `syncSession` sees a "change", refreshes the token and shows the toast "Your access was updated by an administrator"); no lockout per account, only per IP; no MFA; dev account panel is compiled out of production builds (`import.meta.env.DEV`).

### 1.2 Token refresh and session continuity
```
ACTION: Any request returns 401, or the tab regains focus
  ↓ C/services/api.ts response interceptor (401 and not login/refresh): queue concurrent requests, POST /auth/refresh {refreshToken}
  ↓ S/modules/auth/auth.routes.ts:17 → validateRequest(refreshSchema) → auth.controller.ts:48 refresh
  ↓ Service auth.service.ts:75 refresh: verify refresh JWT with JWT_REFRESH_SECRET → findUserById (active, not deleted)
  ↓ DB: re-read role and permissions → new access + new refresh → UPDATE users.refresh_token
  ↓ Response {accessToken, refreshToken}; client stores both and replays the queued requests
```
In parallel, `C/hooks/useSessionSync.ts` (mounted in `C/components/layout/MainLayout.tsx:20`) calls `GET /auth/me` on mount and on `focus`/`visibilitychange` (min interval 60 s): `auth.controller.ts:83 getProfile` → `auth.repository.ts:56 findUserProfile` (fresh role, dashboard_type, permissions, avatar). If role/dashboard/permissions differ, `syncSession` calls `POST /auth/refresh` first, then updates the store and toasts.
Rules: refresh token is never compared with `users.refresh_token` (Confirmed `auth.service.ts:75-115`), so it stays valid after logout, password reset or account deactivation of another session until its 7-day expiry, except the user must still be active (`findUserById`).
Gap: the interceptor treats every 401 as expired (variable `isExpired` computed and unused, `api.ts:112-113`).

### 1.3 Sign out
```
ACTION: User menu → Sign out
  ↓ C/components/layout/Topbar.tsx:123 handleLogout → authStore.logout() → navigate('/login')   (no API call)
  ↓ (never reached from UI) POST /auth/logout → auth.controller.ts:68 → AuthService.logout → users.refresh_token = NULL → Audit LOGOUT
```
Confirmed: the UI never calls `/auth/logout`, so no LOGOUT audit and no server-side token clearing; the access token stays valid up to 15 minutes.

### 1.4 Forgot and reset password
```
ACTION A: "Forgot password" → enter work e-mail
  ↓ C/modules/auth/components/ForgotPasswordModal.tsx:79 handleRequest
  ↓ POST /auth/forgot-password {email}                  [authLimiter]
  ↓ auth.routes.ts:18 → validateRequest(forgotPasswordSchema: trimmed valid e-mail) → auth.controller.ts:129
  ↓ Service auth.service.ts:163 requestPasswordReset
        lower-case e-mail → findUserForPasswordReset (users JOIN employees, active) 
        hasRecentPasswordReset (60 s cooldown, looks in approvals type='password_reset')
        token = 32 random bytes base64url; store sha256(token) in approvals(type='password_reset', status='issued', metadata{email,user_id,token_hash,expires_at=+30 min})
        older issued tokens for the user → status 'superseded' (same transaction)  [auth.repository.ts:196-236]
  ↓ Notify: e-mail (not awaited, failure logged without detail) with link  APP_URL + /login#reset_token=<token>   [auth.service.ts:177-186]
  ↓ Audit: none
  ↓ Response: always the same generic message (no account enumeration)

ACTION B: User opens the e-mailed link
  ↓ C/modules/auth/pages/LoginPage.tsx reads fragment via C/modules/auth/utils/resetToken.ts (pattern ^[A-Za-z0-9_-]{20,128}$), removes it from the address bar, opens the modal in "reset" step
  ↓ ForgotPasswordModal.tsx:102 POST /auth/reset-password {token,newPassword}   (min 6 chars client side)
  ↓ auth.routes.ts:19 → validateRequest(resetPasswordSchema) → auth.controller.ts:135 → auth.service.ts:195 resetPasswordWithToken
        lookup by token hash → must be status 'issued', not expired, e-mail (if sent) must match
  ↓ DB (single transaction) auth.repository.ts:255-300 consumePasswordReset:
        UPDATE approvals SET status='completed' WHERE issued AND hash matches AND expires_at > NOW()
        UPDATE users SET password=<bcrypt>, temp_password=NULL, is_password_temp=false, refresh_token=NULL WHERE id AND tenant AND active
        supersede other issued tokens
  ↓ Response {success, message}; user signs in with the new password
```
Business rules: single use, 30-minute expiry, token only in URL fragment and in DB as hash, tenant and active check at consume time. Side effects: refresh credential cleared (but see 1.2: refresh JWTs still verify). Gaps: reset e-mail failure is invisible to the user (accepted design, `docs/audit/MASTER_COMPLETION_PLAN.md` Revision 4); reset records share the `approvals` table with workflow rows.

### 1.5 First-login password change
```
ACTION: User with a temporary password lands on /change-password
  ↓ C/modules/auth/components/ProtectedRoute.tsx redirects to /change-password while mustChangePassword
  ↓ C/modules/auth/pages/ChangePasswordPage.tsx:30 PUT /auth/me/password {newPassword,password} (min 8 client side)
  ↓ auth.routes.ts:26 authenticate → validateRequest(changePasswordSchema: min 6) → auth.controller.ts:119 → auth.service.ts:140 changePassword
  ↓ Rule: current password verified when supplied; when omitted it is allowed only if users.is_password_temp is true
  ↓ DB UPDATE users SET password=<bcrypt>, temp_password=NULL, is_password_temp=false
  ↓ Notify/Audit: none; client sets mustChangePassword=false, goes to /dashboard
```
Gap: the client enforces 8 characters, the server 6; no password history/complexity; sessions are not revoked on change.

---

## 2. Employees

### 2.1 List and search the directory
```
ACTION: Open /employees, type in search, change page
  ↓ C/modules/employees/components/EmployeeTable.tsx:98 GET /employees?search&page&limit (debounced 400 ms)
  ↓ S/modules/employees/employees.routes.ts:47 authenticate → authorize(['admin','super_admin','hr','manager','employee','employees:read','employees:manage'])
  ↓ employees.controller.ts:9 getEmployees → EmployeesService.getEmployees → employees.repository.ts:4 findMany
  ↓ DB SELECT e.* + department, manager, role, availability, checked-in flag, WHERE e.tenant_id AND deleted_at IS NULL, ILIKE search on name/id/department/email, LIMIT/OFFSET (count query in parallel)
  ↓ Response {items,totalItems,totalPages}
```
Parallel channel: the same page opens an SSE stream `GET /realtime/stream?token=` (`EmployeeTable.tsx:126`) and patches `availability_status` on `STATUS_UPDATE` events.
Business rules: tenant scoped; soft-deleted hidden. The page route in `C/App.tsx:69-73` allows admin, hr, manager, super_admin only.
Gaps (Confirmed): the API route also accepts any role (`employee` expands to permissions all roles hold) and returns `e.*`, so personal columns reach every authenticated user (see architecture report ARC-06); `is_checked_in` joins legacy attendance columns (`employees.repository.ts:21`) so it is false for rows written by the current attendance flow; SSE URL falls back to `http://localhost:4000/api/v1` when `VITE_API_URL` is unset (`EmployeeTable.tsx:122-123`).

### 2.2 Create employee (with login account and offer letter)
```
ACTION: "Add employee" → fill modal → Save   (also onboarding page: C/modules/onboarding/pages/Onboarding.tsx:106)
  ↓ C/modules/employees/components/modals/AddEmployeeModal.tsx (live e-mail checks: GET /employees/check-email?email|name) → EmployeeTable.tsx:169 POST /employees
  ↓ employees.routes.ts:50 authorize(['admin','super_admin','hr','employees:manage']) → validateRequest(createEmployeeSchema, passthrough) → employees.controller.ts:31
  ↓ Service employees.service.ts:47 createEmployee(actor,data) inside withTransaction:
        1. role decision first: resolveRoleForNewAccount(actor,{roleName}, baseline 'employee')  [S/core/security/authzState.ts]  (no named role or the baseline role → no roles:assign needed; any other role → full grant rules)
        2. duplicate checks: employees.email, users.email (global, across tenants; foreign hit answered "Email is already in use."), personal e-mail
        3. next id: SELECT highest 'EMP###' over ALL tenants → EMP{n+1}            [employees.service.ts:96-104]
        4. INSERT employees (32 params)
        5. if e-mail: temp password (random 10 chars) → bcrypt → INSERT users (is_password_temp=true, role_id from step 1)   [repository createUserAccount, returns false on a lost race → 409]
        6. await sendCandidateWelcomeAndOffer(...) (PDF + HTML offer letter, temp password, login URL) INSIDE the transaction; send errors are logged only   [employees.service.ts:140-162]
        7. INSERT payroll_profiles with a fixed CTC split 50/20/25/5 percent (basic/hra/allowances/bonus)   [:165-174]
  ↓ Notify (not awaited): NotificationService.onEmployeeCreated → all active users whose users.role is admin or hr   [employees.service.ts:176; channels.repository.ts:23-27]
  ↓ Audit: none
  ↓ Response 201 {success, employeeId}
```
Business rules: default status `onboarding`; employee without e-mail gets no account; role escalation is blocked by the HF-10 policy.
Gaps: the e-mail with the temporary password leaves while the transaction is open (a rollback after send is possible); ids are global and race-prone; no audit record; bulk upload (2.5) reuses this path.

### 2.3 Edit employee / my own profile fields
```
ACTION: Edit modal (EmployeeTable.tsx:216), Profile page save (C/modules/profile/pages/Profile.tsx:161), My Space (C/modules/dashboard/components/MySpaceProfile.tsx:75), avatar (Profile.tsx:278,307)
  ↓ PUT /employees/:id
  ↓ employees.routes.ts:65 authenticate → validateRequest(updateEmployeeSchema, passthrough) → employees.controller.ts:42 updateEmployee
  ↓ Controller rule: isHrOrAdmin = role name in {admin,super_admin,hr}; others must "own" the row and restricted corporate fields (CTC, department, position, status, role, join date...) are stripped from the body
        ownership call at employees.controller.ts:50: isEmployeeOwner(targetId, user.email, user.userId)  ← arguments shifted vs signature (employeeId, tenantId, email, userId) at employees.service.ts:543 → never matches (Confirmed)
  ↓ Service employees.service.ts:182 updateEmployee in withTransaction:
        e-mail change: uniqueness across tenants; if login e-mail or role changes: tenant check + assertMayManageUser/assertMayAssignRole
        UPDATE employees (whitelisted fields via employees.submodels.ts), UPDATE users avatar/e-mail/role, UPDATE payroll_profiles mirror (name, department, position, CTC, ids)
        diff list (position, role, department, status, CTC) → sendEmployeeActionNotification e-mail (not awaited)   [:263-340]
  ↓ Notify: e-mail only; Audit: none
  ↓ Response {success:true}
```
Gaps: non-HR users cannot edit their own profile through this route because of the shifted-argument bug (their request returns 403 "only authorized to update your own profile"); a custom role holding `employees:update` is blocked because the check is by role name; the frontend `profile.visibility.ts` `edit` flag mirrors the role-name rule on purpose (`S/modules/employees/profile.visibility.ts:27-29`).

### 2.4 Delete employee
```
ACTION: Delete icon → confirm (EmployeeTable.tsx:252)
  ↓ DELETE /employees/:id
  ↓ employees.routes.ts:71 authorize(['admin','super_admin','hr','employees:manage']) → employees.controller.ts:143
  ↓ Service employees.service.ts:593 deleteEmployee (NO assertEmployeeInTenant, unlike sub-record methods at :553-588)
  ↓ Repository employees.repository.ts:320-392 (own transaction):
        DELETE child rows by employee_id only (education, experience, emergency contacts, documents, employee_roles, performance_reviews, timesheets, leave_requests, approvals, payroll_profiles/entries/history, reimbursement_claims, claims, loans)   ← NOT tenant-scoped
        read employee row WITH tenant; hand direct reports to the deleted person's manager / CEO by position regex (new in working tree)
        DELETE employees WHERE id AND tenant_id RETURNING id
        UPDATE users SET is_active=false, deleted_at=NOW() WHERE email AND tenant (skips admin@company.com)
        COMMIT even when 0 employee rows were deleted
        on any error: ROLLBACK then soft delete (status 'terminated') and still report success
  ↓ Notify/Audit: none
  ↓ Response {success:true} or 404 when nothing deleted
```
Severity (Confirmed): a user holding the guard (any tenant) can wipe another tenant's child records for a guessed `EMP###` id; payroll history and approval trail of a legitimately deleted person are destroyed; hard delete has no audit record.

### 2.5 Bulk upload
```
ACTION: Bulk upload modal → CSV (template C/public/bulk_upload_template.csv)
  ↓ C/modules/employees/components/modals/BulkUploadModal.tsx:102 POST /employees/bulk-upload {employees:[...]}
  ↓ employees.routes.ts:68 authorize → validateRequest(bulkUploadSchema: array of any) → employees.controller.ts:127 → employees.service.ts:347
  ↓ Rules: 1..50 rows; pre-validation of every row (name, department, join date, duplicate e-mail in batch and DB via findMany, role grantable by the actor); any error aborts the whole batch with a per-row report (nothing inserted)
  ↓ Then per row: normalizeDate (dd/mm/yyyy → ISO) → createEmployee (2.2) in its own transaction; row failures are reported, not rolled back across rows
  ↓ Response {inserted,skipped,total,aborted,results[]}
```
Gaps: 50 sequential transactions with an SMTP send each in one request (timeouts likely near the cap); no import audit; duplicate-check uses the first 10 hits of a LIKE search, not an exact lookup (`findMany` with `limit:1` returns the best match by `created_at`, so a duplicate not in the newest match can slip through; caught later by the unique/dup checks in `createEmployee`).

### 2.6 Profile view (own and others)
```
ACTION: Open /profile or /profile/:id
  ↓ C/modules/profile/pages/Profile.tsx:60-103: no id → GET /employees/me ; else GET /reports/profile/:id ; plus GET /employees/:id/education|experience|emergency-contacts
  ↓ S/modules/employees/employees.routes.ts:44 GET /me → employees.controller.ts:36 getMyProfile → EmployeesService.getEmployeeProfileByUserIdOrEmail → AnalyticsService.getEmployeeProfile(id, tenant)
  ↓ S/modules/reports/reports.routes.ts:24 GET /reports/profile/:employeeId → reports.controller.ts:39 getEmployeeProfile:
        assertMayViewEmployeeProfile: employee must exist in the caller's tenant; own record, or employees:view   [reports.access.ts:30-38]
        applyProfileAccess(profile, profileAccess(actor,isOwn)) strips personal fields, pay, documents, emergency contacts, reviews unless entitled; returns the `access` flags
  ↓ Sub-records: employees.controller.ts:66-125 assertMayReadPersonalRecords (owner, or employees:update/manage) + assertEmployeeInTenant
  ↓ Response profile JSON with access flags; the UI hides what the server withheld
```
Business rules (Confirmed, `S/modules/employees/profile.visibility.ts`): work card for anyone with `employees:view`; personal records need `employees:update` or `employees:manage`; pay needs `payroll:view` or `payroll:manage`; own record shows everything.
Gap: `GET /employees` (2.1) returns the same data without these filters; the client decides "own" with `user.role === 'admin' || 'hr'` (`Profile.tsx:92`), which is only a display hint.

---

## 3. Attendance

### 3.1 Check in / check out
```
ACTION: Dashboard or Attendance page "Check in" / "Check out"
  ↓ C/modules/dashboard/pages/Dashboard.tsx:132,141 and C/modules/attendance/pages/Attendance.tsx:383 POST /attendance/check-in | check-out (body userId ignored)
  ↓ S/modules/attendance/attendance.routes.ts:32-33 authenticate → validateRequest(passthrough) → attendance.controller.ts:16,24
  ↓ Service attendance.service.ts:43 checkIn: resolveEmployeeId(userId, tenant) → no employee → 404; open session exists → 400; INSERT attendance (employee_id, check_in_time, date, status, tenant_id)
  ↓ checkOut (service :60): UPDATE the open session's check_out_time; none open → 404; returns hours with 2 decimals
  ↓ Notify/Audit: none
  ↓ Response 201 {status:'IN',...} or 200 {status:'COMPLETED', total_hours}
```
Rules: many sessions per day allowed; server time is authoritative; no geofence/IP/device check; no shift or late rules.

### 3.2 View history, weekly hours, summary (self and others)
```
ACTION: Attendance page month change; profile Attendance tab; timesheet weekly hours
  ↓ GET /attendance/today|history|weekly-hours|summary/:userId   (Attendance.tsx:285-314; profile/components/AttendanceTab.tsx:124)
  ↓ attendance.routes.ts:22-29 authenticate → requireSelfOrAdmin   (other userId → role must be super_admin/admin/hr/manager by NAME: authorize.ts:187-200,207-238)
  ↓ Controller uses req.query.userId or token user → service resolveEmployeeId in tenant → repository month/week queries (EXTRACT on check_in_time)
  ↓ Response {items,total} / {days:{date:hours}} / {present_days,half_days,avg_hours}
```
Gap: any manager sees any tenant user's attendance (no team scope). Custom roles with attendance permissions are blocked by the name list.

### 3.3 Regularization request → approval
```
ACTION: "Regularize" (Attendance.tsx:170) or Approvals → New request → Attendance (C/modules/approvals/components/NewRequestModal.tsx:81)
  ↓ POST /attendance/regularize {date,check_in_time,check_out_time,reason}
  ↓ attendance.routes.ts:34 authenticate → validateRequest(passthrough) → attendance.controller.ts:65 → attendance.service.ts:106 requestRegularization
  ↓ Validation: YYYY-MM-DD real date, not in the future, HH:MM[:SS] times, out after in
  ↓ DB: duplicate pending request for the date → 409; INSERT approvals(id REG-uuid, type 'attendance_regularization', status 'pending', metadata{date,times,reason,user_id}, requested_by e-mail)
  ↓ Notify/Audit: none at request time
  ↓ Response 201 {id,status:'pending'}
  Later: decided in the Approvals page (flow 8.2) → ApprovalsService: requester's reporting manager (admin when none) AND permission attendance:regularize|attendance:manage → applyAttendanceRegularization INSERT attendance row status 'present'
```
Gap: approval inserts a new row even if sessions already exist that day (no merge/overlap check, `approvals.repository.ts:306-320`).

---

## 4. Leave

### 4.1 Apply for leave
```
ACTION: Leave page form (C/modules/leave/pages/ApplyLeave.tsx:103) or Approvals → New request → Leave (NewRequestModal.tsx:76)
  ↓ POST /leave/apply {leave_type_id,start_date,end_date,reason}
  ↓ S/modules/leaves/leaves.routes.ts:23 authenticate → validateRequest(applyLeaveSchema: coerce number, strings) → leaves.controller.ts:13 (userId forced from token)
  ↓ Service leaves.service.ts:20 applyLeave → leaves.repository.ts:9 INSERT leave_requests(user_id, leave_type_id, start, end, reason, tenant_id) status default 'pending'
  ↓ Notify (not awaited): onLeaveApplied → users whose users.role is admin, hr or manager (all tenant managers, not just the reporting manager)   [leaves.service.ts:30-33]
  ↓ Audit: none
  ↓ Response 201 {...row, message}
```
Business rules actually enforced: none beyond schema. Not enforced (Confirmed): start before end, overlap with existing leave, balance versus quota, holidays/weekends, notice period, attachments. Leave types are global (`leaves.repository.ts:5`).

### 4.2 View my requests and balance
```
ACTION: Open /leave
  ↓ ApplyLeave.tsx:39,45,54 GET /leave/types, GET /leave/requests?userId=me, GET /leave/balance?userId=me
  ↓ leaves.routes.ts: /types, /requests (no extra guard) and /balance (requireSelfOrAdmin)
  ↓ leaves.service.ts:42 getLeaveRequests: without leave:approve the caller sees only their own and a foreign userId → 403; approvers see the whole tenant
  ↓ leaves.repository.ts:69 getLeaveBalance: quota − SUM of approved days (end−start+1) for the calendar year of start_date
  ↓ Response {items,total} / {userId,year,balances[]}
```
### 4.3 Edit or withdraw my pending request
```
ACTION: Edit / delete on the request row
  ↓ ApplyLeave.tsx:85,97 DELETE|PUT /leave/requests/:id
  ↓ leaves.routes.ts:30-31 → controller → service.updateLeaveRequest|deleteLeaveRequest
  ↓ SQL: WHERE id AND status='pending' AND tenant_id AND user_id = caller; no row → explainRefusal: own but decided → 409, else 404   [leaves.service.ts:69-88]
  ↓ Response message
```
Rule: only the owner, only while pending. Delete is a hard delete (no cancellation state).

### 4.4 Approve or reject leave
```
ACTION: Manager/HR opens /approvals → Approve or Reject on a leave card
  ↓ C/modules/approvals/pages/Approvals.tsx:67 POST /approvals/leave-{id}/action {action,type:'leave'}   (no client call to PUT /leave/:id/approve exists)
  ↓ approvals.routes.ts:18 authorize(ANY_APPROVER_PERMISSIONS) → validateRequest(updateApprovalActionSchema) → approvals.controller.ts:26
  ↓ ApprovalsService.updateApprovalAction (see flow 8.2): permission leave:approve, own-request refusal, pending/pending_audit only, FOR UPDATE lock in tenant
  ↓ DB UPDATE leave_requests SET status approved|rejected
  ↓ Audit: APPROVAL_APPROVE/REJECT row (publishDecisionAudit)
  ↓ Notify: NONE on this path
  Alternative direct path: PUT /leave/:id/approve (leaves.routes.ts:37, authorize leave:approve) → leaves.service.ts:58 approveLeave → same engine with recordApprover → sets approved_by → Notify applicant onLeaveApproved/Rejected → audit
```
Gaps: the inbox lists leave through `JOIN employees e ON l.employee_id = e.id` (`S/modules/approvals/approvals.repository.ts:82`) while apply writes `user_id` only (`leaves.repository.ts:11`): new requests may never appear in the inbox (Inferred; depends on production data, baseline S-3). When they do, the applicant is not notified.

---

## 5. Timesheets

### 5.1 Open week, edit, submit
```
ACTION: Timesheet page week navigation, edit grid, Save, Submit
  ↓ C/modules/timesheet/pages/Timesheets.tsx:163 GET /timesheets/week?userId&weekStart ; :287 PUT /timesheets/:id/entries ; :289 PUT /timesheets/:id/submit
  ↓ S/modules/timesheets/timesheets.routes.ts:21 authenticate → requireSelfOrAdmin → controller → service.getTimesheetByWeek: finds the sheet, otherwise INSERT a draft (a GET that writes), for the userId given (managers can create drafts for others)
  ↓ saveTimesheetEntries (service :32): owner only (getOwnTimesheet), status must be draft or rejected (409 otherwise); clear entries → insert rows → update total_hours
        withTransaction wraps it but the repository uses the global pool, so the three writes are separate commits (timesheets.repository.ts:25-43)
  ↓ submitTimesheet (service :55): repository update draft/rejected → submitted for the owner
  ↓ Notify: none (the template onTimesheetSubmitted exists but is never called, grep); Audit: none
  ↓ Response sheet JSON
```
### 5.2 Review pending and decide
```
ACTION: Approver sees pending timesheets, Approve/Reject
  ↓ Timesheets.tsx:209 GET /timesheets/pending ; :1261 PUT /timesheets/:id/approve {action,approved_by}  (approved_by ignored by the server)
  ↓ timesheets.routes.ts:25,30 authorize(['timesheet:approve']) → timesheets.controller.ts:31 → TimesheetsService.approveTimesheet → ApprovalsService.updateApprovalAction(`ts-{id}`, 'timesheet', recordApprover, remarks)
  ↓ DB UPDATE timesheets SET status, approved_by, remarks (row lock, tenant, no self-approval, status must be 'submitted')
  ↓ Audit: APPROVAL_* via publishDecisionAudit; Notify: none (onTimesheetApproved unused)
  ↓ Response {...row, message}
```
Gap: `GET /timesheets/pending` lists the whole tenant to any approver (no team scope); the client calls `GET /timesheets` (no route) for history (`Timesheets.tsx:195`).

---

## 6. Claims (expenses)
```
ACTION A: Employee submits a claim
  ↓ C/modules/payroll/sections/EmployeePayroll.tsx:124 POST /claims {employee_id,category,amount,description}
  ↓ S/modules/claims/claims.routes.ts:12 authenticate → validateRequest(submitClaimSchema: amount > 0, ≤ 10,000,000) → claims.controller → ClaimsService.submitClaim
  ↓ Rule: body employee_id must equal the caller's own employee id (resolveEmployeeIdForUser) else 403; id `CLM-${Date.now()}`
  ↓ DB INSERT claims (status 'pending'); Notify: none; Audit: none; Response row

ACTION B: Approver decides
  ↓ Intended UI: C/modules/payroll/sections/Approvals.tsx:28,43,52 → GET claims/admin, PUT claims/:id/approve|reject  → NO SUCH ROUTES (Confirmed by route-contract script); the working path is the Approvals page (POST /approvals/claim-{id}/action) or PUT /claims/:id/status {status}
  ↓ claims.routes.ts:16 authorize(['claims:approve']) → ClaimsService.updateClaimStatus → ApprovalsService engine (permission claims:approve, own-claim refusal, pending only)
  ↓ DB UPDATE claims SET status; Audit: APPROVAL_APPROVE/REJECT via publishDecisionAudit on both paths (claims.controller.ts:27 and the inbox controller)
```
Rules: own claims visible to self; any employee's claims to `claims:approve` (`claims.service.ts:26-32`). No payout link into payroll; payroll "pending approvals" counts a different table (`reimbursement_claims`, `payroll.repository.ts:62`).

---

## 7. Payroll

### 7.1 View payroll roster and summaries
```
ACTION: Open /payroll (admin, hr, employee roles may open it: C/App.tsx:96-100)
  ↓ C/modules/payroll/sections/EmployeePayrollManagement.tsx:57, FinancialAnalysis.tsx:37-40 GET /payroll/employees, /activity, /pending-approvals, /live-summary
  ↓ S/modules/payroll/payroll.routes.ts:15-28 authorize(['payroll:view']) → controller → PayrollService (computes gross, PF 12% of basic, PT 200 above CTC 180000, TDS bands in code)
  ↓ DB payroll_profiles / payroll_runs / reimbursement_claims by tenant
  ↓ Response bare arrays/objects
```
Employee self-service ("my payslips"): `EmployeePayroll.tsx:65` calls `payroll/history/:empId` → `payroll.routes.ts:19-21` returns `{payroll_history: []}` always; `GET /payroll/payslip/...` does not exist. So an employee sees no payslips (Confirmed).

### 7.2 Edit a salary structure
```
ACTION: Salary structure modal Save (C/modules/payroll/components/SalaryStructureModal.tsx:24)
  ↓ PUT /payroll/employees/:id
  ↓ payroll.routes.ts:16 authorize(['payroll:manage']) → validateRequest(updatePayrollProfileSchema, passthrough) → payroll.controller.ts:15 updatePayrollProfile (refuses your own employee id)
  ↓ PayrollService.updatePayrollProfile (service :50): employee must exist in tenant; insert or update payroll_profiles
  ↓ Rule defect: omitted bank account is stored as 'Not Linked'; omitted basic/hra/allowances become 0; overtime and bonus not updated   [payroll.service.ts:54-59]
  ↓ Notify/Audit: none
```
Create profile modal calls `POST /payroll/profiles` (no route).

### 7.3 Run payroll
```
ACTION: "Run payroll" for month/year (C/modules/payroll/sections/PayRuns.tsx:37 posts to payroll/run)
  ↓ intended server route: POST /payroll/process (payroll.routes.ts:29 authorize(['payroll:run']) → validateRequest(processPayrollSchema: month/year string|number))  — the client posts to /payroll/run, which does not exist, so the click returns 404 (Confirmed)
  ↓ payroll.controller.ts:59 processPayroll → PayrollService.processPayroll (service :200) in withTransaction:
        INSERT payroll_runs (id RUN-{year}-{month}-{Date.now()}), SELECT all profiles of the tenant,
        per employee INSERT payroll_entries (gross, PF, ESI, PT, TDS, net) + UPSERT payroll_history
  ↓ Notify (after commit, not awaited): payslips available → users with role employee or manager; run complete → admin, hr   [payroll.service.ts:251; templates.service.ts:36-49]
  ↓ Audit: none (AuditAction.PAYROLL_RUN is declared, unused)
  ↓ Response {success, message, runId}
```
Rules not enforced: one run per month, locked month, attendance/LOP/leave integration, approvals before disbursement, bank file. Completion plan declares a payroll freeze until R6 (`docs/audit/MASTER_COMPLETION_PLAN.md` section 8).

---

## 8. Approvals

### 8.1 View inbox
```
ACTION: Open /approvals (tabs: My requests, Action needed, History)
  ↓ C/modules/approvals/pages/Approvals.tsx:36-52 GET /approvals?status=pending and status=completed (My requests fires both)
  ↓ approvals.routes.ts:13 authenticate (no authorize) → approvals.controller.ts:8 → ApprovalsService.getApprovals (service :25)
  ↓ resolveEmployeeIdForUser (user_id or e-mail) → ApprovalsRepository.getApprovals (repository :27): UNION of approvals, leave_requests, employees(status onboarding), timesheets, claims;
        filter: tenant match OR tenant NULL/''; role manager or employee (by NAME) → only rows I raised, about me, or raised by my reports; every other role name sees the whole tenant
  ↓ getReportingManagerUserIds for manager-routed types → tag each row is_mine and can_act (permission for the type, not own request, manager routing)
  ↓ Response {success, data:[{id 'std-|leave-|onb-|ts-|claim-…', type, status, metadata, is_mine, can_act}]}
  ↓ UI: "Action needed" shows only can_act rows (Approvals.tsx:50); sidebar categories filtered by role (ApprovalSidebar.tsx)
```
### 8.2 Decide a request
```
ACTION: Approve / Reject on a card (Approvals.tsx:67)
  ↓ POST /approvals/:id/action {action:'approve'|'reject', type}
  ↓ approvals.routes.ts:18 authenticate → authorize(ANY_APPROVER_PERMISSIONS: union of leave:approve, timesheet:approve, claims:approve, onboarding:manage, organization:manage, employees:manage, settings:manage, attendance:regularize, attendance:manage, approvals:approve) → validateRequest
  ↓ approvals.controller.ts:26 updateApprovalAction (decider = token user only)
  ↓ ApprovalsService.updateApprovalAction (service :124):
        1 parse id prefix → kind; own-table kinds: claimed type must equal the kind and the actor must hold that type's permission (policy :38-56)
        2 BEGIN; SELECT row FOR UPDATE WHERE id AND tenant_id            [repository :270]
        3 actual type from row must equal claimed type
        4 std rows of manager-routed types (attendance_regularization, role_change, promotion, team_change): requester's reporting manager decides (admin when none); self-service types also accept a general approver (permission)
        5 own request → 403; status not pending → 409
        6 effect: department_creation → INSERT departments + org_nodes + org_governance; team_creation → INSERT teams (+ move members) + org_nodes; promotion → employees.position; team_change → employees.team/department; role_change → only admin/super_admin (super_admin for admin roles) then UPDATE users.role_id/role; attendance_regularization → INSERT attendance; others → UPDATE status; onboarding approve → employee status 'active'
        7 COMMIT; onboarding approval e-mail afterwards (failure logged)
  ↓ Audit: publishDecisionAudit (APPROVAL_APPROVE/REJECT, newValues {approvalType, decision, subjectEmployeeId, decidedBy}) → audit_logs
  ↓ Notify: none (leave via /leave/:id/approve is the only decision path that notifies)
  ↓ Response {success:true}; UI removes the card
```
Gaps: created org nodes carry tenant default (`approvals.repository.ts:188,220`); role-change approval does not use `assertMayAssignRole` (HF-10 coverage rule) but a name check (`approvals.service.ts:66-77`); a department/team creation approval that fails mid-way rolls back all of it (single transaction, good).

### 8.3 Raise a self-service request
```
ACTION: New request → role change / promotion / team change   (C/modules/approvals/components/NewRequestModal.tsx:85)
  ↓ POST /approvals/request {type,...fields}
  ↓ approvals.routes.ts:17 authenticate only → approvals.controller.ts:20 → service :83 createSelfServiceRequest
  ↓ Validation: type must be in SELF_SERVICE_FIELDS; only whitelisted string fields kept (500 chars max); at least one field; employee must exist
  ↓ DB INSERT approvals (id REQ-uuid, type, 'pending', metadata, requested_by e-mail, tenant_id)
  ↓ Notify: none (the reporting manager is not told); Audit: none
  ↓ Response 201 {id}
```
Other kinds from the same modal reuse other flows: leave (4.1), attendance (3.3), team/department (10.1).
Also `POST /approvals` (authorize `approvals:approve`) creates a generic row for any employee of the tenant, but not of reserved types (`approvals.service.ts:107-117`); no client calls it.

---

## 9. Org structure, search, notifications, realtime

### 9.1 Departments and teams (organization)
```
ACTION: Organization page create/edit/delete department or team; Approvals modal "Team"/"Department"
  ↓ C/modules/organization/hooks/useOrganizationForm.ts:87-111 POST|PUT|DELETE /organization/departments|teams[/:id]
  ↓ S/modules/organization/organization.routes.ts:11-23 authenticate → adminOnly = authorize(['admin','super_admin','organization:manage','employees:manage']) → validateRequest
  ↓ POST: organization.controller.ts:13 → OrganizationService.createDepartmentRequest|createTeamRequest → INSERT approvals(type department_creation|team_creation, status pending, metadata) → 202 "submitted for approval"
        executed only when an approver decides it (flow 8.2); the requester cannot approve their own request
  ↓ PUT/DELETE: direct tenant-scoped UPDATE/DELETE (hard delete, no member or child check)  [organization.repository.ts:28-69]
  ↓ Notify: none; Audit: none; Response {success,data}
```
Reads: `GET /organization/departments|teams|team-status` any authenticated user (tenant-scoped).

### 9.2 Org tree (governance)
```
ACTION: Open /organization tree or dashboard org widgets
  ↓ C/modules/organization/components/OrganizationTree.tsx:261 GET /governance/tree ; :280 POST /governance/sync
  ↓ S/modules/governance/index.ts → org-tree.routes.ts (GET /tree, GET /search, PUT /:nodeId authorize admin|hr|super_admin) , sync.routes.ts (POST /sync same guard), shared.routes.ts (GET /resolve/:nodeId)
  ↓ OrgTreeService.getOrgTree: nodes + employees for tenant OR tenant 'tenant_default'/'default'; empty → auto-sync from departments and teams; builds nested tree with employees attached to team/department nodes
  ↓ Response nested array
```
Gap: 'default' tenant rows are readable by everyone (`S/modules/governance/org-tree/org-tree.repository.ts:9-24`); a read-triggered write (auto-sync) runs on GET.

### 9.3 Global search
```
ACTION: ⌘K / click search in the top bar, type
  ↓ C/components/layout/Topbar.tsx:55-72 pagesFor(hasAnyRole, query) from C/utils/searchAccess.ts (pages the role may open; same lists as App.tsx)
  ↓ people search (query ≥ 2 chars, only if the role may open Employees): GET /employees?search&limit=5 (debounced 250 ms)
  ↓ server flow = 2.1 (no separate search endpoint); result click navigates to /profile/:id
```
Rules: UI-only gating; the server returns employees to any authenticated caller.

### 9.4 Notifications
```
ACTION: Bell icon (auto-refresh every 60 s), "Mark all read"
  ↓ C/components/layout/Topbar.tsx:79 GET /notifications?limit=8 ; :117 PUT /notifications/read-all
  ↓ S/modules/notifications/index.ts → core.routes.ts (authenticate) → core.controller.ts → NotificationsCoreService → core.repository.ts WHERE user_id AND tenant_id
  ↓ Response {success, data:[...], meta:{unreadCount,page,limit}}
```
Gap (Confirmed): the UI reads `res.data.unreadCount` (`Topbar.tsx:82`), but the server returns `meta.unreadCount`, so the badge count stays 0. `PUT /notifications/:id/read` exists; no UI call found.
Producers: leave applied/approved/rejected, employee created, payroll processed, account created, role updated (templates, `S/modules/notifications/templates/templates.service.ts`); recipients for fan-out are chosen by the legacy `users.role` string.

### 9.5 Availability status and realtime
```
ACTION: Pick a status (available, busy, away, lunch, break, dnd, offline) on the dashboard
  ↓ C/modules/dashboard/pages/Dashboard.tsx:90 PUT /auth/status {status}
  ↓ auth.routes.ts:25 authenticate → validateRequest(updateStatusSchema enum) → auth.controller.ts:106 → AuthService.updateStatus → UPDATE users SET availability_status WHERE id AND tenant_id (caller only)
  ↓ EventPublisher REALTIME_BROADCAST_REQUESTED → realtime.listeners → RealtimeEventsService.broadcastStatusUpdate → SSE data to every connected client of the tenant
  ↓ Response {success, status}
Stream: GET /realtime/stream?token=<jwt> → authenticate → RealtimeConnectionsService.addClient (event-stream, 30 s keep-alive)
```
Gaps: single-process memory; token in URL; all tenant members receive everyone's status; audit none.

---

## 10. Roles, permissions, users and settings

### 10.1 Role CRUD and permission matrix
```
ACTION: Settings → Roles: create / rename / delete role; toggle permissions
  ↓ C/modules/settings/components/RolesTab.tsx:65-121 POST|PUT|DELETE /settings/roles[/:id], PUT /settings/roles/:id/permissions
  ↓ S/modules/settings/index.ts:9-11 authenticate → router guard authorize(['admin','super_admin','hr','settings:manage'])
  ↓ rbac.routes.ts:12-15 authorize(['roles:manage']) | authorize(['permissions:grant'])
  ↓ RBACService (S/modules/settings/rbac/rbac.service.ts): createRole → assertMayCreateRole; updateRole → assertMayModifyRole; deleteRole → assertMayDeleteRole (refuses if users assigned); updateRolePermissions → assertMayGrantPermissions   [S/core/security/authzState.ts]
        rules: permission strings must exist; the actor must hold each permission it grants (unless super/dashboard-admin); reserved name super_admin; dashboard_type 'admin' (a full bypass) only for super/unbounded actors; shared template roles are read-only; other tenants' roles = 404
  ↓ DB roles / role_permissions (replace set: clear then insert one by one, not in a transaction: rbac.service.ts:117-125)
  ↓ Notify/Audit: none
```
Reads: `GET /settings/roles` and `/settings/permissions` need only the router gate (manager with `employees:view` passes through the `admin` expansion).

### 10.2 See and change a role's people
```
ACTION: Roles → members panel → search candidates → assign
  ↓ C/modules/settings/components/RoleMembers.tsx:67,82,99 GET /settings/roles/:id/members | /candidates ; PUT /settings/users/:id/role {role_id}
  ↓ rbac.routes.ts:10-11 authorize(['roles:assign','roles:manage','users:manage']) | authorize(['roles:assign']) → RBACService.listRoleMembers (tenant-only, escaped LIKE, limit ≤ 50/20)
  ↓ user-assignments.routes.ts:13 authorize(['roles:assign']) → UserAssignmentsService.updateUserRole (service :101): assertMayAssignRole (permission, not self, target covered, role visible and covered)
  ↓ DB UPDATE users SET role, role_id
  ↓ Notify: onRoleUpdated (in-app); optional e-mail when notify_user; Audit: none
  ↓ Target user: new rights appear within 15 minutes, or at the next focus sync (flow 1.2) with the toast
```
### 10.3 Create and manage login accounts
```
ACTION: Settings → Users: add user, status toggle, reset/set password, send welcome, delete
  ↓ C/modules/settings/components/UsersTab.tsx:46-325 POST /settings/users, PUT /settings/users/:id/status|role|password, POST /settings/users/:id/reset-password|send-welcome, DELETE /settings/users/:id
  ↓ user-assignments.routes.ts:9-15 authorize(['users:manage'] | ['roles:assign'])
  ↓ UserAssignmentsService: createUser (role resolved and authorized first; random or given password; `temp_password` stored plaintext; welcome e-mail optional; onAccountCreated notification), resetPassword (assertMayManageUser; returns the new temp password in the response body), updatePassword, updateUserStatus (not self; assertMayManageUser), deleteUser (not self; assertMayManageUser)
  ↓ Audit: none
```
Rules: an actor can only manage accounts whose authority it covers; role assignment needs `roles:assign`.
Gap: plaintext temp passwords at rest and in responses; `checkEmailExists` is global (a tenant can probe other tenants' e-mails through the 400 "already exists" message, `user-assignments.service.ts:34`, Inferred from the message).

### 10.4 Organization settings and policies
```
ACTION: Settings tabs General, Branding, Email, Security, Integrations, Features, Policies → Save; "Send test e-mail"
  ↓ C/modules/settings/components/*Tab.tsx PUT /settings/config {category,settings}; EmailTab.tsx:40 POST /settings/test-email
  ↓ configuration.routes.ts (router gate only, no finer permission) → ConfigurationService.updateConfig (service :29): ensureAppConfigTable (CREATE TABLE at runtime), per key UPSERT app_config; secrets sent as the mask are skipped
  ↓ Read: GET /settings/config returns masked values; any error → 200 with warning text and empty data
  ↓ Consumers: GET /workspace (org name/logo) → C/hooks/useWorkspace.ts → Sidebar; emailService reads tenant SMTP only when no Gmail env account is set
  ↓ Notify/Audit: none
```
Gap: the SMTP password is stored in clear in `app_config`; the router gate lets `hr` and any holder of `settings:manage` (or an `admin`-expansion permission) change organization-wide config; the dashboard Policies widget reads `GET /settings/config` for every role (`PoliciesWidget.tsx:32`), which the guard rejects for employees (Confirmed route guard; effect on the widget Inferred).

---

## 11. Reports, dashboards, audit logs, documents

### 11.1 Dashboards
```
ACTION: Open /dashboard
  ↓ C/modules/dashboard/pages/Dashboard.tsx:112-114 (client picks by role): admin/hr → GET /reports/dashboard ; manager → /reports/dashboard/manager?userId ; others → /reports/dashboard/employee?userId ; plus /attendance/today
  ↓ S/modules/reports/reports.routes.ts:18-20 (admin variant authorize reports:view; manager/employee variants authenticate only)
  ↓ reports.controller.ts: userId param must be the caller or (employees:view and same tenant) [reports.access.ts:23-27] → AnalyticsService (S/services/analyticsService.ts) raw SQL with safeQuery fallbacks (errors become zeros)
  ↓ Response bare JSON
```
### 11.2 Reports page
```
ACTION: Open /reports (admin, hr, super_admin)
  ↓ C/modules/reports/pages/Reports.tsx:62 GET /reports/summary → authorize(['reports:view']) → reports.controller.ts getReportSummary → AnalyticsService.getAdminDashboard + 30-day attendance trend query
  ↓ Response includes a fixed list `recentReports` (three fake files with sizes and today's date) [reports.controller.ts:128-132]
```
No export, scheduling or custom report exists. `GET /reports/holidays` (calendar widget) has no route.

### 11.3 Audit log viewer
```
ACTION: Open /audit-logs (admin, super_admin routes)
  ↓ C/modules/audit/pages/AuditLogPage.tsx:27 GET /audit-logs?limit=500
  ↓ S/modules/audit/read/read.routes.ts:11 authorize(['audit:view']) → read.controller.ts:getLogs → read.repository.ts (tenant filter, optional entityType/entityId/userId/action filters, ORDER BY created_at DESC)
  ↓ Response {data, pagination}; the UI filters in the browser
```
Gap: total count ignores the filters; very small event coverage (see section 0).

### 11.4 Documents
```
ACTION: Profile → Documents upload / list / verify / delete
  ↓ C/modules/profile/pages/Profile.tsx:200 POST /documents {employeeId,documentType,documentName,filePath?,fileSize?,expiresAt?}  ; list via /reports/profile/:id
  ↓ S/modules/documents/documents.routes.ts:13-16: GET /:employeeId (authenticate), POST / (authenticate), PUT /:id/verify and DELETE /:id (authorize by role names hr/admin/super_admin)
  ↓ documents.service.ts:13 read restriction only when role name is 'employee'; upload inserts for ANY employeeId in the body
  ↓ DB employee_documents (tenant_id from token; employee id not validated); no file bytes stored
```
Gaps: no employee ownership/tenant validation on upload; no file storage, virus scan or size limit beyond the 50 MB JSON limit; audit none.

---

## 12. Cross-journey side-effect matrix

| Journey | DB writes | Notification row | E-mail | Audit row | Realtime |
|---|---|---|---|---|---|
| Login | users.refresh_token, last_login | no | no | yes (LOGIN) | no |
| Logout (API unused by UI) | users.refresh_token | no | no | yes (LOGOUT) | no |
| Forgot/reset password | approvals (token), users.password | no | yes (reset link) | no | no |
| Create employee | employees, users, payroll_profiles | yes (admin, hr) | yes (offer letter + temp password) | no | no |
| Update employee | employees, users, payroll_profiles | no | yes (promotion/role/status changes) | no | no |
| Delete employee | many child tables, employees, users | no | no | no | no |
| Check in/out | attendance | no | no | no | no |
| Regularize | approvals (+ attendance on approval) | no | no | on decision only | no |
| Apply leave | leave_requests | yes (admin, hr, manager) | no | no | no |
| Decide leave via inbox | leave_requests.status | no | no | yes | no |
| Decide leave via `/leave/:id/approve` | leave_requests.status, approved_by | yes (applicant) | no | yes | no |
| Submit timesheet | timesheets | no | no | no | no |
| Decide timesheet | timesheets.status, approved_by, remarks | no | no | yes | no |
| Submit claim | claims | no | no | no | no |
| Decide claim (inbox) | claims.status | no | no | yes | no |
| Decide claim (`/claims/:id/status`) | claims.status | no | no | yes | no |
| Process payroll | payroll_runs, payroll_entries, payroll_history | yes (employees/managers, admin/hr) | no | no | no |
| Edit salary structure | payroll_profiles | no | no | no | no |
| Role assignment | users.role_id, role | yes | optional | no | no |
| Role/permission edit | roles, role_permissions | no | no | no | no |
| Settings config | app_config | no | no | no | no |
| Status change | users.availability_status | no | no | no | yes (SSE) |
| Approval decision (any kind) | target table | no (except onboarding e-mail) | onboarding only | yes | no |

## 13. Journey gaps ranked (all Confirmed unless marked)
1. `PUT /users/profile` accepts any target id (`S/modules/users/users.controller.ts:11`); chain to account takeover via forgot-password is Inferred.
2. `DELETE /employees/:id` crosses tenants for child rows (`S/modules/employees/employees.repository.ts:326-340`).
3. Employees cannot edit their own profile due to a shifted argument list (`employees.controller.ts:50`).
4. Logout does not revoke anything; refresh is not bound to the stored token (flows 1.2, 1.3).
5. Payroll "run", claims approval screen, payslips, tax summary and holiday widgets call routes that do not exist (flows 6, 7, 11.2).
6. Leave and timesheet requests created by the current flows may be invisible to the Approvals inbox (Inferred; schema drift).
7. Leave has no balance, overlap or date-order validation; decisions in the inbox do not notify applicants.
8. Notification unread badge never shows a count.
9. Audit covers 4 event sources; employee, payroll, role and settings mutations are unaudited.
10. Role-name checks (documents, employees update, attendance/timesheet cross-user reads, notification recipients, inbox scoping) disadvantage custom roles and over-expose elevated ones.

## 14. Unknowns ("Not enough evidence found in repository.")
- Whether production `leave_requests`/`timesheets` rows carry `employee_id` (decides whether finding 6 occurs).
- Which employee columns exist in production (decides the exact content of the `GET /employees` exposure).
- Real role/permission sets per production tenant (the OW-4 export is not in the repository; only `docs/audit/OW4_PERMISSION_EXPORT.sql` the query).
- Whether SMTP is configured and delivering (no logs or settings available).

## 15. Files actually opened
Server: `src/app.ts`, `src/index.ts`, `src/core/security/{authorize,authzState,identity,jwt.service,password.service}.ts`, `src/core/errors/errorHandler.ts`, `src/core/events/*` (registry, types, publisher), `src/modules/auth/{auth.routes (via grep),auth.controller,auth.service,auth.repository,auth.schema}.ts`, `src/modules/approvals/{routes,controller,policy,schema,audit,service,repository}.ts`, `src/modules/leaves/{routes (grep),controller,service,repository,schema}.ts`, `src/modules/employees/{routes,controller,service,repository,profile.visibility}.ts`, `src/modules/attendance/{controller,service,repository (grep)}.ts`, `src/modules/timesheets/{controller,service,repository}.ts`, `src/modules/claims/{service,routes,schema}.ts`, `src/modules/payroll/{routes,controller,service,schema,repository (grep)}.ts`, `src/modules/organization/{routes,controller,service,repository}.ts`, `src/modules/governance/{index,org-tree/*,sync/*}.ts`, `src/modules/settings/{index,rbac/{routes,service},user-assignments/{controller,service,repository},configuration/{service,secrets}}.ts`, `src/modules/notifications/{index,channels/*,templates/templates.service,core/{controller,repository}}.ts`, `src/modules/audit/*`, `src/modules/realtime/*`, `src/modules/documents/*`, `src/modules/users/*`, `src/modules/workspace/*`, `src/modules/reports/{routes,controller,access}.ts`, `src/services/{emailService,notificationService}.ts`, `src/initDb.ts` (excerpts), `src/scripts/seedPermissions.ts` (excerpt).
Client: `src/App.tsx`, `src/services/{api,sessionSync}.ts`, `src/hooks/{useSessionSync,useWorkspace}.ts`, `src/store/authStore.ts`, `src/utils/searchAccess.ts`, `src/components/layout/{MainLayout,Topbar}.tsx`, `src/modules/auth/{pages/LoginPage,pages/ChangePasswordPage,components/ProtectedRoute,components/ForgotPasswordModal,utils/resetToken}.tsx|ts`, `src/modules/approvals/{pages/Approvals,components/NewRequestModal}.tsx`, `src/modules/employees/components/EmployeeTable.tsx` (excerpt), `src/modules/profile/pages/Profile.tsx` (excerpt), `src/modules/profile/components/PersonalInfo.tsx` (excerpt); the full list of `api.*` call sites was obtained by grep across `client/src`.
Repo: `.github/workflows/ci.yml`, `render.yaml`, `vercel.json`, `docs/audit/tools/route_contract_check.py` (executed), baseline audit documents (grep and partial reads), `git log` and `git diff --stat`.
