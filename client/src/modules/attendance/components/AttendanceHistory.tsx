import React, { useState, useMemo } from 'react';
import { CalendarDays, LogIn, LogOut, Clock, Search, ChevronDown, Coffee, TrendingUp, AlertTriangle, CheckCircle2, Timer } from 'lucide-react';

interface HistoryRecord {
    id: string;
    check_in_time?: string;
    check_out_time?: string;
    check_in?: string;
    check_out?: string;
    status: string;
    date?: string;
    overtime_hours?: number;
}

interface Props {
    history: HistoryRecord[];
    fmtDate: (iso: string) => string;
    fmtTime: (iso: string) => string;
    calcHours: (inTime: string, outTime: string) => string;
}

const STATUS_META: Record<string, { label: string; bg: string; text: string; dot: string; icon: React.ElementType }> = {
    present:  { label: 'Present',  bg: 'bg-indigo-50', text: 'text-indigo-700', dot: 'bg-indigo-500', icon: CheckCircle2 },
    half_day: { label: 'Half Day', bg: 'bg-amber-50',  text: 'text-amber-700',  dot: 'bg-amber-400',  icon: Clock        },
    on_duty:  { label: 'On Duty',  bg: 'bg-sky-50',    text: 'text-sky-700',    dot: 'bg-sky-400',    icon: TrendingUp   },
    absent:   { label: 'Absent',   bg: 'bg-rose-50',   text: 'text-rose-700',   dot: 'bg-rose-500',   icon: AlertTriangle},
    holiday:  { label: 'Holiday',  bg: 'bg-violet-50', text: 'text-violet-700', dot: 'bg-violet-400', icon: CalendarDays },
};
const sm  = (s: string) => STATUS_META[s] ?? { label: s, bg: 'bg-slate-50', text: 'text-slate-500', dot: 'bg-slate-300', icon: Clock };

const pad  = (n: number) => String(n).padStart(2, '0');
const msToHM = (ms: number) => {
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return h > 0 ? `${h}h ${pad(m)}m` : `${m}m`;
};

// Build a mini session-timeline bar (check-in to check-out mapped 9AM–7PM = 100%)
const SHIFT_START = 9 * 60; // 9 AM in minutes
const SHIFT_SPAN  = 10 * 60; // 10 hours of visible window

const TimelineBar: React.FC<{ inT: string | null; outT: string | null }> = ({ inT, outT }) => {
    if (!inT) return <div className="h-2 bg-slate-100 rounded-full w-full"/>;
    const toMin = (iso: string) => {
        const d = new Date(iso);
        return d.getHours() * 60 + d.getMinutes();
    };
    const startMin = toMin(inT);
    const endMin   = outT ? toMin(outT) : Math.min(startMin + 30, SHIFT_START + SHIFT_SPAN);
    const left  = Math.max(0, ((startMin - SHIFT_START) / SHIFT_SPAN) * 100);
    const width = Math.min(((endMin - startMin) / SHIFT_SPAN) * 100, 100 - left);
    const isLate = startMin > SHIFT_START + 15;
    return (
        <div className="relative h-2 bg-slate-100 rounded-full w-full overflow-hidden">
            <div className={`absolute h-full rounded-full ${isLate ? 'bg-amber-400' : 'bg-indigo-500'} transition-all`}
                style={{ left: `${left}%`, width: `${Math.max(width, 1)}%` }}/>
            {/* 9h mark */}
            <div className="absolute top-0 h-full w-px bg-slate-300" style={{ left: '0%' }}/>
            {/* 6PM mark */}
            <div className="absolute top-0 h-full w-px bg-slate-300" style={{ left: '90%' }}/>
        </div>
    );
};

