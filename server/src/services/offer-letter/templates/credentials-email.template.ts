/**
 * Employee Portal Credentials & Onboarding Welcome Email Template
 * 
 * Dispatched EXCLUSIVELY once the candidate's onboarding is verified and approved.
 * Contains corporate work email, registered personal email, temporary password,
 * portal access link, security directive, and Day-1 onboarding checklist.
 */

import { CompanyConfig } from '../config';
import { OnboardingCredentialsSubmodel } from './offer-email.submodels';

export function buildOnboardingCredentialsEmailHtml(data: OnboardingCredentialsSubmodel): string {
    const cfg       = CompanyConfig;
    const year      = new Date().getFullYear();
    const loginUrl  = data.loginUrl || cfg.loginUrl;
    const logoUrl   = data.logoUrl  || cfg.logoUrl;
    const firstName = data.name.split(' ')[0] || data.name;

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
  <title>Your Employee Portal Credentials — ${cfg.name}</title>
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
              <div style="font-size:10px;font-weight:800;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:.10em;">Onboarding Approved</div>
              ${data.employeeId ? `<div style="font-size:11px;font-family:monospace;color:rgba(255,255,255,0.80);margin-top:4px;">ID: ${data.employeeId}</div>` : ''}
              <div style="font-size:10px;color:rgba(255,255,255,0.55);margin-top:3px;">Portal Activation Notice</div>
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
          Welcome Aboard to ${cfg.name}! 🚀
        </h1>
        <p style="font-size:13.5px;color:#334155;line-height:1.75;margin:0 0 12px;">
          Your onboarding documentation and verification have been <strong>formally approved</strong>.
          We are thrilled to officially welcome you to our team as
          <strong style="color:#4338ca;">${data.position || 'Team Member'}</strong>
          ${data.department ? `in the <strong>${data.department}</strong> department` : ''}.
        </p>
        <p style="font-size:13.5px;color:#334155;line-height:1.75;margin:0 0 16px;">
          Your official corporate workspace account and employee portal access have been provisioned.
          Please review your credentials below to log in and configure your permanent password.
        </p>
      </td>
    </tr>

    <!-- ══ CREDENTIALS BOX (OFFICIAL PORTAL ACCESS CARD) ══ -->
    <tr>
      <td style="padding:0 36px 24px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0"
               style="background:#f8fafc;border:1.5px solid #c7d2fe;border-radius:14px;overflow:hidden;border-collapse:separate;box-shadow:0 2px 8px rgba(79,70,229,0.06);">
          <tr>
            <td colspan="2" style="padding:16px 20px 12px;background:#f1f5f9;border-bottom:1.5px solid #e2e8f0;">
              <span style="font-size:11px;font-weight:800;color:#1e1b4b;text-transform:uppercase;letter-spacing:.09em;">
                EMPLOYEE PORTAL CREDENTIALS &amp; INITIAL ACCESS
              </span>
            </td>
          </tr>
          <tr style="border-bottom:1px solid #e2e8f0;">
            <td style="padding:12px 20px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em;width:44%;">
              CORPORATE WORK EMAIL
            </td>
            <td style="padding:12px 20px;font-size:13px;font-weight:800;color:#1e1b4b;font-family:monospace;text-align:right;">
              <a href="mailto:${data.email}" style="color:#2563eb;text-decoration:underline;">${data.email}</a>
            </td>
          </tr>
          ${data.personalEmail ? `
          <tr style="border-bottom:1px solid #e2e8f0;">
            <td style="padding:12px 20px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em;width:44%;">
              PERSONAL EMAIL REGISTERED
            </td>
            <td style="padding:12px 20px;font-size:13px;font-weight:700;color:#0f172a;font-family:monospace;text-align:right;">
              <a href="mailto:${data.personalEmail}" style="color:#2563eb;text-decoration:underline;">${data.personalEmail}</a>
            </td>
          </tr>` : ''}
          <tr style="background:#eff6ff;border-bottom:1px solid #dbeafe;">
            <td style="padding:13px 20px;font-size:11px;font-weight:800;color:#1e1b4b;text-transform:uppercase;letter-spacing:.05em;width:44%;">
              TEMPORARY ONE-TIME PASSWORD
            </td>
            <td style="padding:13px 20px;text-align:right;">
              <span style="font-size:14px;font-weight:900;color:#1e1b4b;background:#e0e7ff;padding:5px 14px;border-radius:6px;font-family:monospace;letter-spacing:.12em;display:inline-block;">
                ${data.tempPassword || 'Auto-Generated'}
              </span>
            </td>
          </tr>
          <tr>
            <td colspan="2" style="padding:18px 20px 20px;">
              <a href="${loginUrl}"
                 style="display:block;width:100%;text-align:center;background:linear-gradient(135deg,#1e1b4b,#312e81,#4f46e5);color:#ffffff !important;text-decoration:none;padding:14px 24px;border-radius:10px;font-size:14px;font-weight:800;box-sizing:border-box;letter-spacing:.02em;">
                Access Employee Portal →
              </a>
            </td>
          </tr>
        </table>

        <!-- Security Directive Box -->
        <div style="margin-top:12px;background:#fffbeb;border:1px solid #fde68a;border-radius:9px;padding:12px 16px;font-size:12px;color:#92400e;line-height:1.6;">
          <strong>Security Directive:</strong> You may authenticate using either your corporate email
          (<strong>${data.email}</strong>) or registered personal email with the temporary password above.
          For account security, the portal will strictly require you to establish your permanent confidential password upon initial sign-in.
        </div>
      </td>
    </tr>

    <!-- ══ DAY-1 ONBOARDING CHECKLIST ══ -->
    <tr>
      <td style="padding:0 36px 24px;">
        <div style="font-size:10.5px;font-weight:800;color:#4338ca;text-transform:uppercase;letter-spacing:.10em;margin-bottom:10px;">▸ First Day Checklist</div>
        <table width="100%" cellpadding="0" cellspacing="0" border="0"
               style="border:1.5px solid #e2e8f0;border-radius:12px;overflow:hidden;border-collapse:separate;">
          <tr style="border-bottom:1px solid #f1f5f9;">
            <td style="padding:11px 16px;font-size:13px;color:#334155;line-height:1.5;">
              <strong>1. Log in &amp; Change Password:</strong> Access the portal and update your temporary password to a secure personal password.
            </td>
          </tr>
          <tr style="border-bottom:1px solid #f1f5f9;">
            <td style="padding:11px 16px;font-size:13px;color:#334155;line-height:1.5;">
              <strong>2. Complete Profile &amp; Banking:</strong> Verify your emergency contacts, address, and bank account for payroll disbursement.
            </td>
          </tr>
          <tr>
            <td style="padding:11px 16px;font-size:13px;color:#334155;line-height:1.5;">
              <strong>3. Review Policies &amp; Mark Attendance:</strong> Familiarize yourself with our company policies and record your daily attendance via the portal.
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- ══ SIGN-OFF ══ -->
    <tr>
      <td style="padding:0 36px 32px;">
        <p style="font-size:13.5px;color:#334155;line-height:1.6;margin:0 0 4px;">
          If you encounter any difficulty accessing the portal, please reach out to our team at
          <strong>${cfg.hrEmail || cfg.hrTeamName}</strong>.
        </p>
        <p style="font-size:13.5px;color:#334155;margin:12px 0 0;">Warm regards,</p>
        <p style="font-size:14px;font-weight:800;color:#0f172a;margin:4px 0 2px;">${cfg.hrTeamName}</p>
        <p style="font-size:12px;color:#64748b;margin:0;">${cfg.legalName}</p>
        <p style="font-size:12px;color:#64748b;margin:2px 0 0;">${cfg.offices}</p>
      </td>
    </tr>

    <!-- ══ FOOTER ══ -->
    <tr>
      <td style="padding:18px 36px;background:#1e1b4b;border-bottom-left-radius:16px;border-bottom-right-radius:16px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="font-size:11px;color:rgba(255,255,255,0.50);line-height:1.55;">
              <strong style="color:rgba(255,255,255,0.80);">Confidentiality Notice:</strong>
              This communication contains private credentials intended exclusively for the named recipient.
              Do not forward or share this email.
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
