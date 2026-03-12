# Leave & Absence Management - Page Requirements

## Overview

Streamlined handling of employee time-off requests, accruals, and holiday planning.

## UI/UX Flow

- **Leave Apply Form**: Date picker with auto-calculation of total days (excluding holidays/weekends).
- **Balance Dashboard**: Visual cards showing available days for each leave type.
- **Team Calendar**: Overlay view to see who else in the team is on leave during the requested period.

## Functional Requirements

### 1. Leave Policies

- **Leave Types**: Casual, Sick, Earned/Privilege, Maternity/Paternity, Bereavement.
- **Accrual Logic**: Monthly/Annual credit logic based on tenure and job grade.
- **Carry-forward/Encashment**: Rules for unavailed leaves at the end of the fiscal year.

### 2. Approval Workflow

- **Multi-level Approval**: Direct Manager -> Department Head -> HR (Optional).
- **Proxy/Delegation**: Ability to delegate approval authority during a manager's absence.
- **Auto-Approval**: Logic for specific leave types (e.g., Sick Leave for < 1 day).

### 3. Holiday Management

- **Location-based Holidays**: Different holiday lists for different regional offices.
- **Optional/Floating Holidays**: Employees can choose 'n' days from a pool of optional holidays.

## Logic & Business Rules

- **Clash Detection**: System warning if multiple critical team members apply for leave on the same dates.
- **Negative Balance**: Permission-based ability to avail leave in advance (LWP or "Unpaid Leave" as fallback).
- **Document Attachment**: Mandatory medical certificate upload if Sick Leave exceeds 2 days.

## UX Concepts

- **Quick Action Buttons**: "Quick Apply" on the dashboard for common leave types.
- **Status Tracking**: Visual progress bar for approval lifecycle (Applied -> Manager Approved -> HR Processed).
- **Empathetic Feedback**: Notification messages (e.g., "Enjoy your well-deserved break!").