export const AttendanceHistory: React.FC<Props> = ({ history, fmtDate, fmtTime, calcHours }) => {
    const [search,     setSearch]     = useState('');
    const [filter,     setFilter]     = useState('all');
    const [showFilter, setShowFilter] = useState(false);
    const [expanded,   setExpanded]   = useState<string | null>(null);

    const normalised = useMemo(() => history.map(r => ({
        ...r,
        check_in_time:  r.check_in_time  || r.check_in  || null,
        check_out_time: r.check_out_time || r.check_out || null,
    })), [history]);

    const filtered = useMemo(() => normalised.filter(r => {
        const matchStatus = filter === 'all' || r.status === filter;
        const dateStr = r.date || r.check_in_time || '';
        const matchSearch = !search || (dateStr && fmtDate(dateStr).toLowerCase().includes(search.toLowerCase()));
        return matchStatus && matchSearch;
    }), [normalised, filter, search, fmtDate]);

    // Aggregate stats for the filtered set
    const stats = useMemo(() => {
        let totalMs = 0, lateCount = 0, otMs = 0;
        filtered.forEach(r => {
            if (r.check_in_time && r.check_out_time) {
                const ms = new Date(r.check_out_time).getTime() - new Date(r.check_in_time).getTime();
                totalMs += ms;
                if (ms > 9 * 3600000) otMs += ms - 9 * 3600000;
            }
            if (r.check_in_time) {
                const t = new Date(r.check_in_time);
                if (t.getHours() > 9 || (t.getHours() === 9 && t.getMinutes() > 15)) lateCount++;
            }
        });
        return { totalMs, lateCount, otMs, avgMs: filtered.length ? totalMs / filtered.filter(r => r.check_in_time && r.check_out_time).length : 0 };
    }, [filtered]);

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {/* ── Header ── */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center">
                        <CalendarDays size={14} className="text-white"/>
                    </div>
                    <div>
                        <h3 className="text-[13px] font-bold text-slate-800">Activity Log</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{filtered.length} records</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <div className="relative">
                        <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"/>
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search date…"
                            className="pl-7 pr-3 py-2 text-[11px] bg-white border border-slate-200 rounded-xl focus:border-indigo-400 outline-none w-36 transition-all"/>
                    </div>
                    <div className="relative">
                        <button onClick={() => setShowFilter(f => !f)}
                            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-xl text-[11px] font-semibold text-slate-600 hover:border-indigo-300 transition-all">
                            {filter === 'all' ? 'All Status' : sm(filter).label}
                            <ChevronDown size={10}/>
                        </button>
                        {showFilter && (
                            <div className="absolute right-0 top-full mt-1 bg-white border border-slate-100 rounded-xl shadow-xl z-20 overflow-hidden min-w-[130px]">
                                {['all','present','half_day','absent','on_duty','holiday'].map(s => (
                                    <button key={s} onClick={() => { setFilter(s); setShowFilter(false); }}
                                        className={`w-full text-left px-4 py-2.5 text-[11px] font-semibold hover:bg-indigo-50 transition-colors ${filter===s ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600'}`}>
                                        {s === 'all' ? 'All Status' : sm(s).label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Aggregate stats strip ── */}
            {filtered.length > 0 && (
                <div className="flex items-center divide-x divide-slate-100 border-b border-slate-100">
                    {[
                        { icon: Timer,       label: 'Total Time',  val: msToHM(stats.totalMs), color: 'text-indigo-600' },
                        { icon: TrendingUp,  label: 'Avg / Day',   val: msToHM(stats.avgMs),   color: 'text-violet-600' },
                        { icon: Coffee,      label: 'Overtime',    val: stats.otMs > 0 ? msToHM(stats.otMs) : '—', color: 'text-emerald-600' },
                        { icon: AlertTriangle, label: 'Late Days', val: String(stats.lateCount), color: 'text-amber-600' },
                    ].map(s => (
                        <div key={s.label} className="flex-1 flex items-center gap-2 px-4 py-3">
                            <s.icon size={13} className={s.color}/>
                            <div>
                                <p className={`text-[13px] font-black ${s.color}`}>{s.val}</p>
                                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wide">{s.label}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {filtered.length === 0 ? (
                <div className="py-20 flex flex-col items-center gap-3">
                    <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center">
                        <Search size={22} className="text-slate-300"/>
                    </div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">No records found</p>
                </div>
            ) : (
                <div className="divide-y divide-slate-50">
                    {filtered.map((rec, i) => {
                        const inT   = rec.check_in_time;
                        const outT  = rec.check_out_time;
                        const hrs   = inT && outT ? parseFloat(calcHours(inT, outT)) : null;
                        const hrsMs = inT && outT ? new Date(outT).getTime() - new Date(inT).getTime() : 0;
                        const ot    = hrs ? Math.max(0, hrs - 9) : 0;
                        const isLate = inT ? (() => { const t = new Date(inT); return t.getHours() > 9 || (t.getHours() === 9 && t.getMinutes() > 15); })() : false;
                        const meta  = sm(rec.status);
                        const dateStr = rec.date || inT || '';
                        const rowKey  = rec.id ?? String(i);
                        const isExpanded = expanded === rowKey;
                        // Break time = if total span > logged hours (rough estimate if single session)
                        const spanMs  = inT && outT ? new Date(outT).getTime() - new Date(inT).getTime() : 0;
                        const breakMs = Math.max(0, spanMs - hrsMs); // for single-session this is 0; meaningful with multiple

                        return (
                            <div key={rowKey}>
                                {/* ── Main row ── */}
                                <div onClick={() => setExpanded(isExpanded ? null : rowKey)}
                                    className="flex items-center gap-4 px-6 py-3.5 hover:bg-slate-50/80 transition-colors cursor-pointer group">
                                    {/* Date */}
                                    <div className="w-20 flex-shrink-0">
                                        <p className="text-[12px] font-bold text-slate-800">
                                            {dateStr ? new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}
                                        </p>
                                        <p className="text-[9px] text-slate-400 font-medium">
                                            {dateStr ? new Date(dateStr).toLocaleDateString('en-IN', { weekday: 'short' }) : ''}
                                        </p>
                                    </div>

                                    {/* Status pill */}
                                    <div className={`flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wide ${meta.bg} ${meta.text} w-20`}>
                                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${meta.dot}`}/>
                                        {meta.label}
                                    </div>

                                    {/* Timeline bar + times */}
                                    <div className="flex-1 min-w-0 space-y-1">
                                        <TimelineBar inT={inT || null} outT={outT || null}/>
                                        <div className="flex items-center gap-3 text-[10px] text-slate-400">
                                            <span className="flex items-center gap-1">
                                                <LogIn size={9} className={isLate ? 'text-amber-400' : 'text-emerald-400'}/>
                                                <span className={isLate ? 'text-amber-500 font-bold' : ''}>{inT ? fmtTime(inT) : '—'}</span>
                                                {isLate && <span className="text-amber-400 font-bold text-[8px]">late</span>}
                                            </span>
                                            <span>→</span>
                                            <span className="flex items-center gap-1">
                                                <LogOut size={9} className={outT ? 'text-rose-400' : 'text-slate-200'}/>
                                                {outT ? fmtTime(outT) : <span className="text-slate-300 italic">active</span>}
                                            </span>
                                            <span className="text-[8px] font-bold text-slate-300">9 AM — 6 PM window</span>
                                        </div>
                                    </div>

                                    {/* Duration + OT */}
                                    <div className="text-right flex-shrink-0 w-20">
                                        <p className={`text-[13px] font-black ${hrs && hrs >= 9 ? 'text-emerald-600' : hrs ? 'text-amber-500' : 'text-slate-300'}`}>
                                            {hrs !== null ? `${hrs.toFixed(1)}h` : '—'}
                                        </p>
                                        {ot > 0 && <p className="text-[9px] font-bold text-indigo-500">+{ot.toFixed(1)}h OT</p>}
                                    </div>

                                    <ChevronDown size={12} className={`text-slate-300 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}/>
                                </div>

                                {/* ── Expanded detail ── */}
                                {isExpanded && (
                                    <div className="px-6 pb-4 bg-slate-50/50 border-t border-slate-100">
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4">
                                            {[
                                                { icon: LogIn,      label: 'Check In',    val: inT  ? fmtTime(inT)  : '—', cls: isLate ? 'text-amber-600' : 'text-slate-800' },
                                                { icon: LogOut,     label: 'Check Out',   val: outT ? fmtTime(outT) : 'Active…', cls: 'text-slate-800' },
                                                { icon: Clock,      label: 'Work Hours',  val: hrsMs ? msToHM(hrsMs) : '—',  cls: 'text-indigo-600' },
                                                { icon: Coffee,     label: 'Break',       val: breakMs > 0 ? msToHM(breakMs) : '—', cls: 'text-slate-500' },
                                                { icon: TrendingUp, label: 'Overtime',    val: ot > 0 ? `+${ot.toFixed(2)}h` : '—', cls: ot > 0 ? 'text-emerald-600' : 'text-slate-300' },
                                                { icon: AlertTriangle, label: 'Late',     val: isLate ? 'Yes' : 'On Time', cls: isLate ? 'text-amber-600' : 'text-emerald-600' },
                                                { icon: CalendarDays, label: 'Date',      val: dateStr ? fmtDate(dateStr) : '—', cls: 'text-slate-600' },
                                                { icon: meta.icon,  label: 'Status',      val: meta.label, cls: meta.text },
                                            ].map(d => (
                                                <div key={d.label} className="bg-white rounded-xl border border-slate-100 p-3 flex items-center gap-2.5">
                                                    <d.icon size={12} className="text-slate-400 flex-shrink-0"/>
                                                    <div>
                                                        <p className={`text-[12px] font-bold ${d.cls}`}>{d.val}</p>
                                                        <p className="text-[9px] text-slate-400 font-medium uppercase tracking-wide">{d.label}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Hours bar for this day */}
                                        {hrs !== null && (
                                            <div className="mt-3">
                                                <div className="flex justify-between text-[9px] text-slate-400 font-medium mb-1.5">
                                                    <span>Work hours progress</span>
                                                    <span>{Math.min((hrs / 9) * 100, 100).toFixed(0)}% of 9h target</span>
                                                </div>
                                                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                    <div className={`h-full rounded-full transition-all ${hrs >= 9 ? 'bg-emerald-500' : hrs >= 6 ? 'bg-indigo-500' : 'bg-amber-400'}`}
                                                        style={{ width: `${Math.min((hrs / 9) * 100, 100)}%` }}/>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
