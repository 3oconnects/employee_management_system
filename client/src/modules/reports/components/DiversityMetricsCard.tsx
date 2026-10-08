import React from 'react';
import { Users2, Sparkles } from 'lucide-react';

interface DiversityMetricsCardProps {
    data: { male: number; female: number; other: number };
    total: number;
}

export const DiversityMetricsCard: React.FC<DiversityMetricsCardProps> = ({ data, total }) => {
    const maleCount = data?.male || 0;
    const femaleCount = data?.female || 0;
    const otherCount = data?.other || 0;

    return (
        <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs h-full flex flex-col justify-between">
            <div>
                <div className="flex items-center justify-between mb-5">
                    <div>
                        <h3 className="text-base font-semibold text-slate-900">Diversity & Gender Balance</h3>
                        <p className="text-xs text-slate-500 mt-0.5">Demographic representation breakdown</p>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                        <Users2 size={16} />
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                    {[
                        { label: 'Male', val: maleCount, color: 'bg-blue-600', text: 'text-blue-600', bg: 'bg-blue-50' },
                        { label: 'Female', val: femaleCount, color: 'bg-rose-500', text: 'text-rose-600', bg: 'bg-rose-50' },
                        { label: 'Non-binary / Other', val: otherCount, color: 'bg-amber-500', text: 'text-amber-600', bg: 'bg-amber-50' },
                    ].map(g => {
                        const pct = total > 0 ? Math.round((g.val / total) * 100) : 0;
                        return (
                            <div key={g.label} className={`p-3 rounded-lg border border-slate-100 ${g.bg}`}>
                                <span className="text-[11px] font-semibold text-slate-600 block mb-1">{g.label}</span>
                                <div className="text-lg font-bold text-slate-900">{g.val}</div>
                                <div className="h-1.5 w-full bg-slate-200/60 rounded-full mt-2 overflow-hidden">
                                    <div className={`h-full ${g.color} rounded-full`} style={{ width: `${pct}%` }} />
                                </div>
                                <span className={`text-[10px] font-semibold ${g.text} mt-1 block`}>{pct}% of staff</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-500">
                <Sparkles size={13} className="text-indigo-500 shrink-0" />
                <span>Equal employment opportunity & inclusion standards maintained.</span>
            </div>
        </div>
    );
};
