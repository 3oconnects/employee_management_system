import React, { useState, useEffect } from 'react';
import {
    LogIn,
    LogOut as LogOutIcon,
    Clock,
    CheckCircle,
    XCircle,
    BarChart2,
    CalendarDays,
    Info,
    RefreshCw,
    UserCircle,
    MapPin,
    Zap,
    Download,
    History as HistoryIcon,
    ChevronLeft,
    ChevronRight,
    Search,
    Filter
} from 'lucide-react';
import api from '../../../services/api';
import { useAuthStore } from '../../../store/authStore';

/* ─── Helpers ────────────────────────────────────────────── */
function fmtTime(iso: string) {
    return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}
function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
function calcHours(inTime: string, outTime: string) {
    const diff = new Date(outTime).getTime() - new Date(inTime).getTime();
    return (diff / 3600000).toFixed(2);
}

const STATUS_STYLES: Record<string, string> = {
    present:  'bg-emerald-50 text-emerald-600 border-emerald-100',
    half_day: 'bg-amber-50 text-amber-600 border-amber-100',
    on_duty:  'bg-blue-50 text-blue-600 border-blue-100',
    absent:   'bg-rose-50 text-rose-600 border-rose-100',
    weekend:  'bg-gray-50 text-gray-400 border-gray-100',
};

