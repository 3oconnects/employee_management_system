import React from 'react';
import { IndianRupee, Users, ShieldCheck, Clock, LucideIcon } from 'lucide-react';

interface StatProps {
    label: string;
    value: string;
    sub: string;
    icon: LucideIcon;
    bg: string;
    color: string;
    up?: boolean;
}

const Stat: React.FC<StatProps> = ({ label, value, sub, icon: Icon, bg, color, up }) => (
    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm group hover:border-indigo-200 transition-all relative overflow-hidden">
        <div className="flex items-center justify-between mb-5">
            <div className={`w-10 h-10 rounded-xl ${bg} ${color} flex items-center justify-center shadow-sm transition-transform group-hover:scale-110`}>
                <Icon size={18} />
            </div>
            {up !== undefined && (
                <div className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border ${up ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-500 border-rose-100'}`}>
                    {up ? '↑' : '↓'} Trend
                </div>
            )}
        </div>
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{label}</p>
        <p className="text-[22px] font-black text-slate-900 tracking-tight leading-none">{value}</p>
        <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-3 opacity-40">{sub}</p>
    </div>
);

interface FinancialAnalysisStatsProps {
    summary: {
        netOutflow: number;
        govtPayables: number;
    };
    enrolledEmployees: number;
    totalEmployees: number;
    pendingCount: number;
    inr: (v: number) => string;
}

const FinancialAnalysisStats: React.FC<FinancialAnalysisStatsProps> = ({ summary, enrolledEmployees, totalEmployees, pendingCount, inr }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <Stat 
                label="Total Net Outflow" 
                value={inr(Number(summary.netOutflow) || 0)} 
                sub={`${enrolledEmployees} Active Disbursals`} 
                icon={IndianRupee} 
                bg="bg-indigo-600" 
                color="text-white" 
                up={true} 
            />
            <Stat 
                label="Workforce Enrolment" 
                value={String(enrolledEmployees)} 
                sub={`of ${totalEmployees} Personnel`} 
                icon={Users} 
                bg="bg-slate-900" 
                color="text-white" 
                up={true} 
            />
            <Stat 
                label="Compliance Status" 
                value={inr(Number(summary.govtPayables) || 0)} 
                sub="Total Remittance Pool" 
                icon={ShieldCheck} 
                bg="bg-indigo-50" 
                color="text-indigo-600" 
                up={true} 
            />
            <Stat 
                label="Audit Latency" 
                value={String(pendingCount)} 
                sub={pendingCount > 0 ? 'Action Required' : 'System Purified'} 
                icon={Clock} 
                bg="bg-slate-50" 
                color="text-slate-400" 
                up={pendingCount > 0} 
            />
        </div>
    );
};

export default FinancialAnalysisStats;
