// ============================================================================
// EMS BACKEND — EMAIL SERVICE FACADE & ORCHESTRATOR
// ============================================================================
// Modular architecture organized into typed submodels and domain templates:
// - email.submodels.ts: Strongly typed payload and configuration models
// - email.transport.ts: SMTP config and nodemailer transport engine
// - templates/action.template.ts: Personnel action and promotion notifications
// - templates/system.template.ts: Welcome, role assignment, and password reset
// ============================================================================

import { BRAND } from '../config/brand';
import { 
    OfferLetterData, 
    CompanyConfig,
    generateOfferLetterHtml, 
    generateOfferLetterPdfBuffer, 
    buildWelcomeAndOfferEmailHtml, 
    buildOnboardingCredentialsEmailHtml,
    getLogoPath 
} from './offerLetterService';

import {
    EmailAttachment,
    EmailAttachmentSubmodel,
    EmailOptions,
    EmailOptionsSubmodel,
    SmtpConfigSubmodel,
    EmployeeActionChange,
    EmployeeActionChangeSubmodel,
    EmployeeActionNotificationData,
    EmployeeActionNotificationSubmodel,
    OnboardingCredentialsEmailPayload,
    OnboardingCredentialsEmailPayloadSubmodel,
    WelcomeEmailPayloadSubmodel,
    RoleAssignmentPayloadSubmodel,
    PasswordResetPayloadSubmodel,
} from './email/email.submodels';

import {
    getSmtpConfig,
    getCompanyLogoUrl,
    sendEmail,
} from './email/email.transport';

import { buildEmployeeActionEmailHtml } from './email/templates/action.template';
import {
    buildWelcomeEmail,
    buildRoleAssignmentEmail,
    buildPasswordResetEmail,
} from './email/templates/system.template';

// Re-export all submodels and templates for complete backward compatibility
export {
    EmailAttachment,
    EmailAttachmentSubmodel,
    EmailOptions,
    EmailOptionsSubmodel,
    SmtpConfigSubmodel,
    EmployeeActionChange,
    EmployeeActionChangeSubmodel,
    EmployeeActionNotificationData,
    EmployeeActionNotificationSubmodel,
    OnboardingCredentialsEmailPayload,
    OnboardingCredentialsEmailPayloadSubmodel,
    WelcomeEmailPayloadSubmodel,
    RoleAssignmentPayloadSubmodel,
    PasswordResetPayloadSubmodel,
    getSmtpConfig,
    getCompanyLogoUrl,
    sendEmail,
    buildWelcomeEmail,
    buildRoleAssignmentEmail,
    buildEmployeeActionEmailHtml,
    buildPasswordResetEmail,
};

// ─── HIGH-LEVEL SERVICE DISPATCHERS ──────────────────────────────────────────

/**
 * Sends a unified, executive Welcome & Offer Letter email with candidate appointment details
 * and attached official PDF offer letter.
 */
export const sendCandidateWelcomeAndOffer = async (
    data: OfferLetterData,
    tenantId?: string
): Promise<boolean> => {
    try {
        const cleanName = data.name.replace(/[^a-zA-Z0-9_-]/g, '_');
        
        // Generate PDF offer letter
        const [pdfBuffer] = await Promise.all([
            generateOfferLetterPdfBuffer(data),
            Promise.resolve(generateOfferLetterHtml(data))
        ]);

        if (!data.logoUrl) {
            data.logoUrl = await getCompanyLogoUrl(tenantId);
        }

        const emailHtml = buildWelcomeAndOfferEmailHtml(data);

        // Attach ONLY the official PDF offer letter (no image attachments that clutter Gmail inbox)
        const attachments: EmailAttachmentSubmodel[] = [
            {
                filename: `${CompanyConfig.name}_Offer_Letter_${cleanName}.pdf`,
                content: pdfBuffer,
                contentType: 'application/pdf',
            }
        ];

        // Deliver strictly to the candidate's personal email (or provided address).
        const primaryTo = data.personalEmail || data.email;

        return await sendEmail({
            to: primaryTo,
            subject: `Official Appointment & Offer of Employment: ${data.position} — ${CompanyConfig.name} [${data.employeeId}]`,
            html: emailHtml,
            tenantId,
            attachments,
        });
    } catch (err: any) {
        console.error('[EmailService] ❌ Failed to build or send offer email:', err.message);
        return false;
    }
};

/**
 * Sends official Employee Portal credentials exclusively once candidate onboarding is verified & approved.
 */
export const sendOnboardingCredentialsEmail = async (
    data: OnboardingCredentialsEmailPayloadSubmodel,
    tenantId?: string
): Promise<boolean> => {
    try {
        const logoUrl = await getCompanyLogoUrl(tenantId || data.tenantId);
        const emailHtml = buildOnboardingCredentialsEmailHtml({
            ...data,
            logoUrl: logoUrl || undefined,
        });

        const primaryTo = data.personalEmail || data.email;
        const cc = (data.personalEmail && data.email && data.personalEmail.toLowerCase() !== data.email.toLowerCase())
            ? data.email
            : undefined;

        return await sendEmail({
            to: primaryTo,
            cc,
            subject: `Welcome to ${CompanyConfig.name}! Your Employee Portal Access & Credentials [${data.employeeId}]`,
            html: emailHtml,
            tenantId: tenantId || data.tenantId,
        });
    } catch (err: any) {
        console.error('[EmailService] ❌ Failed to send onboarding credentials email:', err.message);
        return false;
    }
};

/**
 * Instantly sends an action notification email to the employee whenever
 * a promotion, role change, transfer, or status progression occurs.
 */
export const sendEmployeeActionNotification = async (
    data: EmployeeActionNotificationSubmodel,
    tenantId?: string
): Promise<boolean> => {
    try {
        if (!data.email && !data.personalEmail) {
            console.warn('[EmailService] Cannot send action notification: no recipient email specified.');
            return false;
        }

        const isPromotion = data.changes.some(c => c.isPromotion || c.field === 'position');
        const posChange = data.changes.find(c => c.field === 'position') || data.changes.find(c => c.isPromotion);
        const promotedRole = data.newPosition || posChange?.to || 'Elevated Role';

        const subject = isPromotion
            ? `🎉 Promotion Announcement: Congratulations on your advancement to ${promotedRole}! — Ozofi`
            : `Official Notice: Profile & Employment Update — Ozofi [${data.employeeId}]`;

        if (!data.logoUrl) {
            data.logoUrl = await getCompanyLogoUrl(tenantId || data.tenantId);
        }

        const html = buildEmployeeActionEmailHtml(data);
        const primaryTo = data.email || data.personalEmail!;
        const cc = (data.personalEmail && data.email && data.personalEmail.toLowerCase() !== data.email.toLowerCase())
            ? data.personalEmail
            : undefined;

        return await sendEmail({
            to: primaryTo,
            cc,
            subject,
            html,
            tenantId: tenantId || data.tenantId,
        });
    } catch (err: any) {
        console.error('[EmailService] ❌ Failed to dispatch employee action email:', err.message);
        return false;
    }
};

/**
 * Sends a one-time password reset link to a user.
 */
export const sendPasswordResetEmail = async (opts: {
    to: string;
    name: string;
    resetUrl: string;
    expiresInMinutes: number;
    tenantId?: string;
}): Promise<boolean> =>
    sendEmail({
        to: opts.to,
        subject: `Reset your ${BRAND.productName} password`,
        html: buildPasswordResetEmail({ name: opts.name, resetUrl: opts.resetUrl, expiresInMinutes: opts.expiresInMinutes }),
        tenantId: opts.tenantId,
    });
