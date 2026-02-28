# System Architecture & API Logic Mapping

## Overview

Technical mapping of how the frontend modules interact with the backend services.

## Technology Stack

- **Frontend**: Vite + React + TypeScript + Zustand (State).
- **Backend**: Node.js + Express + TypeScript.
- **Auth**: JWT based RBAC (Role-Based Access Control).

## Data Flow (Zustand Stores)

- `useAuthStore`: Handles login state, user tokens, and role permissions.
- `useEmployeeStore`: Manages directory data, filtering, and pagination states.
- `useAttendanceStore`: Real-time tracking of current session and history logs.

## API Endpoint Mapping (v1)

### /api/v1/auth

- `POST /login`: authenticate and receive JWT + Role.
- `GET /me`: refresh user profile and permissions.

### /api/v1/employees

- `GET /`: fetch paginated employee list (with `search`, `dept` filters).
- `POST /`: onboard new employee (Admin only).
- `PATCH /:id`: update employee profile (Manager/HR/Self).

### /api/v1/attendance

- `POST /check-in`: start session (captures Timestamp + IP).
- `POST /check-out`: end session and calculate duration.
- `GET /logs`: monthly/weekly logs for the authenticated user.

### /api/v1/leaves

- `GET /balance`: current available leaves.
- `POST /apply`: submit a new leave request.
- `PATCH /approve/:id`: approve/reject request (Manager only).

## Security Implementation

- **Route Guards**: Frontend `ProtectedRoute` component checking `allowedRoles` prop.
- **Backend Middleware**: `authMiddleware` verifying JWT and `roleMiddleware` checking ACLs.
- **Input Sanitization**: Valibot/Zod on both ends to prevent injection attacks.

## Database Schema (Proposed)

- **Users**: `id, email, password_hash, role_id, profile_id`
- **Profiles**: `id, first_name, last_name, joining_date, designation, manager_id`
- **Attendance**: `id, profile_id, check_in, check_out, ip_address, status`
- **Leaves**: `id, profile_id, type, start_date, end_date, approval_status, reason`
