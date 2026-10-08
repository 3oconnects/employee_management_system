/**
 * Email Domain Submodels
 * 
 * Defines typed submodels for SMTP transport configuration, email options,
 * personnel action notifications (promotions, department transfers), and system account emails.
 */

export interface EmailAttachmentSubmodel {
    filename: string;
    content?: string | Buffer;
    path?: string;
    contentType?: string;
    cid?: string;
}

export type EmailAttachment = EmailAttachmentSubmodel;

export interface EmailOptionsSubmodel {
    to: string;
    cc?: string | string[];
    subject: string;
    html: string;
    tenantId?: string;
    attachments?: EmailAttachmentSubmodel[];
}

export type EmailOptions = EmailOptionsSubmodel;

export interface SmtpConfigSubmodel {
    host: string;
    port: number;
    user: string;
    pass: string;
    from: string;
    secure: boolean;
}

export interface EmployeeActionChangeSubmodel {
    field: string;
    label: string;
    from?: string | null;
    to: string;
    isPromotion?: boolean;
}

export type EmployeeActionChange = EmployeeActionChangeSubmodel;

export interface EmployeeActionNotificationSubmodel {
    employeeId: string;
    name: string;
    email: string;
    personalEmail?: string | null;
    changes: EmployeeActionChangeSubmodel[];
    newPosition?: string;
    newRole?: string;
    newDepartment?: string;
    newStatus?: string;
    effectiveDate?: string;
    tenantId?: string;
    logoUrl?: string;
}

export type EmployeeActionNotificationData = EmployeeActionNotificationSubmodel;

export interface OnboardingCredentialsEmailPayloadSubmodel {
    employeeId: string;
    name: string;
    email: string;
    personalEmail?: string | null;
    tempPassword?: string;
    position?: string;
    department?: string;
    loginUrl?: string;
    tenantId?: string;
}

export type OnboardingCredentialsEmailPayload = OnboardingCredentialsEmailPayloadSubmodel;

export interface WelcomeEmailPayloadSubmodel {
    name: string;
    email: string;
    tempPassword: string;
    role: string;
    loginUrl: string;
    orgName?: string;
}

export interface RoleAssignmentPayloadSubmodel {
    name: string;
    email: string;
    role: string;
    orgName?: string;
    loginUrl: string;
}

export interface PasswordResetPayloadSubmodel {
    name: string;
    resetUrl: string;
    expiresInMinutes: number;
}
