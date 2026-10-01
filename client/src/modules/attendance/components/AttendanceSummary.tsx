import React from 'react';
import { CheckCircle2, Clock, XCircle, TrendingUp, Users, Activity } from 'lucide-react';

interface SummaryData {
    present_days:  number | string;
    half_days:     number | string;
    on_duty_days?: number | string;
    absent_days?:  number | string;
    avg_hours:     number | string;
    total_entries?: number | string;
}

interface AttendanceSummaryProps {
    summary: SummaryData;
    attendance?: {
        totalHours?: string;
        status?: string;
    } | null;
}

export const AttendanceSummary: React.FC<AttendanceSummaryProps> = ({ summary, attendance }) => {
    const rawAvg = parseFloat(String(summary.avg_hours ?? 0)) || 0;
    const liveHours = parseFloat(attendance?.totalHours || '0') || 0;
    const present = Number(summary.present_days ?? 0);
    const half = Number(summary.half_days ?? 0);
    const absent = Number(summary.absent_days ?? 0);
    const total = Number(summary.total_entries ?? (present + half + absent));

    // If no closed avg yet, use today's live hours if present > 0
    const effectiveAvg = rawAvg > 0 ? rawAvg : (present > 0 && liveHours > 0 ? liveHours : 0);
    const attendancePct = total > 0 ? Math.round((present / total) * 100) : (present > 0 ? 100 : 0);

    const stats = [
        {
            label: 'Present',
            val: present,
            unit: 'days',
            tag: present > 0 ? `${present}/22 Target` : 'No shifts',
            pct: Math.min(100, Math.round((present / 22) * 100)),
            color: 'text-emerald-600',
            bg: 'bg-emerald-50 text-emerald-600',
            border: 'border-slate-100 hover:border-emerald-200',
            barGradient: 'from-emerald-400 to-teal-500',
            icon: CheckCircle2,
            subtext: `${Math.min(100, Math.round((present / 22) * 100))}% monthly`,
        },
        {
            label: 'Half Day',
            val: half,
            unit: 'days',
            tag: half === 0 ? 'Zero occurrences' : `${half} days`,
            pct: half > 0 ? Math.min(100, Math.round((half / 22) * 100)) : 0,
            color: 'text-amber-600',
            bg: 'bg-amber-50 text-amber-600',
            border: 'border-slate-100 hover:border-amber-200',
            barGradient: 'from-amber-400 to-orange-400',
            icon: Clock,
            subtext: half === 0 ? 'Clean record' : `${half} registered`,
        },
        {
            label: 'Attendance',
            val: `${attendancePct}%`,
            unit: '',
            tag: attendancePct >= 90 ? 'Excellent' : attendancePct >= 75 ? 'Good' : 'Needs attention',
            pct: attendancePct,
            color: 'text-indigo-600',
            bg: 'bg-indigo-50 text-indigo-600',
            border: 'border-slate-100 hover:border-indigo-200',
            barGradient: 'from-indigo-500 to-violet-500',
            icon: Activity,
            subtext: attendancePct >= 90 ? 'Optimal score' : 'Tracking rate',
        },
        {
            label: 'Absent',
            val: absent,
            unit: 'days',
            tag: absent === 0 ? 'Zero unexcused' : `${absent} days`,
            pct: absent > 0 ? Math.min(100, Math.round((absent / 22) * 100)) : 0,
            color: 'text-rose-600',
            bg: 'bg-rose-50 text-rose-600',
            border: 'border-slate-100 hover:border-rose-200',
            barGradient: 'from-rose-400 to-red-500',
            icon: XCircle,
            subtext: absent === 0 ? 'Perfect record' : 'Unscheduled',
        },
        {
            label: 'Avg Hours',
            val: `${effectiveAvg.toFixed(1)}h`,
            unit: '/day',
            tag: effectiveAvg >= 9 ? 'Target Met' : `${((effectiveAvg / 9) * 100).toFixed(0)}% of 9h`,
            pct: Math.min(100, Math.round((effectiveAvg / 9) * 100)),
            color: 'text-violet-600',
            bg: 'bg-violet-50 text-violet-600',
            border: 'border-slate-100 hover:border-violet-200',
            barGradient: 'from-violet-500 to-purple-500',
            icon: TrendingUp,
            subtext: 'Standard 9h shift',
        },
        {
            label: 'Work Days',
            val: total,
            unit: 'days',
            tag: `${total} logged`,
            pct: Math.min(100, Math.round((total / 22) * 100)),
            color: 'text-slate-700',
            bg: 'bg-slate-100 text-slate-700',
            border: 'border-slate-100 hover:border-slate-300',
            barGradient: 'from-slate-500 to-slate-700',
            icon: Users,
            subtext: '≈ 22 work days/mo',
        },
    ];

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {stats.map(s => (
                <div 
                    key={s.label} 
                    className={`bg-white rounded-2xl border ${s.border} p-4 flex flex-col justify-between shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group relative overflow-hidden`}
                >
                    <div className="flex items-center justify-between mb-2">
                        <div className={`w-9 h-9 ${s.bg} rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform shadow-xs`}>
                            <s.icon size={16} strokeWidth={2.5}/>
                        </div>
                        <span className="text-[8px] font-black uppercase tracking-wider text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
                            {s.tag}
                        </span>
                    </div>

                    <div className="my-1">
                        <div className="flex items-baseline gap-1">
                            <span className={`text-[24px] font-black ${s.color} tracking-tight leading-none`}>
                                {s.val}
                            </span>
                            {s.unit && (
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                    {s.unit}
                                </span>
                            )}
                        </div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">
                            {s.label}
                        </p>
                    </div>

                    {/* Dynamic micro-progress bar with percentage label */}
                    <div className="mt-2 pt-2 border-t border-slate-50">
                        <div className="flex items-center justify-between text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                            <span>{s.subtext}</span>
                            <span className="font-mono text-slate-600 font-bold">{s.pct}%</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                                className={`h-full bg-gradient-to-r ${s.barGradient} rounded-full transition-all duration-700 ease-out`} 
                                style={{ width: `${s.pct}%` }}
                            />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};
