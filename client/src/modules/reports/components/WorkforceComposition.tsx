import React from 'react';

interface EmploymentType {
    type: string;
    count: number;
}

interface WorkforceCompositionProps {
    types: EmploymentType[];
    total: number;
}

export const WorkforceComposition: React.FC<WorkforceCompositionProps> = ({ types, total }) => (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm h-full">
        <h3 className="text-[15px] font-bold text-slate-800 mb-6">Workforce Composition</h3>
        <div className="flex items-center gap-8">
            <div className="space-y-4 flex-1">
                {types?.map((t) => (
                    <div key={t.type}>
                        <div className="flex justify-between text-[11px] font-bold text-slate-500 mb-1">
                            <span className="capitalize">{t.type.replace('_', ' ')}</span>
                            <span>{t.count}</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500" style={{ width: `${(t.count / (total || 1)) * 100}%` }} />
                        </div>
                    </div>
                ))}
            </div>
            <div className="w-32 h-32 rounded-full border-[10px] border-indigo-50 flex items-center justify-center relative flex-shrink-0">
                <span className="text-xl font-black text-indigo-600">{total}</span>
                <div className="absolute inset-0 border-[10px] border-indigo-500 rounded-full border-t-transparent -rotate-45" />
            </div>
        </div>
    </div>
);
