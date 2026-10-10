---
name: ozofi-ui
description: "Design system and UI implementation skill for the Ozofi product family (Ozofi Nexus, Ozofi Mail, Ozofi Flow, etc.). Standardizes the Ozofi UI & Color Flow Brand Bundle: Ozofi Navy #17213D, Electric Blue #2563EB, Intelligence Purple #8B3DFF, Automation Green #65B814, Attention Amber #FFAA0A, and Signal Red #EF3434. Governs the 80–90% neutral surface rule, typography scale, 8-pt spacing, subtle borders, card structures, accessibility, and component standards."
metadata:
  author: ozofi
  version: "1.0.0"
---

# Ozofi UI & Color Flow — Design System Skill Guide

**Brand:** Ozofi  
**Version:** 1.0  
**Status:** Unified Product Foundation (Ozofi Mail, Ozofi Nexus, Ozofi Flow, and future Ozofi products)  
**Primary Audience:** Product designers, frontend engineers, coding agents, QA engineers, and reviewers  

---

## 1. Brand Identity & Color Flow

### 1.1 Brand Palette

| Token | Hex | Intended Role |
| :--- | :--- | :--- |
| `ozofi-navy` | `#17213D` | Brand structure, headings, primary text, navigation frame |
| `ozofi-blue` | `#2563EB` | Primary actions, links, active navigation, key interactive states |
| `ozofi-indigo` | `#3730A3` | Secondary emphasis and selected data series |
| `ozofi-purple` | `#8B3DFF` | AI, intelligence, assistant, smart suggestions |
| `ozofi-teal` | `#0F9F8F` | Secondary data visualization, connected flows, integrations |
| `ozofi-green` | `#65B814` | Automation, success, completed workflows, healthy status |
| `ozofi-amber` | `#FFAA0A` | Pending items, attention, warnings, cautionary states |
| `ozofi-orange` | `#FF641F` | Secondary emphasis and selected highlights |
| `ozofi-red` | `#EF3434` | Errors, destructive actions, critical alerts, failed states |
| `canvas` | `#FFFFFF` | Main page background |
| `surface` | `#F5F7FB` | Secondary surface, grouped sections, table headers |
| `surface-raised`| `#FFFFFF` | Cards, menus, dialogs, popovers |
| `border` | `#E2E8F0` | Dividers, field borders, card outlines |
| `text-primary` | `#17213D` | Main readable text |
| `text-secondary`| `#64748B` | Supporting text, captions, secondary labels |
| `text-muted` | `#94A3B8` | Low-priority metadata only |

### 1.2 The Golden Design Rule
> **Use color to communicate meaning, not as decoration.**  
> Keep approximately **80–90% of the interface neutral** (white and soft-neutral `#F5F7FB` surfaces, `#E2E8F0` borders), and reserve bright colors strictly for actions, data visualization, and meaningful status indicators.

### 1.3 Color Flow Logic
- **Navy (`#17213D`):** Structure, sidebar frame, top headers, primary text.
- **Blue (`#2563EB`):** Primary actions, clickable links, active tabs.
- **Purple (`#8B3DFF`):** AI & intelligence features, auto-suggestions, smart insights.
- **Green (`#65B814`):** Completed workflows, success feedback, active automation.
- **Amber (`#FFAA0A`):** Pending approvals, actions needed, warning alerts.
- **Red (`#EF3434`):** Errors, failed validations, destructive/delete controls.

---

## 2. UI Foundation

### 2.1 Surfaces & Depth
- **Backgrounds:** Crisp white (`#FFFFFF`) or soft neutral (`#F5F7FB`).
- **Borders:** Subtle `1px solid #E2E8F0` over heavy drop shadows.
- **Corner Radii:**
  - Cards & Tables: `rounded-xl` (12px / 16px) — never ballooned or bloated.
  - Buttons & Inputs: `rounded-lg` (8px) or `rounded-md` (6px).
  - Status Badges / Avatars: `rounded-md` or `rounded-lg`.
- **Shadows:** Restrained micro-shadows (`shadow-xs` / `0 1px 2px rgba(15, 23, 42, 0.05)`).

### 2.2 Typography Scale (Inter Font Family)
- **H1 (Page Title):** 24px–32px, font-bold (`text-slate-900 tracking-tight`).
- **H2 (Section Header):** 20px–24px, font-semibold.
- **H3 (Card Title):** 14px–16px, font-semibold.
- **Body Regular:** 14px–15px, font-normal (`text-slate-700`).
- **Label / Control:** 12px–13px, font-medium/semibold.
- **Microcopy / Caption:** 11px–12px, font-medium (`text-slate-400`).

### 2.3 Eight-Point Spacing Rhythm
- `space-1` (4px): Micro gap (icon to text).
- `space-2` (8px): Compact control padding.
- `space-3` (12px): Label-to-input gap, card row gaps.
- `space-4` (16px): Default component padding, table cells.
- `space-5` (20px): Card interior padding (`p-5`).
- `space-6` (24px): Standard section spacing (`space-y-6`).
- `space-8` (32px): Major page group separation.

---

## 3. Recommended Bundle Structure

| Deliverable | What It Standardizes |
| :--- | :--- |
| **Brand Kit** | Logo usage, master palette, typography hierarchy. |
| **Design Tokens** | Shared CSS variables (`--ozofi-*`) and semantic Tailwind classes. |
| **Component Library** | Buttons, inputs, KPI cards, data tables, modals, and navigation drawers. |
| **Layout System** | Dashboard, settings, form flows, and responsive workspace layouts. |
| **UX Standards** | Loading spinners, empty states, error alerts, success confirmations, and permission gates. |
| **Accessibility** | WCAG 2.2 AA contrast, keyboard navigation, `:focus-visible` rings, and screen-reader labels. |
| **Developer Guide** | Reusable component conventions, naming patterns, and coding agent constraints. |

---

## 4. Multi-Product Scaling
This specification serves as the unified foundation for:
1. **Ozofi Mail**: Email, messaging, and communication workspaces.
2. **Ozofi Nexus**: People operations, employee records, payroll, and timesheets.
3. **Ozofi Flow**: Process automation, approvals, pipelines, and trigger orchestrations.
4. **Future Ozofi Ecosystem Products**.

*Rule:* Each product retains its own icon and domain-specific feature emphasis while sharing the identical typography, 8-pt spacing, component geometry, accessible color flow, and 80–90% neutral surface foundation.
