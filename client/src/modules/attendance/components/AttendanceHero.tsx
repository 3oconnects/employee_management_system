import React, { useMemo } from 'react';
import { LogIn, LogOut, Zap, MapPin, Loader2, CheckCircle2, Clock, TrendingUp, Target, Activity } from 'lucide-react';

interface Props {
    isIn: boolean;
    isDone: boolean;
    elapsed: number;           // ms since last check-in (ticking)
    closedHoursMs: number;     // ms from already-completed sessions today
    actionLoading: boolean;
    onAction: () => void;
    checkInTime?: string | null;
    totalHours?: string;
    sessions?: number;
    todayHistory?: any[];
}

const pad = (n: number) => String(n).padStart(2, '0');

export const AttendanceHero: React.FC<Props> = ({
    isIn, isDone, elapsed, closedHoursMs, actionLoading, onAction, checkInTime, totalHours, sessions, todayHistory
}) => {
    // Consolidated = prior closed sessions + current open session tick
    const consolidatedMs = (closedHoursMs ?? 0) + (isIn ? elapsed : 0);
    const h = Math.floor(consolidatedMs / 3600000);
    const m = Math.floor((consolidatedMs % 3600000) / 60000);
    const s = Math.floor((consolidatedMs % 60000) / 1000);
    const totalTimerStr = `${pad(h)}:${pad(m)}:${pad(s)}`;

    // Current session elapsed
    const sessH = Math.floor(elapsed / 3600000);
    const sessM = Math.floor((elapsed % 3600000) / 60000);
    const sessS = Math.floor((elapsed % 60000) / 1000);
    const sessionTimerStr = `${pad(sessH)}:${pad(sessM)}:${pad(sessS)}`;

    // Progress toward 9h quota using consolidated time
    const progressPct = useMemo(() => Math.min((consolidatedMs / (9 * 3600000)) * 100, 100), [consolidatedMs]);
    const dash = 364.4 * (1 - progressPct / 100);
    const circumference = 364.4;

    return (
        <div className="card-premium overflow-hidden border-primary-light/20 shadow-premium">
            <div className="grid grid-cols-1 lg:grid-cols-12">

                {/* ── Left: Timer Hub ── */}
                <div className="lg:col-span-4 p-10 flex flex-col items-center justify-center bg-gradient-to-b from-primary/5 to-transparent border-b lg:border-b-0 lg:border-r border-primary-light/20 gap-6">
                    {/* SVG Ring */}
                    <div className="relative w-44 h-44 flex items-center justify-center">
                        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 128 128">
                            {/* Track */}
                            <circle cx="64" cy="64" r="58" fill="none" stroke="currentColor" strokeWidth="4" className="text-primary-light/10"/>
                            {/* Progress */}
                            <circle cx="64" cy="64" r="58" fill="none"
                                stroke="url(#heroGrad)" strokeWidth="4"
                                strokeLinecap="round"
                                strokeDasharray={circumference}
                                strokeDashoffset={isIn ? dash : circumference}
                                className="transition-all duration-1000"/>
                            <defs>
                                <linearGradient id="heroGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%"   stopColor="#6366f1"/>
                                    <stop offset="100%" stopColor="#8b5cf6"/>
                                </linearGradient>
                            </defs>
                        </svg>
                        {/* No backdrop pulse — clean ring only */}
                        <div className="flex flex-col items-center gap-0 z-10 -mt-2">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Total Today</p>
                            <p className={`text-[32px] font-bold font-mono tracking-tighter tabular-nums leading-none ${isIn ? 'text-primary' : 'text-primary-light/30'}`}>
                                {isIn ? totalTimerStr : '00:00:00'}
                            </p>
                            
                            {isIn && (
                                <div className="mt-4 flex flex-col items-center border-t border-slate-100 pt-3.5 w-full">
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <Zap size={9} className="text-indigo-400 animate-pulse"/>
                                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Active Session</span>
                                    </div>
                                    <p className="text-[14px] font-bold font-mono text-indigo-500 tabular-nums">
                                        {sessionTimerStr}
                                    </p>
                                </div>
                            )}

                            {!isIn && (
                                <div className="mt-5 flex items-center gap-1.5 opacity-40">
                                    <Zap size={10} className="text-slate-400"/>
                                    <span className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400">
                                        Standby
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    <button
                        onClick={onAction}
                        disabled={actionLoading || isDone}
                        className={`group relative w-full py-4 rounded-2xl font-black text-[12px] uppercase tracking-[0.2em] transition-all overflow-hidden flex items-center justify-center gap-3
                            ${isIn 
                                ? 'bg-rose-500 text-white shadow-xl shadow-rose-500/30 hover:bg-rose-600' 
                                : 'bg-primary text-white shadow-xl shadow-primary/30 hover:bg-primary-dark'
                            }
                            ${(actionLoading || isDone) ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}
                        `}
                    >
                        {actionLoading ? (
                            <Loader2 size={18} className="animate-spin" />
                        ) : isIn ? (
                            <><LogOut size={18} /> Punch Out</>
                        ) : (
                            <><LogIn size={18} /> Punch In</>
                        )}
                    </button>

                    <div className="flex items-center gap-2 text-slate-400">
                        <MapPin size={11} />
                        <span className="text-[9px] font-bold uppercase tracking-widest">Office HQ Network</span>
                    </div>
                </div>

                {/* ── Middle: Velocity ── */}
                <div className="lg:col-span-4 p-10 flex flex-col justify-center border-b lg:border-b-0 lg:border-r border-primary-light/20 gap-8">
                    <div>
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Daily Velocity</h4>
                        <div className="flex items-end gap-10">
                            <div>
                                <p className="text-[38px] font-bold text-primary leading-none">
                                    {sessions || 0}
                                </p>
                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">Sessions</p>
                            </div>
                            <div className="h-10 w-px bg-slate-100"/>
                            <div>
                                <p className="text-[32px] font-bold text-primary leading-none tabular-nums">
                                    {(() => {
                                        const hrs = parseFloat(totalHours || '0');
                                        const hh = Math.floor(hrs);
                                        const mm = Math.round((hrs % 1) * 60);
                                        return `${hh}h ${pad(mm)}m`;
                                    })()}
                                </p>
                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1.5">Consolidated Time</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-primary/5 rounded-2xl p-4 border border-primary/10">
                            <div className="flex items-center gap-2 mb-1">
                                <Clock size={12} className="text-primary-soft"/>
                                <span className="text-[10px] font-bold text-primary tabular-nums">
                                    {checkInTime ? new Date(checkInTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '—'}
                                </span>
                            </div>
                            <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">Check In</p>
                        </div>
                        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                            <div className="flex items-center gap-2 mb-1">
                                <TrendingUp size={12} className="text-slate-400"/>
                                <span className="text-[10px] font-bold text-slate-600">
                                    {Math.max(0, parseFloat(totalHours || '0') - 9).toFixed(2)}h
                                </span>
                            </div>
                            <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">Overtime</p>
                        </div>
                    </div>

                    <div>
                        <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-widest mb-2">
                            <span className="text-slate-400">Session Progress</span>
                            <span className="text-primary">{progressPct.toFixed(0)}% / 9h Quota</span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-primary transition-all duration-1000" style={{ width: `${progressPct}%` }}/>
                        </div>
                    </div>
                </div>

                {/* ── Right: Today's Timeline ── */}
                <div className="lg:col-span-4 p-8 bg-slate-50/30 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Today's Timeline</h4>
                        <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{todayHistory?.length || 0} Slots</span>
                    </div>

                    <div className="flex-1 space-y-3 overflow-y-auto max-h-[180px] pr-1 custom-scrollbar">
                        {todayHistory && todayHistory.length > 0 ? (
                            todayHistory.map((s, i) => {
                                const inT = s.check_in_time || s.check_in;
                                const outT = s.check_out_time || s.check_out;
                                const isCurrent = !outT && i === 0 && isIn;
                                return (
                                    <div key={i} className="bg-white rounded-xl border border-slate-100 p-3 shadow-sm relative">
                                        {isCurrent && <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"/>}
                                        <div className="flex items-center justify-between mb-1.5">
                                            <div className="flex items-center gap-1.5">
                                                <LogIn size={10} className="text-emerald-500"/>
                                                <span className="text-[11px] font-bold text-slate-700">
                                                    {new Date(inT).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <LogOut size={10} className={outT ? 'text-rose-400' : 'text-slate-300'}/>
                                                <span className="text-[11px] font-bold text-slate-600">
                                                    {outT ? new Date(outT).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : 'Active'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="h-1 bg-slate-50 rounded-full overflow-hidden">
                                            <div className={`h-full rounded-full ${isCurrent ? 'bg-indigo-400' : 'bg-slate-200'}`} style={{width: outT ? '100%' : '60%'}}/>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-300 gap-2 opacity-50 py-10">
                                <Activity size={24} strokeWidth={1.5}/>
                                <p className="text-[9px] font-bold uppercase tracking-widest">No sessions yet</p>
                            </div>
                        )}
                    </div>

                    <div className="mt-auto bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
                            <TrendingUp size={14}/>
                        </div>
                        <div>
                            <h4 className="text-[11px] font-bold text-slate-800">Monthly Target</h4>
                            <p className="text-[9px] text-slate-400 font-medium tracking-tight">≈ 22 working days · 198h</p>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};
