# Ozofi Nexus — Change Log (deliverable F)

## PR 1 — `feat/nexus-brand-foundation` · 2026-10-02

**Scope (decision G-7):** Phase 1 branding foundation + Phase 2 design tokens/primitives + Phase 3 subset (sign-in, forgot-password, set-password screens).
**Base:** `release-0/safety-net` @ `c4ce621` (decision G-1).

### Decisions applied
| # | Decision | Applied as |
|---|---|---|
| G-1 | Commit Release 0, branch Nexus from it | Release 0 committed as `2e0ef84`, `3c09687`, `c4ce621`; this branch starts at `c4ce621` |
| G-2 | Organisation name from Settings, current text as fallback | Welcome/role emails now use `org_name` (fallback: product name). **Offer letters and employee-action emails are not changed in this PR** (see Remaining risks) |
| G-3 | Quick-login only in development | Dev accounts and pre-filled credentials are gated by `import.meta.env.DEV`; **verified absent from the production bundle** |
| G-4 | No remember-me | Not added |
| G-5 | Do not rename deploy identifiers | Unchanged |
| G-6 | Primary `#2F5BEA` | `--nx-primary` |

### Files changed

**Branding foundation**
| File | Reason | Behaviour change |
|---|---|---|
| `client/src/config/brand.ts` (new) | Single product identity + `pageTitle()`, `copyright()` | — |
| `server/src/config/brand.ts` (new) | Same, for server copy | — |
| `client/public/brand/nexus-icon.svg`, `client/public/site.webmanifest` (new) | Mark/favicon and manifest | Favicon now loads (previously pointed to a missing `/vite.svg`) |
| `client/index.html` | Title, description, theme-color, manifest, favicon | Tab title "Ozofi Nexus · Workforce Management Platform" |
| `client/src/components/brand/NexusLogo.tsx` (new) | Mark + wordmark | — |
| `client/src/hooks/usePageTitle.ts` (new) | "Page · Ozofi Nexus" titles | Used by auth screens |
| `server/src/modules/workspace/*` (new), `server/src/app.ts` | `GET /api/v1/workspace`: authenticated; returns only `{ name, logoUrl }` from Settings → General; logo restricted to http(s) | **New endpoint** (125 routes; unmatched client calls unchanged at 18) |
| `client/src/hooks/useWorkspace.ts` (new) | Workspace identity for the UI, one request per session | — |
| `client/src/components/layout/Sidebar.tsx` | Header "AURA / Personnel Hub" → Nexus mark, "Ozofi Nexus", workspace name (or descriptor) | Sidebar header only; rest of sidebar unchanged until Phase 3 |
| `server/src/app.ts`, `server/src/index.ts` | API root text, startup banner | "Ozofi Nexus API is running."; banner "OZOFI NEXUS API — SERVER STARTED" |
| `server/src/modules/settings/configuration/configuration.service.ts` | Test-email subject "AURA EMS" → "Ozofi Nexus — Test email" | Email subject |
| `server/src/modules/settings/user-assignments/user-assignments.service.ts` | Welcome/role emails pass `orgName`; subjects de-branded | Subject "Welcome to {org or Ozofi Nexus} — your account is ready" (was "Your AURA account is ready") |
| `server/src/services/emailService.ts` | Header/footer fallback "AURA/Ozofi Personnel Hub" → org name or "Ozofi Nexus", footer "Sent via Ozofi Nexus" | Email content |
| `server/src/modules/notifications/templates/templates.service.ts` | "Welcome to AURA 🚀" → "Welcome to Ozofi Nexus" | In-app notification text |
| `client/src/modules/audit/pages/AuditLogPage.tsx` | Fallback `automated@auracore.io` → "Automated system action" | Display text |
| `client/src/modules/settings/components/{FeatureControlTab,EmailTab,GeneralTab,IntegrationsTab,UsersTab}.tsx` | "AURA AI Assistant" → "AI Assistant"; placeholders de-branded; **fabricated endpoint `api.aura-ems.com`** → the deployment's real `/api/v1` origin; generated temp-password prefix `AURA-` → `NEXUS-` | Labels, placeholders, the displayed endpoint, the password prefix |

**Design system**
| File | Reason |
|---|---|
| `client/src/index.css` | `--nx-*` tokens (contrast measured, all AA) |
| `client/tailwind.config.js` | `nx` colour namespace, `font-nx`, `shadow-nx-sm/md` (legacy tokens untouched) |
| `client/src/components/ui/index.tsx` | `Button` on Nexus tokens (+ `fullWidth`, `aria-busy`, focus ring, default `type="button"`). **No existing screen imported `Button`**, so no other screen is affected |
| `client/src/components/ui/form.tsx` (new) | `FormField`, `TextInput`, `PasswordInput` with label/error/hint wiring |
| `client/src/components/ui/Alert.tsx` (new) | Inline status messages |
| `docs/nexus/DESIGN_SYSTEM.md` (new) | Reference |

