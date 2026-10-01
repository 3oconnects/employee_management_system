// ============================================================================
// EMS BACKEND — EMAIL SERVICE
// ============================================================================
// Uses nodemailer. SMTP config is loaded from DB (app_config table) or
// falls back to environment variables (SMTP_HOST, SMTP_USER, SMTP_PASS).
// ============================================================================

import { pool } from '../config/db';
import { 
    OfferLetterData, 
    generateOfferLetterHtml, 
    generateOfferLetterPdfBuffer, 
    buildWelcomeAndOfferEmailHtml, 
    getLogoPath 
} from './offerLetterService';

// ─── TYPES ───────────────────────────────────────────────────────────────────

export interface EmailAttachment {
    filename: string;
    content?: string | Buffer;
    path?: string;
    contentType?: string;
    cid?: string;
}

export interface EmailOptions {
    to: string;
    cc?: string | string[];
    subject: string;
    html: string;
    tenantId?: string;
    attachments?: EmailAttachment[];
}

interface SmtpConfig {
    host: string;
    port: number;
    user: string;
    pass: string;
    from: string;
    secure: boolean;
}

// ─── LOAD SMTP CONFIG ────────────────────────────────────────────────────────

const getSmtpConfig = async (tenantId?: string): Promise<SmtpConfig | null> => {
    // 1. Direct Gmail Configuration (Highest Priority when set in environment)
    if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
        const cleanPass = process.env.GMAIL_APP_PASSWORD.replace(/["'\s]/g, '');
        return {
            host: 'smtp.gmail.com',
            port: 465,
            user: process.env.GMAIL_USER.trim(),
            pass: cleanPass,
            from: process.env.SMTP_FROM || `Ozofi People Operations <${process.env.GMAIL_USER.trim()}>`,
            secure: true,
        };
    }

    // 2. Try DB app_config next
    try {
        if (tenantId) {
            const res = await pool.query(
                `SELECT key, value FROM app_config WHERE category = 'email' AND tenant_id = $1`,
                [tenantId]
            );
            if (res.rows.length > 0) {
                const cfg: Record<string, string> = {};
                for (const row of res.rows) cfg[row.key] = row.value;
                if (cfg['smtp_host'] && cfg['smtp_user'] && cfg['smtp_pass']) {
                    return {
                        host: cfg['smtp_host'],
                        port: parseInt(cfg['smtp_port'] || '587'),
                        user: cfg['smtp_user'],
                        pass: cfg['smtp_pass'],
                        from: cfg['smtp_from'] || `Ozofi <${cfg['smtp_user']}>`,
                        secure: cfg['smtp_secure'] === 'true',
                    };
                }
            }
        }
    } catch (err) { /* app_config table may not exist yet — fall through */ }

    // 3. Fall back to standard SMTP env variables
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        return {
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587'),
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
            from: process.env.SMTP_FROM || `Ozofi <${process.env.SMTP_USER}>`,
            secure: process.env.SMTP_SECURE === 'true',
        };
    }
    return null;
};

// ─── COMPANY LOGO RESOLUTION (HOSTED URL LINK — ZERO ATTACHMENTS) ───────────

export const getCompanyLogoUrl = async (tenantId?: string): Promise<string> => {
    if (process.env.APP_LOGO_URL && process.env.APP_LOGO_URL.trim()) {
        return process.env.APP_LOGO_URL.trim();
    }
    try {
        if (tenantId) {
            const tenantRes = await pool.query(
                `SELECT logo_url FROM tenants WHERE id = $1 LIMIT 1`,
                [tenantId]
            );
            if (tenantRes.rows.length > 0 && tenantRes.rows[0].logo_url) {
                return tenantRes.rows[0].logo_url;
            }
        }
        const configRes = await pool.query(
            `SELECT value FROM app_config WHERE key = 'logo_url' AND (tenant_id = $1 OR tenant_id IS NULL) LIMIT 1`,
            [tenantId || null]
        );
        if (configRes.rows.length > 0 && configRes.rows[0].value) {
            return configRes.rows[0].value;
        }
    } catch {
        // Table or column may not exist yet
    }
    return '';
};

// ─── SEND EMAIL ──────────────────────────────────────────────────────────────

