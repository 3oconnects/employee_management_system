import React from 'react';
import { ArrowUpRight, ArrowDownRight, LucideIcon } from 'lucide-react';

interface StatCardProps {
    label: string;
    value: string;
    trend?: string;
    isUp?: boolean;
    icon: LucideIcon;
    color: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, trend, isUp, icon: Icon, color }) => (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex justify-between items-start mb-4">
            <div className={`p-2 rounded-lg ${color} bg-opacity-10`}>
                <Icon size={20} className={color.replace('bg-', 'text-')} />
            </div>
            {trend && (
                <div className={`flex items-center text-xs font-bold ${isUp ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {isUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                    {trend}
                </div>
            )}
        </div>
        <div className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</div>
        <div className="text-2xl font-black text-slate-900 tracking-tight">{value}</div>
    </div>
);

export default StatCard;
