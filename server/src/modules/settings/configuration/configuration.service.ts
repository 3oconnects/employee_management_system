import { ConfigurationRepository } from './configuration.repository';
import { BRAND } from '../../../config/brand';
import { AppError } from '../../../core/errors/AppError';
import { sendEmail } from '../../../services/emailService';
import { SECRET_CONFIG_KEYS, isMaskPlaceholder, maskSecrets } from './configuration.secrets';

export class ConfigurationService {
    private repo: ConfigurationRepository;

    constructor() {
        this.repo = new ConfigurationRepository();
    }

    async getConfig(tenantId: string) {
        try {
            const rows = await this.repo.getConfig(tenantId);
            const config: Record<string, Record<string, string>> = {};
            for (const row of rows) {
                if (!config[row.category]) config[row.category] = {};
                config[row.category][row.key] = row.value;
            }
            return { data: maskSecrets(config), warning: null };
        } catch (err: any) {
            console.error('CONFIG_FETCH_ERROR:', err.message);
            return { data: {}, warning: err.message };
        }
    }

    async updateConfig(tenantId: string, category: string, settings: any) {
        if (!category || !settings) throw AppError.badRequest('category and settings required.');

        try {
            await this.repo.ensureAppConfigTable();
            for (const [key, value] of Object.entries(settings)) {
                // A secret that comes back as the mask (or a bullet placeholder) is "unchanged", never stored.
                if (SECRET_CONFIG_KEYS.has(key) && isMaskPlaceholder(value)) continue;
                await this.repo.updateConfig(tenantId, category, key, String(value));
            }
        } catch (err: any) {
            console.error('CONFIG_SAVE_ERROR:', err.message);
            throw AppError.badRequest('Failed to save settings: ' + err.message);
        }
    }

    async testEmail(to: string) {
        if (!to) throw AppError.badRequest('Recipient email required.');
        const sent = await sendEmail({
            to,
            subject: `${BRAND.productName} — Test email`,
            html: `<div style="font-family:sans-serif;padding:32px">
                <h2 style="color:#4f46e5">Test Email</h2>
                <p>Your SMTP configuration is working correctly.</p>
                <p style="color:#94a3b8;font-size:12px">Sent at ${new Date().toISOString()}</p>
            </div>`,
        });
        return { sent, message: sent ? 'Test email sent!' : 'SMTP not configured or send failed.' };
    }
}
