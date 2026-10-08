# Production Readiness Report (v2)

Baseline: 2026-10-04 audit @06dc08f. Re-verified against HEAD `42aaace` + uncommitted work, 2026-10-06.
Method: static analysis by five parallel tracks; findings below are synthesized from the sibling documents in this folder. Scores are the auditor's judgment, not measurements. Playwright executed against a throwaway local Postgres: 123 tests, 114 passed, 6 failed, 3 skipped (setup-caused). See `PLAYWRIGHT_TEST_REPORT.md` and `BUG_REPORT.md` (authoritative).

Sibling documents: `SYSTEM_ARCHITECTURE_REPORT.md`, `END_TO_END_FLOW_MAP.md`, `API_DOCUMENTATION.md`, `DATABASE_ANALYSIS.md`, `SECURITY_AUDIT.md`, `PERFORMANCE_AUDIT.md`, `UI_UX_REVIEW.md`, `PLAYWRIGHT_TEST_REPORT.md`, `BUG_REPORT.md`.

## Executive summary

The ten security hotfixes (HF-1..HF-10) landed and were confirmed in code: master-password backdoor removed, JWT secrets required, password reset hardened, approval and sensitive-action authorization closed, tenant binding on key reads/writes, settings secrets masked, role escalation closed. That is real progress and removes the baseline's worst items.

The system is **not production-ready for a multi-tenant deployment**. Three independent tracks (API, security, architecture) converged on two tenant-breaking authorization defects that remain, plus a set of data-exposure and integrity gaps. Operational maturity (migrations, audit trail, observability, tests) is thin.

### Severity reconciliation
The API track rated the two items below Critical; the security track rated them High. Because three tracks independently found them and the first can destroy another tenant's data, this report treats them as **Critical**.

| ID | Sev | Finding | Source |
|---|---|---|---|
| C-1 | Critical | `DELETE /employees/:id` deletes ~15 child tables by employee id with no tenant filter and commits even if the tenant-scoped delete matches 0 rows; employee ids are global sequential `EMP###`. Cross-tenant data destruction by id guessing. (`employees.repository.ts:323-390`) | API S-01, Sec N-02, Arch #2 |
| C-2 | Critical | `PUT /users/profile` takes target `id` from the request body, no authorization: any user can rewrite another same-tenant user's name/login email/phone (lockout, identity corruption; possible takeover via reset flow, Inferred). (`users.controller.ts:11`, `users.repository.ts:4-17`) | API S-02, Sec N-01, Arch #1 |
| H-1 | High | `GET /employees` returns `SELECT e.*` (CTC, bank account, DOB) to every role passing the guard; avatars inline. | API S-04, Sec SEC-13 |
| H-2 | High | `/settings` gate passes any broad-permission holder; SMTP/webhook config writable and `POST /settings/test-email` is a mail relay. | API S-03, Sec N-04 |
| H-3 | High | `GET/PUT /performance` unguarded across tenant reviews; document records attachable to any employee. | API S-06/S-07 |
| H-4 | High | Approvals scoped by role-name string; custom roles see whole tenant; NULL-tenant rows visible to all. | API S-14b, Sec N-06, Arch #5 |
| H-5 | High | Governance/org nodes written without `tenant_id` → `'default'`, readable by every tenant. | API S-08, Sec NEW-DB-2 |
| H-6 | High | Refresh token never compared with stored value; logout/reset/deactivation do not revoke; UI logout does not call `/auth/logout`. 7-day stolen-token window. | API S-09, Sec SEC-09, Arch #4 |
| H-7 | High | Credentials committed in 7 historical commits (history not purged). Current values differ from historical per hash comparison; production rotation unknown. | Sec SEC-07 |
| H-8 | High (functional) | `PUT /employees/:id` calls `isEmployeeOwner` with 3 args vs 4-param signature: non-HR users cannot edit own profile. | API S-05, Arch #3 |

Other notable: no helmet; CORS trusts any `*.vercel.app` with credentials; `?token=` JWT in query accepted; plaintext temp passwords accepted at login; self-edit blacklist incomplete (employee can change own email/manager/bank account); 50 MB body limit; no input validation on path/query params (500s); auditing covers only login/logout/profile/approvals; 18 client calls have no server route (e.g. payroll run posts `/payroll/run`, server has `/payroll/process`); notification unread badge reads the wrong response field.

## Runtime verification (Playwright)
Schema caveat: `0000_live_schema.sql` is missing, so the test DB was built from `initDb.ts` + migrations with hand-patched columns; leave approval was never verified and some flows are environment-limited.

