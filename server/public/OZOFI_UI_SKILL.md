# Ozofi UI & Color Flow --- Design System Skill Guide

**Document type:** Reusable design-system skill and implementation
guidance\
**Brand:** Ozofi\
**Version:** 1.0\
**Status:** Proposed foundation --- validate against product
requirements before production use\
**Primary audience:** Product designers, frontend engineers, coding
agents, QA engineers, and reviewers

------------------------------------------------------------------------

## 1. Purpose

This document defines how to design, build, review, and evolve user
interfaces across the Ozofi product family. It is intended to be
reusable as a repository-level `OZOFI_UI_SKILL.md` or as the foundation
of a coding-agent skill.

The goal is to make Ozofi products feel like one coherent, trustworthy
software ecosystem while allowing each product to serve its own users
and workflows.

Use this guide when: - Creating a new page, dashboard, settings area,
form, table, or workflow. - Refactoring an existing interface without
changing its business behavior. - Building shared UI components or
design tokens. - Reviewing UI quality, responsiveness, accessibility,
and consistency. - Giving a coding agent explicit constraints before it
edits a codebase.

Do not treat this document as permission to replace working product
behavior, rewrite architecture, change APIs, or introduce a new UI
framework. Inspect the existing project first and make the smallest safe
change that achieves the requirement.

## 2. Brand principles

### 2.1 Core experience

Ozofi interfaces should communicate:

1.  **Clarity:** Users can identify the page purpose, current state, and
    next action quickly.
2.  **Trust:** Information is legible, predictable, and presented
    without visual tricks.
3.  **Efficiency:** Common tasks require minimal navigation and avoid
    unnecessary steps.
4.  **Intelligence:** AI capabilities are easy to recognize, but AI
    decoration must not overwhelm the workflow.
5.  **Consistency:** Shared controls behave and look the same across
    products.
6.  **Accessibility:** The interface remains usable with a keyboard,
    assistive technology, zoom, and different input methods.
7.  **Restraint:** Use color, borders, shadows, animation, and gradients
    only when they improve meaning or hierarchy.

### 2.2 Visual direction

Default to a **light, professional, minimal enterprise SaaS interface**.

Prefer: - White and soft-neutral surfaces. - Navy text and navigation. -
Blue primary actions. - Purposeful purple for AI-related capabilities. -
Green for successful states and completed automation. - Amber for
caution and pending attention. - Red for errors and destructive
actions. - Clear spacing, aligned grids, and consistent component
dimensions. - Subtle borders over heavy shadows. - Real product data and
real functional controls.

Avoid: - Dark-by-default dashboards unless a product explicitly requires
one. - Excessive glassmorphism, blur, neon glow, or gradient
backgrounds. - Randomly assigning bright colors to unrelated cards. -
Huge empty dashboard cards that contain no useful information. -
Decorative charts or invented metrics presented as real data. -
Overlapping content, tiny text, excessive rounded pills, and
inconsistent spacing. - Generic template layouts that do not reflect the
actual user workflow. - Unrequested animations, dependencies, or broad
rewrites.

## 3. Brand color system

The following values are proposed initial tokens based on the Ozofi
visual direction. Before production rollout, verify contrast ratios and
test the palette on actual screens. Do not assume that a color is
accessible simply because it looks readable in a design mockup.

### 3.1 Brand palette

  -----------------------------------------------------------------------
  Token                   Hex                     Intended role
  ----------------------- ----------------------- -----------------------
  `ozofi-navy`            `#17213D`               Brand structure,
                                                  headings, primary text

  `ozofi-blue`            `#2563EB`               Primary actions, links,
                                                  active navigation

  `ozofi-indigo`          `#3730A3`               Secondary emphasis and
                                                  selected data series

  `ozofi-purple`          `#8B3DFF`               AI, intelligence,
                                                  assistant and smart
                                                  suggestions

  `ozofi-teal`            `#0F9F8F`               Secondary data
                                                  visualization and
                                                  connected flows

  `ozofi-green`           `#65B814`               Automation, success,
                                                  completed workflows

  `ozofi-amber`           `#FFAA0A`               Pending items,
                                                  attention and caution

  `ozofi-orange`          `#FF641F`               Secondary emphasis and
                                                  selected highlights

  `ozofi-red`             `#EF3434`               Errors, destructive
                                                  actions and critical
                                                  states

  `canvas`                `#FFFFFF`               Main page background

  `surface`               `#F5F7FB`               Secondary surface and
                                                  grouped sections

  `surface-raised`        `#FFFFFF`               Cards, menus, dialogs
                                                  and popovers

  `border`                `#E2E8F0`               Dividers, field borders
                                                  and card outlines

  `text-primary`          `#17213D`               Main text

  `text-secondary`        `#64748B`               Supporting text

  `text-muted`            `#94A3B8`               Low-priority metadata
                                                  only; check contrast

  `focus-ring`            `#2563EB`               Keyboard focus
                                                  indicator
  -----------------------------------------------------------------------

