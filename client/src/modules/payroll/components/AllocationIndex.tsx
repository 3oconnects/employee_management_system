import React from 'react';
import { BarChart3, Activity, ArrowUpRight } from 'lucide-react';

interface AllocationIndexProps {
    deptDist: any[];
    totalPayroll: number;
    maxCost: number;
    inr: (v: number) => string;
}

const AllocationIndex: React.FC<AllocationIndexProps> = ({ deptDist, totalPayroll, maxCost, inr }) => {
    return (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col relative overflow-hidden">
            <div className="flex items-center justify-between mb-8 relative">
                <div>
                    <h3 className="text-[14px] font-black text-slate-900 tracking-tight uppercase">Allocation Index</h3>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Departmental Cost Distribution</p>
                </div>
                <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-indigo-600 shadow-sm">
                    <BarChart3 size={16} />
                </div>
            </div>
            
            <div className="space-y-6 relative mb-8">
                {deptDist.length > 0 ? deptDist.map(d => (
                    <div key={d.name} className="group cursor-default">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[9px] font-black text-slate-900 uppercase tracking-widest group-hover:text-indigo-600 transition-colors">{d.name}</span>
                            <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                                {((d.cost / (totalPayroll || 1)) * 100).toFixed(1)}%
                            </span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100 p-[1px]">
                            <div
                                className="h-full bg-indigo-600 rounded-full transition-all duration-1000 ease-out group-hover:bg-indigo-400 shadow-[0_0_8px_rgba(79,70,229,0.3)]"
                                style={{ width: `${(d.cost / maxCost) * 100}%` }}
                            ></div>
                        </div>
                        <div className="flex items-center justify-between mt-2.5">
                            <p className="text-[10px] font-black text-slate-400 tracking-tight">{inr(d.cost)}</p>
                            <div className="flex items-center gap-1 text-slate-200 group-hover:text-indigo-400 transition-all opacity-0 group-hover:opacity-100">
                                <span className="text-[8px] font-black uppercase tracking-widest">Detail</span>
                                <ArrowUpRight size={10} />
                            </div>
                        </div>
                    </div>
                )) : (
                    <div className="flex flex-col items-center justify-center py-10 text-slate-300">
                        <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center mb-4 border border-slate-100 shadow-inner">
                            <BarChart3 size={20} className="opacity-20" />
                        </div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-center max-w-[140px] leading-relaxed opacity-40">Initialize Matrix to calibrate distribution</p>
                    </div>
                )}
            </div>
            
            <div className="mt-auto pt-6 border-t border-slate-100 relative group">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-indigo-100 transition-all">
                    <div className="flex items-center gap-2.5 mb-2">
                        <div className="w-5 h-5 rounded-md bg-indigo-600 flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-110">
                            <Activity size={10} />
                        </div>
                        <p className="text-[9px] font-black text-slate-900 uppercase tracking-widest">Optimized Pulse</p>
                    </div>
                    <p className="text-[9px] text-slate-400 font-bold leading-relaxed uppercase tracking-tight opacity-70">
                        Budget pool distributions are synchronized with head-count variables.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AllocationIndex;
