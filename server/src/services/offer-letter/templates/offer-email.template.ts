/**
 * Candidate Welcome & Official Offer Letter Email Template
 * 
 * Generates an executive-branded email matching official company credentials
 * and PDF letterhead. Delivers formal appointment notification and acceptance instructions
 * strictly to candidate personal email without distributing login credentials prematurely.
 */

import { CompanyConfig } from '../config';
import { formatDate, getExpiryDate, formatCompensation, buildRefNumber } from '../utils';
import { WelcomeOfferEmailSubmodel } from './offer-email.submodels';

export function buildWelcomeAndOfferEmailHtml(data: WelcomeOfferEmailSubmodel): string {
    const cfg           = CompanyConfig;
    const issueDateStr  = formatDate(data.issueDate);
    const expiryDateStr = getExpiryDate(data.issueDate, data.expiryDays ?? cfg.defaultExpiryDays);
    const firstName     = data.name.split(' ')[0] || data.name;
    const year          = new Date().getFullYear();
    const refNumber     = buildRefNumber(cfg.refPrefix, year, data.employeeId);
    const location      = data.workLocation    || cfg.defaultWorkLocation;
    const schedule      = data.workSchedule    || cfg.defaultWorkSchedule;
    const reporting     = data.reportingManager || cfg.defaultReportingMgr;
    const compStr       = formatCompensation(data);
    const loginUrl      = data.loginUrl        || cfg.loginUrl;
    const logoUrl       = data.logoUrl         || cfg.logoUrl;
    const token         = data.offerToken      || '';
    const acceptUrl     = data.acceptUrl       
        || (token ? `${cfg.appUrl}/offer/accept/${encodeURIComponent(token)}` : `${cfg.appUrl}/offer/accept/${encodeURIComponent(data.employeeId)}`);
    const cleanDocName  = data.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    const engType       = (data.employmentType || '').toLowerCase() === 'intern'
        ? 'Internship' : 'Full-time Employment';
    const probation     = data.probationDuration
        || ((data.employmentType || '').toLowerCase() === 'intern' ? '3 Months Internship Period' : '3 Months Probation');

    /* ── Inline presentation submodels ── */
    const summaryRow = (label: string, value: string, highlight = false) => `
      <tr style="border-bottom:1px solid #f1f5f9;${highlight ? 'background:#fdf8ff;' : ''}">
        <td style="padding:10px 16px;font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em;width:38%;white-space:nowrap;">${label}</td>
        <td style="padding:10px 16px;font-size:13px;font-weight:700;color:${highlight ? '#4f46e5' : '#0f172a'};">${value}</td>
      </tr>`;

    const termRow = (icon: string, title: string, body: string) => `
      <tr style="border-bottom:1px solid #f1f5f9;">
        <td style="padding:12px 16px;font-size:13px;color:#334155;line-height:1.6;">
          <strong>${icon} ${title}</strong><br>
          <span style="font-size:12px;color:#64748b;">${body}</span>
        </td>
      </tr>`;

    const logoBlock = logoUrl
        ? `<table cellpadding="0" cellspacing="0" border="0" role="presentation" style="background:#ffffff;border-radius:10px;box-shadow:0 2px 10px rgba(0,0,0,0.18);">
             <tr>
               <td style="padding:6px 14px;background:#ffffff;border-radius:10px;vertical-align:middle;">
                 <img src="${logoUrl}" alt="${cfg.name}" style="height:30px;width:auto;max-width:140px;display:block;border:0;">
               </td>
             </tr>
           </table>`
        : `<table cellpadding="0" cellspacing="0" border="0" role="presentation"><tr>
             <td style="vertical-align:middle;padding-right:10px;">
               <div style="background:rgba(255,255,255,0.15);width:38px;height:38px;border-radius:10px;text-align:center;line-height:38px;color:#ffffff;font-size:22px;font-weight:900;">${cfg.name.charAt(0)}</div>
             </td>
             <td style="vertical-align:middle;">
               <div style="font-size:22px;font-weight:900;color:#ffffff;letter-spacing:-0.03em;line-height:1;">${cfg.name}</div>
               <div style="font-size:9px;font-weight:700;color:rgba(255,255,255,0.65);text-transform:uppercase;letter-spacing:0.13em;margin-top:3px;">${cfg.tagline}</div>
             </td>
           </tr></table>`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Official Offer of Appointment — ${cfg.name}</title>
</head>
<body style="margin:0;padding:28px 12px;background:#eef2f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">

  <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
  <tr><td align="center">
  <table width="620" cellpadding="0" cellspacing="0" border="0" role="presentation"
         style="max-width:620px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(15,23,42,0.10);">

    <!-- ══ LETTERHEAD BANNER ══ -->
    <tr>
      <td style="background:linear-gradient(135deg,#1e1b4b 0%,#312e81 60%,#4f46e5 100%);padding:0;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="padding:28px 32px 24px;" valign="middle">${logoBlock}</td>
            <td style="padding:28px 32px 24px;text-align:right;" valign="middle">
              <div style="font-size:10px;font-weight:800;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:.10em;">Appointment Notification</div>
              <div style="font-size:11px;font-family:monospace;color:rgba(255,255,255,0.80);margin-top:4px;">${refNumber}</div>
              <div style="font-size:10px;color:rgba(255,255,255,0.55);margin-top:3px;">${issueDateStr}</div>
            </td>
          </tr>
        </table>
        <div style="height:4px;background:linear-gradient(90deg,#818cf8 0%,#c7d2fe 50%,#818cf8 100%);"></div>
      </td>
    </tr>

    <!-- ══ GREETING ══ -->
    <tr>
      <td style="padding:32px 36px 20px;">
        <p style="font-size:13px;color:#64748b;margin:0 0 4px;">Dear <strong style="color:#0f172a;">${data.name}</strong>,</p>
        <h1 style="font-size:22px;font-weight:800;color:#0f172a;margin:10px 0 14px;letter-spacing:-0.02em;">
          Congratulations &amp; Welcome to ${cfg.name}! 🎉
        </h1>
        <p style="font-size:13.5px;color:#334155;line-height:1.75;margin:0 0 12px;">
          We are delighted to extend this formal offer of <strong>${engType}</strong> for the position of
          <strong style="color:#4338ca;">${data.position}</strong> at <strong>${cfg.legalName}</strong>.
          Your appointment reflects our confidence in your professional expertise and alignment with our organisational vision.
        </p>
        <p style="font-size:13.5px;color:#334155;line-height:1.75;margin:0 0 20px;">
          The official <strong>Offer Letter is enclosed as a PDF attachment</strong> to this email for your detailed review, records, and formal counter-signing.
        </p>
      </td>
    </tr>

    <!-- ══ APPOINTMENT SUMMARY TABLE ══ -->
    <tr>
      <td style="padding:0 36px 24px;">
        <div style="font-size:10.5px;font-weight:800;color:#4338ca;text-transform:uppercase;letter-spacing:.10em;margin-bottom:10px;">▸ Appointment Summary</div>
        <table width="100%" cellpadding="0" cellspacing="0" border="0"
               style="border:1.5px solid #e2e8f0;border-radius:12px;overflow:hidden;border-collapse:separate;">
          ${summaryRow('Designation / Role', data.position)}
          ${summaryRow('Department', data.department || 'General')}
          ${summaryRow('Employment Type', engType)}
          ${summaryRow('Compensation', compStr, true)}
          ${summaryRow('Work Location', location)}
          ${summaryRow('Work Schedule', schedule)}
          ${summaryRow('Reporting To', reporting)}
          ${summaryRow('Joining Date', formatDate(data.joinDate || data.issueDate), true)}
          ${summaryRow('Probation Period', probation)}
          ${summaryRow('Offer Valid Until', expiryDateStr)}
        </table>
      </td>
    </tr>

    <!-- ══ FORMAL OFFER ACCEPTANCE & CALL-TO-ACTION ══ -->
    <tr>
      <td style="padding:0 36px 24px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0"
               style="background:linear-gradient(135deg,#f8fafc 0%,#eef2ff 100%);border:2px solid #818cf8;border-radius:14px;overflow:hidden;box-shadow:0 4px 16px rgba(79,70,229,0.08);">
          <tr>
            <td style="padding:16px 22px;background:linear-gradient(135deg,#1e1b4b 0%,#312e81 100%);color:#ffffff;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td valign="middle">
                    <span style="font-size:11.5px;font-weight:900;text-transform:uppercase;letter-spacing:.08em;color:#c7d2fe;">
                      OFFICIAL OFFER ACCEPTANCE &bull; STEP 1 OF 2
                    </span>
                  </td>
                  <td align="right" valign="middle">
                    <span style="display:inline-block;padding:3px 10px;background:rgba(255,255,255,0.15);border-radius:20px;font-size:10px;font-weight:700;color:#ffffff;letter-spacing:0.04em;">
                      Date: ${issueDateStr}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 24px 20px;text-align:center;">
              <h3 style="margin:0 0 8px;font-size:17px;font-weight:800;color:#1e1b4b;letter-spacing:-0.02em;">
                Ready to join ${cfg.name}?
              </h3>
              <p style="margin:0 0 20px;font-size:13px;color:#475569;line-height:1.6;max-width:480px;margin-left:auto;margin-right:auto;">
                Please review your appointment summary above and click below to formally accept this employment offer online. Your acceptance will be recorded with today&rsquo;s date and submitted to People Operations for final workspace confirmation.
              </p>

              <!-- Acceptance CTA Button -->
              <table cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto 16px;">
                <tr>
                  <td align="center" style="border-radius:12px;background:linear-gradient(135deg,#2563eb 0%,#4f46e5 100%);box-shadow:0 6px 20px rgba(79,70,229,0.30);">
                    <a href="${acceptUrl}" target="_blank"
                       style="display:inline-block;padding:14px 34px;font-size:14px;font-weight:800;color:#ffffff;text-decoration:none;letter-spacing:0.02em;border-radius:12px;">
                      ✓ Accept Employment Offer
                    </a>
                  </td>
                </tr>
              </table>

              <div style="font-size:11px;color:#64748b;line-height:1.5;">
                Offer valid until <strong>${expiryDateStr}</strong> &bull; Secure Candidate Acceptance Link<br>
                <span style="font-size:10.5px;color:#94a3b8;word-break:break-all;">${acceptUrl}</span>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:14px 20px;background:#f1f5f9;border-top:1px solid #e2e8f0;font-size:11.5px;color:#475569;line-height:1.5;">
              <strong>Manual / Offline Alternative:</strong> You may also sign the duplicate copy of the attached PDF and return it via email to <a href="mailto:${cfg.hrEmail}" style="color:#4f46e5;font-weight:700;text-decoration:none;">${cfg.hrEmail}</a> before <strong>${expiryDateStr}</strong>.
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- ══ KEY TERMS & CONDITIONS ══ -->
    <tr>
      <td style="padding:0 36px 24px;">
        <div style="font-size:10.5px;font-weight:800;color:#4338ca;text-transform:uppercase;letter-spacing:.10em;margin-bottom:10px;">▸ Terms &amp; Conditions</div>
        <table width="100%" cellpadding="0" cellspacing="0" border="0"
               style="border:1.5px solid #e2e8f0;border-radius:12px;overflow:hidden;border-collapse:separate;">
          ${termRow('🔒', 'Confidentiality & IP',
            'You agree to protect proprietary information, client data, and trade secrets, and assign all IP created during employment to ' + cfg.legalName + '.')}
          ${termRow('📋', 'Statutory Compliance',
            'This offer is contingent upon satisfactory reference checks and verification of educational credentials and previous employment documents.')}
          ${termRow('📅', 'Offer Validity & Expiry',
            `This offer is valid until <strong>${expiryDateStr}</strong>. Please sign and return the acceptance copy before this date.`)}
        </table>
      </td>
    </tr>

    <!-- ══ SIGN-OFF ══ -->
    <tr>
      <td style="padding:0 36px 32px;">
        <p style="font-size:13.5px;color:#334155;line-height:1.6;margin:0 0 4px;">
          Should you have questions regarding compensation, benefits, or your first day, please reach out to
          <strong>${cfg.hrEmail || cfg.hrTeamName}</strong>.
        </p>
        <p style="font-size:13.5px;color:#334155;margin:16px 0 0;">Yours sincerely,</p>
        <p style="font-size:14px;font-weight:800;color:#0f172a;margin:4px 0 2px;">${cfg.hrSignatory}</p>
        <p style="font-size:12px;color:#64748b;margin:0;">${cfg.hrTeamName}</p>
        <p style="font-size:12px;color:#64748b;margin:0;">${cfg.legalName}</p>
      </td>
    </tr>

    <!-- ══ FOOTER ══ -->
    <tr>
      <td style="padding:18px 36px;background:#1e1b4b;border-bottom-left-radius:16px;border-bottom-right-radius:16px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="font-size:11px;color:rgba(255,255,255,0.50);line-height:1.55;">
              <strong style="color:rgba(255,255,255,0.80);">Strictly Confidential:</strong>
              This communication and enclosed appointment document are intended exclusively for the named addressee.
            </td>
            <td align="right" style="white-space:nowrap;padding-left:20px;">
              <div style="font-size:10px;color:rgba(255,255,255,0.40);">© ${year} ${cfg.name}</div>
              <a href="${cfg.website}" style="font-size:10px;color:#818cf8;text-decoration:none;">${cfg.website.replace('https://', '')}</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>

  </table>
  </td></tr>
  </table>

</body>
</html>`;
}