### 3.2 Semantic tokens

Use semantic tokens in application components rather than hardcoding
palette values throughout the codebase.

  ------------------------------------------------------------------------
  Semantic token           Default value           Use
  ------------------------ ----------------------- -----------------------
  `color-text-primary`     `#17213D`               Main readable content

  `color-text-secondary`   `#64748B`               Descriptions and
                                                   secondary labels

  `color-page`             `#FFFFFF`               Main app background

  `color-surface`          `#F5F7FB`               Secondary surfaces

  `color-border`           `#E2E8F0`               Borders and separators

  `color-action`           `#2563EB`               Main action and
                                                   interactive links

  `color-action-hover`     `#1D4ED8`               Hovered primary action

  `color-action-pressed`   `#1E40AF`               Pressed primary action

  `color-focus`            `#2563EB`               Focus outline

  `color-success`          `#15803D`               Success text/icon;
                                                   verify paired
                                                   background

  `color-success-bg`       `#F0FDF4`               Success surface

  `color-warning`          `#B45309`               Warning text/icon;
                                                   verify paired
                                                   background

  `color-warning-bg`       `#FFFBEB`               Warning surface

  `color-danger`           `#B91C1C`               Error/destructive
                                                   text/icon

  `color-danger-bg`        `#FEF2F2`               Error surface

  `color-info`             `#1D4ED8`               Informational status

  `color-info-bg`          `#EFF6FF`               Informational surface
  ------------------------------------------------------------------------

**Important:** The vivid brand colors are not always appropriate for
small text on white. Use dark semantic foreground tokens for status text
and icons when needed. Never communicate status using color alone;
include a label, icon, or clear message.

### 3.3 Color flow rules

Apply colors according to meaning:

-   **Navy:** navigation, headings, core structure, primary content.
-   **Blue:** primary CTA, links, active tabs, selected controls, focus.
-   **Purple:** AI assistant, generated suggestions, model-related
    actions, intelligent automation.
-   **Teal:** integrations, connected systems, secondary analytics
    series.
-   **Green:** success, completed tasks, healthy state, automation
    finished.
-   **Amber:** pending approval, caution, attention required,
    approaching limits.
-   **Orange:** optional secondary emphasis; do not use as a substitute
    for warning semantics.
-   **Red:** validation errors, failed actions, destructive controls and
    critical alerts.
-   **Neutrals:** the majority of page backgrounds, cards, tables,
    forms, and separators.

Suggested starting principle: approximately **80--90% neutral
surfaces**, with the remaining color used selectively. This is a design
heuristic, not a rigid ratio.

Do not give every dashboard metric card a different color just to make
the page look colorful. Prefer neutral cards with a small semantic icon,
label, or chart accent.

### 3.4 Example CSS variables

``` css
:root {
  --ozofi-navy: #17213d;
  --ozofi-blue: #2563eb;
  --ozofi-indigo: #3730a3;
  --ozofi-purple: #8b3dff;
  --ozofi-teal: #0f9f8f;
  --ozofi-green: #65b814;
  --ozofi-amber: #ffaa0a;
  --ozofi-orange: #ff641f;
  --ozofi-red: #ef3434;

  --color-page: #ffffff;
  --color-surface: #f5f7fb;
  --color-surface-raised: #ffffff;
  --color-border: #e2e8f0;
  --color-text-primary: #17213d;
  --color-text-secondary: #64748b;
  --color-text-muted: #94a3b8;

  --color-action: #2563eb;
  --color-action-hover: #1d4ed8;
  --color-focus: #2563eb;

  --color-success: #15803d;
  --color-success-bg: #f0fdf4;
  --color-warning: #b45309;
  --color-warning-bg: #fffbeb;
  --color-danger: #b91c1c;
  --color-danger-bg: #fef2f2;
  --color-info: #1d4ed8;
  --color-info-bg: #eff6ff;

  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;

  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;

  --shadow-sm: 0 1px 2px rgb(15 23 42 / 5%);
  --shadow-md: 0 4px 12px rgb(15 23 42 / 8%);
}
```

