# Release 0 — Final Verification & Production Gate

**Branch:** `release-0/safety-net` · **HEAD:** `83c1e84d9a5834a33f72cc444aa55b89cd71b55b` (Release 0 changes uncommitted) · **Verified:** 2026-10-02
**Machine-readable handoff:** [`release1_handoff.json`](release1_handoff.json)

## Gate decision: **BLOCKED**

None of the owner actions required by B0-01, B0-02, B0-04 and B0-05 have been performed, so no B0 item can be RESOLVED. Evidence of absence (checked 2026-10-02):

| Required evidence | Searched | Found |
|---|---|---|
| `server/db/baseline/0000_live_schema.sql` (production `pg_dump`) | repo tree, working tree | **No** |
| Diagnostics output (production) | repo tree, working tree | **No** |
| `server/db/baseline/0000_live_schema.md` | repo tree | **No** (cannot be written without the above) |
| Restore drill results (`docs/runbooks/backup-restore.md` §4) | file | **Blank** |
| Staging rebuild/smoke log (`docs/runbooks/staging.md` §4) | file | **Blank** |
| `PROD_DB_URL_READONLY`, `STAGING_DB_URL`, `STAGING_API_URL`, `STAGING_SEED_PASSWORD`, `TEST_DATABASE_URL`, `SENTRY_DSN`, `VITE_SENTRY_DSN` | process env; key names in `server/.env` (values never read) | **None set** |

No database command was run against production or staging in this verification. The only DB target used was an unreachable placeholder (`host=127.0.0.1 port=1 db=unreachable`, class: NON-EXISTENT).

---

## 1. Checks executed

| # | Check | Command / method | Result |
|---|---|---|---|
| 1 | Unit tests | `npm test` | **PASS**: 4/4 |
| 2 | Integration tests against the real snapshot | `npm run test:integration` | **BLOCKED**: no snapshot, no `TEST_DATABASE_URL`. Suite reports 3 skipped and the setup states why |
| 3 | Authz matrix harness | file review | **PASS** (harness only; 0 rows by design) |
| 4 | Type-check: server src + tests + scripts | `npm run typecheck` | **PASS** |
| 5 | Type-check: client | `npx tsc --noEmit` | **PASS** |
| 6 | Route contract | `npm run check:routes` vs recorded baseline | **PASS**: 124 backend routes / 18 unmatched; **byte-identical** to the baseline |
| 7 | `app.ts` import side effects | scripted import + inspection | **PASS**: 0 listening servers, 0 pool connections (both pools), 0 process handlers added, 0 console output, no seeding |
| 8 | Route table vs `83c1e84` | Express stack dump via `index.ts` and via `app.ts` | **PASS**: identical (173 lines incl. middleware order) |
| 9 | Compiled startup logs vs `83c1e84` | `tsc` build → run → normalized diff | **PASS**: identical |
| 10 | Representative responses | `/health` 200 · unknown route 404 · unauthenticated payroll 401 · empty login 400 | **PASS**: status and body shapes as at `83c1e84` |
| 11 | Client without DSN | `vite build` with `VITE_SENTRY_DSN` unset | **PASS**: main chunk 287.83 kB (original 287.82 kB); 0 occurrences of `@sentry`, `Sentry`, `dataCollection`, `beforeBreadcrumb` |
| 12 | Secret/PII scan of all 34 new or modified files (lockfiles excluded) | regex scan: credentialed connection strings, JWTs, Sentry DSNs, API/private keys, real-domain emails, `COPY`/`INSERT` in the baseline dir | **PASS**: 0 hits |
| 13 | No unintended staging or commits | `git diff --cached`, `git log` | **PASS**: nothing staged, nothing committed (by design: committing awaits owner review) |
| 14 | Forbidden-path diff | `git diff 83c1e84 -- <forbidden paths>` | **PASS**: empty |
| 15 | Staging rebuild ×2 / smoke | `npm run staging:rebuild` / `staging:smoke` | **BLOCKED**: no staging project exists |
| 16 | Sentry staging 5xx + client event | staging | **BLOCKED**: no DSN or staging |
| 17 | Deployed Node ≥ 20.19 (Sentry 11 requirement) | `package.json` engines, `vercel.json`, `render.yaml` | **BLOCKED**: no Node version is pinned anywhere; the deployed version is unknown (see R0-F7) |

