# Attendance & Time Tracking - Page Requirements

## Overview

A comprehensive module for tracking employee presence, shift timings, and billable hours.

## UI/UX Flow (Zoho People Reference)

- **Check-in/Out Modal**: Big, prominent "Clock In" button on the dashboard and dedicated attendance page.
- **Visual Timeline**: A linear bar showing logged hours vs. required hours for the day.
- **Calendar View**: Monthly grid with color-coded status (Present, Absent, Leave, Weekend).

## Functional Requirements

### 1. Attendance Capture

- **Web Check-in**: Standard browser-based clock-in/out.
- **Geo-fencing/IP Restriction**: Ability to restrict clock-ins only from office IP ranges or specific GPS coordinates (for remote site workers).
- **Offline Mode**: Local storage capture of logs if internet is lost, with subsequent sync.

### 2. Shift Management

- **Shift Rosters**: Define multiple shifts (General, Night, Rotational).
- **Shift Swapping**: Employee request to swap shifts, subject to manager approval.
- **Grace Period**: Configuration for late-in (e.g., 15 mins) and early-out permissions.

### 3. Timesheets

- **Project Linking**: Log hours against specific projects and tasks.
- **Approval Workflow**: Weekly submission of timesheets to respective project managers.
- **Billable vs Non-Billable**: Classification of hours for client billing.

## Logic & Business Rules

- **Auto Clock-out**: Automated clock-out at the end of the day if an employee forgets (configurable).
- **Overtime Calculation**: Logic to automatically calculate OT based on hours logged beyond the standard 8/9 hour shift.
- **Attendance Regularization**: Flow for employees to explain missing logs (e.g., "Forgot to clock in" or "On-duty/Client Meeting").

## UX Concepts

- **Real-time Counter**: A live ticking clock showing "Time Since Logged In" to create awareness.
- **Mobile Push**: Notifications at the start/end of shift timings to remind employees to log time.
- **Color Cues**: Red for "Absent", Green for "Present", Yellow for "Shortage of Hours".
