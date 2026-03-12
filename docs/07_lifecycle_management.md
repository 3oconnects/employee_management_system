# Employee Lifecycle Management - Page Requirements

## Overview

Comprehensive management of the employee journey from hiring/onboarding to exit/offboarding.

## UI/UX Flow

- **Onboarding Pipeline**: Kanban or Checklist view of candidates in transition.
- **Exit Portal**: A compassionate, simplified UI for resigning employees.
- **Relieving Docs**: Secure download area for Experience letters and Relieving letters.

## Functional Requirements

### 1. Onboarding Flow

- **Pre-joining Checklist**: Automated emails to candidates for document uploads.
- **IT/Asset Provisioning**: Automated tickets sent to IT department for Laptop/Email ID setup.
- **Orientation Schedule**: View for new joiners to see their first-week training and meetings.

### 2. Promotions & Transfers

- **Internal Job Posting (IJP)**: Application portal for internal transfers.
- **Role Evolution**: Automated workflow for designation changes and reporting manager updates.

### 3. Offboarding (Separation)

- **Resignation Workflow**: Standard notice period calculation with manager review.
- **Exit Interviews**: Online survey forms to capture departure reasons.
- **Full & Final (F&F) Settlement**: Automated clearance workflow from Finance, IT, and Dept Heads.

## Logic & Business Rules

- **Contract Management**: Expiry alerts for contract employees (30/60 day warnings).
- **Access Revocation**: Trigger for IT to disable Email/VPN access at 6 PM on the last working day.
- **Asset Recovery**: Lock F&F processing until all assets are marked "Returned" in the system.

## UX Concepts

- **Celebratory UI**: Confetti animations on "Onboarding Completion".
- **Step-by-Step Wizards**: To prevent cognitive load for new employees during document submission.
- **Digital Handshake**: Welcome dashboard with team intro videos and company vision docs.
