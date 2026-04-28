import React, { useState, useEffect, useCallback } from 'react';
import {
    Clock, CheckCircle2, XCircle, AlertCircle, TrendingUp,
    ChevronLeft, ChevronRight, Calendar, Timer, BarChart3, Activity,
    LogIn, LogOut, Loader2,
} from 'lucide-react';
import api from '../../../services/api';
import { useAuthStore } from '../../../store/authStore';

// ─── Types ──────────────────────────────────────────────────────────────────
interface AttendanceRecord {
    id: number;
    date: string;
    check_in_time: string | null;
    check_out_time: string | null;
    status: string;
    overtime_hours?: number;
}

interface Summary {
    present_days: number;
    half_days: number;
    total_entries: number;
    avg_hours: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt12 = (iso: string | null) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
};

const fmtHrs = (h: number | null | undefined) =>
    h ? `${Math.floor(h)}h ${Math.round((h % 1) * 60)}m` : '—';

const statusMeta: Record<string, { label: string; dot: string; bg: string; text: string }> = {
    present:  { label: 'Present',  dot: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700' },
    half_day: { label: 'Half Day', dot: 'bg-amber-400',   bg: 'bg-amber-50',   text: 'text-amber-700'   },
    absent:   { label: 'Absent',   dot: 'bg-rose-500',    bg: 'bg-rose-50',    text: 'text-rose-700'    },
    leave:    { label: 'Leave',    dot: 'bg-violet-400',  bg: 'bg-violet-50',  text: 'text-violet-700'  },
    holiday:  { label: 'Holiday',  dot: 'bg-sky-400',     bg: 'bg-sky-50',     text: 'text-sky-700'     },
};
const sm = (s: string) => statusMeta[s] ?? { label: s, dot: 'bg-slate-300', bg: 'bg-slate-50', text: 'text-slate-500' };

// ─── Calendar ────────────────────────────────────────────────────────────────
const CalendarGrid: React.FC<{ year: number; month: number; records: AttendanceRecord[] }> = ({ year, month, records }) => {
    const dayMap: Record<string, string> = {};
    records.forEach(r => {
        const key = (r.date || r.check_in_time || '').slice(0, 10);
        if (key) dayMap[key] = r.status;
    });

    const firstDay = new Date(year, month - 1, 1).getDay();
    const daysInMonth = new Date(year, month, 0).getDate();
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

    const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({length: daysInMonth}, (_, i) => i + 1)];

    return (
        <div>
            <div className="grid grid-cols-7 mb-2">
                {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
                    <div key={d} className="text-center text-[9px] font-bold text-slate-400 uppercase py-1">{d}</div>
                ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
                {cells.map((day, idx) => {
                    if (!day) return <div key={idx}/>;
                    const key = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                    const status = dayMap[key];
                    const isToday = key === todayStr;
                    const isFuture = key > todayStr;
                    const m = status ? sm(status) : null;
                    return (
                        <div key={idx} className={`relative h-8 rounded-lg flex items-center justify-center text-[10px] font-bold transition-all
                            ${isToday ? 'ring-2 ring-indigo-500 ring-offset-1' : ''}
                            ${m ? `${m.bg} ${m.text}` : isFuture ? 'text-slate-200' : 'text-slate-300 bg-slate-50'}`}>
                            {day}
                            {m && <div className={`absolute bottom-0.5 right-0.5 w-1.5 h-1.5 rounded-full ${m.dot}`}/>}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// ─── Stat Card ───────────────────────────────────────────────────────────────
const StatCard: React.FC<{ icon: React.ElementType; label: string; value: string | number; sub?: string; color: string }> = ({ icon: Icon, label, value, sub, color }) => (
    <div className="bg-white rounded-xl border border-slate-100 p-4 flex flex-col gap-2">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
            <Icon size={16} className="opacity-80"/>
        </div>
        <p className="text-[22px] font-black text-slate-800 leading-none">{value}</p>
        <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{label}</p>
            {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
        </div>
    </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
interface Props { profileUserId?: number; }

const AttendanceTab: React.FC<Props> = ({ profileUserId }) => {
    const { user } = useAuthStore();
    const now = new Date();
    const [month, setMonth]   = useState(now.getMonth() + 1);
    const [year, setYear]     = useState(now.getFullYear());
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [summary, setSummary] = useState<Summary | null>(null);
    const [loading, setLoading] = useState(true);
    const [view, setView]     = useState<'calendar' | 'log'>('calendar');

    const targetUserId = profileUserId ?? user?.id;

    const load = useCallback(async () => {
        if (!targetUserId) return;
        setLoading(true);
        try {
            const [histRes, sumRes] = await Promise.all([
                api.get('/attendance/history', { params: { userId: targetUserId, month, year } }),
                api.get(`/attendance/summary/${targetUserId}`,  { params: { month, year } }),
            ]);
            setRecords(histRes.data?.items || []);
            setSummary(sumRes.data || null);
        } catch { /* silent */ }
        finally { setLoading(false); }
    }, [targetUserId, month, year]);

    useEffect(() => { load(); }, [load]);

    const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y => y - 1); } else { setMonth(m => m - 1); } };
    const nextMonth = () => {
        const isCurrentMonth = month === now.getMonth() + 1 && year === now.getFullYear();
        if (isCurrentMonth) return;
        if (month === 12) { setMonth(1); setYear(y => y + 1); } else { setMonth(m => m + 1); }
    };

    const monthLabel = new Date(year, month - 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' });
    const presentDays = Number(summary?.present_days ?? 0);
    const halfDays    = Number(summary?.half_days ?? 0);
    const avgHours    = parseFloat(String(summary?.avg_hours ?? '0')) || 0;
    const workingDays = records.length;
    const totalHours  = records.reduce((acc, r) => {
        if (r.check_in_time && r.check_out_time) {
            return acc + (new Date(r.check_out_time).getTime() - new Date(r.check_in_time).getTime()) / 3600000;
        }
        return acc;
    }, 0);
    const lateCount = records.filter(r => {
        if (!r.check_in_time) return false;
        const t = new Date(r.check_in_time);
        return t.getHours() > 9 || (t.getHours() === 9 && t.getMinutes() > 15);
    }).length;

    const isCurrentMonth = month === now.getMonth() + 1 && year === now.getFullYear();

    return (
        <div className="space-y-5">
            {/* ── Header ── */}
            <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl p-5 text-white">
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Activity size={16} className="text-indigo-200"/>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-200">Attendance Overview</span>
                        </div>
                        <h2 className="text-[22px] font-black">{monthLabel}</h2>
                    </div>
                    {/* Month nav */}
                    <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-xl p-1">
                        <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/20 transition-all">
                            <ChevronLeft size={14}/>
                        </button>
                        <span className="text-[11px] font-bold px-2 min-w-[120px] text-center">{monthLabel}</span>
                        <button onClick={nextMonth} disabled={isCurrentMonth}
                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                            <ChevronRight size={14}/>
                        </button>
                    </div>
                </div>
                {/* Mini stats row */}
                <div className="grid grid-cols-4 gap-3 mt-5">
                    {[
                        { label: 'Days Present', value: presentDays, icon: '✓' },
                        { label: 'Half Days',    value: halfDays,    icon: '½' },
                        { label: 'Late Arrivals',value: lateCount,   icon: '⚡' },
                        { label: 'Total Hours',  value: `${totalHours.toFixed(1)}h`, icon: '⏱' },
                    ].map(s => (
                        <div key={s.label} className="bg-white/10 rounded-xl px-3 py-2.5 text-center">
                            <div className="text-[18px] font-black">{s.value}</div>
                            <div className="text-[9px] font-bold text-indigo-200 uppercase tracking-wide mt-0.5">{s.label}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Stat Cards ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard icon={CheckCircle2} label="Present Days"   value={presentDays}                   color="bg-emerald-50 text-emerald-600" sub="This month"/>
                <StatCard icon={AlertCircle}  label="Late Arrivals"  value={lateCount}                     color="bg-amber-50 text-amber-600"    sub="After 09:15"/>
                <StatCard icon={Timer}        label="Avg Daily Hours" value={fmtHrs(avgHours)}             color="bg-indigo-50 text-indigo-600"  sub="Logged hours"/>
                <StatCard icon={TrendingUp}   label="Total Hours"    value={`${totalHours.toFixed(1)}h`}   color="bg-violet-50 text-violet-600" sub="Month total"/>
            </div>

            {/* ── Calendar / Log Toggle ── */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-2">
                        {view === 'calendar' ? <Calendar size={14} className="text-indigo-500"/> : <BarChart3 size={14} className="text-indigo-500"/>}
                        <h3 className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">
                            {view === 'calendar' ? 'Monthly Calendar' : 'Attendance Log'}
                        </h3>
                        <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[10px] font-bold">{records.length} records</span>
                    </div>
                    <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
                        <button onClick={() => setView('calendar')} className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all ${view==='calendar'?'bg-white text-indigo-600 shadow-sm':'text-slate-400 hover:text-slate-600'}`}>
                            <Calendar size={11} className="inline mr-1"/>Calendar
                        </button>
                        <button onClick={() => setView('log')} className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all ${view==='log'?'bg-white text-indigo-600 shadow-sm':'text-slate-400 hover:text-slate-600'}`}>
                            <BarChart3 size={11} className="inline mr-1"/>Log
                        </button>
                    </div>
                </div>

                <div className="p-5">
                    {loading ? (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 size={24} className="animate-spin text-indigo-400"/>
                        </div>
                    ) : view === 'calendar' ? (
                        <>
                            <CalendarGrid year={year} month={month} records={records}/>
                            {/* Legend */}
                            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-100 flex-wrap">
                                {Object.entries(statusMeta).map(([, m]) => (
                                    <span key={m.label} className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500">
                                        <span className={`w-2 h-2 rounded-full ${m.dot}`}/>
                                        {m.label}
                                    </span>
                                ))}
                            </div>
                        </>
                    ) : records.length > 0 ? (
                        <div className="space-y-2">
                            {/* Table header */}
                            <div className="grid grid-cols-5 gap-2 px-3 py-2 text-[9px] font-bold text-slate-400 uppercase tracking-wide">
                                <span>Date</span><span>Status</span><span>Check In</span><span>Check Out</span><span>Hours</span>
                            </div>
                            {records.map((r, i) => {
                                const m = sm(r.status);
                                const inT  = r.check_in_time ? new Date(r.check_in_time) : null;
                                const outT = r.check_out_time ? new Date(r.check_out_time) : null;
                                const hrs  = inT && outT ? (outT.getTime() - inT.getTime()) / 3600000 : null;
                                const late = inT && (inT.getHours() > 9 || (inT.getHours() === 9 && inT.getMinutes() > 15));
                                return (
                                    <div key={i} className="grid grid-cols-5 gap-2 px-3 py-2.5 bg-slate-50 hover:bg-indigo-50/50 rounded-xl border border-slate-100 transition-colors items-center">
                                        <span className="text-[12px] font-semibold text-slate-700">
                                            {new Date(r.date || r.check_in_time || '').toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                        </span>
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold ${m.bg} ${m.text} w-fit`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`}/>{m.label}
                                        </span>
                                        <span className={`text-[12px] font-semibold ${late ? 'text-amber-500' : 'text-slate-600'} flex items-center gap-1`}>
                                            <LogIn size={10} className="text-emerald-400"/>
                                            {fmt12(r.check_in_time)}
                                            {late && <span className="text-[9px] text-amber-400 font-bold">Late</span>}
                                        </span>
                                        <span className="text-[12px] font-semibold text-slate-600 flex items-center gap-1">
                                            <LogOut size={10} className="text-rose-400"/>
                                            {fmt12(r.check_out_time)}
                                        </span>
                                        <span className={`text-[12px] font-bold ${hrs && hrs >= 9 ? 'text-emerald-600' : hrs ? 'text-amber-500' : 'text-slate-300'}`}>
                                            {hrs ? `${hrs.toFixed(1)}h` : '—'}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center py-14 text-slate-300">
                            <Clock size={36} className="mb-3"/>
                            <p className="text-[13px] font-semibold text-slate-400">No attendance records for {monthLabel}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Hours bar chart ── */}
            {!loading && records.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <BarChart3 size={14} className="text-indigo-500"/>
                        <h3 className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">Daily Hours Distribution</h3>
                        <span className="ml-auto text-[10px] text-slate-400">9h = full day threshold</span>
                    </div>
                    <div className="flex items-end gap-1.5 h-28">
                        {records.slice(0, 31).reverse().map((r, i) => {
                            const inT  = r.check_in_time  ? new Date(r.check_in_time)  : null;
                            const outT = r.check_out_time ? new Date(r.check_out_time) : null;
                            const hrs  = inT && outT ? (outT.getTime() - inT.getTime()) / 3600000 : 0;
                            const pct  = Math.min((hrs / 12) * 100, 100);
                            const color = hrs >= 9 ? 'bg-emerald-400' : hrs > 4 ? 'bg-amber-400' : hrs > 0 ? 'bg-rose-400' : 'bg-slate-100';
                            const day  = new Date(r.date || r.check_in_time || '').getDate();
                            return (
                                <div key={i} className="flex-1 flex flex-col items-center gap-1 group" title={`${day}: ${hrs.toFixed(1)}h`}>
                                    <div className="w-full flex flex-col justify-end h-24 relative">
                                        {/* 9h reference line — show only once */}
                                        {i === 0 && <div className="absolute w-full border-t border-dashed border-indigo-200" style={{bottom:'75%'}}/>}
                                        <div className={`w-full rounded-t-md transition-all ${color} group-hover:opacity-80`} style={{height:`${pct}%`, minHeight: r.check_in_time ? '4px' : '0'}}/>
                                    </div>
                                    <span className="text-[8px] text-slate-300 font-semibold">{day}</span>
                                </div>
                            );
                        })}
                    </div>
                    <div className="flex items-center gap-4 mt-3 flex-wrap">
                        {[{c:'bg-emerald-400',l:'≥ 9h (Full)'},{c:'bg-amber-400',l:'4–9h (Partial)'},{c:'bg-rose-400',l:'< 4h (Short)'}].map(x=>(
                            <span key={x.l} className="flex items-center gap-1.5 text-[10px] text-slate-500"><span className={`w-2 h-2 rounded-sm ${x.c}`}/>{x.l}</span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AttendanceTab;
