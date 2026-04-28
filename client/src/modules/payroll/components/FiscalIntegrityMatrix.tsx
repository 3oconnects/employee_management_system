import React from 'react';
import { TrendingUp, BarChart3, Activity, IndianRupee, ShieldCheck, Target } from 'lucide-react';

interface FiscalIntegrityMatrixProps {
    summary: {
        totalGross: number;
        totalDeductions: number;
        netOutflow: number;
        govtPayables: number;
    };
    avgSalary: number;
    inr: (v: number) => string;
}

const FiscalIntegrityMatrix: React.FC<FiscalIntegrityMatrixProps> = ({ summary, avgSalary, inr }) => {
    return (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm relative overflow-hidden flex flex-col">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/20 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none" />
            
            <div className="relative flex items-center justify-between mb-8">
                <div>
                    <h3 className="text-[14px] font-black text-slate-900 tracking-tight uppercase">Fiscal Integrity Matrix</h3>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Consolidated Operational Expenditure</p>
                </div>
                <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm">
                    <TrendingUp size={16} />
                </div>
            </div>

            <div className="relative grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {[
                    { label: 'Gross Value', value: inr(summary.totalGross), icon: BarChart3, sub: 'Pre-Deduction', color: 'text-indigo-600' },
                    { label: 'Deductions', value: inr(summary.totalDeductions), icon: Activity, sub: 'PF, PT & TDS', color: 'text-rose-500' },
                    { label: 'Net Payable', value: inr(summary.netOutflow), icon: IndianRupee, sub: 'Personnel Payout', color: 'text-emerald-600' },
                    { label: 'Govt. Dues', value: inr(summary.govtPayables), icon: ShieldCheck, sub: 'Compliance Pool', color: 'text-amber-500' },
                ].map((s) => (
                    <div key={s.label} className="p-4 rounded-xl border border-slate-50 bg-slate-50/30 hover:bg-white hover:shadow-xl hover:border-indigo-100 transition-all group">
                        <div className="flex items-center gap-2 mb-2.5">
                            <div className={`w-6 h-6 rounded-lg bg-white border border-slate-100 flex items-center justify-center ${s.color} group-hover:scale-110 transition-transform`}>
                                <s.icon size={10} />
                            </div>
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{s.label}</span>
                        </div>
                        <p className="text-[18px] font-black text-slate-900 tracking-tight">{s.value}</p>
                        <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest mt-1.5 opacity-50">{s.sub}</p>
                    </div>
                ))}
            </div>

            <div className="mt-auto pt-6 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white shadow-lg shadow-slate-900/20">
                        <Target size={14} />
                    </div>
                    <div>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Mean Compensation</p>
                        <p className="text-[14px] font-black text-slate-900 tracking-tight mt-0.5">{inr(avgSalary)}</p>
                    </div>
                </div>
                <div className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-[8px] font-black uppercase tracking-widest shadow-lg shadow-indigo-600/20 animate-pulse">
                    Live Matrix
                </div>
            </div>
        </div>
    );
};

export default FiscalIntegrityMatrix;
