/**
 * Employee Personnel Action Email Template
 * 
 * Generates an executive announcement email for promotions, role progressions,
 * department transfers, or profile updates.
 */

import { EmployeeActionNotificationSubmodel } from '../email.submodels';

export const buildEmployeeActionEmailHtml = (data: EmployeeActionNotificationSubmodel): string => {
    const isPromotion = data.changes.some(c => c.isPromotion || c.field === 'position');
    const loginUrl = `${process.env.APP_URL || 'http://localhost:5173'}/login`;
    const effectiveDate = data.effectiveDate || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
    const year = new Date().getFullYear();
    const refNumber = `OZO/ACTION/${year}/${(data.employeeId || '001').replace(/[^0-9]/g, '').padStart(3, '0') || '001'}`;
    const logoUrl = data.logoUrl || process.env.APP_LOGO_URL || '';

    // Promoted role details
    const posChange = data.changes.find(c => c.field === 'position') || data.changes.find(c => c.isPromotion);
    const promotedRole = data.newPosition || posChange?.to || 'Elevated Role';
    const previousRole = posChange?.from && posChange.from !== 'Unassigned' ? posChange.from : null;

    const badgeText = isPromotion ? '✨ PROMOTION & CAREER ADVANCEMENT' : '📋 OFFICIAL EMPLOYMENT UPDATE';
    const heroTitle = isPromotion ? 'Congratulations on Your Promotion!' : 'Your Employment Record Has Been Updated';
    const heroSub = isPromotion 
        ? `We are thrilled to officially announce your advancement to <strong>${promotedRole}</strong>.`
        : 'Official notification regarding recent updates to your corporate profile and responsibilities.';

    const congratulationsMessage = isPromotion
        ? `Your hard work, exceptional leadership, and valuable contributions have been pivotal to our shared success. We take great pride in your dedication and look forward to witnessing your continued leadership and high impact in this elevated capacity.`
        : `Your profile, administrative rights, and team associations have been formally updated in our organizational records. Please review the details of your updated profile below.`;

    let contentSectionHtml = '';

    if (isPromotion) {
        contentSectionHtml = `
        <!-- Single Focused Promoted Role Card -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 22px; background: #ffffff; border: 1.5px solid #86efac; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 16px rgba(16, 185, 129, 0.08);">
          <tr>
            <td style="padding: 14px 20px; background: #f0fdf4; border-bottom: 1px solid #bbf7d0;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-size: 11px; font-weight: 800; color: #166534; text-transform: uppercase; letter-spacing: 0.08em;">
                    ★ PROMOTED ROLE
                  </td>
                  <td align="right">
                    <span style="display: inline-block; background: #dcfce7; color: #15803d; border: 1px solid #86efac; font-size: 10px; font-weight: 800; padding: 2px 10px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.04em;">
                      CAREER ADVANCEMENT
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 22px; background: #ffffff;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  ${previousRole ? `
                  <td style="width: 44%; vertical-align: middle; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 16px;">
                    <div style="font-size: 9.5px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 4px;">
                      PREVIOUS ROLE
                    </div>
                    <div style="font-size: 14px; font-weight: 600; color: #64748b; text-decoration: line-through; word-break: break-word;">
                      ${previousRole}
                    </div>
                  </td>
                  <td style="width: 12%; text-align: center; vertical-align: middle; padding: 0 6px;">
                    <div style="display: inline-block; width: 30px; height: 30px; line-height: 30px; background: #dcfce7; color: #15803d; border-radius: 50%; font-size: 14px; font-weight: 900; text-align: center;">
                      ➔
                    </div>
                  </td>` : ''}
                  <td style="${previousRole ? 'width: 44%;' : 'width: 100%;'} vertical-align: middle; background: #f0fdf4; border: 2px solid #86efac; border-radius: 10px; padding: 12px 16px;">
                    <div style="font-size: 9.5px; font-weight: 800; color: #166534; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 4px;">
                      PROMOTED ROLE
                    </div>
                    <div style="font-size: 16px; font-weight: 900; color: #0f172a; word-break: break-word;">
                      ${promotedRole}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        `;
    } else {
        const visibleChanges = data.changes.filter(c => c.field !== 'role');
        contentSectionHtml = visibleChanges.map(c => `
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 12px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
            <tr>
              <td style="padding: 16px 18px;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 10px;">
                  <tr>
                    <td style="font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.06em;">
                      ${c.label}
                    </td>
                  </tr>
                </table>
                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    ${c.from ? `
                    <td style="width: 44%; vertical-align: middle; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px;">
                      <div style="font-size: 9.5px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 3px;">PREVIOUS</div>
                      <div style="font-size: 13.5px; font-weight: 600; color: #64748b; text-decoration: line-through; word-break: break-word;">${c.from}</div>
                    </td>
                    <td style="width: 12%; text-align: center; vertical-align: middle; padding: 0 6px;">
                      <div style="display: inline-block; width: 28px; height: 28px; line-height: 28px; background: #e0e7ff; color: #4338ca; border-radius: 50%; font-size: 13px; font-weight: 900; text-align: center;">➔</div>
                    </td>` : ''}
                    <td style="${c.from ? 'width: 44%;' : 'width: 100%;'} vertical-align: middle; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 10px 14px;">
                      <div style="font-size: 9.5px; font-weight: 800; color: #15803d; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 3px;">NEW ASSIGNMENT</div>
                      <div style="font-size: 14px; font-weight: 800; color: #0f172a; word-break: break-word;">${c.to}</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        `).join('');
    }

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${heroTitle}</title>
</head>
<body style="background-color: #f1f5f9; margin: 0; padding: 32px 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(15, 23, 42, 0.06);">
    
    <!-- Top Corporate Header Bar -->
    <tr>
      <td style="padding: 24px 36px 18px; border-bottom: 2px solid #f1f5f9; background: #ffffff;">
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
                ${isPromotion ? 'Promotion Announcement' : 'Personnel Action'}
              </div>
              <div style="font-size: 11px; font-family: monospace; color: #64748b; margin-top: 3px;">
                Ref: ${refNumber}
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Hero Announcement Banner -->
    <tr>
      <td style="background: ${isPromotion ? 'linear-gradient(135deg, #065f46 0%, #047857 50%, #064e3b 100%)' : 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e3a8a 100%)'}; padding: 36px 36px 30px; color: #ffffff;">
        <div style="display: inline-block; background: rgba(255, 255, 255, 0.2); backdrop-filter: blur(6px); padding: 5px 14px; border-radius: 20px; font-size: 11px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: #ffffff; margin-bottom: 12px; border: 1px solid rgba(255, 255, 255, 0.28);">
          ${badgeText}
        </div>
        <h1 style="margin: 0 0 8px; font-size: 23px; font-weight: 900; line-height: 1.25; color: #ffffff; letter-spacing: -0.01em;">
          ${heroTitle}
        </h1>
        <p style="margin: 0; font-size: 13.5px; color: rgba(255, 255, 255, 0.9); font-weight: 500; line-height: 1.55;">
          ${heroSub}
        </p>
      </td>
    </tr>

    <!-- Main Letter Content -->
    <tr>
      <td style="padding: 32px 36px;">
        <p style="font-size: 16px; font-weight: 800; color: #0f172a; margin-top: 0; margin-bottom: 12px;">
          Dear ${data.name}, 👋
        </p>
        <p style="font-size: 13.5px; line-height: 1.7; color: #334155; margin-bottom: 24px;">
          ${congratulationsMessage}
        </p>

        <!-- Promoted Role Content -->
        <div style="margin-bottom: 20px;">
          ${contentSectionHtml}
        </div>

        <!-- Clean Essential Details Strip -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; margin-bottom: 26px;">
          <tr>
            <td style="padding: 12px 20px; width: 50%; border-right: 1px solid #e2e8f0; vertical-align: middle;">
              <div style="font-size: 9.5px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 2px;">EMPLOYEE ID</div>
              <div style="font-size: 13px; font-weight: 800; color: #0f172a; font-family: monospace;">${data.employeeId}</div>
            </td>
            <td style="padding: 12px 20px; width: 50%; vertical-align: middle;">
              <div style="font-size: 9.5px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 2px;">EFFECTIVE DATE</div>
              <div style="font-size: 13px; font-weight: 800; color: #0f172a;">${effectiveDate}</div>
            </td>
          </tr>
        </table>

        <!-- Direct Action CTA -->
        <div style="text-align: center; margin: 28px 0 16px;">
          <a href="${loginUrl}" style="display: inline-block; background: ${isPromotion ? '#059669' : '#4f46e5'}; color: #ffffff !important; text-decoration: none; padding: 14px 34px; border-radius: 10px; font-size: 13.5px; font-weight: 800; letter-spacing: 0.02em; box-shadow: 0 4px 14px ${isPromotion ? 'rgba(5, 150, 105, 0.3)' : 'rgba(79, 70, 229, 0.3)'};">
            Access Your Workspace & Team Portal →
          </a>
        </div>

        <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 12px 0 0;">
          All associated permissions, organizational roles, and reporting lines are now active.
        </p>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 22px 36px; text-align: center; font-size: 11px; color: #94a3b8; line-height: 1.6;">
        <p style="margin: 0 0 4px; font-weight: 700; color: #64748b;">Ozofi Global Technologies · People Operations & Talent Governance</p>
        <p style="margin: 0;">This is an official automated notification. For queries regarding this update, please contact Human Resources.</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
};
