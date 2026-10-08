import React from 'react';
import { Briefcase } from 'lucide-react';

interface EmploymentType {
    type: string;
    count: number;
}

interface WorkforceCompositionProps {
    types: EmploymentType[];
    total: number;
}

export const WorkforceComposition: React.FC<WorkforceCompositionProps> = ({ types, total }) => (
    <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs h-full flex flex-col justify-between">
        <div>
            <div className="flex items-center justify-between mb-5">
                <div>
                    <h3 className="text-base font-semibold text-slate-900">Workforce Composition</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Distribution by employment agreement type</p>
                </div>
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Briefcase size={16} />
                </div>
            </div>

            <div className="flex items-center gap-6">
                <div className="space-y-3.5 flex-1">
                    {types?.map((t) => {
                        const pct = total > 0 ? Math.round((t.count / total) * 100) : 0;
                        return (
                            <div key={t.type}>
                                <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1.5">
                                    <span className="capitalize">{t.type.replace('_', ' ')}</span>
                                    <span>{t.count} ({pct}%)</span>
                                </div>
                                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-600 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                                </div>
                            </div>
                        );
                    })}
                </div>
                <div className="w-24 h-24 rounded-full border-[8px] border-blue-50 flex flex-col items-center justify-center shrink-0">
                    <span className="text-xl font-bold text-slate-900 leading-none">{total}</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">Total Staff</span>
                </div>
            </div>
        </div>

        <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Classifications: <strong>{types?.length || 0} types</strong></span>
            <span>Primary: <strong className="capitalize">{types?.[0]?.type?.replace('_', ' ') || 'Full Time'}</strong></span>
        </div>
    </div>
);
