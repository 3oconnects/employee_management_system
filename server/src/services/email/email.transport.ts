/**
 * Email Transport Service Submodel
 * 
 * Handles SMTP credentials resolution, database app_config overrides,
 * company logo URL lookup, and secure nodemailer email dispatching.
 */

import { pool } from '../../config/db';
import { SmtpConfigSubmodel, EmailOptionsSubmodel } from './email.submodels';

/**
 * Loads SMTP configuration from Gmail credentials, database app_config table,
 * or standard SMTP environment variables.
 */
export const getSmtpConfig = async (tenantId?: string): Promise<SmtpConfigSubmodel | null> => {
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
    } catch { /* app_config table may not exist yet — fall through */ }

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

/**
 * Resolves the hosted company logo URL for email templates without attaching local files.
 */
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

/**
 * Transports an HTML email with optional attachments using nodemailer.
 */
export const sendEmail = async (opts: EmailOptionsSubmodel): Promise<boolean> => {
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