### Discrepancy found and corrected during verification
- **Route-contract output line endings.** On Windows the checker printed CRLF, and the recorded baseline had mixed endings, so an exact comparison (as CI would do) falsely reported every line as changed. The content was identical. Fix: `route_contract_check.py` now always emits LF (`sys.stdout.reconfigure(newline=chr(10))`) and the baseline file was normalized to LF. *Justification:* a defect in a Release 0 tooling artifact, with no application impact. After the fix the comparison is byte-identical.

No contradiction with `RELEASE_0_REPORT.md` was found. Every regression claim in that report was re-run and reproduced.

---

## 2. B0-01 drift table (production column: no evidence yet)

"Code expects" is what application code reads or writes. "Repo scripts" is what `initDb.ts` + `db/schema.ts` + `db/migration_v3.ts` actually produce on a fresh database (verified on a throwaway local Postgres in Release 0). **Production reality is unknown until B0-01 runs.**

| Object | Code expects | Repo scripts create | Production reality | Drift (code vs repo) | Classification | Action |
|---|---|---|---|---|---|---|
| `users.phone`, `users.address`, `users.emergency` | read by `auth.repository.findUserProfile` | **No** | UNKNOWN | Yes | Repo-level **confirmed**; prod **ambiguous** | B0-01 |
| `users.avatar_url` | read by auth and employees | No (only `scratch/add_avatar_col.ts`) | UNKNOWN | Yes | Repo-level **confirmed**; prod **ambiguous** | B0-01 |
| `payroll_entries.payroll_run_id` | written by `insertPayrollEntry` | **No** | UNKNOWN | Yes | Repo-level **confirmed**; prod **ambiguous** | B0-01 |
| `payroll_entries.tenant_id` | written | Only via `schema.ts`, which fails on a fresh DB (R0-F2) | UNKNOWN | Yes | **confirmed** / **ambiguous** | B0-01 |
| `payroll_history.name` | written by `upsertPayrollHistory` | **No** (not even `phase2_migrations.ts`) | UNKNOWN | Yes | **confirmed** / **ambiguous** | B0-01 |
| `payroll_history.status` + `UNIQUE(employee_id,month,year,tenant_id)` | required by `ON CONFLICT` | Only `phase2_migrations.ts`, which is **not wired** into `db:setup` | UNKNOWN | Yes | **confirmed** / **ambiguous** | B0-01 (do the phase2 objects exist in prod?) |
| `payroll_runs.tenant_id` | written | Only via `schema.ts` (fails fresh) | UNKNOWN | Yes | **confirmed** / **ambiguous** | B0-01 |
| `employees.manager_id` | read by approvals scoping, delete | **No** (stand-in lacked it) | UNKNOWN | Yes | **new** (Release 0) / **ambiguous** | B0-01 → W-3 |
| `leave_types.tenant_id` | needed for tenant scoping (T-2) | **No** | UNKNOWN | Yes | **new** / **ambiguous** | B0-01 → T-2 |
| `tenants.is_active` | inserted by `initializeDatabase()` | **No** (`initDb` creates `tenants` without it) | UNKNOWN | Yes | **new** (R0-F2) / **ambiguous** | B0-01 |
| `leave_requests` dual schema (`employee_id`/`type` vs `user_id`/`leave_type_id`) | both used | Both present | UNKNOWN (NULL counts) | n/a | Code-level **confirmed**; data **ambiguous** | B0-01 diagnostics L1–L6 |
| `attendance` dual schema | both used | Both present | UNKNOWN (usage counts) | n/a | **confirmed** / **ambiguous** | B0-01 diagnostics A1–A5 |
| Duplicate payroll runs, employee status counts, manager disagreements, DB timezone, triggers | n/a | n/a | UNKNOWN | n/a | **ambiguous** | B0-01 diagnostics |

**Schema truth: NOT ESTABLISHED.** The only proven fact is that the repository cannot reproduce the schema its own code expects. No migration may be written until `0000_live_schema.sql` exists.

---

## 3. Final release gate

