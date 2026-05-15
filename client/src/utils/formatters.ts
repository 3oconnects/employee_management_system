/**
 * Formats currency values in a compact Indian style (K, Lacs, Cr).
 * Handles astronomical numbers gracefully to prevent UI breakage.
 */
export const fmtCurrency = (n: number) => {
    if (!n || isNaN(n)) return '₹0';
    
    // Handle astronomical numbers (beyond 1000 Cr) by falling back to Western compact notation
    if (n >= 10000000000) {
        return '₹' + new Intl.NumberFormat('en-US', {
            notation: 'compact',
            maximumFractionDigits: 1
        }).format(n);
    }
    
    if (n >= 10000000) {
        const crValue = n / 10000000;
        // If it's more than 1000 Crore, show it as 'k Cr' (e.g., 1.5k Cr)
        if (crValue >= 1000) {
            return `₹${(crValue / 1000).toFixed(1)}k Cr`;
        }
        return `₹${crValue.toFixed(1)} Cr`;
    }
    if (n >= 100000)   return `₹${(n / 100000).toFixed(1)} Lacs`;
    if (n >= 1000)     return `₹${(n / 1000).toFixed(1)} K`;
    
    return `₹${Math.round(n).toLocaleString('en-IN')}`;
};
