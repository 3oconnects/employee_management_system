import React from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

interface DayData { day: number; status: string; }

interface Props {
    monthLabel: string;
    viewYear: number;
    viewMonth: number;
    calDays: DayData[];
    onPrev: () => void;
    onNext: () => void;
}

const STATUS: Record<string, { bg: string; text: string; label: string; dot?: string }> = {
    present:     { bg: 'bg-indigo-600',  text: 'text-white',    label: 'Present',  dot: 'bg-indigo-600'  },
    half_day:    { bg: 'bg-amber-100',   text: 'text-amber-700',label: 'Half Day', dot: 'bg-amber-400'   },
    absent:      { bg: 'bg-rose-100',    text: 'text-rose-600', label: 'Absent',   dot: 'bg-rose-500'    },
    on_duty:     { bg: 'bg-sky-100',     text: 'text-sky-700',  label: 'On Duty',  dot: 'bg-sky-400'     },
    holiday:     { bg: 'bg-violet-100',  text: 'text-violet-600',label:'Holiday',  dot: 'bg-violet-400'  },
    weekend:     { bg: 'bg-transparent', text: 'text-slate-300', label: 'Weekend'  },
    future:      { bg: 'bg-transparent', text: 'text-slate-200', label: 'Future'   },
    no_data:     { bg: 'bg-slate-100',   text: 'text-slate-400', label: 'No Data'  },
    today_empty: { bg: 'bg-slate-100',   text: 'text-slate-500', label: 'Today'    },
};
const sm = (s: string) => STATUS[s] ?? STATUS.no_data;

const LEGEND = [
    { key: 'present',  label: 'Present',  dot: 'bg-indigo-600' },
    { key: 'half_day', label: 'Half Day', dot: 'bg-amber-400'  },
    { key: 'absent',   label: 'Absent',   dot: 'bg-rose-500'   },
    { key: 'on_duty',  label: 'On Duty',  dot: 'bg-sky-400'    },
    { key: 'holiday',  label: 'Holiday',  dot: 'bg-violet-400' },
    { key: 'no_data',  label: 'No Data',  dot: 'bg-slate-300'  },
    { key: 'weekend',  label: 'Weekend',  dot: 'bg-slate-100'  },
];

export const AttendanceCalendar: React.FC<Props> = ({
    monthLabel, viewYear, viewMonth, calDays, onPrev, onNext,
}) => {
    const firstDay = new Date(viewYear, viewMonth - 1, 1).getDay();
    const today    = new Date().getDate();
    const isCurrentMonth = new Date().getMonth() + 1 === viewMonth && new Date().getFullYear() === viewYear;

    // Build a summary count for this month
    const counts: Record<string, number> = {};
    calDays.forEach(d => { counts[d.status] = (counts[d.status] || 0) + 1; });

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {/* ── Header ── */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center">
                        <Calendar size={14} className="text-white"/>
                    </div>
                    <div>
                        <h3 className="text-[13px] font-bold text-slate-800">Shift Visualization</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{monthLabel}</p>
                    </div>
                </div>
                <div className="flex items-center gap-1.5">
                    <button onClick={onPrev} className="w-7 h-7 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-300 transition-all">
                        <ChevronLeft size={13}/>
                    </button>
                    <button onClick={onNext} className="w-7 h-7 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-300 transition-all">
                        <ChevronRight size={13}/>
                    </button>
                </div>
            </div>

            {/* ── Mini summary strip ── */}
            <div className="flex items-center gap-0 border-b border-slate-100 divide-x divide-slate-100">
                {[
                    { label: 'Present',  val: counts['present']  || 0, cls: 'text-indigo-600' },
                    { label: 'Half Day', val: counts['half_day'] || 0, cls: 'text-amber-500'  },
                    { label: 'Absent',   val: counts['absent']   || 0, cls: 'text-rose-500'   },
                    { label: 'On Duty',  val: counts['on_duty']  || 0, cls: 'text-sky-500'    },
                ].map(s => (
                    <div key={s.label} className="flex-1 text-center py-2.5">
                        <p className={`text-[16px] font-black ${s.cls}`}>{s.val}</p>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{s.label}</p>
                    </div>
                ))}
            </div>

            {/* ── Calendar grid ── */}
            <div className="p-4">
                {/* Day headers */}
                <div className="grid grid-cols-7 mb-1.5">
                    {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
                        <div key={d} className="text-center text-[9px] font-black text-slate-400 uppercase tracking-widest py-1.5">{d}</div>
                    ))}
                </div>

                {/* Day cells — compact */}
                <div className="grid grid-cols-7 gap-1">
                    {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`}/>)}
                    {calDays.map(d => {
                        const meta    = sm(d.status);
                        const isToday = isCurrentMonth && d.day === today;
                        const isFuture = d.status === 'future';
                        return (
                            <div key={d.day}
                                title={meta.label}
                                className={`relative h-9 rounded-lg flex items-center justify-center text-[11px] font-bold transition-all
                                    ${meta.bg} ${meta.text}
                                    ${isToday ? 'ring-2 ring-indigo-500 ring-offset-1' : ''}
                                    ${isFuture ? 'opacity-40' : ''}
                                    ${!isFuture && d.status !== 'weekend' ? 'hover:opacity-80 cursor-default' : ''}`}>
                                {d.day}
                                {isToday && d.status !== 'present' && (
                                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-indigo-400"/>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Legend */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap gap-x-4 gap-y-1.5">
                    {LEGEND.map(l => (
                        <span key={l.key} className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-wide">
                            <span className={`w-2 h-2 rounded-full ${l.dot} border border-white shadow-sm`}/>
                            {l.label}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
};