/* ─── Page ───────────────────────────────────────────────── */
const Attendance: React.FC = () => {
    const { user } = useAuthStore();
    const params = new URLSearchParams(window.location.search);
    const userId = params.get('userId') || user?.id;

    const [loading,        setLoading]        = useState(true);
    const [refreshing,     setRefreshing]      = useState(false);
    const [attendance,     setAttendance]      = useState<any>(null);
    const [history,        setHistory]         = useState<any[]>([]);
    const [summary,        setSummary]         = useState<any>(null);
    const [elapsed,        setElapsed]         = useState(0);
    const [regularizeTxt,  setRegularizeTxt]   = useState('');
    const [submitting,     setSubmitting]       = useState(false);
    const [actionLoading,  setActionLoading]    = useState(false);

    const now   = new Date();
    const month = now.getMonth() + 1;
    const year  = now.getFullYear();

    const fetchToday = async () => {
        const { data } = await api.get('/attendance/today', { params: { userId } });
        setAttendance({ status: data.status, checkInTime: data.checkIn || null, sessions: data.sessions_today ?? 0, totalHours: data.total_hours_today ?? '0.00' });
        if (data.status !== 'IN') setElapsed(0);
    };

    const fetchHistory = async () => {
        const { data } = await api.get('/attendance/history', { params: { userId, month, year } });
        setHistory(data.items || []);
    };

    const fetchSummary = async () => {
        const { data } = await api.get(`/attendance/summary/${userId}`, { params: { month, year } });
        setSummary(data);
    };

    const loadAll = async (refresh?: boolean) => {
        if (!userId) { setLoading(false); return; }
        refresh ? setRefreshing(true) : setLoading(true);
        try { await Promise.all([fetchToday(), fetchHistory(), fetchSummary()]); }
        catch (e) { console.error(e); }
        finally { refresh ? setRefreshing(false) : setLoading(false); }
    };

    useEffect(() => { loadAll(); }, [userId]);

    useEffect(() => {
        if (attendance?.status !== 'IN' || !attendance?.checkInTime) { setElapsed(0); return; }
        const base = new Date(attendance.checkInTime).getTime();
        const tick = () => setElapsed(Date.now() - base);
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [attendance]);

    const handleAttendance = async () => {
        if (!userId || actionLoading) return;
        setActionLoading(true);
        try {
            const endpoint = attendance?.status === 'IN' ? '/attendance/check-out' : '/attendance/check-in';
            await api.post(endpoint, { userId });
            await loadAll(true);
        } catch (err: any) {
            alert('Action failed');
        } finally { setActionLoading(false); }
    };

    const submitRegularization = async () => {
        if (!regularizeTxt || !userId) return;
        setSubmitting(true);
        try {
            await api.post('/attendance/regularize', {
                userId,
                date: new Date().toISOString().slice(0, 10),
                check_in_time: '09:00',
                check_out_time: '18:00',
                reason: regularizeTxt,
            });
            setRegularizeTxt('');
            alert('Request submitted.');
        } catch { alert('Failed.'); }
        finally { setSubmitting(false); }
    };

    const calDays = (() => {
        const total = new Date(year, month, 0).getDate();
        const records: Record<number, string> = {};
        history.forEach(r => { records[new Date(r.check_in).getDate()] = r.status; });
        return Array.from({ length: total }, (_, i) => {
            const d = i + 1;
            const weekday = new Date(year, month - 1, d).getDay();
            return { day: d, status: (weekday === 0 || weekday === 6) ? 'weekend' : records[d] || 'absent' };
        });
    })();

    const isIn   = attendance?.status === 'IN';
    const isDone = attendance?.status === 'COMPLETED';

    if (loading) return (
        <div className="p-8 space-y-8 animate-pulse">
            <div className="h-64 bg-gray-100 rounded-[2.5rem]"></div>
            <div className="grid grid-cols-5 gap-4">
                {[1,2,3,4,5].map(i => <div key={i} className="h-24 bg-gray-100 rounded-3xl"></div>)}
            </div>
        </div>
    );

    const monthLabel = new Date(year, month-1).toLocaleString('default', { month: 'long', year: 'numeric' });

    return (
        <div className="p-6 space-y-8 page-enter">
            
            {/* ── Page Header ──────────────────────────────── */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100">
                        <HistoryIcon size={20} className="text-white" />
                    </div>
                    <div>
                        <h2 className="text-[17px] font-black text-gray-900 tracking-tight uppercase">Attendance Register</h2>
                        <p className="text-[11.5px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
                            Real-time Log & Lifecycle Tracking
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button onClick={() => loadAll(true)} className={`p-2.5 bg-white border border-gray-100 rounded-xl text-gray-400 hover:text-indigo-600 transition-all ${refreshing ? 'animate-spin' : ''}`}>
                        <RefreshCw size={16}/>
                    </button>
                    <div className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg border border-blue-100 flex items-center gap-1.5">
                        <MapPin size={14} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Office HQ</span>
                    </div>
                </div>
            </div>

            {/* ── Hero Tracking Card ────────────────────────── */}
            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden group">
                <div className="grid grid-cols-1 lg:grid-cols-12">
                    {/* Left: Interactive Control */}
                    <div className="lg:col-span-4 p-10 flex flex-col items-center justify-center border-b lg:border-b-0 lg:border-r border-gray-100 bg-gray-50/30">
                        <div className={`w-48 h-48 rounded-full border-4 flex flex-col items-center justify-center transition-all duration-500 relative ${isIn ? 'border-indigo-500 bg-indigo-50 shadow-2xl shadow-indigo-100' : 'border-gray-100 bg-white'}`}>
                            {isIn && <div className="absolute inset-0 rounded-full border border-indigo-200 animate-ping opacity-20"></div>}
                            <p className={`text-[36px] font-black font-mono tracking-tighter tabular-nums leading-none ${isIn ? 'text-indigo-600' : 'text-gray-200'}`}>
                                {isIn ? (
                                    <span className="flex items-center">
                                        {String(Math.floor(elapsed / 3600000)).padStart(2,'0')}:
                                        {String(Math.floor((elapsed % 3600000) / 60000)).padStart(2,'0')}:
                                        <span className="text-indigo-400 text-[24px] ml-1">{String(Math.floor((elapsed % 60000) / 1000)).padStart(2,'0')}</span>
                                    </span>
                                ) : '00:00:00'}
                            </p>
                            <div className="mt-3 flex items-center gap-2">
                                <Zap size={14} className={isIn ? 'text-indigo-500 animate-pulse' : 'text-gray-300'} />
                                <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${isIn ? 'text-indigo-500' : 'text-gray-300'}`}>
                                    {isIn ? 'Recording Live' : 'Not Tracking'}
                                </span>
                            </div>
                        </div>

                        <div className="mt-8 w-full space-y-4">
                            {!isDone ? (
                                <button
                                    onClick={handleAttendance}
                                    disabled={actionLoading}
                                    className={`w-full py-4 rounded-2xl text-[14px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-xl flex items-center justify-center gap-3 ${
                                        isIn 
                                            ? 'bg-rose-50 text-rose-600 border border-rose-100 shadow-rose-100/50 hover:bg-rose-100'
                                            : 'bg-indigo-600 text-white shadow-indigo-100 hover:bg-indigo-700'
                                    }`}
                                >
                                    {actionLoading ? <Loader2 size={18} className="animate-spin" /> : isIn ? <LogOutIcon size={18} /> : <LogIn size={18} />}
                                    {isIn ? 'End Shift' : 'Start Shift'}
                                </button>
                            ) : (
                                <div className="w-full py-4 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center gap-2 text-[13px] font-black uppercase tracking-widest">
                                    <CheckCircle size={18} /> Cycle Completed
                                </div>
                            )}
                            <p className="text-[10px] text-gray-400 text-center font-bold uppercase tracking-widest">
                                {isIn ? `Active session started at ${fmtTime(attendance.checkInTime)}` : 'Next scheduled sync available now'}
                            </p>
                        </div>
                    </div>

                    {/* Right: Insights & Metadata */}
                    <div className="lg:col-span-8 p-10 bg-white grid grid-cols-2 gap-10">
                        <div className="space-y-10">
                            <div>
                                <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">Today's Progress</p>
                                <div className="flex gap-6">
                                    <div>
                                        <p className="text-[28px] font-black text-gray-900 tracking-tight">{attendance?.sessions ?? 0}</p>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Sessions</p>
                                    </div>
                                    <div className="w-px bg-gray-100"></div>
                                    <div>
                                        <p className="text-[28px] font-black text-indigo-600 tracking-tight">{attendance?.totalHours ?? '0.00'}h</p>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Total Duration</p>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">Shift Details</p>
                                <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                                    <div className="flex items-center gap-3 mb-2">
                                        <Clock size={16} className="text-indigo-500" />
                                        <p className="text-[14px] font-bold text-gray-800 uppercase tracking-tight">General Office Shift</p>
                                    </div>
                                    <p className="text-[12px] text-gray-500 font-medium">09:00 AM — 18:00 PM <span className="mx-2 opacity-30">|</span> 9.0h expected</p>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-6">
                            <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">Live Map Trace</p>
                            <div className="h-full bg-gray-50 rounded-3xl border border-gray-100 relative overflow-hidden flex flex-col items-center justify-center p-8 gap-4">
                                <MapPin size={32} className="text-gray-200" />
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest text-center">GPS verification active for current IP subnet</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Monthly Summary Strip ───────────────────── */}
            {summary && (
                <div className="grid grid-cols-5 gap-4">
                    {[
                        { label: 'Present',  val: summary.present_days,   color: 'text-emerald-500', bg: 'bg-emerald-50', icon: CheckCircle },
                        { label: 'Half Day', val: summary.half_days,      color: 'text-amber-500',  bg: 'bg-amber-50',   icon: Clock },
                        { label: 'On Duty',  val: summary.on_duty_days,   color: 'text-blue-500',   bg: 'bg-blue-50',    icon: BarChart2 },
                        { label: 'Absence',  val: summary.absent_days || 0, color: 'text-rose-500',   bg: 'bg-rose-50',    icon: XCircle },
                        { label: 'Avg Hrs',  val: summary.avg_hours != null ? parseFloat(summary.avg_hours).toFixed(1)+'h' : '—',
                          color: 'text-indigo-600', bg: 'bg-indigo-50', icon: Zap },
                    ].map(s => (
                        <div key={s.label} className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm hover:-translate-y-1 transition-all">
                             <div className={`w-8 h-8 ${s.bg} rounded-lg flex items-center justify-center mb-4`}>
                                <s.icon size={15} className={s.color} />
                            </div>
                            <p className={`text-[24px] font-black ${s.color} leading-none`}>{s.val}</p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">{s.label}</p>
                        </div>
                    ))}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* ── Monthly Calendar View ───────────────────── */}
                <div className="lg:col-span-8 bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-8">
                    <div className="flex items-center justify-between mb-8 px-2">
                        <div>
                            <h3 className="text-[15px] font-black text-gray-900 uppercase tracking-tight">Monthly Visualizer</h3>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">{monthLabel}</p>
                        </div>
                        <div className="flex gap-2">
                            <button className="p-2 bg-gray-50 rounded-xl text-gray-400 hover:text-gray-900 border border-transparent hover:border-gray-200 transition-all"><ChevronLeft size={16}/></button>
                            <button className="p-2 bg-gray-50 rounded-xl text-gray-400 hover:text-gray-900 border border-transparent hover:border-gray-200 transition-all"><ChevronRight size={16}/></button>
                        </div>
                    </div>

                    <div className="grid grid-cols-7 gap-3">
                        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
                            <div key={d} className="text-center text-[10px] font-black text-gray-300 uppercase tracking-[0.2em] pb-4">{d}</div>
                        ))}
                        {Array.from({ length: new Date(year, month-1, 1).getDay() }).map((_,i) => <div key={i}></div>)}
                        {calDays.map(d => (
                            <div
                                key={d.day}
                                className={`aspect-square flex flex-col items-center justify-center rounded-2xl text-[12px] font-black transition-all cursor-default border group hover:scale-105 ${
                                    d.status === 'weekend' ? 'text-gray-300 bg-gray-50 border-transparent' :
                                    d.status === 'present' ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100' :
                                    d.status === 'absent'  ? 'bg-rose-50 text-rose-500 border-rose-100' :
                                    d.status === 'half_day'? 'bg-amber-50 text-amber-500 border-amber-100' :
                                    d.status === 'on_duty' ? 'bg-blue-50 text-blue-500 border-blue-100' :
                                    'bg-white text-gray-400 border-gray-100'
                                }`}
                            >
                                {d.day}
                                <div className={`w-1 h-1 rounded-full mt-1 opacity-0 group-hover:opacity-100 ${d.status === 'present' ? 'bg-white' : 'bg-current'}`}></div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-10 pt-6 border-t border-gray-50 flex flex-wrap gap-6 justify-center">
                        {[
                            { label: 'Present',  color: 'bg-indigo-600' },
                            { label: 'Absent',   color: 'bg-rose-300' },
                            { label: 'Half Day', color: 'bg-amber-400' },
                            { label: 'On Duty',  color: 'bg-blue-500' },
                            { label: 'Weekend',  color: 'bg-gray-200' },
                        ].map(l => (
                            <div key={l.label} className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${l.color}`}></div>
                                <span className="text-[10.5px] text-gray-400 font-bold uppercase tracking-widest">{l.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── Action: Regularization ──────────────────── */}
                <div className="lg:col-span-4 bg-gray-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden flex flex-col justify-between">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl -mr-16 -mt-16"></div>
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full border border-white/5 mb-6">
                            <Info size={14} className="text-amber-400" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Correction Sync</span>
                        </div>
                        <h3 className="text-[20px] font-black tracking-tight leading-none mb-3">Sync Regularization</h3>
                        <p className="text-gray-400 text-[12px] font-medium leading-relaxed">Missed a punch? Transmit a correction request for manager orchestration.</p>
                    </div>

                    <div className="my-8 space-y-4">
                        <textarea
                            value={regularizeTxt}
                            onChange={e => setRegularizeTxt(e.target.value)}
                            placeholder="Detail the discrepancy..."
                            rows={6}
                            className="w-full bg-white/5 border border-white/10 rounded-3xl p-5 text-[13px] text-white outline-none focus:bg-white/10 focus:border-indigo-500 transition-all resize-none italic placeholder-gray-600"
                        />
                    </div>

                    <button
                        onClick={submitRegularization}
                        disabled={!regularizeTxt.trim() || submitting}
                        className="w-full py-4 bg-indigo-600 text-white rounded-2xl text-[12px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-500/10 flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
                    >
                        {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                        Transmit Request
                    </button>
                </div>
            </div>

            {/* ── Table Log: History ──────────────────────── */}
            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-10 py-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-600 text-white rounded-xl"><CalendarDays size={18}/></div>
                        <h3 className="text-[15px] font-black text-gray-900 uppercase tracking-tight">Immutable Session Logs</h3>
                    </div>
                </div>
                
                {history.length === 0 ? (
                    <div className="py-32 flex flex-col items-center gap-4 opacity-30">
                        <Search size={48} className="text-gray-300"/>
                        <p className="text-[12px] font-black text-gray-400 uppercase tracking-widest">No log entries captured</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">
                                    <th className="px-10 py-5">Verified Date</th>
                                    <th className="px-10 py-5">Initial Punch</th>
                                    <th className="px-10 py-5">Final Exit</th>
                                    <th className="px-10 py-5">Calculated Duration</th>
                                    <th className="px-10 py-5">Protocol Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {history.map(rec => (
                                    <tr key={rec.id} className="hover:bg-indigo-50/10 transition-colors group">
                                        <td className="px-10 py-6">
                                            <p className="text-[13px] font-black text-gray-900 uppercase tracking-tight">{fmtDate(rec.check_in)}</p>
                                        </td>
                                        <td className="px-10 py-6">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                                <span className="text-[13px] font-mono font-bold text-gray-600">{fmtTime(rec.check_in)}</span>
                                            </div>
                                        </td>
                                        <td className="px-10 py-6">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-2 h-2 rounded-full ${rec.check_out ? 'bg-amber-500' : 'bg-gray-200'}`}></div>
                                                <span className="text-[13px] font-mono font-bold text-gray-600">{rec.check_out ? fmtTime(rec.check_out) : '—'}</span>
                                            </div>
                                        </td>
                                        <td className="px-10 py-6">
                                            <p className="text-[14px] font-black text-indigo-600">{rec.check_out ? `${calcHours(rec.check_in, rec.check_out)}h` : 'Running...'}</p>
                                        </td>
                                        <td className="px-10 py-6">
                                            <span className={`inline-flex px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${STATUS_STYLES[rec.status] || 'bg-gray-50 border-gray-100 text-gray-400'}`}>
                                                {rec.status?.replace('_', ' ')}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

const Send = (props: any) => <Zap size={props.size || 16} {...props}/>;

export default Attendance;