Adapt token naming to the existing project conventions. Do not introduce
duplicate token systems if the repository already has an established
one.

## 4. Typography

### 4.1 Font family

Preferred starting font: **Inter**, with sensible system fallbacks.

``` css
font-family: Inter, ui-sans-serif, system-ui, -apple-system,
  BlinkMacSystemFont, "Segoe UI", sans-serif;
```

Do not add a remote font dependency if the product must work offline or
the repository already bundles an approved font. Follow existing
licensing and asset policies.

### 4.2 Type scale

  Style                          Size   Line height     Weight Typical use
  ------------ ---------------------- ------------- ---------- --------------------------
  Display                       36 px         44 px   650--700 Rare product-level hero
  H1                            32 px         40 px   600--700 Main page heading
  H2                            24 px         32 px        600 Major page section
  H3                            20 px         28 px        600 Card group or subsection
  H4                            18 px         26 px        600 Smaller section heading
  Body large                    16 px         24 px        400 Introductory text
  Body                      14--16 px     20--24 px        400 Main application content
  Label                         14 px         20 px        500 Form labels and controls
  Caption                   12--13 px         18 px        400 Supporting metadata
  Microcopy      12 px minimum target         16 px        400 Dense metadata only

Avoid text below 12 px for ordinary UI. Dense tables may need compact
modes, but must remain readable and zoom-friendly. Prefer 14--16 px body
text.

### 4.3 Typography rules

-   Use sentence case for page headings, buttons, tabs, and menu items.
-   Use uppercase sparingly for tiny overlines or section identifiers.
-   Keep line lengths readable; avoid paragraphs spanning the full width
    of large screens.
-   Use weight and spacing to establish hierarchy instead of using a
    different color for every heading.
-   Do not use all-bold pages or oversized headings inside every card.
-   Do not truncate essential data without a way to inspect the full
    value.

## 5. Layout and spacing

### 5.1 Spacing system

Use a consistent 4 px base scale, organized around an 8 px rhythm.

  Token          Value Example
  ------------ ------- ---------------------------
  `space-1`       4 px Icon/text micro-gap
  `space-2`       8 px Compact control spacing
  `space-3`      12 px Field label/control gap
  `space-4`      16 px Default component padding
  `space-5`      20 px Card interior spacing
  `space-6`      24 px Standard section gap
  `space-8`      32 px Major content group gap
  `space-10`     40 px Page-level separation
  `space-12`     48 px Large section spacing

Use existing project spacing tokens if present. Avoid arbitrary values
unless there is a clear layout reason.

### 5.2 Grid and page structure

-   Use a consistent page container and align the heading, filters,
    content, and pagination.
-   Establish a clear hierarchy: page title → summary/context → main
    action → filters or tabs → primary content.
-   Use responsive grids rather than fixed-width dashboard columns.
-   Keep a readable maximum content width for text-heavy pages.
-   Use dense layouts for data-heavy workflows only when they remain
    scannable.
-   Keep sticky headers and sidebars from obscuring focus targets or
    page content.
-   Avoid nested cards inside cards unless the nested grouping adds real
    meaning.

### 5.3 Responsive breakpoints

Use the existing project's breakpoint system where possible. If none
exists, these are reasonable starting points:

  ------------------------------------------------------------------------
  Name                                         Width Guidance
  --------------------- ---------------------------- ---------------------
  Small mobile                          under 480 px One-column layout;
                                                     essential actions
                                                     remain visible

  Mobile/tablet                          480--767 px Stack forms and
                                                     cards; compact
                                                     navigation

  Tablet                                768--1023 px Two-column layouts
                                                     where content allows

  Desktop                              1024--1439 px Standard sidebar and
                                                     content workspace

  Wide desktop                     1440 px and above Wider content area;
                                                     do not stretch text
                                                     indefinitely
  ------------------------------------------------------------------------

