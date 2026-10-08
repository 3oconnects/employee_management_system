// Settings that are credentials. They are write-only through the API (HF-7): a read returns a mask,
// and a write of the mask (or of an all-bullet placeholder) means "keep the stored value".
export const SECRET_CONFIG_KEYS: ReadonlySet<string> = new Set([
    'smtp_pass',
    'api_key',
    'slack_webhook', // incoming-webhook URLs embed the secret
    'teams_webhook',
]);

export const SECRET_MASK = '••••••••';

/** True for the mask we hand out and for any placeholder made only of bullet characters. */
export const isMaskPlaceholder = (value: unknown): boolean =>
    typeof value === 'string' && /^•+$/.test(value.trim());

/** Replace every stored secret by the mask (empty stays empty, so the UI can tell "not set"). */
export function maskSecrets(config: Record<string, Record<string, string>>): Record<string, Record<string, string>> {
    const out: Record<string, Record<string, string>> = {};
    for (const [category, settings] of Object.entries(config)) {
        out[category] = {};
        for (const [key, value] of Object.entries(settings)) {
            out[category][key] = SECRET_CONFIG_KEYS.has(key) && value ? SECRET_MASK : value;
        }
    }
    return out;
}
