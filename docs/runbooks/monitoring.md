# Runbook — Error Monitoring (Release 0 · B0-04)

EMS reports server 5xx errors and client crashes to Sentry. **Monitoring is off unless a DSN is configured**; with no DSN the application behaves exactly as before Release 0.

## 1. Setup (owner)

1. Create a Sentry organisation (or use the company's existing one) and **two projects**: `ems-api` (Node/Express) and `ems-web` (React). Data region: choose the one matching your data-residency needs (EU or US).
2. In each project's settings, also enable server-side scrubbing: *Security & Privacy → Data Scrubber = on, Use Default Scrubbers = on*. Add `ctc`, `salary`, `bank`, `pan`, `aadhaar` to *Additional Sensitive Fields*.
3. Set the variables in each environment (staging first):

| Where | Variable | Notes |
|---|---|---|
| API (runtime) | `SENTRY_DSN` | from `ems-api` |
| API (runtime) | `SENTRY_ENVIRONMENT` | `staging` / `production` |
| API (runtime) | `SENTRY_RELEASE` | optional, e.g. the git SHA |
| API (runtime) | `SENTRY_TRACES_SAMPLE_RATE` | leave unset (= 0). Do not enable before baseline W-6, because URLs can carry tokens |
| Client (**build time**) | `VITE_SENTRY_DSN` | from `ems-web` |
| Client (**build time**) | `VITE_SENTRY_ENVIRONMENT` | `staging` / `production` |

> **Client DSN is a build-time value.** Vite inlines `import.meta.env.*` during `vite build`. When `VITE_SENTRY_DSN` is unset at build time, Sentry is removed from the bundle entirely (verified: main chunk 287.82 kB → 287.83 kB). When set, it adds about 33 kB gzipped. Set it in the platform's **build** environment and redeploy.

## 2. What is collected

| Category | Server | Client |
|---|---|---|
| Errors | Only HTTP **5xx** and unhandled errors. 4xx (validation, 401/403) are not sent. | Uncaught errors and React render crashes |
| Request bodies | **Never** | **Never** |
| Headers | `content-type`, `user-agent`, `x-request-id` only | None |
| Cookies | Never | Never |
| Query strings | **Stripped** from URLs, request and breadcrumbs | **Stripped** |
| User identity | Never auto-populated | Never |
| DB query parameters / stack-frame variables | Off | Off |
| Performance traces | Off by default | Off |

Configuration: `server/src/instrument.ts` and `client/src/main.tsx`. The SDK's `dataCollection` options restrict collection, and a `beforeSend`/`beforeBreadcrumb` scrubber runs as a second layer.

**Verification performed (2026-10-02, local, against a fake ingest endpoint — nothing was sent to Sentry):**
- **Server:** a forced 500 carried a secret query token, a cookie, a Bearer JWT, and a body with a password, CTC, phone and email. One event was captured, and **0 occurrences** of any of those values appeared in the payload. The client response was unchanged.
- **Client:** an uncaught error on a URL with `?token=…&email=…` was captured, with the URL reduced to `/login` and **0 occurrences** of the token or email.

## 3. Verify in staging (Release 0 exit)

1. Deploy staging with both DSNs set.
2. Server: trigger a 5xx. The simplest way is to temporarily point the staging API's `DATABASE_URL` at an unreachable host, call any authenticated endpoint, then restore the variable. Do not add test routes to the code.
3. Client: in the staging site, open the browser console and run `setTimeout(() => { throw new Error('sentry-staging-check') })`.
4. In Sentry, confirm both events arrived, with `environment = staging`, no query strings, no request body and no Authorization header.
5. Record the result in `docs/runbooks/staging.md` §4 (Notes).

## 4. Alerting (minimal until Release 5)

In each Sentry project, create one alert rule: *a new issue is created → notify the on-call email/Slack*. Full alerting (5xx rate, payroll failures, uptime) is baseline item O-4.
