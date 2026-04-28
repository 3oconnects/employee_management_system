import React from 'react';
import { ChevronRight } from 'lucide-react';

interface SectionHeaderProps {
    title: string;
    subtitle?: string;
    action?: {
        label: string;
        onClick: () => void;
    };
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
    title,
    subtitle,
    action
}) => (
    <div className="flex items-center justify-between mb-6">
        <div>
            <h3 className="text-[15px] font-bold text-primary tracking-tight">{title}</h3>
            {subtitle && <p className="text-[11px] text-text-muted font-medium mt-1 uppercase tracking-wider">{subtitle}</p>}
        </div>
        {action && (
            <button 
                onClick={action.onClick} 
                className="text-[12px] font-bold text-primary-soft hover:text-primary flex items-center gap-1 transition-colors group"
            >
                {action.label} 
                <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
        )}
    </div>
);
