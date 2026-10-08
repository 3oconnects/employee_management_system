import { getAppLocale, SUPPORTED_CURRENCIES } from './locale';

/**
 * Formats currency values dynamically according to active regional localization.
 * Supports INR (with Lacs/Cr notations), USD, EUR, GBP, AED, SGD, CAD, AUD.
 */
export const fmtCurrency = (n: number, currencyCodeOverride?: string) => {
    if (!n || isNaN(n)) {
        const locale = getAppLocale();
        const code = currencyCodeOverride || locale.currency || 'INR';
        const symbol = SUPPORTED_CURRENCIES[code]?.symbol || '₹';
        return `${symbol}0`;
    }

    const locale = getAppLocale();
    const currencyCode = currencyCodeOverride || locale.currency || 'INR';
    const currencyMeta = SUPPORTED_CURRENCIES[currencyCode] || SUPPORTED_CURRENCIES.INR;
    const symbol = currencyMeta.symbol;

    // Specific Indian style notation for INR
    if (currencyCode === 'INR') {
        if (n >= 10000000000) {
            return symbol + new Intl.NumberFormat('en-US', {
                notation: 'compact',
                maximumFractionDigits: 1
            }).format(n);
        }
        if (n >= 10000000) {
            const crValue = n / 10000000;
            if (crValue >= 1000) {
                return `${symbol}${(crValue / 1000).toFixed(1)}k Cr`;
            }
            return `${symbol}${crValue.toFixed(1)} Cr`;
        }
        if (n >= 100000) return `${symbol}${(n / 100000).toFixed(1)} Lacs`;
        if (n >= 1000) return `${symbol}${(n / 1000).toFixed(1)} K`;
        return `${symbol}${Math.round(n).toLocaleString('en-IN')}`;
    }

    // International Standard Notation (USD, EUR, GBP, AED, etc.)
    if (n >= 1000000000) {
        return `${symbol}${(n / 1000000000).toFixed(1)}B`;
    }
    if (n >= 1000000) {
        return `${symbol}${(n / 1000000).toFixed(1)}M`;
    }
    if (n >= 10000) {
        return `${symbol}${(n / 1000).toFixed(1)}k`;
    }

    return `${symbol}${Math.round(n).toLocaleString(currencyMeta.locale || 'en-US')}`;
};

/**
 * Formats a date according to the user's active date display format preference
 */
export const fmtDate = (dateVal: string | number | Date | null | undefined, formatOverride?: string): string => {
    if (!dateVal) return '—';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return '—';

    const format = formatOverride || getAppLocale().dateFormat || 'DD/MM/YYYY';

    const day = String(d.getDate()).padStart(2, '0');
    const monthNum = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const monthShort = d.toLocaleString('default', { month: 'short' });

    switch (format) {
        case 'MM/DD/YYYY':
            return `${monthNum}/${day}/${year}`;
        case 'YYYY-MM-DD':
            return `${year}-${monthNum}-${day}`;
        case 'DD MMM YYYY':
            return `${day} ${monthShort} ${year}`;
        case 'DD/MM/YYYY':
        default:
            return `${day}/${monthNum}/${year}`;
    }
};
