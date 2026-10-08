/**
 * System Account Email Templates
 * 
 * Provides template generators for:
 * 1. buildWelcomeEmail - Initial account creation & temp credentials
 * 2. buildRoleAssignmentEmail - System RBAC role changes
 * 3. buildPasswordResetEmail - One-time password reset links
 */

import { BRAND } from '../../../config/brand';
import { 
    WelcomeEmailPayloadSubmodel, 
    RoleAssignmentPayloadSubmodel, 
    PasswordResetPayloadSubmodel 
} from '../email.submodels';

export const buildWelcomeEmail = (opts: WelcomeEmailPayloadSubmodel): string => `
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
      <h1>${opts.orgName || BRAND.productName}</h1>
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
    <div class="footer">${opts.orgName || BRAND.productName} · Sent via ${BRAND.productName} · Do not reply</div>
  </div>
</body>
</html>
`;

export const buildRoleAssignmentEmail = (opts: RoleAssignmentPayloadSubmodel): string => `
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
    <div class="footer">${opts.orgName || BRAND.productName} · Sent via ${BRAND.productName}</div>
  </div>
</body>
</html>
`;

const escapeHtml = (value: string): string =>
    value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

export const buildPasswordResetEmail = (opts: PasswordResetPayloadSubmodel): string => {
    const name = escapeHtml(opts.name || 'there');
    const url = escapeHtml(opts.resetUrl);
    const product = escapeHtml(BRAND.productName);
    return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8" /></head>
<body style="font-family:'Segoe UI',Arial,sans-serif;background:#f8f9fc;margin:0;padding:24px;color:#1f2937;">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:32px;">
    <h1 style="font-size:18px;margin:0 0 16px;">Reset your ${product} password</h1>
    <p style="font-size:14px;line-height:1.6;margin:0 0 16px;">Hi ${name},</p>
    <p style="font-size:14px;line-height:1.6;margin:0 0 24px;">We received a request to reset your password. Use the button below to choose a new one. The link works once and expires in ${opts.expiresInMinutes} minutes.</p>
    <p style="margin:0 0 24px;"><a href="${url}" style="display:inline-block;background:#2f5bea;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:10px 20px;border-radius:8px;">Choose a new password</a></p>
    <p style="font-size:12px;line-height:1.6;color:#6b7280;margin:0 0 8px;">If the button does not work, copy this link into your browser:</p>
    <p style="font-size:12px;line-height:1.6;word-break:break-all;margin:0 0 24px;"><a href="${url}" style="color:#2f5bea;">${url}</a></p>
    <p style="font-size:12px;line-height:1.6;color:#6b7280;margin:0;">If you did not request this, you can ignore this email. Your password will not change.</p>
  </div>
</body>
</html>`;
};
