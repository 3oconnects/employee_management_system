# Payroll & Finance Administration - Page Requirements

## Overview

Secure management of employee compensation, taxes, and reimbursement claims.

## UI/UX Flow

- **Pay Slip Dashboard**: List of historic pay slips with viewing/downloading options.
- **Tax Declarations (FBP)**: Guided wizard for declaring investments and calculating tax saving.
- **Admin Control Panel**: Bulk "Generate Payroll" button and variance report dashboard.

## Functional Requirements

### 1. Salary Components

- **Fixed & Variable**: Base Pay, HRA, LTA, Special Allowance, and Performance Bonuses.
- **Deductions**: Statutory (PF, PT, ESI, TDS) and Voluntary (LWP, Loan recovery).
- **Arrears**: Automatic calculation of backdated salary increments.

### 2. Flexible Benefit Plan (FBP)

- **Allowance Selection**: Employees can choose from food coupons, fuel allowance, or telephony reimbursements.
- **Proof Submission**: Interactive gallery for uploading bills/receipts for tax exemption.

### 3. Payroll Processing (Admin)

- **One-click Run**: Automates calculations based on attendance and leave logs.
- **Hold Salary**: Provision to hold salary for employees in their notice period or absconding cases.
- **Export Formats**: Generate Bank Transfer Files (XLS/CSV) and Form 16 (for Indian Tax compliance).

## Logic & Business Rules

- **Integration**: Real-time sync with Attendance (to calculate LWP) and Leaves.
- **Encrypted Storage**: Salary data must be encrypted at rest and masked in logs.
- **Cut-off Dates**: Monthly freeze on earnings/deductions (e.g., 25th of every month).

## UX Concepts

- **Confidentiality Toggles**: "Eye" icon to hide/show salary figures on screen.
- **Progressive Disclosure**: Detailed breakdown of tax calculations hidden under "View Calculation" tooltip.
- **Bulk Operations**: Seamless UI for clearing pending reimbursement claims in bulk.
