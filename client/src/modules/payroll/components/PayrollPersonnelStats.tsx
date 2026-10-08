import React from 'react';
import { Users, CheckCircle2, AlertCircle, IndianRupee } from 'lucide-react';

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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
                { 
                    label: 'Total Employees', 
                    val: String(stats.total), 
                    icon: Users, 
                    color: 'text-blue-600', 
                    bg: 'bg-blue-50',
                    desc: 'On company roster'
                },
                { 
                    label: 'Configured Salaries', 
                    val: String(stats.active), 
                    icon: CheckCircle2, 
                    color: 'text-emerald-600', 
                    bg: 'bg-emerald-50',
                    desc: 'Ready for disbursement'
                },
                { 
                    label: 'Pending Setup', 
                    val: String(stats.missing), 
                    icon: AlertCircle, 
                    color: stats.missing > 0 ? 'text-amber-600' : 'text-slate-500', 
                    bg: stats.missing > 0 ? 'bg-amber-50' : 'bg-slate-50',
                    desc: stats.missing > 0 ? 'Action required' : 'All profiles ready'
                },
                { 
                    label: 'Total Annual CTC', 
                    val: formatter.format(stats.totalCTC), 
                    icon: IndianRupee, 
                    color: 'text-violet-600', 
                    bg: 'bg-violet-50',
                    desc: 'Cumulative company budget'
                },
            ].map((s) => (
                <div 
                    key={s.label} 
                    className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all"
                >
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-semibold text-slate-500">{s.label}</span>
                        <div className={`w-9 h-9 ${s.bg} ${s.color} rounded-lg flex items-center justify-center`}>
                            <s.icon size={18} />
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-slate-900 tracking-tight leading-none">{s.val}</p>
                    <p className="text-xs text-slate-400 font-medium mt-2">{s.desc}</p>
                </div>
            ))}
        </div>
    );
};

export default PayrollPersonnelStats;