Do not design only for a 1440 px screenshot. Check narrow screens,
browser zoom, long labels, empty states, and tables with many columns.

## 6. Component standards

### 6.1 Buttons

Button hierarchy: - **Primary:** one clear main action per visual
region, typically solid blue. - **Secondary:** outlined or neutral
surface for a supporting action. - **Tertiary:** text button for
low-emphasis actions. - **Success:** use only when the action's meaning
is genuinely a successful/confirming action. - **Warning:** use for
cautionary actions where context warrants it. - **Destructive:** red
treatment for delete, revoke, or similarly destructive operations.

Rules: - Buttons must have clear action labels, such as "Save changes"
rather than "OK" when context is not obvious. - Include hover, active,
focus-visible, disabled, and loading states. - Prevent duplicate
submissions while a request is in progress. - Preserve a visible label
for important actions; do not rely on icons alone. - Confirm
irreversible or high-impact actions and explain what will happen. -
Disabled controls must look disabled and must not trigger actions.

### 6.2 Inputs and forms

-   Use persistent visible labels; placeholders are examples, not label
    replacements.
-   Group related fields and order them according to the user's
    workflow.
-   Mark required fields consistently and explain validation rules
    before or near submission.
-   Validate on the client for usability and on the server for security
    and correctness.
-   Display errors next to the affected field and provide a concise
    summary for long forms.
-   Preserve valid input when a submission fails.
-   Show success only after the operation is confirmed by the
    application.
-   Make password visibility controls, date pickers, comboboxes, and
    custom controls keyboard accessible.
-   Do not use color alone to mark invalid fields.

### 6.3 Cards and panels

-   Use cards to group related information or actions, not to wrap every
    element.
-   Prefer neutral surfaces, subtle borders, and consistent padding.
-   Keep titles and action areas aligned across sibling cards.
-   Make clickable cards discoverable and keyboard accessible; do not
    make a whole card clickable if it contains conflicting nested
    actions.
-   Avoid artificial shadows, heavy gradients, or oversized icon tiles
    without a purpose.

### 6.4 Navigation and sidebars

-   Keep labels consistent with the product's actual domain terminology.
-   Highlight the current route clearly and programmatically.
-   Group related destinations logically and avoid deep, unnecessary
    navigation trees.
-   Use a responsive drawer or collapsible navigation on smaller
    screens.
-   Preserve keyboard access, focus visibility, and correct
    expanded/collapsed state.
-   Do not show links that the user cannot access; however, do not treat
    hiding a link as authorization. The server must enforce permissions.
-   Avoid changing route definitions or access rules as part of a
    visual-only task.

### 6.5 Tables and data grids

-   Use clear column headers, aligned values, and consistent row
    heights.
-   Right-align numeric values where it improves comparison.
-   Keep important identifiers and status visible; avoid relying on
    color-only status chips.
-   Provide loading, empty, error, and pagination states where
    applicable.
-   Make sorting and filtering state understandable and accessible.
-   On mobile, choose a deliberate strategy: responsive column
    reduction, horizontal scrolling, or a list/card alternative. Do not
    simply shrink all columns until unreadable.
-   Confirm destructive row actions and prevent accidental clicks.
-   Never replace real data with invented demo records in a production
    screen.

### 6.6 Status badges

Use semantic badges consistently: - Success/completed: green. -
Pending/attention: amber. - Error/failed: red. - Informational/in
progress: blue. - AI-generated or intelligence-specific: purple only
where it adds meaning. - Neutral/default: gray or neutral surface.

Always include readable text. Ensure text/background contrast. Avoid
using bright colored pills for every category or ordinary metadata.

### 6.7 Dialogs and popovers

-   Use dialogs for focused decisions, short forms, and confirmations.
-   Give each dialog a clear title, description when needed, and visible
    close/cancel action.
-   Manage focus when opening and closing; keep keyboard navigation
    within modal dialogs.
