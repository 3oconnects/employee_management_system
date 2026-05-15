// ============================================================================
// EMS BACKEND — EMAIL SERVICE
// ============================================================================
// Uses nodemailer. SMTP config is loaded from DB (app_config table) or
// falls back to environment variables (SMTP_HOST, SMTP_USER, SMTP_PASS).
// ============================================================================

import { pool } from '../config/db';

// ─── TYPES ───────────────────────────────────────────────────────────────────

export interface EmailOptions {
    to: string;
    subject: string;
    html: string;
    tenantId?: string;
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
    // Try DB first
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
                    from: cfg['smtp_from'] || `EMS <${cfg['smtp_user']}>`,
                    secure: cfg['smtp_secure'] === 'true',
                };
            }
            }
        }
    } catch (err) { /* app_config table may not exist yet — fall through */ }

    // Fall back to env
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        return {
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587'),
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
            from: process.env.SMTP_FROM || `EMS <${process.env.SMTP_USER}>`,
            secure: process.env.SMTP_SECURE === 'true',
        };
    }
    return null;
};

// ─── SEND EMAIL ──────────────────────────────────────────────────────────────

export const sendEmail = async (opts: EmailOptions): Promise<boolean> => {
    const smtpConfig = await getSmtpConfig(opts.tenantId);
    if (!smtpConfig) {
        console.warn('[EmailService] No SMTP config found. Email not sent to:', opts.to);
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
            subject: opts.subject,
            html: opts.html,
        });

        console.log(`[EmailService] ✅ Sent "${opts.subject}" → ${opts.to}`);
        return true;
    } catch (err: any) {
        console.error('[EmailService] ❌ Failed to send email:', err.message);
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
    <div class="footer">${opts.orgName || 'AURA Personnel Hub'} · Access management notification</div>
  </div>
</body>
</html>
`;
