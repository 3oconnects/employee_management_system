import React from 'react';

/**
 * OzofiMark — The signature multi-layered brand icon:
 * - Top Purple sphere / diamond (#8B3DFF): Intelligence & AI
 * - Electric Blue layer (#2563EB): Action & Connectivity
 * - Growth Green layer (#65B814): Automation & Workflows
 * - Amber / Orange foundation (#FFAA0A / #FF641F): Security & Core Structure
 */
export const OzofiMark: React.FC<{ size?: number; className?: string }> = ({ size = 32, className = '' }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`flex-shrink-0 ${className}`}
        role="img"
        aria-label="Ozofi Brand Mark"
    >
        {/* Layer 4: Foundation (Amber / Orange) */}
        <path
            d="M24 43L7 33.5L14 29.5L24 35L34 29.5L41 33.5L24 43Z"
            fill="url(#ozofi-amber-grad)"
        />
        {/* Layer 3: Automation (Growth Green) */}
        <path
            d="M24 34L7 24.5L14 20.5L24 26L34 20.5L41 24.5L24 34Z"
            fill="url(#ozofi-green-grad)"
        />
        {/* Layer 2: Action (Electric Blue) */}
        <path
            d="M24 25L7 15.5L14 11.5L24 17L34 11.5L41 15.5L24 25Z"
            fill="url(#ozofi-blue-grad)"
        />
        {/* Layer 1: Intelligence Crown (Ozofi Purple) */}
        <circle cx="24" cy="9" r="4.5" fill="url(#ozofi-purple-grad)" />
        
        <defs>
            <linearGradient id="ozofi-purple-grad" x1="19" y1="5" x2="29" y2="13" gradientUnits="userSpaceOnUse">
                <stop stopColor="#A855F7" />
                <stop offset="1" stopColor="#8B3DFF" />
            </linearGradient>
            <linearGradient id="ozofi-blue-grad" x1="7" y1="11" x2="41" y2="25" gradientUnits="userSpaceOnUse">
                <stop stopColor="#3B82F6" />
                <stop offset="1" stopColor="#2563EB" />
            </linearGradient>
            <linearGradient id="ozofi-green-grad" x1="7" y1="20" x2="41" y2="34" gradientUnits="userSpaceOnUse">
                <stop stopColor="#84CC16" />
                <stop offset="1" stopColor="#65B814" />
            </linearGradient>
            <linearGradient id="ozofi-amber-grad" x1="7" y1="29" x2="41" y2="43" gradientUnits="userSpaceOnUse">
                <stop stopColor="#FFAA0A" />
                <stop offset="1" stopColor="#FF641F" />
            </linearGradient>
        </defs>
    </svg>
);

interface OzofiLogoProps {
    size?: 'sm' | 'md' | 'lg';
    showTagline?: boolean;
    inverse?: boolean;
    className?: string;
}

const LOGO_SIZES = {
    sm: { mark: 24, text: 'text-base', tagline: 'text-[10px]' },
    md: { mark: 32, text: 'text-xl', tagline: 'text-xs' },
    lg: { mark: 40, text: 'text-2xl', tagline: 'text-sm' },
};

/**
 * OzofiLogo — Official lockup with mark, lowercase wordmark and optional positioning tagline.
 */
export const OzofiLogo: React.FC<OzofiLogoProps> = ({
    size = 'md',
    showTagline = false,
    inverse = false,
    className = ''
}) => {
    const s = LOGO_SIZES[size];
    return (
        <div className={`flex items-center gap-2.5 font-sans ${className}`}>
            <OzofiMark size={s.mark} />
            <div className="leading-none">
                <div className="flex items-center gap-1.5">
                    <span className={`font-bold tracking-tight lowercase ${s.text} ${inverse ? 'text-white' : 'text-[#17213D]'}`}>
                        ozofi
                    </span>
                </div>
                {showTagline && (
                    <p className={`font-medium tracking-tight mt-1 ${s.tagline} ${inverse ? 'text-slate-300' : 'text-slate-500'}`}>
                        Intelligent software. Connected experiences.
                    </p>
                )}
            </div>
        </div>
    );
};

export default OzofiLogo;