export const sendEmail = async (opts: EmailOptions): Promise<boolean> => {
    const smtpConfig = await getSmtpConfig(opts.tenantId);
    if (!smtpConfig) {
        console.warn('[EmailService] No SMTP or Gmail config found. Email not sent to:', opts.to);
        return false;
    }

    try {
        // Lazy-load nodemailer to avoid startup crash if not installed
        const nodemailer = await import('nodemailer').catch(() => null);
        if (!nodemailer) {
            console.warn('[EmailService] nodemailer not installed. Run: npm install nodemailer');
            return false;
        }

        const transporter = nodemailer.default.createTransport({
            host: smtpConfig.host,
            port: smtpConfig.port,
            secure: smtpConfig.secure,
            auth: { user: smtpConfig.user, pass: smtpConfig.pass },
        });

        await transporter.sendMail({
            from: smtpConfig.from,
            to: opts.to,
            cc: opts.cc,
            subject: opts.subject,
            html: opts.html,
            attachments: opts.attachments,
        });

        console.log(`[EmailService] ✅ Sent "${opts.subject}" → ${opts.to} ${opts.cc ? `(CC: ${opts.cc})` : ''}`);
        return true;
    } catch (err: any) {
        console.error('[EmailService] ❌ Failed to send email:', err.message);
        return false;
    }
};

/**
 * Sends a unified, executive Welcome & Offer Letter email with credentials, embedded offer letter,
 * and attached PDF + HTML document copies.
 */
export const sendCandidateWelcomeAndOffer = async (
    data: OfferLetterData,
    tenantId?: string
): Promise<boolean> => {
    try {
        const cleanName = data.name.replace(/[^a-zA-Z0-9_-]/g, '_');
        
        // Generate PDF and HTML offer letters in parallel
        const [pdfBuffer, htmlDoc] = await Promise.all([
            generateOfferLetterPdfBuffer(data),
            Promise.resolve(generateOfferLetterHtml(data))
        ]);

        if (!data.logoUrl) {
            data.logoUrl = await getCompanyLogoUrl(tenantId);
        }

        const emailHtml = buildWelcomeAndOfferEmailHtml(data);

        // Attach ONLY the official PDF offer letter (no image attachments that clutter Gmail inbox)
        const attachments: EmailAttachment[] = [
            {
                filename: `Ozofi_Offer_Letter_${cleanName}.pdf`,
                content: pdfBuffer,
                contentType: 'application/pdf',
            }
        ];

        // Determine destination:
        // If candidate has a personal email, deliver primary to personalEmail so they can access credentials,
        // and CC their new corporate work email. If no personalEmail, send to work email.
        const primaryTo = data.personalEmail || data.email;
        const cc = (data.personalEmail && data.email && data.personalEmail.toLowerCase() !== data.email.toLowerCase())
            ? data.email
            : undefined;

        return await sendEmail({
            to: primaryTo,
            cc,
            subject: `Official Appointment & Offer of Employment: ${data.position} — Ozofi [${data.employeeId}]`,
            html: emailHtml,
            tenantId,
            attachments,
        });
    } catch (err: any) {
        console.error('[EmailService] ❌ Failed to build or send offer email:', err.message);
        return false;
    }
};

// ─── TEMPLATES ───────────────────────────────────────────────────────────────

