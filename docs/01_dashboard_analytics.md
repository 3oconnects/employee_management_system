# Dashboard & Analytics - Page Requirements

## Overview

The Dashboard is the central cockpit for both employees and HR admins. It provides a real-time snapshot of organizational health, pending tasks, and personal metrics.

## UI/UX Flow (Inspired by Zoho People)

- **Layout**: Widget-based grid (drag-and-drop capability for personalized views).

* **Navigation**: Primary sidebar with quick-access icons.
* **Visuals**: Clean typography, high-contrast states, and subtle micro-animations for data loading.

## Functional Requirements

### 1. Employee View (Individual Contributor)

- **Attendance Widget**: Current day's status (Checked-in time, duration).
- **Leave Balance**: Quick view of available Casual, Sick, and Earned leaves.
- **Pending Tasks**: Approval requests, document signings, or performance self-appraisals.
- **Organization Announcements**: Scrolling marquee or card-based feed for company news.
- **Calendar**: Integration of upcoming holidays, team leaves, and birthdays.

### 2. Admin/HR View

- **Total Headcount**: Dynamic counter with department-wise breakdown.
- **Attendance Rate**: Percentage of employees checked in today vs total.
- **Leave Requests**: Actionable list of pending approvals across the organization.
- **Attrition/Turnover Rate**: Monthly/Quarterly trend lines.
- **Gender Diversity**: Pie chart showing organization-wide demographics.

## Logic & Business Rules

- **Data Refresh**: Poll API every 5 minutes or use WebSockets for real-time attendance updates.
- **RBAC Filters**: Admins see global data; Managers see team data; Employees see personal data only.
- **Widget Visibility**: Restricted based on user roles (e.g., "Payroll Budget" widget only for Admins/Finance).

## UX Concepts

- **Empty States**: Friendly illustrations for "No Pending Tasks" or "No Upcoming Holidays".
- **Loading States**: Shimmer effect (Skeleton screens) for widgets to reduce perceived latency.
- **Interactivity**: Clicking a widget (e.g., "Attendance Rate") navigates deeper into the respective module.
