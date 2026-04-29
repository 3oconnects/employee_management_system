import React from 'react';
import { TrendingUp } from 'lucide-react';

interface DiversityMetricsCardProps {
    data: { male: number; female: number; other: number };
    total: number;
}

export const DiversityMetricsCard: React.FC<DiversityMetricsCardProps> = ({ data, total }) => (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm h-full">
        <h3 className="text-[15px] font-bold text-slate-800 mb-6">Diversity Metrics</h3>
        <div className="grid grid-cols-3 gap-4">
            {[
                { label: 'Male', val: data?.male || 0, color: 'bg-blue-500' },
                { label: 'Female', val: data?.female || 0, color: 'bg-rose-500' },
                { label: 'Other', val: data?.other || 0, color: 'bg-amber-500' },
            ].map(g => (
                <div key={g.label} className="text-center">
                    <div className={`w-full h-2 ${g.color} rounded-full mb-3 opacity-80`} style={{ width: `${(g.val / (total || 1)) * 100 || 5}%` }} />
                    <p className="text-[11px] font-bold text-slate-400 uppercase">{g.label}</p>
                    <p className="text-[16px] font-black text-slate-800">{g.val}</p>
                </div>
            ))}
        </div>
        <div className="mt-6 p-3 bg-slate-50 rounded-xl flex items-center gap-3">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                <TrendingUp size={14} className="text-emerald-500" />
            </div>
            <p className="text-[11px] text-slate-500 leading-tight">
                Diversity score has improved by <span className="font-bold text-slate-700">12%</span> since last quarter.
            </p>
        </div>
    </div>
);
