import React from 'react';
import { ArrowUpRight, ArrowDownRight, LucideIcon } from 'lucide-react';

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
    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
        <div className="flex items-start justify-between mb-4">
            <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center`}>
                <Icon size={18} className={iconColor} />
            </div>
            <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold ${up ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                {up ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                {trend}
            </div>
        </div>
        <p className="text-[12px] font-semibold text-slate-500 mb-1">{label}</p>
        <p className="text-2xl font-black text-slate-800 tracking-tight">{value}</p>
    </div>
);
