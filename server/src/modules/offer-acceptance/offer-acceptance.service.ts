import { OfferAcceptanceRepository, OfferCandidateRecord } from './offer-acceptance.repository';
import { AppError } from '../../core/errors/AppError';
import { NotificationService } from '../../services/notificationService';
import { CompanyConfig } from '../../services/offer-letter/config';
import { sendEmail } from '../../services/emailService';
import { getCompanyLogoUrl } from '../../services/email/email.transport';

export class OfferAcceptanceService {
    private repo = new OfferAcceptanceRepository();

    /**
     * Retrieves offer appointment summary for candidate verification.
     */
    async getOfferSummary(token: string) {
        if (!token || typeof token !== 'string') {
            throw AppError.badRequest('Invalid or missing offer token.');
        }

        const candidate = await this.repo.findByToken(token);
        if (!candidate) {
            throw AppError.notFound('Offer not found. The link may be invalid or expired.');
        }

        const isExpired = candidate.offer_token_expires_at 
            ? new Date(candidate.offer_token_expires_at) < new Date() 
            : false;

        const isAccepted = candidate.status === 'offer_accepted' || candidate.status === 'active';

        const logoUrl = await getCompanyLogoUrl(candidate.tenant_id);

        return {
            candidateId: candidate.id,
            name: candidate.name,
            email: candidate.email,
            personalEmail: candidate.personal_email,
            position: candidate.position,
            department: candidate.department_name || candidate.department || 'General',
            employmentType: (candidate.employment_type || 'full_time').replace(/_/g, ' '),
            annualCTC: candidate.annual_ctc,
            internshipStipend: candidate.internship_stipend,
            joinDate: candidate.join_date ? new Date(candidate.join_date).toISOString().split('T')[0] : null,
            status: candidate.status,
            isAccepted,
            isExpired,
            acceptedAt: candidate.offer_accepted_at,
            acceptedDate: candidate.offer_accepted_date || (candidate.offer_accepted_at ? new Date(candidate.offer_accepted_at).toISOString().split('T')[0] : null),
            expiresAt: candidate.offer_token_expires_at,
            companyName: CompanyConfig.name,
            companyLegalName: CompanyConfig.legalName,
            logoUrl: logoUrl || CompanyConfig.logoUrl,
        };
    }

    /**
     * Executes candidate offer acceptance with timestamp and audit tracking.
     */
    async acceptOffer(token: string, payload?: { remarks?: string; acceptedDate?: string }) {
        if (!token) {
            throw AppError.badRequest('Offer token is required.');
        }

        const candidate = await this.repo.findByToken(token);
        if (!candidate) {
            throw AppError.notFound('Offer not found. Please contact HR.');
        }

        if (candidate.status === 'active') {
            return {
                success: true,
                alreadyConfirmed: true,
                message: 'Your employment is already confirmed and active in our system.',
                status: candidate.status,
            };
        }

        if (candidate.status === 'offer_accepted') {
            return {
                success: true,
                alreadyAccepted: true,
                message: 'You have already formally accepted this offer. Waiting for HR confirmation.',
                status: candidate.status,
                acceptedAt: candidate.offer_accepted_at,
                acceptedDate: candidate.offer_accepted_date,
            };
        }

        if (candidate.offer_token_expires_at && new Date(candidate.offer_token_expires_at) < new Date()) {
            throw AppError.badRequest('This offer letter has expired. Please contact HR to request a renewed offer letter.');
        }

        const effectiveAcceptanceDate = payload?.acceptedDate || new Date().toISOString().split('T')[0];
        const notes = payload?.remarks?.trim() || 'Formally accepted by candidate via secure email link';

        // 1. Record acceptance in database
        const updated = await this.repo.recordAcceptance(
            candidate.id, 
            candidate.tenant_id, 
            notes, 
            effectiveAcceptanceDate
        );

        // 2. Notify HR & Administrators
        NotificationService.notifyByRole(candidate.tenant_id, ['super_admin', 'admin', 'hr'], {
            title: 'Candidate Accepted Offer Online',
            message: `${candidate.name} accepted the appointment offer for ${candidate.position} on ${effectiveAcceptanceDate}. Ready for final HR confirmation.`,
            type: 'onboarding',
        }).catch(err => {
            console.error('[OfferAcceptanceService] Failed to notify HR:', err);
        });

        // 3. Dispatch an acknowledgment confirmation email to the candidate
        const recipientEmail = candidate.personal_email || candidate.email;
        if (recipientEmail) {
            const formattedDate = new Date().toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
            });

            sendEmail({
                to: recipientEmail,
                subject: `Offer Acceptance Confirmed — ${CompanyConfig.name} [${candidate.position}]`,
                html: `
                <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:580px;margin:0 auto;padding:28px 20px;background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;">
                    <div style="background:linear-gradient(135deg,#1e1b4b,#4f46e5);padding:24px;border-radius:10px;text-align:center;color:#ffffff;margin-bottom:24px;">
                        <div style="font-size:20px;font-weight:800;letter-spacing:-0.02em;">${CompanyConfig.name}</div>
                        <div style="font-size:11px;opacity:0.8;text-transform:uppercase;letter-spacing:0.1em;margin-top:4px;">Offer Acceptance Receipt</div>
                    </div>
                    <p style="font-size:14px;color:#334155;margin:0 0 12px;">Dear <strong>${candidate.name}</strong>,</p>
                    <p style="font-size:13.5px;color:#334155;line-height:1.65;margin:0 0 16px;">
                        Thank you for accepting the offer of employment for the role of <strong>${candidate.position}</strong> at <strong>${CompanyConfig.legalName}</strong>.
                    </p>
                    <div style="background:#f8fafc;border:1.5px solid #c7d2fe;border-radius:10px;padding:16px;margin-bottom:20px;">
                        <table width="100%" style="font-size:12.5px;color:#334155;border-collapse:collapse;">
                            <tr><td style="padding:4px 0;color:#64748b;">Designation:</td><td style="font-weight:700;">${candidate.position}</td></tr>
                            <tr><td style="padding:4px 0;color:#64748b;">Acceptance Date:</td><td style="font-weight:700;color:#4f46e5;">${formattedDate}</td></tr>
                            <tr><td style="padding:4px 0;color:#64748b;">Status:</td><td style="font-weight:700;color:#16a34a;">Accepted &bull; Awaiting Company Confirmation</td></tr>
                        </table>
                    </div>
                    <div style="background:#f0fdf4;border-left:4px solid #16a34a;padding:14px;border-radius:6px;font-size:12.5px;color:#166534;line-height:1.6;margin-bottom:20px;">
                        <strong>Next Steps:</strong>
                        Our People Operations team is finalizing your workspace configuration. Once final confirmation is complete, you will receive an official Welcome Email containing your Employee Portal login ID and temporary credentials.
                    </div>
                    <p style="font-size:12px;color:#64748b;margin:0;">
                        Warm regards,<br>
                        <strong>${CompanyConfig.hrTeamName}</strong><br>
                        ${CompanyConfig.legalName}
                    </p>
                </div>
                `,
                tenantId: candidate.tenant_id,
            }).catch(emailErr => {
                console.error('[OfferAcceptanceService] Failed to send acknowledgment email:', emailErr);
            });
        }

        return {
            success: true,
            status: 'offer_accepted',
            acceptedDate: effectiveAcceptanceDate,
            acceptedAt: updated.offer_accepted_at,
            message: 'Employment offer successfully accepted! Your response has been submitted to HR.',
        };
    }
}
