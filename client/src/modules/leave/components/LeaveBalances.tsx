import React from 'react';
import { Sun, Briefcase, HeartPulse, Clock, Sparkles } from 'lucide-react';

interface LeaveBalance {
    leave_type_id: string;
    name: string;
    annual_quota: number;
    used: number;
    available: number;
}

interface LeaveBalancesProps {
    balances: LeaveBalance[];
}

export const LeaveBalances: React.FC<LeaveBalancesProps> = ({ balances }) => {
    const defaultBalances = [
        { name: 'Casual Leave', used: 0, annual_quota: 12, available: 12 },
        { name: 'Sick Leave', used: 0, annual_quota: 10, available: 10 },
        { name: 'Earned Leave', used: 0, annual_quota: 15, available: 15 },
    ];

    const displayBalances = balances.length > 0 ? balances : defaultBalances;

    const totalQuota = displayBalances.reduce((acc, b) => acc + (Number(b.annual_quota) || 0), 0);
    const totalUsed = displayBalances.reduce((acc, b) => acc + (Number(b.used) || 0), 0);
    const totalAvailable = displayBalances.reduce((acc, b) => acc + (Number(b.available) || 0), 0);
    const overallPct = totalQuota > 0 ? Math.round((totalAvailable / totalQuota) * 100) : 100;

    const getMeta = (name: string) => {
        const lower = name.toLowerCase();
        if (lower.includes('casual')) {
            return {
                icon: Sun,
                color: 'text-indigo-600',
                bg: 'bg-indigo-50 text-indigo-600',
                bar: 'from-indigo-500 to-indigo-600',
                border: 'hover:border-indigo-200',
                tag: 'Casual Balance',
            };
        }
        if (lower.includes('sick')) {
            return {
                icon: HeartPulse,
                color: 'text-rose-600',
                bg: 'bg-rose-50 text-rose-600',
                bar: 'from-rose-400 to-red-500',
                border: 'hover:border-rose-200',
                tag: 'Health & Medical',
            };
        }
        if (lower.includes('earned') || lower.includes('privilege') || lower.includes('annual')) {
            return {
                icon: Briefcase,
                color: 'text-emerald-600',
                bg: 'bg-emerald-50 text-emerald-600',
                bar: 'from-emerald-400 to-teal-500',
                border: 'hover:border-emerald-200',
                tag: 'Paid Vacation',
            };
        }
        return {
            icon: Clock,
            color: 'text-amber-600',
            bg: 'bg-amber-50 text-amber-600',
            bar: 'from-amber-400 to-orange-500',
            border: 'hover:border-amber-200',
            tag: 'Leave Quota',
        };
    };

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Allowance Overview Card */}
            <div className="bg-white rounded-xl border border-slate-100 p-3.5 shadow-xs hover:shadow-sm hover:border-slate-200 hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between group">
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                                <Sparkles size={14} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-800 uppercase tracking-wider leading-tight">
                                    Total Allowance
                                </p>
                                <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">
                                    {totalUsed} of {totalQuota} used
                                </p>
                            </div>
                        </div>
                        <span className="text-[8px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                            Pool
                        </span>
                    </div>

                    <div className="flex items-baseline justify-between mt-1 mb-2">
                        <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-black text-slate-900 tracking-tight leading-none">
                                {totalAvailable}
                            </span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                days left
                            </span>
                        </div>
                        <span className="text-[10px] font-mono font-black text-indigo-600">
                            {overallPct}%
                        </span>
                    </div>
                </div>

                <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-gradient-to-r from-indigo-500 to-violet-600 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${overallPct}%` }}
                    />
                </div>
            </div>

            {/* Individual Leave Type Cards */}
            {displayBalances.map(b => {
                const meta = getMeta(b.name);
                const Icon = meta.icon;
                const available = Number(b.available) || 0;
                const quota = Number(b.annual_quota) || 0;
                const used = Number(b.used) || 0;
                const pct = quota > 0 ? Math.round((available / quota) * 100) : 0;

                return (
                    <div 
                        key={b.name} 
                        className={`bg-white rounded-xl border border-slate-100 ${meta.border} p-3.5 shadow-xs hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between group`}
                    >
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <div className={`w-7 h-7 rounded-lg ${meta.bg} flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform`}>
                                        <Icon size={14} strokeWidth={2.5} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-800 uppercase tracking-wider leading-tight">
                                            {b.name}
                                        </p>
                                        <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">
                                            {used} of {quota} used
                                        </p>
                                    </div>
                                </div>
                                <span className="text-[8px] font-black uppercase tracking-wider text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
                                    {meta.tag}
                                </span>
                            </div>

                            <div className="flex items-baseline justify-between mt-1 mb-2">
                                <div className="flex items-baseline gap-1">
                                    <span className={`text-2xl font-black ${meta.color} tracking-tight leading-none`}>
                                        {available}
                                    </span>
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                        days avail
                                    </span>
                                </div>
                                <span className="text-[10px] font-mono font-bold text-slate-600">
                                    {pct}%
                                </span>
                            </div>
                        </div>

                        <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                                className={`h-full bg-gradient-to-r ${meta.bar} rounded-full transition-all duration-500 ease-out`}
                                style={{ width: `${pct}%` }}
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