| Item | Implementation | Owner Evidence | Tests | Security | Status |
|---|---|---|---|---|---|
| B0-01 | PASS (scripts validated on stand-in) | **FAIL** (absent) | PASS (script runs read-only, drift-tolerant) | PASS | **BLOCKED** |
| B0-02 | PASS (runbook) | **FAIL** (no drill) | N/A | PASS | **BLOCKED** |
| B0-03 | PASS | **FAIL** (no snapshot) | PARTIAL: unit PASS; integration **BLOCKED** | PASS | **BLOCKED** |
| B0-04 | PASS (local scrub verification: 0 leaks) | **FAIL** (no Sentry projects/DSNs) | PASS locally; staging **BLOCKED** | PASS | **BLOCKED** |
| B0-05 | PASS (local validation) | **FAIL** (no staging) | PASS locally; staging **BLOCKED** | PASS | **BLOCKED** |

---

### Criteria for RESOLVED

Release 0 becomes eligible for **RESOLVED** only when every row has actual evidence:

| Gate | Required evidence | Current |
|---|---|---|
| B0-01 | Production schema dump, diagnostics and reviewed schema truth (`0000_live_schema.md`) | Absent |
| B0-02 | Successful isolated restore, with RPO/RTO recorded and approved | Absent |
| B0-03 | Integration tests passing against the real schema | Blocked on B0-01 |
| B0-04 | Sentry projects and DSNs, staging event verification, deployed Node runtime confirmed | Absent |
| B0-05 | Isolated staging, rebuild twice, smoke test | Absent |
| Regression | Existing route and runtime behavior still verified | **Met** (§1, checks 1 and 3–14) |
| Security | No newly introduced secrets or PII | **Met** (§1, check 12) |
| Git | Changes reviewed and committed | Not yet: uncommitted, pending review |

**Git state:** Branch `release-0/safety-net` remains at `83c1e84`. All Release 0 changes are uncommitted and unstaged. No unexpected or unrelated changes were detected.

### Keep visible: not to be silently deferred

- **R0-F4 (auth limiter / proxy keying).** The local test proves the 10-per-15-minute limiter covers every `/auth/*` route. The real deployment behaviour (whether all users behind the Vercel/Render proxy share one bucket) is **unverified** and can lock the whole organisation out of login. Fixing it is Release 1, but **the B0-05 staging smoke run must record it**: run the smoke from two different networks within 15 minutes and note whether the second run gets 429 on its first login. A 429 on the first login means all users share one bucket.
- **R0-F7 (Node runtime vs Sentry 11).** The source tree pins no Node version, so compatibility must be established by the **deployment configuration** (Vercel project Node setting or Render runtime), confirmed by the owner, **before** any `SENTRY_DSN` is set in an environment. Vercel deprecated Node 20 on 2026-10-01; Sentry 11 requires Node ≥ 20.19 (and excludes 22.0–22.11).

## Release discipline (carried forward)

These rules held throughout Release 0 and apply to every later release:
1. Never invent owner evidence. An item without evidence stays BLOCKED or IN PROGRESS.
2. Never touch the production database except through read-only scripts the owner runs.
3. Never write schema migrations before the live schema snapshot exists.
4. Report defects outside the current release; do not fix them silently.

## 4. R0-F status

| ID | Status after verification |
|---|---|
| R0-F1 `initDb` self-executes → `db:migrate` race | **Confirmed** (reproduced). Target O-5 |
| R0-F2 Legacy scripts mutually inconsistent | **Confirmed** (reproduced). Target O-5 |
| R0-F3 Code reads columns no repo script creates | **Confirmed repo-level**; production pending B0-01 |
| R0-F4 Auth limiter covers all `/auth/*`; no `trust proxy` | **Confirmed** locally (11th call → 429). Proxy-wide lockout **unverified**: needs staging. **Release 1** |
| R0-F5 Vulnerable client deps (3 high, 4 moderate) + 1 moderate server | **Confirmed**, unchanged vs `83c1e84`. **Release 1** |
| R0-F6 vitest 5 needs `@types/node` ≥ 22 | Open. Release 5 |
| R0-F7 Sentry needs Node ≥ 20.19 | **BLOCKED**: no Node version pinned in `package.json`, `vercel.json` or `render.yaml`. The Vercel project's Node setting must be checked by the owner. Node 20 is deprecated on Vercel from 2026-10-01; Node 24 is the current default |
| R0-F8 Client DSN is build-time | **Confirmed** (no-DSN bundle contains no Sentry code) |
