import React from 'react';
import { Users, CheckCircle2, Zap, Target } from 'lucide-react';

interface PayrollPersonnelStatsProps {
    stats: {
        total: number;
        active: number;
        missing: number;
        totalCTC: number;
    };
    formatter: Intl.NumberFormat;
}

const PayrollPersonnelStats: React.FC<PayrollPersonnelStatsProps> = ({ stats, formatter }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
                { label: 'Personnel Matrix', val: stats.total, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                { label: 'Verified Profiles', val: stats.active, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                { label: 'Pending Config', val: stats.missing, icon: Zap, color: 'text-amber-600', bg: 'bg-amber-50' },
                { label: 'Annual Liability', val: formatter.format(stats.totalCTC), icon: Target, color: 'text-slate-900', bg: 'bg-slate-50' },
            ].map(s => (
                <div key={s.label} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm group hover:border-indigo-200 transition-all">
                    <div className="flex items-center justify-between mb-3.5">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{s.label}</p>
                        <div className={`w-9 h-9 ${s.bg} ${s.color} rounded-lg flex items-center justify-center shadow-sm`}>
                            <s.icon size={16} />
                        </div>
                    </div>
                    <p className={`text-[20px] font-black ${s.color === 'text-slate-900' ? 'text-slate-900' : s.color} tracking-tight leading-none`}>{s.val}</p>
                </div>
            ))}
        </div>
    );
};

export default PayrollPersonnelStats;
