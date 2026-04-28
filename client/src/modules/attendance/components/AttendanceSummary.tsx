import React from 'react';
import { CheckCircle2, Clock, BarChart2, XCircle, TrendingUp, Users, Activity } from 'lucide-react';

interface SummaryData {
    present_days:  number | string;
    half_days:     number | string;
    on_duty_days?: number | string;
    absent_days?:  number | string;
    avg_hours:     number | string;
    total_entries?: number | string;
}

export const AttendanceSummary: React.FC<{ summary: SummaryData }> = ({ summary }) => {
    const avg    = parseFloat(String(summary.avg_hours ?? 0)) || 0;
    const present = Number(summary.present_days ?? 0);
    const half    = Number(summary.half_days ?? 0);
    const absent  = Number(summary.absent_days ?? 0);
    const total   = Number(summary.total_entries ?? present + half + absent);
    const attendancePct = total > 0 ? Math.round((present / total) * 100) : 0;

    const stats = [
        { label: 'Present',     val: present,              unit: 'days',  color: 'text-emerald-600', bg: 'bg-emerald-50',  border: 'border-emerald-100', icon: CheckCircle2, bar: 'bg-emerald-400' },
        { label: 'Half Day',    val: half,                 unit: 'days',  color: 'text-amber-600',   bg: 'bg-amber-50',    border: 'border-amber-100',   icon: Clock,        bar: 'bg-amber-400'   },
        { label: 'Attendance',  val: `${attendancePct}%`,  unit: '',      color: 'text-indigo-600',  bg: 'bg-indigo-50',   border: 'border-indigo-100',  icon: Activity,     bar: 'bg-indigo-400'  },
        { label: 'Absent',      val: absent,               unit: 'days',  color: 'text-rose-600',    bg: 'bg-rose-50',     border: 'border-rose-100',    icon: XCircle,      bar: 'bg-rose-400'    },
        { label: 'Avg Hours',   val: `${avg.toFixed(1)}h`, unit: '/day',  color: 'text-violet-600',  bg: 'bg-violet-50',   border: 'border-violet-100',  icon: TrendingUp,   bar: 'bg-violet-400'  },
        { label: 'Work Days',   val: total,                unit: 'days',  color: 'text-slate-600',   bg: 'bg-slate-50',    border: 'border-slate-100',   icon: Users,        bar: 'bg-slate-300'   },
    ];

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {stats.map(s => (
                <div key={s.label} className={`bg-white rounded-2xl border ${s.border} p-4 flex flex-col gap-3 hover:shadow-md transition-all group`}>
                    <div className={`w-9 h-9 ${s.bg} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                        <s.icon size={16} className={s.color}/>
                    </div>
                    <div>
                        <p className={`text-[22px] font-black ${s.color} leading-none`}>{s.val}</p>
                        {s.unit && <p className="text-[9px] text-slate-400 font-bold mt-0.5">{s.unit}</p>}
                    </div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{s.label}</p>
                    {/* micro-bar */}
                    <div className="h-0.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full ${s.bar} rounded-full transition-all`} style={{width:`${Math.min(Number(s.val)||attendancePct, 100)}%`}}/>
                    </div>
                </div>
            ))}
        </div>
    );
};
