import React from 'react';
import { BRAND } from '../../config/brand';

// The Ozofi Nexus mark: an "N" drawn as two connected nodes. Mirrors
// public/brand/nexus-icon.svg (the favicon) so both stay identical.

interface NexusMarkProps {
    size?: number;
    className?: string;
    /** Decorative when the product name is also rendered as text next to it. */
    decorative?: boolean;
    /** White tile with a blue "N", for use on brand-coloured backgrounds. */
    inverse?: boolean;
}

export const NexusMark: React.FC<NexusMarkProps> = ({ size = 32, className = '', decorative = false, inverse = false }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        className={className}
        {...(decorative ? { 'aria-hidden': true } : { role: 'img', 'aria-label': BRAND.productName })}
    >
        <rect width="32" height="32" rx="7" fill={inverse ? '#fff' : 'rgb(var(--nx-primary))'} />
        <path d="M10 22V10l12 12V10" fill="none" stroke={inverse ? 'rgb(var(--nx-primary))' : '#fff'} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="10" cy="10" r="2.4" fill={inverse ? 'rgb(var(--nx-primary))' : '#fff'} />
        <circle cx="22" cy="22" r="2.4" fill={inverse ? 'rgb(var(--nx-primary))' : '#fff'} />
    </svg>
);

interface NexusLogoProps {
    /** Mark size in px; the wordmark scales with it. */
    size?: 'sm' | 'md' | 'lg';
    showTagline?: boolean;
    className?: string;
}

const SIZES = {
    sm: { mark: 28, name: 'text-[15px]', tagline: 'text-xs' },
    md: { mark: 36, name: 'text-lg', tagline: 'text-xs' },
    lg: { mark: 44, name: 'text-xl', tagline: 'text-sm' },
};

/** Mark + "Ozofi Nexus" wordmark, with the product descriptor optionally below. */
export const NexusLogo: React.FC<NexusLogoProps> = ({ size = 'md', showTagline = false, className = '' }) => {
    const s = SIZES[size];
    return (
        <div className={`flex items-center gap-3 font-nx ${className}`}>
            <NexusMark size={s.mark} decorative />
            <div className="leading-tight">
                <p className={`${s.name} font-semibold text-nx-fg tracking-tight`}>
                    {BRAND.companyName} <span className="text-nx-primary">{BRAND.shortName}</span>
                </p>
                {showTagline && <p className={`${s.tagline} text-nx-fg-subtle mt-0.5`}>{BRAND.tagline}</p>}
            </div>
        </div>
    );
};
