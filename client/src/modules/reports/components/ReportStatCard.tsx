import React from 'react';
import { LucideIcon } from 'lucide-react';

interface ReportStatCardProps {
    label: string;
    value: string;
    trend: string;
    up: boolean;
    icon: LucideIcon;
    iconColor: string;
    iconBg: string;
}

export const ReportStatCard: React.FC<ReportStatCardProps> = ({ 
    label, value, trend, up, icon: Icon, iconColor, iconBg 
}) => (
    <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs hover:border-slate-300 transition-all">
        <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500">{label}</span>
            <div className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center`}>
                <Icon size={16} className={iconColor} />
            </div>
        </div>
        <p className="text-2xl font-bold text-slate-900 tracking-tight truncate" title={value}>{value}</p>
        <div className="flex items-center gap-1.5 mt-2">
            <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-semibold ${
                up ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
            }`}>
                {trend}
            </span>
            <span className="text-xs text-slate-400 font-medium">vs previous period</span>
        </div>
    </div>
);