- **Confirmed at runtime:** manager gets 200 on `GET /settings/roles` and `/settings/users` (H-2 partially: role create/change/status/password reset were denied with 403); non-HR self-edit `PUT /employees/:id` returns 403 (H-8); CORS reflects any `*.vercel.app` origin with credentials; no `x-content-type-options` header; `POST /leave/apply` with end date before start returns 201 (new, Medium); JWT in `/realtime/stream?token=`; client logout never calls the server (H-6).
- **Refuted at runtime:** suspected IDOR on other employees' education/experience/emergency contacts, update-other-employee, and cross-employee claims were all denied.
- **Not exercised by tests:** C-1 (cross-tenant delete) and C-2 (`PUT /users/profile`) remain code-reading findings, not runtime-confirmed.

## Scorecard (1–10, auditor judgment)

| Category | Score | Basis |
|---|---|---|
| Reliability | 4 | Several broken/stubbed flows (payroll run route mismatch, history stub, claims approval routes missing); no duplicate-period guard on payroll; employee create awaits PDF+SMTP inside a transaction; seeding on every start. |
| Maintainability | 5 | Module structure (controller/service/repository/policy) is sound; undermined by ~40 dead/duplicate files, two permission vocabularies, ~15 duplicated route wrappers, role lists duplicated, tracked scratch scripts, empty authz matrix test. |
| Scalability | 4 | 3 DB pools (23 conn/process), unbounded `limit`, N inserts per payroll, per-row bulk-upload transactions, five widgets each fetching 500 employees, in-memory SSE and rate limiter (single-instance only), no compression/caching. |
| Security | 4 | Improved from baseline (0 → still 2 Critical by this report's rating). Tenant isolation is by hand-written predicates (~41 `tenant_default`/NULL fallbacks), no RLS. |
| Observability | 4 | Sentry present in source (not in the stale `dist`), audit trail narrow; no evidence of metrics/tracing/alerting. Unknown whether Sentry/SMTP configured in prod. |
| Disaster recovery | 2 | Live schema baseline `server/db/baseline/0000_live_schema.sql` does not exist; no migration tool; no backup/restore evidence in repo. |
| Testing | 3 | 17 commits added unit tests (tenant isolation, secrets, approvals); authz matrix test empty; Playwright suite (123 tests) authored this audit — see test report for run status. |
| UX/Accessibility | 5 | Approvals gating/search access/ConfirmDialog improved; shell not mobile-capable, generic Modal lacks dialog semantics/focus trap, low-contrast text widespread. |

**Overall health score: 4.3 / 10** (mean of the eight above).
**Production readiness score: 3 / 10** for multi-tenant/public use; ~5 / 10 for a single-tenant, trusted-network pilot *after* C-1, C-2, H-1..H-3 are fixed.
**Technical debt score: 6.5 / 10 (high debt; 10 = worst).**

## Refactoring / remediation priority list

**P0 – before any further tenant exposure**
1. C-1: scope every child delete by `tenant_id`; wrap in one transaction and abort when the parent delete affects 0 rows; consider soft delete.
2. C-2: derive target user from the session (or require an admin permission); validate body with zod.
3. H-1: replace `SELECT e.*` with a column allow-list by viewer permission (reuse the profile-visibility logic from commit 42aaace); remove inline base64 avatars.
4. H-2/H-3: per-route permission guards on `/settings/*`, `/performance`, documents.
5. H-7: rotate all credentials (DB, JWT, SMTP) in production regardless; purge history or treat it as compromised.
6. Decide the production schema source of truth: produce `0000_live_schema.sql` (B0-01 is already a known blocker).

**P1**
7. H-4/H-5: make approvals and governance scoping permission/tenant-based, not role-name-based; backfill `tenant_id` and add NOT NULL.
8. H-6: store/compare hashed refresh tokens, revoke on logout/reset/deactivation, call `/auth/logout` from the UI.
9. Fix B-1/H-8 owner-check signature (and type `user`); complete self-edit blacklist.
10. Add helmet, tighten CORS (explicit origins), remove `?token=` query auth, lower body limit, add path/query validation.
11. Introduce a migration tool and indexes: `lower(email)`, reset-token lookup, unique payroll-run/timesheet-week constraints, unindexed FKs.
12. Wire missing endpoints or remove dead client calls (18 unmatched); fix notification badge field.

**P2**
13. Broaden audit logging to employee/payroll/role/settings mutations.
14. Performance: single employees fetch shared via a query cache, manual chunks and non-blocking fonts, memoization, hoist 1 s timers out of page roots; fix `EmployeeTable` debounce/double fetch/SSE reconnect.
15. Mobile shell, accessible Modal, focus styles, contrast pass.
16. Delete dead code and tracked scratch scripts; unify permission vocabulary; fill the authz matrix test.
17. Rate limiting backed by a shared store if running more than one instance.

## Unknowns that a human can resolve quickly
- Which of Render or Vercel is live, and whether Sentry/SMTP are configured.
- Production schema, role/permission rows, and which permission vocabulary runs in prod.
- Whether production credentials were rotated since the 7 historical commits.
- Whether the client still calls `PUT /users/profile`.
- Dependency vulnerabilities (`npm audit` was not run).