-   Return focus to the triggering element when appropriate.
-   Prevent background interaction when a modal is active.
-   Use a full page instead of a modal for complex multi-step workflows.
-   Do not stack dialogs or open a popover off-screen.

### 6.8 Notifications and feedback

Provide feedback for meaningful operations: - Loading/progress while
work is happening. - Success only after confirmed completion. -
Actionable errors with recovery guidance where possible. - Warning
before risky operations. - Empty states that explain why no content is
shown and what the user can do next.

Do not display fake success messages, swallow errors, or show raw stack
traces to end users. Log technical detail through the project's approved
logging mechanism.

## 7. AI-specific UI guidance

Ozofi AI features should feel like useful software capabilities, not
decorative chatbot gimmicks.

-   Use purple as a restrained semantic accent for AI-specific
    functionality.
-   Label generated content and distinguish it from user-authored or
    verified content where that distinction matters.
-   Explain what an AI action will do before a consequential operation.
-   Provide review and confirmation steps before sending messages,
    deleting data, changing permissions, or triggering external actions.
-   Show meaningful progress for long-running operations and allow
    cancellation where technically supported.
-   Make uncertainty and limitations visible when relevant.
-   Never imply an action succeeded when the underlying API has not
    confirmed it.
-   Avoid autonomous execution of high-impact actions without
    appropriate authorization and confirmation.
-   Preserve auditability for consequential actions where the product
    requires it.
-   Do not expose system prompts, secrets, tokens, hidden
    chain-of-thought, or private implementation data in the UI.

## 8. Motion and interaction

Motion should explain a state change, not serve as decoration.

-   Keep common transitions short and subtle.
-   Use animation for opening/closing, loading, selection, and
    meaningful progress.
-   Respect `prefers-reduced-motion`.
-   Avoid parallax, constant movement, bouncing elements, animated
    gradients, and long page transitions.
-   Ensure animations do not delay task completion or hide important
    feedback.
-   Do not add a motion library unless the project needs it and the
    dependency is approved.

## 9. Accessibility requirements

Treat accessibility as a functional requirement, not a final polish
step.

Minimum expectations: - Semantic HTML elements and correct heading
hierarchy. - Every input has an accessible name and an associated
label. - Buttons and links have meaningful names. - All functionality is
available by keyboard. - Visible `:focus-visible` treatment. - No
keyboard traps. - Dialogs, menus, tabs, and custom controls expose
correct roles and state. - Status and error changes are announced
appropriately when needed. - Images have appropriate alternative text;
decorative images use empty alt text. - Color is never the only way to
convey information. - Text and control contrast are checked against WCAG
2.2 AA requirements where applicable. - Content works at browser zoom
and reflow sizes without loss of functionality. - Touch targets should
be comfortably usable; target approximately 44 × 44 CSS px for primary
touch controls where practical. - Reduced-motion preferences are
respected.

Automated accessibility tools help but do not replace keyboard and
assistive-technology checks. Do not claim WCAG compliance without
testing and evidence.

## 10. Data integrity and realistic UI behavior

-   Use actual API responses and existing state management.
-   Do not fabricate KPI values, activity history, user names,
    notifications, or charts for a production dashboard.
-   If sample data is necessary for a clearly identified prototype,
    label it as sample data.
-   Model loading, empty, success, partial, and error states.
-   Handle slow networks and retry paths deliberately.
-   Keep filters, pagination, sorting, and search synchronized with
    actual data behavior.
-   Do not simulate a backend operation with a local toast or optimistic
    state unless that behavior is deliberately designed and rolled back
    on failure.
-   Never place secrets or sensitive personal data in client-side
    constants, logs, or error messages.

## 11. Technical implementation rules for coding agents

Before changing code:

1.  Inspect the repository structure, package scripts, current design
    tokens, shared components, routing, state management, and test
    setup.
2.  Identify the exact page and components involved.
3.  Read relevant implementation and tests before editing.
4.  Determine whether the requested task is visual-only or requires
    functional changes.
5.  Record the current behavior that must remain unchanged.
6.  Propose a small implementation plan and identify risk areas.

While implementing:

