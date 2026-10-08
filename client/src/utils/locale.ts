export interface CurrencyMeta {
    code: string;
    symbol: string;
    name: string;
    locale: string;
}

export const SUPPORTED_CURRENCIES: Record<string, CurrencyMeta> = {
    INR: { code: 'INR', symbol: '₹', name: 'Indian Rupee (INR)', locale: 'en-IN' },
    USD: { code: 'USD', symbol: '$', name: 'US Dollar (USD)', locale: 'en-US' },
    EUR: { code: 'EUR', symbol: '€', name: 'Euro (EUR)', locale: 'de-DE' },
    GBP: { code: 'GBP', symbol: '£', name: 'British Pound (GBP)', locale: 'en-GB' },
    AED: { code: 'AED', symbol: 'AED ', name: 'UAE Dirham (AED)', locale: 'en-AE' },
    SGD: { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar (SGD)', locale: 'en-SG' },
    CAD: { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar (CAD)', locale: 'en-CA' },
    AUD: { code: 'AUD', symbol: 'AU$', name: 'Australian Dollar (AUD)', locale: 'en-AU' },
};

export const SUPPORTED_LANGUAGES = [
    { code: 'en-US', label: 'English (US)', flag: '🇺🇸' },
    { code: 'en-GB', label: 'English (UK)', flag: '🇬🇧' },
    { code: 'hi-IN', label: 'Hindi (हिंदी)', flag: '🇮🇳' },
    { code: 'es-ES', label: 'Spanish (Español)', flag: '🇪🇸' },
    { code: 'fr-FR', label: 'French (Français)', flag: '🇫🇷' },
    { code: 'de-DE', label: 'German (Deutsch)', flag: '🇩🇪' },
    { code: 'ar-AE', label: 'Arabic (العربية)', flag: '🇦🇪' },
    { code: 'ja-JP', label: 'Japanese (日本語)', flag: '🇯🇵' },
];

export const SUPPORTED_TIMEZONES = [
    'Asia/Kolkata (IST +5:30)',
    'UTC (Coordinated Universal Time)',
    'America/New_York (EST -5:00)',
    'America/Los_Angeles (PST -8:00)',
    'Europe/London (GMT +0:00)',
    'Europe/Paris (CET +1:00)',
    'Asia/Singapore (SGT +8:00)',
    'Asia/Dubai (GST +4:00)',
    'Australia/Sydney (AEST +10:00)',
    'Asia/Tokyo (JST +9:00)',
];

export const SUPPORTED_DATE_FORMATS = [
    'DD/MM/YYYY',
    'MM/DD/YYYY',
    'YYYY-MM-DD',
    'DD MMM YYYY',
];

export interface AppLocaleConfig {
    currency: string;
    dateFormat: string;
    timezone: string;
    language: string;
    fiscalYearStart?: string;
}

const DEFAULT_LOCALE: AppLocaleConfig = {
    currency: 'INR',
    dateFormat: 'DD/MM/YYYY',
    timezone: 'Asia/Kolkata (IST +5:30)',
    language: 'English (US)',
    fiscalYearStart: '04',
};

const STORAGE_KEY = 'ozofi_nexus_locale';

/**
 * Retrieve the current application localization configuration
 */
export function getAppLocale(): AppLocaleConfig {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            return { ...DEFAULT_LOCALE, ...parsed };
        }
    } catch {
        // Fallback to default
    }
    return DEFAULT_LOCALE;
}

/**
 * Save and broadcast application localization changes
 */
export function setAppLocale(updates: Partial<AppLocaleConfig>): AppLocaleConfig {
    const current = getAppLocale();
    const updated: AppLocaleConfig = { ...current, ...updates };
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        window.dispatchEvent(new CustomEvent('app-locale-changed', { detail: updated }));
    } catch (e) {
        console.error('Failed to persist locale', e);
    }
    return updated;
}
