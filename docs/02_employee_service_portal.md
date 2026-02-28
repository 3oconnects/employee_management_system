# Employee Service Portal (ESS) - Page Requirements

## Overview

The Employee Self-Service (ESS) portal empowers employees to manage their personal information, documents, and professional profile without HR intervention.

## UI/UX Flow

- **Profile Summary**: Header with employee photo, designation, and primary contact.
- **Tabbed Navigation**: Personal Info | Professional Details | Documents | Assets | Education.

## Functional Requirements

### 1. Profile Management

- **Personal Information**: Editable fields for contact details, home address, and emergency contacts (requires HR approval).
- **Professional Details**: Read-only view of reporting hierarchy, joining date, and employee ID.
- **Skills Matrix**: Employees can tag their skills (Endorsable by managers).

### 2. Document Vault

- **Digital Storage**: Store digital copies of Aadhar, PAN, Degree certificates, and Passport.
- **HR Policy Downloads**: Access to company handbook, NDAs, and insurance policy documents.
- **Electronic Signatures**: In-built signing capability for internal documents.

### 3. Asset Management

- **Inventory View**: List of company-provided assets (Laptop, Mobile, Security Key).
- **Raise Request**: Form to request new assets or report damage.

## Logic & Business Rules

- **Approval Workflow**: Edits to sensitive fields (e.g., Date of Birth, Bank Details) trigger a workflow to HR for verification.
- **Privacy Settings**: Certain fields (e.g., home address) hidden from non-reporting managers.
- **File Limits**: Max 5MB per document; supported formats (PDF, JPG, PNG).

## UX Concepts

- **Consistency**: High-quality avatars and consistent iconography across profile tabs.
- **Direct Feedback**: Inline validation for form fields (e.g., Phone number format, Email format).
- **Mobile First**: Profile views optimized for mobile app "Digital Identity Card" experience.
