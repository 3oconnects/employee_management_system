# Technical Handover Guide (Junior Developers)

## Overview

This document serves as the primary technical guide for junior developers joining the Employee Management System (EMS) project. It outlines the core tech stack, folder organization, and coding standards required to maintain a high-quality codebase.

---

## 🛠 Global Tech Stack

### Frontend (Client)

- **Core**: React 18, TypeScript, Vite.
- **Styling**: Tailwind CSS (Use `tailwind-merge` for dynamic classes).
- **State**: Zustand (Small, focused stores).
- **Forms**: React Hook Form + Zod for validation.
- **API**: Axios with interceptors for JWT injection.
- **Icons**: Lucide-React.

### Backend (Server)

- **Runtime**: Node.js (LTS), TypeScript.
- **Framework**: Express.js.
- **Auth**: JWT (Stateless) with `jsonwebtoken`.
- **Validation**: Valibot or Zod (Parallel to frontend).
- **Utilities**: `dotenv` for config, `cors` for security.

---

## 📂 Standardized Folder Structure

Maintain this structure strictly to ensure modularity.

### Client-side (`/client/src`)

```text
├── assets/           # Static images, global fonts, svgs
├── components/       # Shared UI components (Button, Input, Modal)
│   ├── ui/           # Atomic components
│   └── layout/       # MainLayout, Sidebar, Navbar
├── modules/          # Feature-based folders (The "Zoho People" Modules)
│   ├── [feature]/    # e.g., auth, dashboard, recruitment
│   │   ├── components/ # Internal feature components
│   │   ├── pages/      # Route-level components
│   │   └── hooks/      # Feature-specific logic
├── services/         # API call definitions (Axios instances)
├── store/            # Zustand global stores
├── utils/            # Shared formatting/logic functions
└── types/            # Global TypeScript interfaces
```

### Server-side (`/server/src`)

```text
├── config/           # DB connections, Env configs
├── controllers/      # Request handlers (Logic layer)
├── middleware/       # Auth, Logger, Error handlers
├── models/           # DB Schemas / TypeScript interfaces
├── routes/           # API Route definitions
├── utils/            # Helper functions
└── index.ts          # Server entry point
```

---

## 📜 Coding Standards & Best Practices

### 1. TypeScript is Mandatory

- **No `any`**: Always define interfaces or types for props, state, and API responses.
- **Strict Mode**: Ensure `tsconfig` remains in strict mode to catch null/undefined errors.

### 2. Component Architecture

- **Functional Components**: Use arrow functions (`const MyComp = () => ...`).
- **De-structuring**: Destructure props directly in the function signature.
- **Hooks**: Keep logic in custom hooks if a component exceeds 150 lines.

### 3. CSS Performance

- **Utility First**: Stick to Tailwind classes. Avoid custom CSS in `.css` files unless absolutely necessary.
- **Responsive-first**: Use `sm:`, `md:`, `lg:` prefixes consistently.

### 4. Git Workflow

- **Naming**: `feature/module-name`, `bugfix/issue-description`.
- **Commits**: Use conventional commits (e.g., `feat: add leave approval logic`, `fix: sidebar mobile padding`).

---

## 🚀 Development Workflow

1.  **Strict Linting**: Run `npm run lint` before committing.
2.  **Environment Sync**: Always check `file.sample` (or `.env.example`) for new environment variables.
3.  **Documentation First**: When adding a new module, update the `docs/` folder before writing code.

---

## 💡 Junior Dev Onboarding Checklist

- [ ] Pull latest code from `main`.
- [ ] Install dependencies in both `client` and `server`.
- [ ] Setup local `.env` files.
- [ ] Read the `08_ux_and_design_tokens.md` to understand design rules.
- [ ] Start by picking a task from the `UI/Atomic` components to get familiar.
