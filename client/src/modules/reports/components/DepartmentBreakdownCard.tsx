import React from 'react';
import { Users, Building2, PieChart } from 'lucide-react';

interface DeptData {
    name: string;
    val: number;
    color?: string;
}

export const DepartmentBreakdownCard: React.FC<{ departments: DeptData[] }> = ({ departments }) => {
    const sortedDepts = (departments || []).slice().sort((a, b) => b.val - a.val);

    return (
        <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between h-full">
            <div>
                <div className="flex items-center justify-between mb-5">
                    <div>
                        <h3 className="text-base font-semibold text-slate-900">Department Distribution</h3>
                        <p className="text-xs text-slate-500 mt-0.5">Headcount proportion across operational units</p>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                        <PieChart size={16} />
                    </div>
                </div>

                <div className="space-y-4">
                    {sortedDepts.length > 0 ? (
                        sortedDepts.map((d, idx) => (
                            <div key={d.name} className="p-3 rounded-lg bg-slate-50/70 border border-slate-100">
                                <div className="flex justify-between items-center mb-1.5">
                                    <div className="flex items-center gap-2">
                                        <Building2 size={13} className="text-slate-400" />
                                        <span className="text-xs font-semibold text-slate-800">{d.name}</span>
                                    </div>
                                    <span className="text-xs font-bold text-slate-900">{d.val}%</span>
                                </div>
                                <div className="h-1.5 w-full bg-slate-200/70 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full rounded-full transition-all duration-500 ${
                                            idx === 0 ? 'bg-blue-600' : idx === 1 ? 'bg-indigo-500' : 'bg-violet-400'
                                        }`} 
                                        style={{ width: `${d.val}%` }} 
                                    />
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-10 text-slate-400">
                            <Users size={28} className="mx-auto mb-2 text-slate-300" />
                            <p className="text-xs font-medium text-slate-600">No Department Data</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">Assign employees to departments to see breakdown.</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Active Units: <strong className="text-slate-800">{departments?.length || 0}</strong></span>
                <span>Dominant: <strong className="text-slate-800">{sortedDepts[0]?.name || '—'}</strong></span>
            </div>
        </div>
    );
};