-   Reuse existing components, tokens, and conventions.
-   Prefer targeted changes over broad refactors.
-   Keep components focused and maintainable.
-   Avoid unnecessary new dependencies.
-   Preserve API contracts, routes, authorization, business rules, and
    database behavior unless explicitly requested.
-   Never weaken permissions or security to make the UI easier to
    implement.
-   Do not remove existing functionality because it is visually
    inconvenient.
-   Do not create a parallel design system if one already exists.
-   Keep responsive and accessible states in scope from the start.
-   Use real icons from the existing approved icon library; avoid emoji
    as interface icons unless the product explicitly calls for them.
-   Do not leave dead buttons, placeholder links, TODO-only controls, or
    decorative elements that appear interactive.
-   Do not make unrelated formatting changes across the repository.

After implementation:

1.  Run the project's relevant lint, type-check, unit, and build
    commands.
2.  Run or update UI tests.
3.  Use Playwright when the repository has it configured or the task
    requires browser-level verification.
4.  Test desktop and mobile layouts.
5.  Check loading, empty, error, disabled, and success states.
6.  Check keyboard navigation and visible focus.
7.  Inspect browser console and network errors.
8.  Review the diff for unrelated changes, secrets, accidental API
    changes, and removed behavior.
9.  Report what changed, tests actually run, failures, and any remaining
    limitations.

Never claim that a test passed if it was not executed. Never claim
production readiness based only on a successful frontend build.

## 12. Safe implementation workflow

Use the following stages for non-trivial work.

### Stage A --- Discovery

-   Read the README and package scripts.
-   Identify framework and component library.
-   Find current color tokens and typography definitions.
-   Find route entry points and page ownership.
-   Find tests and CI checks.
-   Record constraints and potential regressions.

**Exit condition:** The implementation area and protected behavior are
understood.

### Stage B --- Plan

-   List the intended files to change.
-   Describe the visual/functional outcome.
-   State which behavior must not change.
-   Identify responsive and accessibility requirements.
-   Identify required tests.

**Exit condition:** The plan is narrow, reversible, and testable.

### Stage C --- Implement

-   Apply tokens before repeating literal colors.
-   Build or reuse shared primitives where appropriate.
-   Implement complete states, not only the ideal screenshot.
-   Keep changes aligned with existing architecture.

**Exit condition:** The requested experience is implemented without
unrelated changes.

### Stage D --- Verify

-   Run relevant static checks and tests.
-   Test browser interactions and responsive layouts.
-   Verify real data, routes, permissions, and error handling when
    relevant.
-   Compare the implementation with the design requirements.

**Exit condition:** Results are documented accurately, including
failures.

### Stage E --- Report

Include: - Summary of changes. - Files changed. - Design
tokens/components reused or added. - Commands and tests executed. - Test
results and failures. - Accessibility/responsive checks completed. -
Known limitations and recommended next steps.

Do not silently expand scope. If an existing defect blocks the task,
report it and propose a separate fix unless the user has authorized the
broader change.

## 13. UI review checklist

### Visual quality

-   [ ] The page has a clear heading and primary action.
-   [ ] Spacing follows the established token system.
-   [ ] Typography is readable and consistent.
-   [ ] Neutral surfaces dominate; accent colors communicate meaning.
-   [ ] Cards, fields, buttons, and tables share consistent dimensions.
-   [ ] No overlap, clipping, accidental horizontal overflow, or
    unexplained empty space.
-   [ ] No unnecessary gradients, glass effects, or decorative
    animation.
-   [ ] Real product data is shown accurately.

### Interaction quality

-   [ ] Every visible control has a real, clear behavior.
-   [ ] Loading and disabled states work.
-   [ ] Validation and errors are understandable.
-   [ ] Destructive actions are protected appropriately.
-   [ ] Success feedback follows confirmed success.
-   [ ] Search, filtering, sorting, and pagination work as presented.

### Responsive quality

-   [ ] Mobile navigation is usable.
-   [ ] Forms stack appropriately.
-   [ ] Tables remain usable on narrow screens.
-   [ ] Long labels and values do not break the layout.
-   [ ] Zoom and reflow do not hide critical controls.

### Accessibility

