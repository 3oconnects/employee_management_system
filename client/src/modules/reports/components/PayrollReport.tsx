import React from 'react';
import { CreditCard, TrendingUp, PieChart, Download } from 'lucide-react';

interface PayrollReportProps {
    data: {
        monthlyPayout: number;
    };
    avgSalary: number;
    distribution: any[];
}

export const PayrollReport: React.FC<PayrollReportProps> = ({ data, avgSalary, distribution }) => {
    const totalCtc = distribution?.reduce((sum, item) => sum + parseFloat(item.total_ctc || '0'), 0) || 1;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* ... kpis ... */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                            <CreditCard size={24} />
                        </div>
                        <button className="text-[11px] font-bold text-indigo-600 hover:underline flex items-center gap-1">
                            <Download size={14} /> View History
                        </button>
                    </div>
                    <p className="text-[12px] font-bold text-slate-400 uppercase tracking-wider">Total Monthly Payout</p>
                    <p className="text-3xl font-black text-slate-800 mt-1">₹{data.monthlyPayout.toLocaleString()}</p>
                    <div className="mt-4 flex items-center gap-2 text-[12px] text-emerald-600 font-bold">
                        <TrendingUp size={14} /> +2.4% from last month
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
                            <PieChart size={24} />
                        </div>
                    </div>
                    <p className="text-[12px] font-bold text-slate-400 uppercase tracking-wider">Avg. Annual CTC</p>
                    <p className="text-3xl font-black text-slate-800 mt-1">₹{(avgSalary).toLocaleString()}</p>
                    <p className="mt-4 text-[12px] text-slate-500 font-medium">Standardized across all active roles</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                    <h3 className="text-[15px] font-bold text-slate-800 mb-6">Salary Distribution by Position</h3>
                    <div className="space-y-4">
                        {distribution?.map((item, i) => {
                            const pct = Math.round((parseFloat(item.total_ctc) / totalCtc) * 100);
                            return (
                                <div key={item.level || i}>
                                    <div className="flex justify-between text-[11px] font-bold text-slate-500 mb-1.5 uppercase">
                                        <span>{item.level || 'Unassigned'}</span>
                                        <span>{pct}%</span>
                                    </div>
                                    <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden">
                                        <div className="h-full bg-indigo-500" style={{ width: `${pct}%` }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
                
                <div className="bg-indigo-600 rounded-2xl p-6 text-white shadow-lg shadow-indigo-100">
                    <h3 className="text-[15px] font-bold mb-4 opacity-90">Payroll Health</h3>
                    <p className="text-[13px] leading-relaxed opacity-80">
                        All compliance metrics (EPF, ESI, TDS) are within standard operating limits for this cycle.
                    </p>
                    <div className="mt-8 pt-8 border-t border-white/10">
                        <div className="flex justify-between items-end">
                            <div>
                                <p className="text-[10px] font-bold uppercase opacity-60">Next Cycle</p>
                                <p className="text-[15px] font-bold mt-1">01 May 2026</p>
                            </div>
                            <div className="bg-white/20 px-3 py-1.5 rounded-lg text-[11px] font-bold">
                                ON SCHEDULE
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
