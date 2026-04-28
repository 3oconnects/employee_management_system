import React from 'react';
import { Calendar } from 'lucide-react';

interface LeaveTabProps {
    leaveBalances: any[];
}

const LeaveTab: React.FC<LeaveTabProps> = ({ leaveBalances }) => {
    if (!leaveBalances || leaveBalances.length === 0) {
        return (
            <div className="text-center py-10 text-slate-400">
                <Calendar size={28} className="mx-auto mb-2 opacity-30"/>
                <p className="text-[12px] font-bold">No leave types configured</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {leaveBalances.map((lb: any) => {
                const pct = Math.round(((lb.annual_quota - (lb.used || 0)) / Math.max(lb.annual_quota, 1)) * 100);
                return (
                    <div key={lb.name} className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-[14px] font-black flex-shrink-0 ${lb.available > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-600'}`}>
                            {Math.max(lb.annual_quota - (lb.used || 0), 0)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-baseline mb-1.5">
                                <p className="text-[13px] font-bold text-slate-700">{lb.name}</p>
                                <p className="text-[10px] font-bold text-slate-400">{lb.used || 0} used · {lb.annual_quota} total</p>
                            </div>
                            <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                <div className="h-full rounded-full bg-indigo-500 transition-all duration-700" style={{ width: `${pct}%` }}/>
                            </div>
                        </div>
                        <span className="text-[11px] font-bold text-slate-500 flex-shrink-0 w-10 text-right">{pct}%</span>
                    </div>
                );
            })}
        </div>
    );
};

export default LeaveTab;