**Authentication screens**
| File | Behaviour change |
|---|---|
| `client/src/modules/auth/components/AuthLayout.tsx` (new) | — |
| `client/src/modules/auth/pages/LoginPage.tsx` | New design; fake status panel ("Sync Status: Operational", "L3 Secure") and AURA/PRECISIONHUB branding removed; inline validation (no request when invalid); plain-language errors; dev-only accounts. **Sign-in request, `setAuth` mapping and redirects unchanged** |
| `client/src/modules/auth/pages/ChangePasswordPage.tsx` | New design; field-level errors. **API call, 8-character rule, redirect and sign-out unchanged** |
| `client/src/modules/auth/components/ForgotPasswordModal.tsx` | New design; dialog semantics (role, labelled title, focus on open, Escape closes). **State machine and every API call byte-identical** (verified by diffing the logic section against `83c1e84`) |

**Tests and tooling**
| File | Purpose |
|---|---|
| `server/test/unit/workspace.test.ts` (new) | 401 without token; name trimming; null when unset; non-http(s) logo dropped; no lookup without tenant |
| `client/vitest.config.ts`, `client/src/test/setup.ts` (new); client devDeps `vitest@3`, `jsdom`, `@testing-library/{react,dom,user-event}`; `npm test` | Client component tests |
| `client/src/components/ui/form.test.tsx`, `client/src/modules/auth/pages/LoginPage.test.tsx` (new) | Label association, error wiring, password toggle; Nexus branding present and no legacy brand; inline validation without API call; server error shown |
| `docs/audit/tools/route_contract_baseline.txt` | 124 → 125 routes (workspace); unmatched list unchanged |

### Tests executed
| Check | Result |
|---|---|
| Server `npm test` | 9/9 pass |
| Server `npm run typecheck` (src + tests + scripts) | pass |
| Client `npm test` | 8/8 pass |
| Client `tsc --noEmit` | pass |
| Client production build | pass; main chunk 282.18 kB |
| Production bundle scan | `Admin@123`, dev accounts panel, `alex.rivers`, AURA, PRECISIONHUB, auracore: **0**. The remaining `admin@company.com` and `priya@company.com` strings come from `authStore.ts` (known RBAC finding), a Settings placeholder and the bulk-upload CSV sample, not the login page |
| Route contract | 125 routes / 18 unmatched (unchanged list) |
| Runtime regression vs Release 0 evidence | Health 200, unknown 404, unauthenticated payroll 401, `/workspace` without token 401, empty login 400; startup logs identical **except the intended banner line** |
| Browser (dev server, no backend calls) | Login at 1280px and 375px (no horizontal overflow); inline errors with red border, `aria-invalid`, `aria-describedby`; **0 login requests** on invalid submit; forgot-password dialog focus + Escape; set-password page at 375px; favicon and manifest load; 0 console errors |
| Stale-brand scan (src) | Clean except documented dead code (`LandingPage.tsx`, `settings.routes.ts`) and seed data (`initDb.ts`) |

### Remaining risks / not in this PR
1. **Offer letters and employee-action emails** still hard-code four Ozofi variants ("Ozofi Technologies Private Limited", "Ozofi Global Technologies", "Ozofi People Operations", "Ozofi Personnel Hub"). These are legal documents, so they need an explicit decision on the registered name before the code reads `org_name` (next PR, needs owner input).
2. **Pre-existing bug, preserved deliberately:** `LoginPage` builds the stored user without `dashboard_type` (unchanged from `83c1e84`), so custom roles with an admin dashboard fall back to the employee layout until the next refresh path. Fixing it changes behaviour, so it belongs with Phase 3 shell / W-5. Recorded, not fixed.
3. `UsersTab.tsx` generates temporary passwords in the browser with `Math.random()` (H1); only the prefix changed.
4. `initDb.ts` seeds the default tenant as "AURA Default" (seed data; Release 1 H4 touches this file).
5. The sidebar change was type-checked but not viewed in the browser, because rendering the signed-in shell would call the local backend with a placeholder session. It will be reviewed with the Phase 3 shell.
6. The password-reset flow is still insecure (S2). This PR only restyled it.
7. `.claude/launch.json` (local preview config, port 5199) is left uncommitted.
