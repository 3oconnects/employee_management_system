# Ozofi Nexus — Design System

**Status:** foundation (Phase 2, first increment). Adopted so far by the authentication screens only; other screens migrate page by page (plan Phase 5).
**Principles:** light-first, neutral surfaces, one brand colour, clear hierarchy, honest data, accessible by default. No gradients, glassmorphism, glows or decorative motion.

---

## 1. Brand

| Item | Value | Source |
|---|---|---|
| Product | **Ozofi Nexus** (compact: **Nexus**) | `client/src/config/brand.ts`, `server/src/config/brand.ts` |
| Descriptor | Workforce Management Platform | same |
| Company | Ozofi | same |
| Mark | "N" drawn as two connected nodes on a Nexus-blue rounded square | `components/brand/NexusLogo.tsx` (`NexusMark`), `public/brand/nexus-icon.svg` |
| Wordmark | "Ozofi" in foreground colour + "Nexus" in primary | `NexusLogo` |

**Product vs workspace.** Product identity is fixed and comes only from `config/brand.ts`. The customer organisation (workspace) name and logo come from Settings → General through `GET /api/v1/workspace` (`useWorkspace()`), and appear *alongside* the product, never instead of it.

## 2. Colour tokens

Defined once as CSS variables (`client/src/index.css`, `--nx-*`, space-separated RGB) and exposed to Tailwind as the `nx` namespace (`tailwind.config.js`), e.g. `bg-nx-primary`, `text-nx-fg-muted`, `border-nx-border`, `bg-nx-primary/10`.

| Token | Hex | Use | Contrast (measured) |
|---|---|---|---|
| `nx-primary` | `#2F5BEA` | Primary actions, links, focus rings | 5.52:1 on white; white text on it 5.52:1 |
| `nx-primary-hover` | `#244ACC` | Hover/pressed | white text 7.18:1 |
| `nx-primary-subtle` | `#EEF2FE` | Selected rows, info chips | primary text on it 4.93:1 |
| `nx-canvas` | `#F8FAFC` | Page background | — |
| `nx-surface` | `#FFFFFF` | Cards, inputs, dialogs | — |
| `nx-surface-muted` | `#F1F5F9` | Subtle fills, hover | — |
| `nx-border` | `#E2E8F0` | Dividers, card borders | — |
| `nx-border-strong` | `#CBD5E1` | Input borders | — |
| `nx-fg` | `#0F172A` | Primary text | — |
| `nx-fg-muted` | `#475569` | Secondary text | 7.58:1 on white |
| `nx-fg-subtle` | `#64748B` | Captions, placeholders, hints | 4.76:1 on white; 4.55:1 on canvas |
| `nx-success` / `-subtle` | `#15803D` / `#F0FDF4` | Success | 4.79:1 |
| `nx-warning` / `-subtle` | `#B45309` / `#FFFBEB` | Warning, pending | 4.84:1 |
| `nx-danger` / `-subtle` | `#B91C1C` / `#FEF2F2` | Errors, destructive | 5.91:1 |
| `nx-info` / `-subtle` | `#0369A1` / `#F0F9FF` | Informational | 5.57:1 |

All text pairings meet WCAG 2.1 AA (≥ 4.5:1).

> **Restart the dev server after changing `tailwind.config.js`.** Tailwind reads its config only at startup. A server started before the `nx` namespace existed keeps the `--nx-*` variables but never generates classes such as `bg-nx-primary`, so primary buttons render as white text on a transparent background (invisible). Production builds are unaffected. Legacy tokens (`primary`, `sidebar`, `--color-*`) remain until each page migrates and are removed afterwards.

## 3. Typography

- **Family:** Inter (`font-nx`). Use tabular numbers (`tabular-nums`) for figures in tables and metrics.
- **Weights:** 400 regular · 500 medium (labels, buttons) · 600 semibold (headings). No `font-black`; no 800–900.
- **Scale (Tailwind):** `text-xs` 12 (captions, **minimum**) · `text-[13px]` (dense table cells, small buttons) · `text-sm` 14 (body, inputs) · `text-base` 16 · `text-lg` 18 · `text-xl` 20 (page/card titles) · `text-2xl` 24 · `text-3xl` 30 (rare display).
- **Case:** sentence case everywhere. Uppercase only for tiny overline labels, sparingly, never with wide tracking on body text.
- **Copy:** plain language. No "protocol", "sequence", "decommission"; name things as HR users do.

## 4. Spacing, radius, elevation

- 4px grid (Tailwind spacing). Form fields stack with `space-y-4`; card padding 24–32px.
- Radius: 6px (chips, small controls) · 8px (`rounded-lg`: inputs, buttons) · 12px (`rounded-xl`: cards, dialogs). No 24–40px container radii.
- Elevation: `shadow-nx-sm` (subtle) and `shadow-nx-md` (cards, dialogs) only, always with a border.
- Height: inputs and medium buttons 40px; large buttons 44px; small buttons 32px.

## 5. Components (implemented)

All in `client/src/components/ui/` and exported from `components/ui`.

| Component | Notes |
|---|---|
| `Button` | Variants `primary`, `secondary`, `outline`, `ghost`, `danger`; sizes `sm`/`md`/`lg`; `loading` (spinner + `aria-busy`), `icon`, `fullWidth`. Defaults to `type="button"`; pass `type="submit"` in forms. Visible focus ring |
| `FormField` | Owns label, optional `labelAside`, `hint`, `error`. Wires `label[htmlFor]`→input `id`, hint/error→`aria-describedby`, error→`aria-invalid`; the error has `role="alert"` |
| `TextInput` | Optional decorative `leadingIcon`, optional `trailing` slot; reads its id and invalid state from `FormField` |
| `PasswordInput` | `TextInput` with a show/hide button (`aria-label` "Show password"/"Hide password", `aria-pressed`) |
| `Alert` | Tones `danger` (role alert), `success`, `warning`, `info` (role status); optional title |
| `NexusLogo` / `NexusMark` | Brand lockup; mark is decorative when the name is shown next to it; `inverse` mark (white tile, blue N) for brand-coloured backgrounds |
| `AuthLayout` (auth module) | Desktop: brand panel (darker Nexus blue, describing only modules that exist) + form column. Mobile/tablet: logo, card, footer. Used by sign-in and set-password |

Pending (later phases, extending this library, not duplicating it): Select, Combobox, Checkbox/Switch, Tabs, Table + Pagination (consolidating `DataTable`), Modal/Drawer/ConfirmDialog (consolidating `Modal`), Menu, Tooltip, Badge (token migration), Avatar, Breadcrumbs, Skeleton, EmptyState/ErrorState (one each), PageHeader, StatCard (one, replacing 4 copies).

## 6. Accessibility rules

- Every input is labelled through `FormField` (no placeholder-as-label).
- Icon-only buttons carry `aria-label`; decorative icons carry `aria-hidden`.
- Visible focus for every interactive element (`focus-visible:ring-2 ring-nx-primary`).
- Dialogs: `role="dialog"`, `aria-modal`, `aria-labelledby`, focus moves into the dialog, Escape closes it.
- Errors are announced (`role="alert"`); status changes are polite (`role="status"`).
- Minimum text size 12px; contrast AA per §2.

## 7. Honest data

Never show a number the system did not measure. No hard-coded trends, scores or "status" claims. When history is unavailable, show the value without a trend; when data is missing, show an empty state that explains why and what to do.