export const buildWelcomeEmail = (opts: {
    name: string;
    email: string;
    tempPassword: string;
    role: string;
    loginUrl: string;
    orgName?: string;
}): string => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <style>
    body { font-family: 'Segoe UI', sans-serif; background:#f8f9fc; margin:0; padding:0; }
    .wrap { max-width:580px; margin:40px auto; background:#fff; border-radius:20px; overflow:hidden; box-shadow:0 4px 32px rgba(0,0,0,0.08); }
    .header { background:linear-gradient(135deg,#4f46e5,#7c3aed); padding:40px 40px 30px; }
    .header h1 { color:#fff; margin:0; font-size:24px; font-weight:900; }
    .header p { color:rgba(255,255,255,0.75); margin:8px 0 0; font-size:14px; }
    .body { padding:36px 40px; }
    .greeting { font-size:18px; font-weight:700; color:#1e293b; margin-bottom:16px; }
    .text { font-size:14px; color:#64748b; line-height:1.7; }
    .cred-box { background:#f1f5f9; border:1px solid #e2e8f0; border-radius:14px; padding:24px; margin:24px 0; }
    .cred-row { display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; }
    .cred-row:last-child { margin-bottom:0; }
    .cred-label { font-size:11px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:.08em; }
    .cred-value { font-size:14px; font-weight:700; color:#1e293b; font-family:monospace; }
    .btn { display:inline-block; background:#4f46e5; color:#fff; text-decoration:none; padding:14px 32px; border-radius:12px; font-size:14px; font-weight:700; margin:8px 0 24px; }
    .warning { background:#fef3c7; border:1px solid #fde68a; border-radius:10px; padding:14px 16px; font-size:12px; color:#92400e; margin-top:16px; }
    .footer { padding:24px 40px; background:#f8f9fc; border-top:1px solid #f1f5f9; font-size:11px; color:#94a3b8; text-align:center; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="header">
      <h1>${opts.orgName || 'AURA Personnel Hub'}</h1>
      <p>Your account is ready — welcome aboard</p>
    </div>
    <div class="body">
      <p class="greeting">Hi ${opts.name}! 👋</p>
      <p class="text">
        Your employee account has been created. You have been assigned the
        <strong>${opts.role}</strong> role in the system. Use the credentials
        below to log in for the first time.
      </p>
      <div class="cred-box">
        <div class="cred-row">
          <span class="cred-label">Email</span>
          <span class="cred-value">${opts.email}</span>
        </div>
        <div class="cred-row">
          <span class="cred-label">Temporary Password</span>
          <span class="cred-value">${opts.tempPassword}</span>
        </div>
        <div class="cred-row">
          <span class="cred-label">Role</span>
          <span class="cred-value">${opts.role}</span>
        </div>
      </div>
      <a href="${opts.loginUrl}" class="btn">Login to Your Account →</a>
      <div class="warning">
        ⚠️ Please change your password immediately after your first login. This temporary
        password will remain active until you update it.
      </div>
    </div>
    <div class="footer">${opts.orgName || 'AURA Personnel Hub'} · Automated account notification · Do not reply</div>
  </div>
</body>
</html>
`;

export const buildRoleAssignmentEmail = (opts: {
    name: string;
    email: string;
    role: string;
    orgName?: string;
    loginUrl: string;
}): string => `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Segoe UI', sans-serif; background:#f8f9fc; margin:0; padding:0; }
    .wrap { max-width:560px; margin:40px auto; background:#fff; border-radius:20px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.07); }
    .header { background:linear-gradient(135deg,#059669,#0d9488); padding:36px 40px 28px; }
    .header h1 { color:#fff; margin:0; font-size:22px; font-weight:900; }
    .body { padding:32px 40px; }
    .text { font-size:14px; color:#64748b; line-height:1.7; }
    .badge { display:inline-block; background:#ecfdf5; border:1px solid #a7f3d0; border-radius:8px; padding:8px 16px; font-size:13px; font-weight:700; color:#065f46; margin:16px 0; }
    .btn { display:inline-block; background:#059669; color:#fff; text-decoration:none; padding:14px 32px; border-radius:12px; font-size:14px; font-weight:700; margin:16px 0; }
    .footer { padding:20px 40px; background:#f8f9fc; border-top:1px solid #f1f5f9; font-size:11px; color:#94a3b8; text-align:center; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="header"><h1>Role Updated</h1></div>
    <div class="body">
      <p class="text">Hi <strong>${opts.name}</strong>,</p>
      <p class="text">Your system role has been updated by an administrator.</p>
      <div class="badge">New Role: ${opts.role}</div>
      <p class="text">Your access permissions have been updated accordingly. Please log in to see your new workspace.</p>
      <a href="${opts.loginUrl}" class="btn">Go to Dashboard →</a>
    </div>
    <div class="footer">${opts.orgName || 'Ozofi Personnel Hub'} · Access management notification</div>
  </div>
</body>
</html>
`;

// ─── INSTANT PROMOTION & ACTION NOTIFICATION ─────────────────────────────────

export interface EmployeeActionChange {
    field: string;
    label: string;
    from?: string | null;
    to: string;
    isPromotion?: boolean;
}

export interface EmployeeActionNotificationData {
    employeeId: string;
    name: string;
    email: string;
    personalEmail?: string | null;
    changes: EmployeeActionChange[];
    newPosition?: string;
    newRole?: string;
    newDepartment?: string;
    newStatus?: string;
    effectiveDate?: string;
    tenantId?: string;
    logoUrl?: string;
}

export const buildEmployeeActionEmailHtml = (data: EmployeeActionNotificationData): string => {
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

    // When it's a promotion, the user explicitly wants ONLY the promoted role shown,
    // avoiding internal technical system access roles ("employee -> manager") or administrative clutter.
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
        // Non-promotion updates (e.g. transfer or confirmation): Filter out internal 'role' permissions noise
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
    
    <!-- Top Corporate Header Bar (Vector CSS brand mark — zero unwanted file attachments) -->
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

        <!-- Promoted Role Content (No unwanted system infos) -->
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

/**
 * Instantly sends an action notification email to the employee whenever
 * a promotion, role change, transfer, or status progression occurs.
 */
export const sendEmployeeActionNotification = async (
    data: EmployeeActionNotificationData,
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

        // NOTE: We deliberately do NOT attach logo.png as a MIME attachment.
        // Attaching image files causes Gmail and other web clients to display an unwanted "logo.png"
        // attachment chip in the inbox header. The email template uses an inline vector brand header instead.
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

