import React from 'react';
import { Users } from 'lucide-react';

interface DeptData {
    name: string;
    val: number;
}

export const DepartmentBreakdownCard: React.FC<{ departments: DeptData[] }> = ({ departments }) => (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm h-full">
        <h3 className="text-[15px] font-bold text-slate-800 mb-6">Department Breakdown</h3>
        <div className="space-y-6">
            {departments?.length > 0 ? departments.map(d => (
                <div key={d.name}>
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-[12px] font-semibold text-slate-700">{d.name}</span>
                        <span className="text-[12px] font-bold text-slate-900">{d.val}%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${d.val}%` }} />
                    </div>
                </div>
            )) : (
                <div className="text-center py-12">
                    <Users size={32} className="mx-auto mb-3 text-slate-300" />
                    <p className="text-[12px] font-medium text-slate-500">No department data</p>
                </div>
            )}
        </div>
    </div>
);
