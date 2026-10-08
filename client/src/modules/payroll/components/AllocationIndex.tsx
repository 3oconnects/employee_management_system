import React from 'react';
import { PieChart, Users, Building2 } from 'lucide-react';

interface DeptDistItem {
    name: string;
    cost: number;
    headcount?: number;
}

interface AllocationIndexProps {
    deptDist: DeptDistItem[];
    totalPayroll: number;
    maxCost: number;
    inr: (v: number) => string;
}

const AllocationIndex: React.FC<AllocationIndexProps> = ({ deptDist, totalPayroll, maxCost, inr }) => {
    return (
        <div className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-xs flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-base font-semibold text-slate-900">Department Distribution</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Monthly salary allocation across teams</p>
                </div>
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <PieChart size={16} />
                </div>
            </div>

            <div className="space-y-4 mb-6 flex-1">
                {deptDist.length > 0 ? (
                    deptDist.map((d) => {
                        const pct = totalPayroll > 0 ? ((d.cost / totalPayroll) * 100).toFixed(1) : '0.0';
                        const barWidth = maxCost > 0 ? Math.min(100, Math.max(8, (d.cost / maxCost) * 100)) : 0;
                        return (
                            <div key={d.name} className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-slate-200 transition-all">
                                <div className="flex items-center justify-between mb-1.5">
                                    <div className="flex items-center gap-2">
                                        <Building2 size={14} className="text-slate-400" />
                                        <span className="text-xs font-semibold text-slate-800">{d.name}</span>
                                        {d.headcount !== undefined && d.headcount > 0 && (
                                            <span className="text-[11px] text-slate-400">
                                                ({d.headcount} {d.headcount === 1 ? 'member' : 'members'})
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-slate-900">{inr(d.cost)}</span>
                                        <span className="px-1.5 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 text-indigo-700">
                                            {pct}%
                                        </span>
                                    </div>
                                </div>
                                <div className="h-1.5 w-full bg-slate-200/70 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                                        style={{ width: `${barWidth}%` }}
                                    />
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="flex flex-col items-center justify-center py-10 text-center text-slate-400">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mb-2.5 text-slate-400">
                            <Building2 size={18} />
                        </div>
                        <p className="text-xs font-medium text-slate-600">No Department Data</p>
                        <p className="text-[11px] text-slate-400 mt-0.5 max-w-[200px]">
                            Assign employees to departments to view cost breakdown.
                        </p>
                    </div>
                )}
            </div>

            <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Active Departments: <strong className="text-slate-800">{deptDist.length}</strong></span>
                <span>Total Outflow: <strong className="text-slate-800">{inr(totalPayroll)}</strong></span>
            </div>
        </div>
    );
};

export default AllocationIndex;
