# Runbook — Staging Environment (Release 0 · B0-05)

Staging is built **only** from the production schema baseline (`server/db/baseline/0000_live_schema.sql`) plus **synthetic** data. It never contains production personal data. If the rebuild fails, the baseline snapshot is incomplete: fix B0-01 rather than patching staging by hand.

## 1. One-time setup (owner)

1. **Database:** create a new Supabase project `ems-staging`, in the same region and Postgres major version as production. Use its **direct** connection string (port 5432).
2. **API + client deployment:** a separate deployment that never shares environment variables with production:
   - Vercel: a separate project (or Preview environment) with its own env vars; or
   - Render: a separate `ems-api-staging` service plus a static site.
3. **Staging-only secrets** (set in the platform, never in git):

   | Variable | Value |
   |---|---|
   | `DATABASE_URL`, `DIRECT_URL` | staging DB connection strings |
   | `JWT_SECRET`, `JWT_REFRESH_SECRET` | new random values (≥ 32 chars), **different from production** |
   | `NODE_ENV` | `production` (to exercise production code paths) |
   | `SENTRY_DSN`, `SENTRY_ENVIRONMENT=staging` | the Sentry project DSN (see `monitoring.md`) |
   | `VITE_SENTRY_DSN`, `VITE_SENTRY_ENVIRONMENT=staging` | client build-time variables |
   | `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `SMTP_*` | **leave empty** so staging cannot email real people |
   | `APP_URL` | the staging client URL |

## 2. Rebuild (repeatable)

From `server/`, with `0000_live_schema.sql` committed:

```bash
read -rs -p "Staging DB URL: " STAGING_DB_URL; export STAGING_DB_URL; echo
read -rs -p "Staging seed password (>=12 chars): " STAGING_SEED_PASSWORD; export STAGING_SEED_PASSWORD; echo
npm run staging:rebuild -- --i-understand-this-destroys-staging
```

Safety checks performed before anything is dropped (`scripts/staging/guard.ts`):
- the target must not equal `DATABASE_URL`/`DIRECT_URL` in `server/.env`;
- every existing user must be on `@ems-staging.example.test` (a database with any other user is refused as "not staging");
- the explicit `--i-understand-this-destroys-staging` flag is required;
- you must type the database host to confirm (CI may set `STAGING_CONFIRM_HOST` instead).

What it does: drop `public` → apply the snapshot → seed. The seed adds:
- 1 tenant (`tenant_default`);
- roles super_admin, admin, hr, manager, employee and custom `trainee`, each with one login `<role>@ems-staging.example.test` using the seed password;
- a 20-person reporting hierarchy;
- leave types;
- payroll profiles with synthetic round numbers.

Each optional step reports **APPLIED** or **SKIPPED (reason)**. A SKIPPED step is a schema fact worth noting in `0000_live_schema.md`.

## 3. Smoke run

After deploying the API against the rebuilt database:

```bash
STAGING_API_URL="https://<staging-api-host>/api/v1" npm run staging:smoke -- --out smoke-results.md
```

It logs in as every role and exercises:
- profile;
- employee list;
- approvals inbox (admin and manager);
- check-in and check-out;
- leave types and leave apply;
- the approvals inbox again after the leave is applied.

**Release 0 records results; it does not assert them.** Security expectations begin in Release 1. Paste the table into §4.

> The auth rate limiter allows 10 `/auth/*` requests per 15 minutes per IP. One smoke run uses 8. Wait 15 minutes between runs from the same machine.

**Required proxy check (R0-F4).** After the first smoke run, run it again **within 15 minutes from a different network**, for example a phone hotspot. Record the result of the second run's first login:
- **200**: the limiter keys on the real client IP. Record "R0-F4 proxy: per-client".
- **429**: all clients share one bucket behind the proxy, so the whole organisation can be locked out of login. Record "R0-F4 proxy: SHARED BUCKET". This makes R0-F4 a confirmed High finding for Release 1.

## 4. Smoke results log

| Date | Commit | Operator | Rebuild OK? | Smoke results (link or table) | Notes |
|---|---|---|---|---|---|
| | | | | | |

**Release 0 gate:** one row with Rebuild OK = yes and recorded smoke results.

## 5. Notes from local validation (2026-10-02)

The tooling was validated on a throwaway local Postgres, using a **stand-in** schema built from the repo scripts. That was not the production snapshot, which did not exist yet.
- Guard refusals: non-synthetic users, missing flag, wrong host and short password are all refused, and the existing data was left untouched.
- The rebuild is repeatable.
- Smoke mechanics work.

The stand-in itself produced 500s on `/auth/me`, `/employees` and `/approvals` because the repo scripts never create columns such as `users.phone`. That is further evidence for baseline §0.2, not a staging defect, and it is expected to disappear with the real snapshot.
