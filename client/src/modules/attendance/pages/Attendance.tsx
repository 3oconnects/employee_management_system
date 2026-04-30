import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { RefreshCw, MapPin, History, Send, Loader2, BarChart3, Info, AlertCircle, Tally3, Clock, ShieldCheck } from 'lucide-react';
import api from '../../../services/api';
import { useAuthStore } from '../../../store/authStore';
import { AttendanceHero }    from '../components/AttendanceHero';
import { AttendanceSummary } from '../components/AttendanceSummary';
import { AttendanceCalendar } from '../components/AttendanceCalendar';
import { AttendanceHistory }  from '../components/AttendanceHistory';

/* ─── Helpers ─────────────────────────────────────────────── */
const fmtTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
const calcHours = (inT: string, outT: string) =>
    ((new Date(outT).getTime() - new Date(inT).getTime()) / 3600000).toFixed(2);

/* ─── Weekly bar chart ───────────────────────────────────── */
const WeeklyChart: React.FC<{ days: Record<string, number>, history: any[] }> = ({ days, history }) => {
    const [mode, setMode] = useState<'bars' | 'timeline'>('bars');
    
    // Fixed Sunday to Saturday week
    const now = new Date();
    const startOfCurrentWeek = new Date(now);
    startOfCurrentWeek.setDate(now.getDate() - now.getDay()); // Move to Sunday
    
    const week = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(startOfCurrentWeek);
        d.setDate(d.getDate() + i);
        const key = d.toISOString().slice(0, 10);
        const lbl = d.toLocaleDateString('en-IN', { weekday: 'short' });
        const isToday = key === now.toISOString().slice(0, 10);
        return { key, lbl, hrs: days[key] ?? 0, isToday, date: d };
    });
    
    const max = Math.max(...week.map(w => w.hrs), 9);

    return (
        <div className="card-premium border-primary-light/20 p-7 shadow-premium">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
                    <BarChart3 size={16} className="text-white"/>
                </div>
                <div>
                    <h3 className="text-[14px] font-black text-slate-800 tracking-tight">Weekly Performance</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                        {week[0].date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – {week[6].date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </p>
                </div>
                <div className="ml-auto flex items-center gap-2">
                    <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/50">
                        <button onClick={() => setMode('bars')} 
                            className={`p-1.5 rounded-lg transition-all ${mode === 'bars' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>
                            <BarChart3 size={14}/>
                        </button>
                        <button onClick={() => setMode('timeline')} 
                            className={`p-1.5 rounded-lg transition-all ${mode === 'timeline' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>
                            <Tally3 size={14} className="rotate-90"/>
                        </button>
                    </div>
                    <div className="text-[10px] text-slate-400 font-black px-3 border-l border-slate-200 uppercase tracking-widest">Target: 9h</div>
                </div>
            </div>

            {mode === 'bars' ? (
                <div className="flex items-end gap-3 h-32 px-2">
                    {week.map(w => {
                        const pct = (w.hrs / max) * 100;
                        const color = w.hrs >= 9 ? 'bg-indigo-500' : 'bg-slate-200'; // Only blue and gray
                        const isFuture = w.date > now;
                        return (
                            <div key={w.key} className={`flex-1 flex flex-col items-center gap-2 group ${isFuture ? 'opacity-30' : ''}`}>
                                <span className={`text-[9px] font-black tabular-nums transition-all ${w.hrs >= 9 ? 'text-indigo-600' : 'text-slate-400'}`}>
                                    {w.hrs > 0 ? `${w.hrs.toFixed(1)}h` : ''}
                                </span>
                                <div className="w-full flex flex-col justify-end h-24 relative">
                                    <div className="absolute w-full border-t border-dashed border-slate-100" style={{ bottom: `${(9 / max) * 100}%` }}/>
                                    <div className={`w-full rounded-t-lg transition-all duration-700 ${color} ${w.isToday ? 'ring-1 ring-offset-1 ring-indigo-400' : ''}`}
                                        style={{ height: `${pct}%`, minHeight: w.hrs > 0 ? '4px' : '0' }}/>
                                </div>
                                <span className={`text-[9px] font-black uppercase tracking-widest ${w.isToday ? 'text-indigo-600' : 'text-slate-400'}`}>{w.lbl}</span>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="space-y-6 py-4 px-2">
                    {week.map(w => {
                        const daySessions = history.filter(h => (h.check_in_time || h.check_in || '').slice(0, 10) === w.key);
                        const SHIFT_START = 9 * 60, SHIFT_SPAN = 9 * 60; 
                        const isFuture = w.date > now;

                        return (
                            <div key={w.key} className={`flex items-center gap-6 ${isFuture ? 'opacity-25' : ''}`}>
                                <div className={`w-10 text-[10px] font-black uppercase tracking-widest ${w.isToday ? 'text-indigo-600' : 'text-slate-400'}`}>{w.lbl}</div>
                                
                                <div className="flex-1 relative h-[3px] flex items-center">
                                    {/* Minimalist Gray Track */}
                                    <div className="absolute inset-0 bg-slate-100 rounded-full"/>

                                    {/* Minimalist Blue Sessions */}
                                    {daySessions.map((s, idx) => {
                                        const inT  = s.check_in_time || s.check_in;
                                        const outT = s.check_out_time || s.check_out;
                                        if (!inT) return null;

                                        const dIn = new Date(inT);
                                        const startMin = dIn.getHours() * 60 + dIn.getMinutes();
                                        const left = Math.max(0, ((startMin - SHIFT_START) / SHIFT_SPAN) * 100);
                                        
                                        let width = 0;
                                        if (outT) {
                                            const dOut = new Date(outT);
                                            const endMin = dOut.getHours() * 60 + dOut.getMinutes();
                                            width = Math.min(((endMin - startMin) / SHIFT_SPAN) * 100, 100 - left);
                                        } else if (w.isToday) {
                                            const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
                                            width = Math.min(((nowMin - startMin) / SHIFT_SPAN) * 100, 100 - left);
                                        }

                                        if (width <= 0) return null;

                                        return (
                                            <div key={idx} className="absolute h-full bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.3)] transition-all"
                                                style={{ left: `${left}%`, width: `${Math.max(width, 0.5)}%` }}/>
                                        );
                                    })}
                                </div>

                                <div className="w-12 text-right">
                                    <span className={`text-[10px] font-black tabular-nums ${w.hrs >= 9 ? 'text-indigo-600' : 'text-slate-400'}`}>
                                        {w.hrs > 0 ? `${w.hrs.toFixed(1)}h` : ''}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                    
                    <div className="flex justify-between px-16 pt-2 opacity-40">
                        {['09:00 AM', '12:00 PM', '03:00 PM', '06:00 PM'].map(t => (
                            <span key={t} className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">{t}</span>
                        ))}
                    </div>
                </div>
            )}
            <div className="flex items-center gap-5 mt-6 pt-4 border-t border-slate-100">
                {[{ c: 'bg-indigo-500', l: 'Working' }, { c: 'bg-slate-200', l: 'Break / Expected' }].map(x => (
                    <span key={x.l} className="flex items-center gap-1.5 text-[9px] text-slate-500 font-black uppercase tracking-widest">
                        <span className={`w-2 h-0.5 rounded-full ${x.c}`}/>{x.l}
                    </span>
                ))}
            </div>
        </div>
    );
};

/* ─── Regularization Panel ───────────────────────────────── */
const RegularizePanel: React.FC<{ userId: any }> = ({ userId }) => {
    const [date, setDate] = useState('');
    const [inT, setInT] = useState('');
    const [outT, setOutT] = useState('');
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post('/attendance/regularize', { userId, date, check_in_time: inT, check_out_time: outT, reason });
            alert('Regularization request submitted!');
            setDate(''); setInT(''); setOutT(''); setReason('');
        } catch (err: any) {
            alert(err.response?.data?.error || 'Submission failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="rounded-[32px] bg-white border border-slate-100 flex flex-col gap-0 shadow-2xl shadow-slate-200/50 overflow-hidden relative h-full group transition-all duration-500 hover:shadow-indigo-500/10">
            <div className="p-8 pb-6 border-b border-slate-50 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-3xl -mr-16 -mt-16 opacity-50 group-hover:bg-indigo-100 transition-colors" />
                <div className="relative">
                    <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200 mb-4">
                        <Clock size={18} />
                    </div>
                    <h3 className="text-[18px] font-black text-slate-800 tracking-tight">Request Regularization</h3>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">Manual Attendance Correction</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="p-8 flex-1 flex flex-col gap-5">
                <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Affected Date</label>
                    <input required type="date" value={date} onChange={e => setDate(e.target.value)} 
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-[12px] text-slate-700 outline-none focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/5 transition-all"/>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Check In</label>
                        <input required type="time" value={inT} onChange={e => setInT(e.target.value)} 
                            className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-[12px] text-slate-700 outline-none focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/5 transition-all"/>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Check Out</label>
                        <input type="time" value={outT} onChange={e => setOutT(e.target.value)} 
                            className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-[12px] text-slate-700 outline-none focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/5 transition-all"/>
                    </div>
                </div>

                <div className="space-y-1.5 flex-1 min-h-[100px]">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Reason for Adjustment</label>
                    <textarea required value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Forgot to check in, System error..."
                        className="w-full h-full min-h-[100px] bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-[12px] text-slate-700 outline-none focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/5 transition-all resize-none"/>
                </div>

                <button disabled={loading} type="submit" 
                    className="w-full bg-slate-900 text-white rounded-2xl py-4 text-[13px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-xl shadow-slate-200 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                    Submit Request
                </button>
            </form>

            <div className="px-8 py-4 bg-slate-50/50 border-t border-slate-50">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center">Requests are subject to manager approval</p>
            </div>
        </div>
    );
};

/* ─── Page ───────────────────────────────────────────────── */
const Attendance: React.FC = () => {
    const { user } = useAuthStore();
    const params   = new URLSearchParams(window.location.search);
    const userId   = params.get('userId') || user?.id;

    const now = new Date();
    const [loading,       setLoading]       = useState(true);
    const [refreshing,    setRefreshing]    = useState(false);
    const [attendance,    setAttendance]    = useState<any>(null);
    const [history,       setHistory]       = useState<any[]>([]);
    const [summary,       setSummary]       = useState<any>(null);
    const [weeklyDays,    setWeeklyDays]    = useState<Record<string, number>>({});
    const [elapsed,       setElapsed]       = useState(0);
    const [actionLoading, setActionLoading] = useState(false);
    const [viewMonth,     setViewMonth]     = useState(now.getMonth() + 1);
    const [viewYear,      setViewYear]      = useState(now.getFullYear());

    const fetchToday = async () => {
        const fetchTime = Date.now();
        const { data } = await api.get('/attendance/today', { params: { userId } });
        // total_hours_today from API = closedSessions + currentElapsed(at fetch time)
        const totalHoursMs  = parseFloat(data.total_hours_today || '0') * 3600000;
        const checkInMs     = data.checkIn ? new Date(data.checkIn).getTime() : null;
        // Strip out the current-session elapsed so we know how many ms are from prior sessions
        const currentElapsedAtFetch = (data.status === 'IN' && checkInMs) ? (fetchTime - checkInMs) : 0;
        const closedHoursMs = Math.max(0, totalHoursMs - currentElapsedAtFetch);
        setAttendance({
            status:       data.status,
            checkInTime:  data.checkIn || null,
            sessions:     data.sessions_today ?? 0,
            totalHours:   data.total_hours_today ?? '0.00',
            closedHoursMs,   // accumulated ms from already-completed sessions today
        });
        if (data.status !== 'IN') setElapsed(0);
    };

    const fetchHistory = useCallback(async () => {
        const { data } = await api.get('/attendance/history', { params: { userId, month: viewMonth, year: viewYear } });
        setHistory(data.items || []);
    }, [userId, viewMonth, viewYear]);

    const fetchSummary = async () => {
        const { data } = await api.get(`/attendance/summary/${userId}`, { params: { month: now.getMonth() + 1, year: now.getFullYear() } });
        setSummary(data);
    };

    const fetchWeekly = async () => {
        const start = new Date(); start.setDate(start.getDate() - 6);
        const { data } = await api.get('/attendance/weekly-hours', {
            params: { userId, weekStart: start.toISOString().slice(0, 10), weekEnd: now.toISOString().slice(0, 10) },
        });
        setWeeklyDays(data.days || {});
    };

    const loadAll = async (refresh = false) => {
        if (!userId) { setLoading(false); return; }
        refresh ? setRefreshing(true) : setLoading(true);
        try { await Promise.all([fetchToday(), fetchHistory(), fetchSummary(), fetchWeekly()]); }
        catch (e) { console.error(e); }
        finally { refresh ? setRefreshing(false) : setLoading(false); }
    };

    useEffect(() => { loadAll(); }, [userId]);
    useEffect(() => { fetchHistory(); }, [fetchHistory]);

    useEffect(() => {
        if (attendance?.status !== 'IN' || !attendance?.checkInTime) { setElapsed(0); return; }
        const base = new Date(attendance.checkInTime).getTime();
        const tick = () => setElapsed(Date.now() - base);
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [attendance]);

    const liveWeeklyDays = useMemo(() => {
        const todayKey = new Date().toISOString().slice(0, 10);
        const copy = { ...weeklyDays };
        const liveHrs = parseFloat(attendance?.totalHours || '0');
        if (liveHrs > 0) copy[todayKey] = Math.max(copy[todayKey] || 0, liveHrs);
        return copy;
    }, [weeklyDays, attendance?.totalHours]);

    const handleAttendance = async () => {
        if (!userId || actionLoading) return;
        setActionLoading(true);
        try {
            const ep = attendance?.status === 'IN' ? '/attendance/check-out' : '/attendance/check-in';
            await api.post(ep, { userId });
            await loadAll(true);
        } catch (err: any) {
            alert(err.response?.data?.error || 'Action failed');
        } finally { setActionLoading(false); }
    };

    const calDays = (() => {
        const total    = new Date(viewYear, viewMonth, 0).getDate();
        const todayD   = new Date();
        const isViewingCurrentMonth = viewYear === todayD.getFullYear() && viewMonth === todayD.getMonth() + 1;
        const todayDay = isViewingCurrentMonth ? todayD.getDate() : -1;
        const records: Record<number, string> = {};
        
        // Sort history by time ASC so later sessions overwrite earlier ones in the map
        const sortedHistory = [...history].sort((a, b) => 
            new Date(a.check_in_time || a.check_in || 0).getTime() - 
            new Date(b.check_in_time || b.check_in || 0).getTime()
        );

        sortedHistory.forEach(r => {
            const d = new Date(r.check_in_time || r.check_in || r.date || '');
            if (!isNaN(d.getTime())) {
                const day = d.getDate();
                // Prioritize 'present' or 'half_day' over 'absent' if multiple sessions exist for the same day
                if (!records[day] || r.status === 'present' || r.status === 'half_day') {
                    records[day] = r.status;
                }
            }
        });
        return Array.from({ length: total }, (_, i) => {
            const d  = i + 1;
            const wd = new Date(viewYear, viewMonth - 1, d).getDay();
            if (wd === 0 || wd === 6)            return { day: d, status: 'weekend' };
            if (records[d])                       return { day: d, status: records[d] };
            if (d > todayDay && todayDay !== -1)  return { day: d, status: 'future' };
            if (d === todayDay)                   return { day: d, status: attendance?.status === 'IN' ? 'present' : 'today_empty' };
            return { day: d, status: 'no_data' };
        });
    })();

    if (loading) return (
        <div className="p-8 space-y-8">
            <div className="h-56 bg-indigo-50 rounded-3xl animate-pulse"/>
            <div className="grid grid-cols-6 gap-4">
                {[1,2,3,4,5,6].map(i => <div key={i} className="h-24 bg-slate-50 rounded-2xl animate-pulse"/>)}
            </div>
        </div>
    );

    const monthLabel = new Date(viewYear, viewMonth - 1).toLocaleString('default', { month: 'long', year: 'numeric' });

    return (
        <div className="p-8 space-y-7 max-w-[1600px] mx-auto">

            {/* ── Page Header ── */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/25">
                        <History size={22} className="text-white"/>
                    </div>
                    <div>
                        <h2 className="text-[20px] font-black text-slate-900 tracking-tight">Attendance Ledger</h2>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-0.5">Operational Lifecycle Verification</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={() => loadAll(true)}
                        className={`p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-indigo-600 hover:border-indigo-300 transition-all shadow-sm ${refreshing ? 'animate-spin' : ''}`}>
                        <RefreshCw size={18}/>
                    </button>
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-xl">
                        <MapPin size={14}/>
                        <span className="text-[10px] font-black uppercase tracking-widest">HQ Hub</span>
                    </div>
                </div>
            </div>

            {/* ── Hero ── */}
            <AttendanceHero
                isIn={attendance?.status === 'IN'}
                isDone={attendance?.status === 'COMPLETED'}
                elapsed={elapsed}
                closedHoursMs={attendance?.closedHoursMs ?? 0}
                actionLoading={actionLoading}
                onAction={handleAttendance}
                checkInTime={attendance?.checkInTime}
                totalHours={attendance?.totalHours}
                sessions={attendance?.sessions}
                todayHistory={history.filter(h => (h.check_in_time || h.check_in || '').slice(0, 10) === new Date().toISOString().slice(0, 10))}
            />

            {/* ── Summary Cards ── */}
            {summary && <AttendanceSummary summary={summary}/>}

            {/* ── Weekly Chart ── */}
            <WeeklyChart days={liveWeeklyDays} history={history}/>

            {/* ── Calendar + Regularization ── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-7">
                <div className="lg:col-span-8">
                    <AttendanceCalendar
                        monthLabel={monthLabel}
                        viewYear={viewYear}
                        viewMonth={viewMonth}
                        calDays={calDays}
                        onPrev={() => {
                            const d = new Date(viewYear, viewMonth - 2, 1);
                            setViewMonth(d.getMonth() + 1); setViewYear(d.getFullYear());
                        }}
                        onNext={() => {
                            const d = new Date(viewYear, viewMonth, 1);
                            setViewMonth(d.getMonth() + 1); setViewYear(d.getFullYear());
                        }}
                    />
                </div>
                <div className="lg:col-span-4">
                    <RegularizePanel userId={userId}/>
                </div>
            </div>

            {/* ── History ── */}
            <AttendanceHistory history={history} fmtDate={fmtDate} fmtTime={fmtTime} calcHours={calcHours}/>
        </div>
    );
};

export default Attendance;