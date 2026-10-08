# EXECUTION BASELINE (2026-10-05, Execution Day 1)

Current HEAD:        06dc08f on feat/nexus-brand-foundation (linear stack: main 83c1e84 → release-0/safety-net c4ce621 → Nexus 06dc08f; no divergence, no merge conflicts expected)
Working tree:        clean except untracked docs/audit/{AUDIT_PROGRESS,MASTER_COMPLETION_PLAN,PRODUCT_EVOLUTION_UPGRADE_REPORT}.md, docs/audit/_raw/, .claude/
Rollback tag:        v0-baseline → 83c1e84 (local only, not pushed)
Remote:              origin = github.com/3oconnects/employee_management_system; origin/main = 83c1e84. Release 0 and Nexus are NOT on the remote
CI:                  none (.github absent)
Owner blockers:      OW-1 rotate secrets; OW-2 admin@company.com check; OW-3 schema dump; OW-4 permission export (blocks HF-9A); OW-5 restore drill; OW-6 staging; OW-7 Sentry; OW-8 main protection. None evidenced complete.

Re-verified at HEAD (no drift from the audit):
  HF-1  auth.service.ts:23 master password; seedPermissions.ts:138-149 and initDb.ts:451-464 admin coercion/reset
  HF-2  config/env.ts:9-10 JWT defaults
  HF-3  auth.service.ts:162,207 token returned; :246 token optional
  HF-4  approvals.routes.ts:14 action route has no permission guard
  HF-5  payroll, audit-read, leaves, timesheets, claims routes: only the authenticate import, no authorize
  HF-6  analyticsService.ts:660 `WHERE e.id = $1`, no tenant
  HF-7  user-assignments.repository.ts:9,39 temp_password selected and returned; smtp_pass returned by config
  HF-8  no .github directory
  HF-9A authorize.ts:85-93 dashboard_type admin bypass (waits for OW-4)

First implementation item: consolidation (push Release 0, PR, rebase Nexus, PR), then HF-8 (CI) → HF-1
Expected branch:     fix/HF-8-ci-baseline, then fix/HF-1-remove-master-password
Expected tests:      HF-1: login with admin@company.com/admin123 and Admin@123 → 401 (repo mocked); existing 17 tests stay green; tsc server+client; check:routes unchanged (18 unmatched)
