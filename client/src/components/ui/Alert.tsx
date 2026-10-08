import React from 'react';
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react';

// Inline status message (docs/nexus/DESIGN_SYSTEM.md). Errors are announced
// to screen readers immediately (role="alert"); other tones politely.

type Tone = 'danger' | 'success' | 'warning' | 'info';

const TONES: Record<Tone, { box: string; icon: React.ReactNode }> = {
    danger:  { box: 'bg-nx-danger-subtle border-nx-danger/20 text-nx-danger',   icon: <AlertCircle size={16} aria-hidden /> },
    success: { box: 'bg-nx-success-subtle border-nx-success/20 text-nx-success', icon: <CheckCircle2 size={16} aria-hidden /> },
    warning: { box: 'bg-nx-warning-subtle border-nx-warning/20 text-nx-warning', icon: <AlertTriangle size={16} aria-hidden /> },
    info:    { box: 'bg-nx-info-subtle border-nx-info/20 text-nx-info',          icon: <Info size={16} aria-hidden /> },
};

interface AlertProps {
    tone?: Tone;
    title?: string;
    children?: React.ReactNode;
    className?: string;
}

export const Alert: React.FC<AlertProps> = ({ tone = 'info', title, children, className = '' }) => {
    const t = TONES[tone];
    return (
        <div
            role={tone === 'danger' ? 'alert' : 'status'}
            className={`flex gap-2.5 rounded-lg border px-3.5 py-3 text-sm font-nx ${t.box} ${className}`}
        >
            <span className="mt-0.5 flex-shrink-0">{t.icon}</span>
            <div className="min-w-0">
                {title && <p className="font-medium">{title}</p>}
                {children && <div className={`${title ? 'mt-0.5' : ''} text-nx-fg-muted`}>{children}</div>}
            </div>
        </div>
    );
};