-   [ ] Keyboard navigation works.
-   [ ] Focus is visible.
-   [ ] Labels and accessible names are present.
-   [ ] Status is not conveyed by color alone.
-   [ ] Contrast is checked.
-   [ ] Dialogs and menus manage focus correctly.
-   [ ] Reduced-motion preferences are respected.

### Engineering quality

-   [ ] Existing architecture and API contracts are preserved.
-   [ ] No unnecessary dependency was added.
-   [ ] No permissions or security checks were weakened.
-   [ ] Lint/type-check/build/test commands were run as applicable.
-   [ ] Browser console and network errors were checked.
-   [ ] The diff contains only relevant changes.
-   [ ] The final report distinguishes verified results from
    assumptions.

## 14. Coding-agent skill prompt

Copy the following section into an agent instruction or adapt it for the
repository's supported skill format.

> You are implementing the Ozofi UI design system. Follow
> `OZOFI_UI_SKILL.md` as the visual and interaction source of truth.
>
> **First inspect; then plan; then implement; then verify.** Do not
> begin with a broad redesign. Inspect the repository, framework,
> package scripts, existing tokens, shared components, routing, state
> management, and tests. Reuse the established stack and conventions.
>
> Use a clean, light, professional enterprise SaaS style. Prefer white
> and soft-neutral surfaces, navy structure, blue primary actions,
> purple for AI-specific features, green for success/automation, amber
> for caution/pending, and red for errors/destructive actions. Use color
> semantically and sparingly. Keep typography readable, spacing
> consistent, borders subtle, and layouts responsive. Avoid generic
> template styling, excessive gradients/glassmorphism, clutter, tiny
> text, fake metrics, and unnecessary animation.
>
> Preserve all existing business logic, APIs, routes, authorization, and
> data behavior unless the task explicitly requests a change. Never
> remove functionality to simplify the design. Do not invent data or
> claim success before an operation is confirmed. Every visible control
> must work or be clearly presented as non-interactive.
>
> Implement loading, empty, error, disabled, and success states. Meet
> keyboard-accessibility and visible-focus expectations. Validate
> responsive layouts and contrast. Avoid unnecessary dependencies and
> unrelated refactors.
>
> Before editing, provide a concise plan and the files expected to
> change. After editing, run relevant lint, type-check, build, unit, and
> browser tests available in the project. Use Playwright for
> browser-level verification when available or required. Report exact
> commands and outcomes, files changed, remaining issues, and checks not
> performed. Never claim tests passed unless they actually ran.
>
> If the task conflicts with this guide or existing project constraints,
> preserve security and existing behavior, explain the conflict, and
> choose the smallest safe implementation.

## 15. Suggested repository placement

Choose a location that matches the repository's conventions:

``` text
repository/
├── README.md
├── docs/
│   └── design-system/
│       ├── OZOFI_UI_SKILL.md
│       ├── COLOR_TOKENS.md
│       └── COMPONENT_GUIDELINES.md
└── ...
```

If the coding agent supports a dedicated skill format, keep this guide
as the authoritative design reference and add the skill's required
metadata/entry file according to that agent's actual specification. Do
not assume every agent uses the same skill folder structure.

## 16. Governance and evolution

-   Treat token changes as design-system changes, not isolated page
    tweaks.
-   Prefer adding semantic tokens over adding more arbitrary colors.
-   Review new components for accessibility, responsive behavior, and
    complete states.
-   Document meaningful changes and migration guidance.
-   Test color tokens in real components before adopting them globally.
-   Keep product-specific exceptions explicit and limited.
-   Avoid breaking changes to shared components without checking their
    consumers.
-   Gather feedback from actual users and revise the system based on
    observed workflows.

## 17. Definition of done

A UI task is complete when: - The requested workflow is clear and
usable. - The interface follows the Ozofi visual principles and semantic
color rules. - Existing behavior and security boundaries are
preserved. - Responsive, loading, empty, error, and disabled states are
handled. - Accessibility basics have been checked. - Relevant tests have
been run and results recorded. - No unnecessary dependencies, fake
production data, dead controls, or unrelated refactors remain. - The
implementation and its limitations are accurately reported.

------------------------------------------------------------------------

**End of guide.**

This guide defines the intended design direction; it does not replace
product requirements, security policies, framework documentation, or
verified accessibility testing.
