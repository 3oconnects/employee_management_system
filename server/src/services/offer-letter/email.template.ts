import { OfferLetterData } from './types';
import { formatDate, getExpiryDate, formatCompensation } from './utils';

/**
 * Builds the comprehensive, executive welcome email with login credentials and offer letter embedded
 */
export function buildWelcomeAndOfferEmailHtml(data: OfferLetterData): string {
    const issueDateStr = formatDate(data.issueDate);
    const expiryDateStr = getExpiryDate(data.issueDate, data.expiryDays || 7);
    const firstName = data.name.split(' ')[0] || data.name;
    const year = new Date().getFullYear();
    const empNum = (data.employeeId || '001').replace(/[^0-9]/g, '').padStart(3, '0') || '001';
    const refNumber = `OZO/HR/OFFER/${year}/${empNum}`;
    const location = data.workLocation || [data.city, data.state].filter(Boolean).join(', ') || 'Bengaluru / Chennai (Hybrid)';
    const compStr = formatCompensation(data);
    const reportingStr = data.reportingManager || 'Chief Technology Officer (CTO)';
    const loginUrl = data.loginUrl || 'http://localhost:5173/login';
    const cleanDocName = data.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    const logoUrl = data.logoUrl || process.env.APP_LOGO_URL || '';

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Official Appointment & Offer Letter — Ozofi</title>
</head>
<body style="background-color: #f1f5f9; margin: 0; padding: 32px 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(15, 23, 42, 0.06);">
    
    <!-- Top Corporate Header -->
    <tr>
      <td style="padding: 28px 36px 20px; border-bottom: 2px solid #f1f5f9; background: #ffffff;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td valign="middle" align="left">
              ${logoUrl ? `
              <img src="${logoUrl}" alt="Ozofi" style="height: 36px; width: auto; max-width: 140px; display: block;" />
              <div style="font-size: 8px; font-weight: 800; color: #4338ca; text-transform: uppercase; letter-spacing: 0.12em; margin-top: 4px;">
                Building Intelligent Digital Systems
              </div>` : `
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="vertical-align: middle; padding-right: 10px;">
                    <div style="background: linear-gradient(135deg, #4338ca 0%, #6366f1 100%); width: 34px; height: 34px; border-radius: 9px; text-align: center; line-height: 34px; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 19px; font-weight: 900;">
                      O
                    </div>
                  </td>
                  <td style="vertical-align: middle;">
                    <div style="font-size: 21px; font-weight: 900; color: #0f172a; letter-spacing: -0.03em; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1;">
                      Ozofi
                    </div>
                    <div style="font-size: 8px; font-weight: 800; color: #4338ca; text-transform: uppercase; letter-spacing: 0.12em; margin-top: 3px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                      Building Intelligent Digital Systems
                    </div>
                  </td>
                </tr>
              </table>`}
            </td>
            <td valign="middle" align="right" style="text-align: right;">
              <div style="font-size: 9.5px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.08em;">
                Appointment Notification
              </div>
              <div style="font-size: 11px; font-family: monospace; color: #64748b; margin-top: 3px;">
                Ref: ${refNumber}
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Main Body Content -->
    <tr>
      <td style="padding: 32px 36px;">
        
        <!-- Salutation & Welcome -->
        <h2 style="font-size: 20px; font-weight: 800; color: #0f172a; margin: 0 0 12px; letter-spacing: -0.01em;">
          Welcome to Ozofi, ${firstName}
        </h2>
        <p style="font-size: 13.5px; color: #334155; line-height: 1.7; margin: 0 0 16px;">
          We are pleased to formally extend this offer of employment for the position of <strong>${data.position}</strong> with <strong>Ozofi</strong>. Your selection is an outcome of your distinguished professional background, technical acumen, and leadership capabilities.
        </p>
        <p style="font-size: 13.5px; color: #334155; line-height: 1.7; margin: 0 0 24px;">
          Your formal, countersigned <strong>Offer Letter is attached to this email as a PDF document</strong> (<code>Ozofi_Offer_Letter_${cleanDocName}.pdf</code>) outlining your role charter, terms of engagement, and compensation framework.
        </p>

        <!-- Appointment Summary Table -->
        <div style="font-size: 11px; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 10px;">
          Appointment Summary
        </div>
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; font-size: 12.5px; margin-bottom: 26px;">
          <tr style="background: #f8fafc;">
            <td style="padding: 10px 14px; font-weight: 700; color: #64748b; width: 38%; border-bottom: 1px solid #f1f5f9;">Official Position</td>
            <td style="padding: 10px 14px; font-weight: 800; color: #0f172a; border-bottom: 1px solid #f1f5f9;">${data.position}</td>
          </tr>
          <tr style="background: #ffffff;">
            <td style="padding: 10px 14px; font-weight: 700; color: #64748b; border-bottom: 1px solid #f1f5f9;">Department</td>
            <td style="padding: 10px 14px; font-weight: 700; color: #0f172a; border-bottom: 1px solid #f1f5f9;">${data.department || 'AI & Innovation Labs'}</td>
          </tr>
          <tr style="background: #f8fafc;">
            <td style="padding: 10px 14px; font-weight: 700; color: #64748b; border-bottom: 1px solid #f1f5f9;">Annual Compensation</td>
            <td style="padding: 10px 14px; font-weight: 800; color: #3730a3; border-bottom: 1px solid #f1f5f9;">${compStr}</td>
          </tr>
          <tr style="background: #ffffff;">
            <td style="padding: 10px 14px; font-weight: 700; color: #64748b; border-bottom: 1px solid #f1f5f9;">Work Location</td>
            <td style="padding: 10px 14px; font-weight: 700; color: #0f172a; border-bottom: 1px solid #f1f5f9;">${location}</td>
          </tr>
          <tr style="background: #f8fafc;">
            <td style="padding: 10px 14px; font-weight: 700; color: #64748b; border-bottom: 1px solid #f1f5f9;">Effective Joining Date</td>
            <td style="padding: 10px 14px; font-weight: 700; color: #0f172a; border-bottom: 1px solid #f1f5f9;">${formatDate(data.joinDate)}</td>
          </tr>
          <tr style="background: #ffffff;">
            <td style="padding: 10px 14px; font-weight: 700; color: #64748b;">Reporting Hierarchy</td>
            <td style="padding: 10px 14px; font-weight: 700; color: #0f172a;">${reportingStr}</td>
          </tr>
        </table>

        <!-- Employee Portal Credentials Card -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 14px; margin-bottom: 26px;">
          <tr>
            <td style="padding: 22px 24px;">
              <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: #312e81; margin-bottom: 14px;">
                Employee Portal Credentials & Initial Access
              </div>

              <!-- Row 1: Corporate Work Email -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; margin-bottom: 8px;">
                <tr>
                  <td style="padding: 10px 14px; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">
                    Corporate Work Email
                  </td>
                  <td align="right" style="padding: 10px 14px; font-size: 13.5px; font-weight: 800; color: #1e1b4b; font-family: monospace; text-align: right;">
                    ${data.email}
                  </td>
                </tr>
              </table>

              ${data.personalEmail ? `
              <!-- Row 2: Personal Email Registered -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; margin-bottom: 8px;">
                <tr>
                  <td style="padding: 10px 14px; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">
                    Personal Email Registered
                  </td>
                  <td align="right" style="padding: 10px 14px; font-size: 13px; font-weight: 700; color: #334155; font-family: monospace; text-align: right;">
                    ${data.personalEmail}
                  </td>
                </tr>
              </table>` : ''}

              <!-- Row 3: Temporary Access Key -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: #ffffff; border: 1.5px solid #818cf8; border-radius: 10px; margin-bottom: 16px;">
                <tr>
                  <td style="padding: 10px 14px; font-size: 11px; font-weight: 800; color: #3730a3; text-transform: uppercase;">
                    Temporary One-Time Password
                  </td>
                  <td align="right" style="padding: 10px 14px; text-align: right;">
                    <span style="font-size: 14px; font-weight: 900; color: #312e81; background: #e0e7ff; padding: 4px 10px; border-radius: 6px; font-family: monospace; letter-spacing: 0.08em; display: inline-block;">
                      ${data.tempPassword || 'Auto-Generated'}
                    </span>
                  </td>
                </tr>
              </table>

              <!-- Login CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center">
                    <a href="${loginUrl}" style="display: block; width: 100%; text-align: center; background: #312e81; color: #ffffff !important; text-decoration: none; padding: 13px 24px; border-radius: 10px; font-size: 13.5px; font-weight: 800; box-sizing: border-box; letter-spacing: 0.02em;">
                      Access Employee Portal →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Security Directive -->
              <div style="font-size: 11.5px; color: #92400e; background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 10px 14px; margin-top: 14px; line-height: 1.5;">
                <strong>Security Directive:</strong> You may authenticate using either your corporate email (<code>${data.email}</code>) or registered personal email with the temporary password above. For account security, the portal will strictly require you to establish your permanent confidential password upon initial sign-in.
              </div>
            </td>
          </tr>
        </table>

        <!-- Enclosure Notice -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; margin-bottom: 24px;">
          <tr>
            <td style="padding: 14px 18px; font-size: 12.5px; color: #1e40af; line-height: 1.6;">
              <strong>Formal Offer Document Attached (PDF):</strong> Please review the enclosed PDF (<code>Ozofi_Offer_Letter_${cleanDocName}.pdf</code>). Kindly sign and return a duplicate copy on or before <strong>${expiryDateStr}</strong> to confirm your acceptance.
            </td>
          </tr>
        </table>

        <!-- Formal Sign-off -->
        <p style="font-size: 13.5px; color: #334155; line-height: 1.6; margin: 0 0 4px;">
          Sincerely,
        </p>
        <p style="font-size: 13.5px; font-weight: 800; color: #0f172a; margin: 0 0 2px;">
          People Operations & Talent Culture
        </p>
        <p style="font-size: 12px; color: #64748b; margin: 0;">
          Ozofi Technologies Private Limited • Bengaluru & Chennai
        </p>
      </td>
    </tr>

    <!-- Executive Footer -->
    <tr>
      <td style="padding: 22px 36px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; line-height: 1.6; text-align: center;">
        <p style="margin: 0 0 4px;">
          <strong>Confidentiality Notice:</strong> This electronic transmission and any attachments are intended exclusively for the named addressee.
        </p>
        <p style="margin: 0;">
          © ${year} Ozofi Technologies. All rights reserved. | <a href="https://ozofi.com" style="color: #6366f1; text-decoration: none;">ozofi.com</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
