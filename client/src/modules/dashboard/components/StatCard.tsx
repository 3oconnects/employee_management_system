import React from 'react';
import { ArrowUpRight, ArrowDownRight, MoreHorizontal } from 'lucide-react';

interface StatCardProps {
    label: string;
    value: string | number;
    icon: React.ElementType;
    color: string;
    bg: string;
    trend?: string;
    trendUp?: boolean;
    onClick?: () => void;
    sub?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
    label,
    value,
    icon: Icon,
    color,
    bg,
    trend,
    trendUp,
    onClick,
    sub
}) => (
    <div 
        onClick={onClick}
        className={`bg-white rounded-2xl border border-slate-200 p-5 hover:border-indigo-500/30 transition-all duration-300 group relative ${onClick ? 'cursor-pointer active:scale-[0.98]' : ''}`}
    >
        <div className="flex items-center justify-between mb-5">
            <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center ${color} group-hover:shadow-lg transition-all`}>
                <Icon size={18} />
            </div>
            <button className="text-slate-300 hover:text-slate-500 transition-colors">
                <MoreHorizontal size={16} />
            </button>
        </div>
        
        <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] leading-none">{label}</p>
            <div className="flex items-baseline gap-2">
                <h4 className="text-2xl font-black text-slate-900 tracking-tight leading-none">{value}</h4>
                {trend && (
                    <div className={`text-[10px] font-black flex items-center gap-0.5 ${trendUp !== false ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {trendUp !== false ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                        {trend}
                    </div>
                )}
            </div>
            {sub && (
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-1.5 line-clamp-1">
                    {sub}
                </p>
            )}
        </div>
        
        {/* Subtle background glow on hover */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/0 to-indigo-500/0 group-hover:from-indigo-500/5 group-hover:to-transparent rounded-2xl transition-all duration-500 -z-10" />
    </div>
);
