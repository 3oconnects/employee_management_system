# Graph Report - employee_management_system  (2026-09-29)

## Corpus Check
- 406 files · ~167,796 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 7 file(s) not represented in the graph (top: (none) 3, .csv 1, .css 1)

## Summary
- 1777 nodes · 3540 edges · 109 communities (72 shown, 37 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 153 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- EventBus & Realtime Core
- Audit Logging & Tracking
- RBAC & Access Control
- RBAC & Access Control
- RBAC & Access Control
- Leave Management System
- System Settings & Config
- Payroll & Compensation Engine
- Approvals Workflow
- Payroll & Compensation Engine
- Attendance & Time Tracking
- Leave Management System
- Payroll & Compensation Engine
- EventBus & Realtime Core
- Leave Management System
- Leave Management System
- System Settings & Config
- Payroll & Compensation Engine
- Auth, Security & JWT
- Employee Core Directory
- Auth, Security & JWT
- Audit Logging & Tracking
- Attendance & Time Tracking
- Package Services
- Audit Logging & Tracking
- System Settings & Config
- Attendance & Time Tracking
- Auth, Security & JWT
- RBAC & Access Control
- Payroll & Compensation Engine
- Attendance & Time Tracking
- Payroll & Compensation Engine
- Attendance & Time Tracking
- Payroll & Compensation Engine
- RBAC & Access Control
- Attendance & Time Tracking
- Dashboard Module
- Employee Core Directory
- Audit Logging & Tracking
- Payroll & Compensation Engine
- Package Services
- Leave Management System
- Employee Core Directory
- Auth, Security & JWT
- EventBus & Realtime Core
- System Settings & Config
- Auth, Security & JWT
- RBAC & Access Control
- Auth, Security & JWT
- Governance Module
- Notifications & Communications
- Employee Core Directory
- Mainlayout Services
- Employee Core Directory
- Tsconfig Services
- Auth, Security & JWT
- Auth, Security & JWT
- Employee Core Directory
- Performance Module
- Performance Module
- Tsconfig Services
- Attendance & Time Tracking
- Package Services
- Auth, Security & JWT
- Attendance & Time Tracking
- Users Module
- Employee Core Directory
- Governance Module
- Governance Module
- System Settings & Config
- Attendance & Time Tracking
- Approvals Workflow
- Employee Core Directory
- Attendance & Time Tracking
- Notifications & Communications
- Users Module
- Tsconfig.Node Services
- Database Connection & Pooling
- Dashboard Module
- Employee Core Directory
- Vite.Config Services
- Approvals Workflow
- Audit Logging & Tracking
- Governance Module
- Governance Module
- Vercel Services
- Employee Core Directory
- Leave Management System
- Package Services
- Package Services
- Database Connection & Pooling
- Database Connection & Pooling
- Auth, Security & JWT
- Approvals Workflow
- Database Connection & Pooling
- Vite Env.D Services
- Audit Logging & Tracking
- Notifications & Communications
- Analytics & Reporting
- Performance Module
- Performance Module
- EventBus & Realtime Core
- Organization & Teams Structure
- Organization & Teams Structure
- Package Services

## God Nodes (most connected - your core abstractions)
1. `react` - 134 edges
2. `lucide-react` - 114 edges
3. `express` - 73 edges
4. `api` - 60 edges
5. `useAuthStore` - 43 edges
6. `pool` - 32 edges
7. `AuthenticatedRequest` - 32 edges
8. `AppError` - 29 edges
9. `authenticate()` - 28 edges
10. `asyncHandler()` - 27 edges

## Surprising Connections (you probably didn't know these)
- `RootRedirect()` --calls--> `useAuthStore`  [EXTRACTED]
  client/src/App.tsx → client/src/store/authStore.ts
- `Attendance()` --calls--> `useAuthStore`  [EXTRACTED]
  client/src/modules/attendance/pages/Attendance.tsx → client/src/store/authStore.ts
- `Can()` --calls--> `useAuthStore`  [EXTRACTED]
  client/src/modules/auth/components/Can.tsx → client/src/store/authStore.ts
- `ChangePasswordPage()` --calls--> `useAuthStore`  [EXTRACTED]
  client/src/modules/auth/pages/ChangePasswordPage.tsx → client/src/store/authStore.ts
- `ApplyLeave()` --calls--> `useAuthStore`  [EXTRACTED]
  client/src/modules/leave/pages/ApplyLeave.tsx → client/src/store/authStore.ts

## Import Cycles
- None detected.

## Communities (109 total, 37 thin omitted)

### Community 0 - "EventBus & Realtime Core"
Cohesion: 0.05
Nodes (53): ref_crypto, ref_events, eventBus, InternalEventBus, AuditLogRequestedPayload, BaseDomainEvent, GovernanceSyncCompletedPayload, NotificationCreatedPayload (+45 more)

### Community 1 - "Audit Logging & Tracking"
Cohesion: 0.05
Nodes (34): AuditLogPage, BadgeProps, ButtonProps, CardProps, Column, DataTableProps, EmptyStateProps, LoadingSpinner() (+26 more)

### Community 2 - "RBAC & Access Control"
Cohesion: 0.05
Nodes (27): getConfig(), service, testEmail(), updateConfig(), router, router, createRole(), deleteRole() (+19 more)

### Community 3 - "RBAC & Access Control"
Cohesion: 0.06
Nodes (38): Settings, BrandingTab(), Props, EmailTab(), Props, ADVANCED_FEATURES, FeatureControlTab(), MODULES (+30 more)

### Community 4 - "RBAC & Access Control"
Cohesion: 0.05
Nodes (13): bcrypt, jsonwebtoken, bcrypt, { Pool }, env, envSchema, JwtService, PasswordService (+5 more)

### Community 5 - "Leave Management System"
Cohesion: 0.06
Nodes (33): EmpDashData, EmployeeDashboard(), EmployeeDashboardProps, LEAVE_COLORS, MySpaceProfile(), AnnouncementsWidget(), MOCK_ANNOUNCEMENTS, PRIORITY_STYLES (+25 more)

### Community 6 - "System Settings & Config"
Cohesion: 0.06
Nodes (19): SectionHeaderProps, StatCardProps, StatsCardProps, OnboardingModalProps, StructuralDeepDiveProps, AllocationIndex(), AllocationIndexProps, FinancialAnalysisStats() (+11 more)

### Community 7 - "Payroll & Compensation Engine"
Cohesion: 0.07
Nodes (29): Reports, AdminDashboard(), Claim, EmployeePayroll(), Payslip, Profile(), AttendanceReport(), AttendanceReportProps (+21 more)

### Community 8 - "Approvals Workflow"
Cohesion: 0.07
Nodes (17): createDepartment(), createTeam(), deleteDepartment(), deleteTeam(), getDepartments(), getTeams(), getTeamStatus(), service (+9 more)

### Community 9 - "Payroll & Compensation Engine"
Cohesion: 0.07
Nodes (14): getLiveSummary(), getPayrollActivity(), getPayrollDeadlines(), getPayrollEmployees(), getPayrollRuns(), getPendingApprovals(), getTaxSummary(), processPayroll() (+6 more)

### Community 10 - "Attendance & Time Tracking"
Cohesion: 0.08
Nodes (14): checkIn(), checkOut(), getHistory(), getSummary(), getTodayStatus(), getWeeklyHours(), regularize(), service (+6 more)

### Community 11 - "Leave Management System"
Cohesion: 0.08
Nodes (14): applyLeave(), approveLeave(), deleteLeaveRequest(), getLeaveBalance(), getLeaveRequests(), getLeaveTypes(), service, updateLeaveRequest() (+6 more)

### Community 12 - "Payroll & Compensation Engine"
Cohesion: 0.08
Nodes (17): DonutChartProps, Segment, MiniBarChartProps, CreateProfileModal(), CreateProfileModalProps, PayrollPersonnelStats(), PayrollPersonnelStatsProps, PayrollPersonnelTable() (+9 more)

### Community 13 - "EventBus & Realtime Core"
Cohesion: 0.13
Nodes (20): express, asyncHandler(), authenticate(), ELEVATED_ROLES, requireSelfOrAdmin(), ROLE_TO_PERMISSIONS, getLogs(), service (+12 more)

### Community 14 - "Leave Management System"
Cohesion: 0.10
Nodes (22): Approvals, ApprovalCard(), ApprovalCardProps, ApprovalNav(), ApprovalNavProps, ApprovalSidebar(), ApprovalSidebarProps, ApprovalStats() (+14 more)

### Community 15 - "Leave Management System"
Cohesion: 0.14
Nodes (19): Tab, TABS, CompensationTab(), CompensationTabProps, DocumentsTab(), DocumentsTabProps, EmergencyTab(), EmergencyTabProps (+11 more)

### Community 16 - "System Settings & Config"
Cohesion: 0.12
Nodes (19): Profile, Props, EduEntry, BLANK, DEGREES, EducationTab(), Props, ProfileHeader() (+11 more)

### Community 17 - "Payroll & Compensation Engine"
Cohesion: 0.22
Nodes (15): Props, TabId, TABS, Props, EducationSection(), ExperienceSection(), Field(), AddEmployeeForm (+7 more)

### Community 18 - "Auth, Security & JWT"
Cohesion: 0.08
Nodes (23): adm-zip, cors, express-rate-limit, nodemailer, nodemon, ts-node, tsx, @types/adm-zip (+15 more)

### Community 19 - "Employee Core Directory"
Cohesion: 0.13
Nodes (19): createPerformanceReview(), deletePerformanceReview(), getPerformanceReviews(), service, updatePerformanceReview(), router, createPerformanceReviewSchema, updatePerformanceReviewSchema (+11 more)

### Community 20 - "Auth, Security & JWT"
Cohesion: 0.12
Nodes (13): App(), ChangePasswordPage, Dashboard, Onboarding, OrganizationPage, RootRedirect(), StructuralDeepDivePage, client_src_index (+5 more)

### Community 21 - "Audit Logging & Tracking"
Cohesion: 0.09
Nodes (22): ApiResponse, AttendanceRecord, AuditLog, Employee, EmployeeDTO, LeaveRequest, LeaveType, Notification (+14 more)

### Community 22 - "Attendance & Time Tracking"
Cohesion: 0.11
Nodes (13): Attendance, AttendanceCalendar(), DayData, LEGEND, Props, sm(), STATUS, AttendanceHero() (+5 more)

### Community 23 - "Package Services"
Cohesion: 0.10
Nodes (19): typescript, zod, name, private, type, version, autoprefixer, axios (+11 more)

### Community 24 - "Audit Logging & Tracking"
Cohesion: 0.12
Nodes (16): globalErrorHandler(), notFoundHandler(), apiLimiter, app, authLimiter, router, router, router (+8 more)

### Community 26 - "Attendance & Time Tracking"
Cohesion: 0.08
Nodes (20): AttendanceStatus, ABSENT, HALF_DAY, ON_DUTY, PRESENT, EmployeeStatus, ACTIVE, INACTIVE (+12 more)

### Community 27 - "Auth, Security & JWT"
Cohesion: 0.11
Nodes (9): pg, pool, pg, { Pool }, { Pool }, { Pool }, check(), { Pool } (+1 more)

### Community 28 - "RBAC & Access Control"
Cohesion: 0.14
Nodes (14): NotificationType, showToast(), toastListeners, ToastNotification, UseApiOptions, UseApiReturn, useAuth(), useModuleAccess() (+6 more)

### Community 29 - "Payroll & Compensation Engine"
Cohesion: 0.12
Nodes (3): withTransaction(), EmployeesRepository, EmployeesService

### Community 31 - "Payroll & Compensation Engine"
Cohesion: 0.15
Nodes (12): getAdminDashboard(), getAnalytics(), getEmployeeDashboard(), getEmployeeProfile(), getManagerDashboard(), getReportSummary(), getTeamEmployees(), AdminDashboardData (+4 more)

### Community 33 - "Payroll & Compensation Engine"
Cohesion: 0.15
Nodes (13): GeneratePayroll, GeneratePayroll(), Approvals(), DocumentsPayslips(), Employee, MONTHS, EmployeePayrollManagement(), inr() (+5 more)

### Community 34 - "RBAC & Access Control"
Cohesion: 0.20
Nodes (12): bcryptjs, run(), migrationQuery(), runMigrationV3(), SEED_DEPARTMENTS, SEED_HOLIDAYS_2026, initializeDatabase(), PERMISSIONS_LIST (+4 more)

### Community 35 - "Attendance & Time Tracking"
Cohesion: 0.19
Nodes (16): Timesheets, blankRow(), DAY_LABELS, DayKey, DAYS, EntryRow, fmtDate(), fmtWeekRange() (+8 more)

### Community 36 - "Dashboard Module"
Cohesion: 0.15
Nodes (13): AdminDashboardProps, AdminStats, DEPT_COLORS, Holiday, KpiCardProps, RecentActivity, ManagerDashboard(), ManagerDashboardProps (+5 more)

### Community 37 - "Employee Core Directory"
Cohesion: 0.15
Nodes (13): BulkUploadModal(), parseCSV(), Props, REQUIRED_COLS, SAMPLE_ROW, Step, TEMPLATE_HEADERS, UploadResult (+5 more)

### Community 38 - "Audit Logging & Tracking"
Cohesion: 0.20
Nodes (5): query(), server_src_db_connection_query, AuditWriteRepository, NotificationChannelsRepository, NotificationsCoreRepository

### Community 40 - "Package Services"
Cohesion: 0.12
Nodes (16): devDependencies, autoprefixer, eslint, eslint-plugin-react-hooks, eslint-plugin-react-refresh, postcss, tailwind-merge, tailwindcss (+8 more)

### Community 41 - "Leave Management System"
Cohesion: 0.15
Nodes (13): ApplyLeave, LeaveBalance, LeaveBalances(), LeaveBalancesProps, LeaveForm(), LeaveFormData, LeaveFormProps, LeaveType (+5 more)

### Community 42 - "Employee Core Directory"
Cohesion: 0.19
Nodes (10): ApiResponse, bulkUpload(), createEmployee(), getEmployees(), service, updateEmployee(), router, bulkUploadSchema (+2 more)

### Community 43 - "Auth, Security & JWT"
Cohesion: 0.18
Nodes (11): authorize(), router, getOrgTree(), searchNodes(), service, updateGovernance(), router, router (+3 more)

### Community 44 - "EventBus & Realtime Core"
Cohesion: 0.22
Nodes (7): getStream(), router, RealtimeClient, RealtimeConnectionsService, RealtimeEventsService, RealtimeService, router

### Community 45 - "System Settings & Config"
Cohesion: 0.23
Nodes (7): router, buildRoleAssignmentEmail(), buildWelcomeEmail(), EmailOptions, getSmtpConfig(), sendEmail(), SmtpConfig

### Community 46 - "Auth, Security & JWT"
Cohesion: 0.13
Nodes (15): dependencies, adm-zip, bcrypt, bcryptjs, cors, dotenv, express, express-rate-limit (+7 more)

### Community 47 - "RBAC & Access Control"
Cohesion: 0.17
Nodes (7): { pool }, directPool, pool, NOTE: TLS verification is disabled per-pool via ssl.rejectUnauthorized=false, start(), ALL_PERMISSIONS, seedPermissionsAndSuperAdmin()

### Community 50 - "Notifications & Communications"
Cohesion: 0.20
Nodes (7): getNotifications(), markAllAsRead(), markAsRead(), service, router, NotificationsCoreService, coreService

### Community 51 - "Employee Core Directory"
Cohesion: 0.23
Nodes (12): EmployeeTable, clr(), COLORS, Employee, EmployeeTable(), fmtId(), ini(), ST (+4 more)

### Community 52 - "Mainlayout Services"
Cohesion: 0.18
Nodes (10): MainLayout(), MenuItem, MenuSection, Sidebar(), sidebarSections, SubMenuItem, AVATAR_COLORS, getAvatarColor() (+2 more)

### Community 54 - "Tsconfig Services"
Cohesion: 0.14
Nodes (13): compilerOptions, allowJs, esModuleInterop, forceConsistentCasingInFileNames, lib, module, moduleResolution, outDir (+5 more)

### Community 55 - "Auth, Security & JWT"
Cohesion: 0.15
Nodes (13): devDependencies, nodemon, ts-node, tsx, @types/bcrypt, @types/bcryptjs, @types/cors, @types/express (+5 more)

### Community 60 - "Tsconfig Services"
Cohesion: 0.17
Nodes (11): compilerOptions, esModuleInterop, jsx, module, moduleResolution, outDir, rootDir, skipLibCheck (+3 more)

### Community 61 - "Attendance & Time Tracking"
Cohesion: 0.29
Nodes (9): approveTimesheet(), getPendingTimesheets(), getTimesheetByWeek(), getTimesheetHistory(), saveTimesheetEntries(), service, submitTimesheet(), approveTimesheetSchema (+1 more)

### Community 62 - "Package Services"
Cohesion: 0.18
Nodes (11): dependencies, axios, @hookform/resolvers, lodash, lucide-react, react, react-dom, react-hook-form (+3 more)

### Community 63 - "Auth, Security & JWT"
Cohesion: 0.25
Nodes (8): Can(), CanProps, ProtectedRoute(), ProtectedRouteProps, AuthState, User, UserRole, zustand

### Community 64 - "Attendance & Time Tracking"
Cohesion: 0.25
Nodes (9): AttendanceRecord, AttendanceTab(), CalendarGrid(), fmt12(), fmtHrs(), Props, sm(), statusMeta (+1 more)

### Community 65 - "Users Module"
Cohesion: 0.27
Nodes (7): ref_zod, validateRequest(), getUsers(), service, updateProfile(), router, updateProfileSchema

### Community 66 - "Employee Core Directory"
Cohesion: 0.29
Nodes (8): getAllClaims(), getEmployeeClaims(), service, submitClaim(), updateClaimStatus(), router, submitClaimSchema, updateClaimStatusSchema

### Community 67 - "Governance Module"
Cohesion: 0.29
Nodes (8): getOrgTree(), resolveOwnership(), searchNodes(), service, syncGraph(), updateGovernance(), router, updateGovernanceSchema

### Community 70 - "Attendance & Time Tracking"
Cohesion: 0.27
Nodes (8): AttendanceTab(), AttendanceTabProps, AXIS_TICKS, DAY_LABELS, durationH(), fmt12(), toAxisPct(), WeekTimeline()

### Community 71 - "Approvals Workflow"
Cohesion: 0.31
Nodes (7): createApprovalRequest(), getApprovals(), service, updateApprovalAction(), router, createApprovalSchema, updateApprovalActionSchema

### Community 72 - "Employee Core Directory"
Cohesion: 0.33
Nodes (7): deleteDocument(), getEmployeeDocuments(), service, uploadDocument(), verifyDocument(), uploadDocumentSchema, verifyDocumentSchema

### Community 73 - "Attendance & Time Tracking"
Cohesion: 0.31
Nodes (7): AttendanceHistory(), HistoryRecord, msToHM(), pad(), Props, sm(), STATUS_META

### Community 76 - "Tsconfig.Node Services"
Cohesion: 0.25
Nodes (7): compilerOptions, allowSyntheticDefaultImports, composite, module, moduleResolution, skipLibCheck, include

### Community 77 - "Database Connection & Pooling"
Cohesion: 0.25
Nodes (8): scripts, build, db:migrate, db:seed, db:setup, dev, migrate:cleanup, start

### Community 78 - "Dashboard Module"
Cohesion: 0.38
Nodes (6): DEPT_COLORS, DeptCard(), DeptData, DeptTreeWidget(), initials(), MemberCard()

### Community 79 - "Employee Core Directory"
Cohesion: 0.38
Nodes (6): clr(), COLORS, EmpOption, ini(), ManagerPicker(), Props

### Community 80 - "Vite.Config Services"
Cohesion: 0.29
Nodes (4): ref_fs, ref_path, vite, @vitejs/plugin-react

### Community 81 - "Approvals Workflow"
Cohesion: 0.29
Nodes (4): dotenv, pool, dotenv, { Pool }

### Community 85 - "Vercel Services"
Cohesion: 0.29
Nodes (6): builds, env, NODE_ENV, name, routes, version

### Community 86 - "Employee Core Directory"
Cohesion: 0.40
Nodes (5): Props, ExpEntry, BLANK, ExperienceTab(), Props

### Community 87 - "Leave Management System"
Cohesion: 0.40
Nodes (5): getStatus(), LeaveRequest, LeaveRequests(), LeaveRequestsProps, statusMeta

### Community 88 - "Package Services"
Cohesion: 0.40
Nodes (5): scripts, build, dev, lint, preview

### Community 93 - "Approvals Workflow"
Cohesion: 0.50
Nodes (3): ApprovalRequest, ApprovalStatus, ApprovalType

## Knowledge Gaps
- **469 isolated node(s):** `type`, `pg`, `pool`, `name`, `private` (+464 more)
  These have ≤1 connection - possible missing edges. (Counts symbols only; 818 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **37 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `express` connect `EventBus & Realtime Core` to `EventBus & Realtime Core`, `RBAC & Access Control`, `RBAC & Access Control`, `Approvals Workflow`, `Payroll & Compensation Engine`, `Attendance & Time Tracking`, `Leave Management System`, `Auth, Security & JWT`, `Employee Core Directory`, `Audit Logging & Tracking`, `Audit Logging & Tracking`, `Payroll & Compensation Engine`, `Employee Core Directory`, `Auth, Security & JWT`, `EventBus & Realtime Core`, `System Settings & Config`, `Notifications & Communications`, `Auth, Security & JWT`, `Attendance & Time Tracking`, `Users Module`, `Employee Core Directory`, `Governance Module`, `Approvals Workflow`, `Employee Core Directory`, `Package Services`?**
  _High betweenness centrality (0.262) - this node is a cross-community bridge._
- **Why does `react` connect `Payroll & Compensation Engine` to `Audit Logging & Tracking`, `RBAC & Access Control`, `Leave Management System`, `System Settings & Config`, `Payroll & Compensation Engine`, `Leave Management System`, `Leave Management System`, `System Settings & Config`, `Payroll & Compensation Engine`, `Auth, Security & JWT`, `Attendance & Time Tracking`, `Package Services`, `RBAC & Access Control`, `Payroll & Compensation Engine`, `Attendance & Time Tracking`, `Dashboard Module`, `Employee Core Directory`, `Leave Management System`, `Employee Core Directory`, `Mainlayout Services`, `Auth, Security & JWT`, `Attendance & Time Tracking`, `Attendance & Time Tracking`, `Attendance & Time Tracking`, `Dashboard Module`, `Employee Core Directory`, `Employee Core Directory`, `Leave Management System`?**
  _High betweenness centrality (0.210) - this node is a cross-community bridge._
- **Why does `lucide-react` connect `System Settings & Config` to `Audit Logging & Tracking`, `RBAC & Access Control`, `Leave Management System`, `Payroll & Compensation Engine`, `Payroll & Compensation Engine`, `Leave Management System`, `Leave Management System`, `System Settings & Config`, `Payroll & Compensation Engine`, `Auth, Security & JWT`, `Attendance & Time Tracking`, `Package Services`, `Payroll & Compensation Engine`, `Attendance & Time Tracking`, `Dashboard Module`, `Employee Core Directory`, `Leave Management System`, `Employee Core Directory`, `Mainlayout Services`, `Attendance & Time Tracking`, `Attendance & Time Tracking`, `Attendance & Time Tracking`, `Dashboard Module`, `Employee Core Directory`, `Employee Core Directory`, `Leave Management System`?**
  _High betweenness centrality (0.139) - this node is a cross-community bridge._
- **What connects `type`, `pg`, `pool` to the rest of the system?**
  _469 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `EventBus & Realtime Core` be split into smaller, more focused modules?**
  _Cohesion score 0.05328218243819267 - nodes in this community are weakly interconnected._
- **Should `Audit Logging & Tracking` be split into smaller, more focused modules?**
  _Cohesion score 0.05194805194805195 - nodes in this community are weakly interconnected._
- **Should `RBAC & Access Control` be split into smaller, more focused modules?**
  _Cohesion score 0.05450733752620545 - nodes in this community are weakly interconnected._