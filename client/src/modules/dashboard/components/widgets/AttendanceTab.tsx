import React, { useState, useEffect, useCallback } from 'react';
import {
    BarChart2, CalendarDays, ChevronLeft, ChevronRight as ChevronRightIcon,
    CheckCircle2, XCircle, Minus, Loader2
} from 'lucide-react';
import api from '../../../../services/api';

interface AttendanceTabProps {
    attendanceSummary: any;
    userId?: number;
}

/* ── Timeline axis constants ─────────────────────────── */
const AXIS_START = 7;
const AXIS_END   = 21;
const SPAN_H     = AXIS_END - AXIS_START;
const AXIS_TICKS = [7, 9, 11, 13, 15, 17, 19, 21];

const toAxisPct = (ts?: string) => {
    if (!ts) return null;
    const d = new Date(ts);
    const h = d.getHours() + d.getMinutes() / 60;
    return Math.min(Math.max(((h - AXIS_START) / SPAN_H) * 100, 0), 100);
};

const durationH = (inTs?: string, outTs?: string) => {
    if (!inTs || !outTs) return null;
    const diff = (new Date(outTs).getTime() - new Date(inTs).getTime()) / 3600000;
    return diff > 0 ? diff : null;
};

const fmt12 = (ts?: string) =>
    ts ? new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : null;

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/* ── Attendance Tab Component ────────────────────────── */
const AttendanceTab: React.FC<AttendanceTabProps> = ({ attendanceSummary, userId }) => {
    const [view,       setView]       = useState<'summary' | 'week'>('summary');
    const [weekOffset, setWeekOffset] = useState(0);
    const [weekData,   setWeekData]   = useState<any[]>([]);
    const [loading,    setLoading]    = useState(false);

    const loadWeek = useCallback(async () => {
        if (!userId) return;
        setLoading(true);
        try {
            const now = new Date();
            const day = now.getDay();
            const mon = new Date(now);
            mon.setDate(now.getDate() - (day === 0 ? 6 : day - 1) + weekOffset * 7);
            mon.setHours(0, 0, 0, 0);
            const sun = new Date(mon); sun.setDate(mon.getDate() + 6); sun.setHours(23, 59, 59, 999);
            const f = (d: Date) => d.toISOString().split('T')[0];
            const { data } = await api.get('/attendance/history', {
                params: { userId, startDate: f(mon), endDate: f(sun), limit: 50 }
            });
            setWeekData(data.items || data.records || data || []);
        } catch { setWeekData([]); }
        finally { setLoading(false); }
    }, [userId, weekOffset]);

    useEffect(() => { if (view === 'week') loadWeek(); }, [view, weekOffset]);

    return (
        <div className="space-y-4">
            {/* View toggle + week nav */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
                    {(['summary', 'week'] as const).map(v => (
                        <button key={v} onClick={() => setView(v)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all
                                ${view === v ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                            {v === 'summary' ? <BarChart2 size={12}/> : <CalendarDays size={12}/>}
                            {v === 'summary' ? 'Summary' : 'Week'}
                        </button>
                    ))}
                </div>
                {view === 'week' && (
                    <div className="flex items-center gap-2">
                        <button onClick={() => setWeekOffset(w => w - 1)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-600 transition-all">
                            <ChevronLeft size={13}/>
                        </button>
                        <span className="text-[11px] font-bold text-slate-600 min-w-[80px] text-center">
                            {weekOffset === 0 ? 'This Week' : weekOffset === -1 ? 'Last Week' : `${Math.abs(weekOffset)}w ago`}
                        </span>
                        <button onClick={() => setWeekOffset(w => Math.min(w + 1, 0))} disabled={weekOffset === 0}
                            className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-600 transition-all disabled:opacity-30">
                            <ChevronRightIcon size={13}/>
                        </button>
                    </div>
                )}
            </div>

            {/* Summary view */}
            {view === 'summary' && <SummaryView data={attendanceSummary}/>}

            {/* Week timeline view */}
            {view === 'week' && <WeekTimeline data={weekData} loading={loading} weekOffset={weekOffset}/>}
        </div>
    );
};

/* ── Summary sub-component ───────────────────────────── */
const SummaryView: React.FC<{ data: any }> = ({ data }) => (
    <div className="space-y-3">
        <div className="grid grid-cols-3 gap-4">
            {[
                { l: 'Present Days',  v: data?.present_days ?? 0,  c: '#10b981', bg: '#f0fdf4', border: '#bbf7d0' },
                { l: 'Avg Hours/Day', v: `${parseFloat(data?.avg_hours || '0').toFixed(1)}h`, c: '#6366f1', bg: '#eef2ff', border: '#c7d2fe' },
                { l: 'Late Arrivals', v: data?.late_arrivals ?? 0, c: '#ef4444', bg: '#fff1f2', border: '#fecaca' },
            ].map(s => (
                <div key={s.l} className="rounded-2xl p-5 text-center border" style={{ backgroundColor: s.bg, borderColor: s.border }}>
                    <p className="text-[28px] font-black" style={{ color: s.c }}>{s.v}</p>
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mt-1">{s.l}</p>
                </div>
            ))}
        </div>
        <p className="text-[11px] text-slate-400 text-center">Showing data for the current calendar month</p>
    </div>
);

/* ── Week Timeline sub-component ─────────────────────── */
const WeekTimeline: React.FC<{ data: any[]; loading: boolean; weekOffset: number }> = ({ data, loading, weekOffset }) => {
    const now = new Date();
    const day = now.getDay();
    const mon = new Date(now);
    mon.setDate(now.getDate() - (day === 0 ? 6 : day - 1) + weekOffset * 7);
    const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(mon); d.setDate(mon.getDate() + i); return d; });
    const todayStr = now.toISOString().split('T')[0];

    const byDate: Record<string, any[]> = {};
    (data || []).forEach((r: any) => {
        const dt = (r.date || r.check_in_time || r.checkIn || '').split('T')[0];
        if (!byDate[dt]) byDate[dt] = [];
        byDate[dt].push(r);
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 size={18} className="animate-spin text-indigo-400 mr-2"/>
                <p className="text-[12px] text-slate-400">Loading week…</p>
            </div>
        );
    }

    return (
        <div className="space-y-1">
            {/* Time axis header */}
            <div className="flex items-center gap-2 mb-3">
                <div className="w-[68px] flex-shrink-0"/>
                <div className="flex-1 relative h-4">
                    {AXIS_TICKS.map(h => (
                        <span key={h} className="absolute -translate-x-1/2 text-[9px] font-bold text-slate-300 uppercase"
                            style={{ left: `${((h - AXIS_START) / SPAN_H) * 100}%` }}>
                            {h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h - 12}pm`}
                        </span>
                    ))}
                </div>
                <div className="w-[52px] flex-shrink-0"/>
            </div>

            {days.map((d, i) => {
                const ds = d.toISOString().split('T')[0];
                const isFuture = ds > todayStr, isToday = ds === todayStr, isWeekend = i >= 5;
                const recs = byDate[ds] || [], present = recs.length > 0;
                const firstIn = recs[0]?.check_in_time || recs[0]?.checkIn;
                const lastOut = recs[recs.length - 1]?.check_out_time || recs[recs.length - 1]?.checkOut;
                const startPct = toAxisPct(firstIn), endPct = toAxisPct(lastOut);
                const hrs = durationH(firstIn, lastOut);

                return (
                    <div key={ds} className={`flex items-center gap-2 rounded-xl px-3 py-2.5 transition-all
                        ${isToday ? 'bg-indigo-50 border border-indigo-100' : 'hover:bg-slate-50'}`}>
                        <div className="w-[68px] flex-shrink-0">
                            <p className={`text-[9px] font-black uppercase tracking-wider ${isToday ? 'text-indigo-500' : isWeekend ? 'text-slate-300' : 'text-slate-400'}`}>{DAY_LABELS[i]}</p>
                            <p className={`text-[14px] font-black leading-none ${isToday ? 'text-indigo-700' : isWeekend ? 'text-slate-300' : 'text-slate-600'}`}>{d.getDate()}</p>
                        </div>
                        <div className="flex-1 relative h-6 flex items-center">
                            <div className="absolute inset-y-[10px] left-0 right-0 rounded-full bg-slate-100"/>
                            {AXIS_TICKS.map(h => <div key={h} className="absolute top-0 bottom-0 w-px bg-white opacity-80" style={{ left: `${((h - AXIS_START) / SPAN_H) * 100}%` }}/>)}
                            {present && startPct !== null && endPct !== null && (
                                <div className={`absolute h-3 rounded-full top-1/2 -translate-y-1/2 transition-all duration-700 ${isToday ? 'bg-indigo-500 shadow-sm shadow-indigo-200' : 'bg-emerald-500 shadow-sm shadow-emerald-100'}`}
                                    style={{ left: `${startPct}%`, width: `${Math.max(endPct - startPct, 1.5)}%` }}/>
                            )}
                            {present && startPct !== null && !lastOut && (
                                <div className="absolute h-3 rounded-full top-1/2 -translate-y-1/2 bg-emerald-400 opacity-50" style={{ left: `${startPct}%`, right: 0 }}/>
                            )}
                            {present && startPct !== null && <div className={`absolute w-3 h-3 rounded-full border-2 border-white top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 shadow-sm ${isToday ? 'bg-indigo-600' : 'bg-emerald-600'}`} style={{ left: `${startPct}%` }}/>}
                            {present && endPct !== null && lastOut && <div className="absolute w-3 h-3 rounded-full border-2 border-white bg-slate-500 top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 shadow-sm" style={{ left: `${endPct}%` }}/>}
                            {!present && <div className="absolute inset-0 flex items-center justify-center"><span className={`text-[9px] font-bold uppercase tracking-wider ${isFuture ? 'text-slate-200' : isWeekend ? 'text-slate-300' : 'text-rose-300'}`}>{isFuture ? '—' : isWeekend ? 'Off' : 'Absent'}</span></div>}
                        </div>
                        <div className="w-[52px] flex-shrink-0 text-right">
                            {present && <>
                                <p className="text-[9px] font-bold text-emerald-600 leading-tight">{fmt12(firstIn)}</p>
                                {lastOut ? <p className="text-[9px] text-slate-400 leading-tight">{fmt12(lastOut)}</p> : <p className="text-[9px] font-bold text-indigo-400 leading-tight animate-pulse">Live</p>}
                                {hrs !== null && <p className="text-[8px] font-black text-slate-500 mt-0.5">{hrs.toFixed(1)}h</p>}
                            </>}
                        </div>
                    </div>
                );
            })}

            {/* Legend */}
            <div className="flex items-center gap-4 pt-3 border-t border-slate-100 mt-2">
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-white shadow-sm"/><span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Check In</span></div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-slate-500 border-2 border-white shadow-sm"/><span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Check Out</span></div>
                <div className="flex items-center gap-1.5"><div className="w-8 h-2 rounded-full bg-emerald-500"/><span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Duration</span></div>
            </div>
        </div>
    );
};

export default AttendanceTab;
