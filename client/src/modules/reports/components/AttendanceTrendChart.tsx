import React from 'react';
import { Target } from 'lucide-react';

interface AttendanceTrendChartProps {
    data: number[];
    avgCompliance: string;
}

export const AttendanceTrendChart: React.FC<AttendanceTrendChartProps> = ({ data, avgCompliance }) => (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm h-full">
        <div className="flex items-center justify-between mb-8">
            <div>
                <h3 className="text-[15px] font-bold text-slate-800">Attendance Trends</h3>
                <p className="text-[12px] text-slate-500 mt-0.5">Daily attendance percentage over 30 days</p>
            </div>
            <div className="flex items-center gap-2 px-2.5 py-1 bg-slate-50 border border-slate-200 text-slate-600 rounded-lg text-[11px] font-semibold">
                <Target size={13} />
                Goal: 95%
            </div>
        </div>
        
        <div className="h-52 w-full flex items-end gap-1.5 px-1">
            {data.map((h, i) => (
                <div key={i} className="group relative flex-1">
                    <div 
                        className={`w-full rounded-t-md transition-colors ${h >= 95 ? 'bg-indigo-600' : h >= 90 ? 'bg-indigo-400' : 'bg-slate-200'}`} 
                        style={{ height: `${Math.max(5, h)}%` }}
                    />
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                        <div className="bg-slate-800 text-white text-[11px] font-medium px-2 py-1 rounded shadow-lg whitespace-nowrap">
                            Day {i+1}: {h}%
                        </div>
                    </div>
                </div>
            ))}
        </div>
        <div className="flex justify-between items-center mt-6 pt-6 border-t border-slate-100">
            <div className="flex gap-4 text-[11px] font-medium text-slate-500 overflow-hidden">
                <div className="flex items-center gap-1.5 whitespace-nowrap"><div className="w-2.5 h-2.5 rounded-sm bg-indigo-600 flex-shrink-0"/>95%+</div>
                <div className="flex items-center gap-1.5 whitespace-nowrap"><div className="w-2.5 h-2.5 rounded-sm bg-indigo-400 flex-shrink-0"/>90-95%</div>
                <div className="flex items-center gap-1.5 whitespace-nowrap"><div className="w-2.5 h-2.5 rounded-sm bg-slate-200 flex-shrink-0"/>&lt;90%</div>
            </div>
            <p className="text-[12px] font-semibold text-slate-700 whitespace-nowrap">
                Avg: <span className="text-indigo-600">{avgCompliance}%</span>
            </p>
        </div>
    </div>
);
