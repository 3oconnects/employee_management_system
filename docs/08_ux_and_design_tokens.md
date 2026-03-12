# UX Design System & Design Tokens

## Overview

The "Luminous Duo" design system for EMS—prioritizing professional aesthetics, high productivity, and modern user experience.

## Brand Identity

- **Primary Color**: #2563EB (Corporate Blue)
- **Success Tone**: #10B981 (Emerald Green)
- **Warning Tone**: #F59E0B (Amber)
- **Dark Mode Surface**: #0F172A (Navy Slate)

## Typography

- **Primary Font**: 'Outfit' or 'Inter' (Sans-serif)
- **Hierarchy**:
  - H1: 32px, Bold (Page Titles)
  - H2: 24px, Semi-bold (Module Headers)
  - Body: 16px, Regular (Content)
  - Captions: 12px, Slate (Metadata/Timestamps)

## Component Library Standards

### 1. Navigation Shell

- **Persistence**: Sidebar remains fixed; contents scroll.
- **Collapsible**: Ability to shrink sidebar to "Icon-only" mode for more workspace.
- **Breadcrumbs**: Always visible to show current depth (e.g., _Employees > Profile > Leave History_).

### 2. Data Tables (Zoho Style)

- **Density Toggles**: Compact vs. Comfortable views.
- **Sticky Headers**: Essential for long employee lists.
- **Inline Actions**: Hover triggers "Edit", "Delete", or "View" icons to reduce clutter.

### 3. Forms & Modals

- **Auto-focus**: First input field focused on modal open.
- **Backdrop Blur**: Use `backdrop-filter: blur(8px)` for focused modal experience.
- **Validation**: Real-time feedback using Zod error messages below fields.

## Interactive Concepts

- **Micro-interactions**: Subtle scale-up (102%) on hover for action cards.
- **Transitions**: Slide-in from right for side-drawers (Profile edit views).
- **Dark Mode**: High-contrast accessibility for late-night HR processing.
