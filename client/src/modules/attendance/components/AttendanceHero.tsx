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
                    {/* SVG Ring with comfortable breathing room */}
                    <div className="relative w-48 h-48 sm:w-52 sm:h-52 flex items-center justify-center">
                        <svg className="absolute inset-0 w-full h-full -rotate-90 p-0.5" viewBox="0 0 128 128">
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
                        
                        {/* Centered Content with zero overlap & balanced typography */}
                        <div className="flex flex-col items-center justify-center text-center z-10 px-4">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.18em] mb-1">
                                Total Today
                            </span>
                            <span className={`text-[23px] sm:text-[25px] font-extrabold font-mono tracking-tight tabular-nums leading-none ${isIn ? 'text-primary' : 'text-primary-light/30'}`}>
                                {isIn ? totalTimerStr : '00:00:00'}
                            </span>
                            
                            {isIn ? (
                                <div className="mt-3 flex flex-col items-center border-t border-slate-100/90 pt-2.5 w-28">
                                    <div className="flex items-center gap-1 mb-1">
                                        <Zap size={9} className="text-indigo-500 animate-pulse"/>
                                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Active Session</span>
                                    </div>
                                    <span className="text-[13px] font-bold font-mono text-indigo-600 tabular-nums leading-none">
                                        {sessionTimerStr}
                                    </span>
                                </div>
                            ) : (
                                <div className="mt-3 flex items-center gap-1.5 opacity-40">
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
                        <div className="flex items-center gap-2">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Today's Timeline</h4>
                            {isIn && (
                                <span className="flex items-center gap-1 text-[8px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"/> Live
                                </span>
                            )}
                        </div>
                        <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                            {(() => {
                                const list = Array.isArray(todayHistory) ? [...todayHistory] : [];
                                if (isIn && checkInTime && !list.some(s => !(s.check_out_time || s.check_out))) {
                                    list.unshift({ check_in_time: checkInTime });
                                }
                                return `${list.length} Slot${list.length === 1 ? '' : 's'}`;
                            })()}
                        </span>
                    </div>

                    <div className="flex-1 space-y-3 overflow-y-auto max-h-[190px] pr-1 custom-scrollbar">
                        {(() => {
                            const list = Array.isArray(todayHistory) ? [...todayHistory] : [];
                            if (isIn && checkInTime && !list.some(s => !(s.check_out_time || s.check_out))) {
                                list.unshift({
                                    check_in_time: checkInTime,
                                    check_out_time: null,
                                    status: 'present',
                                    isLive: true
                                });
                            }

                            if (list.length === 0) {
                                return (
                                    <div className="flex-1 flex flex-col items-center justify-center text-slate-300 gap-2 opacity-60 py-10">
                                        <Activity size={24} strokeWidth={1.5} className="text-slate-400"/>
                                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">No sessions recorded yet</p>
                                    </div>
                                );
                            }

                            return list.map((s, i) => {
                                const inT = s.check_in_time || s.check_in;
                                const outT = s.check_out_time || s.check_out;
                                const isCurrent = !outT && (s.isLive || (i === 0 && isIn));
                                const durationMs = outT 
                                    ? (new Date(outT).getTime() - new Date(inT).getTime()) 
                                    : (isCurrent ? elapsed : 0);
                                const durationH = Math.floor(durationMs / 3600000);
                                const durationM = Math.floor((durationMs % 3600000) / 60000);
                                const durationStr = durationH > 0 ? `${durationH}h ${durationM}m` : `${durationM}m`;
                                const slotProgressPct = Math.min(100, Math.max(8, (durationMs / (9 * 3600000)) * 100));

                                return (
                                    <div 
                                        key={i} 
                                        className={`bg-white rounded-xl border p-3.5 shadow-sm relative transition-all duration-300 hover:shadow-md ${
                                            isCurrent 
                                                ? 'border-indigo-300/80 ring-2 ring-indigo-500/10 shadow-indigo-500/5' 
                                                : 'border-slate-100 hover:border-slate-200'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <div className="w-5 h-5 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-xs">
                                                    <LogIn size={11} strokeWidth={2.5}/>
                                                </div>
                                                <div>
                                                    <p className="text-[7px] font-bold text-slate-400 uppercase tracking-wider">Punch In</p>
                                                    <p className="text-[11px] font-black text-slate-800 tabular-nums">
                                                        {inT ? new Date(inT).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '—'}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 text-right">
                                                <div>
                                                    <p className="text-[7px] font-bold text-slate-400 uppercase tracking-wider">
                                                        {outT ? 'Punch Out' : 'Current Status'}
                                                    </p>
                                                    <p className={`text-[11px] font-black tabular-nums ${outT ? 'text-slate-700' : 'text-indigo-600'}`}>
                                                        {outT 
                                                            ? new Date(outT).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
                                                            : 'Active Now'
                                                        }
                                                    </p>
                                                </div>
                                                <div className={`w-5 h-5 rounded-md flex items-center justify-center shadow-xs ${
                                                    outT ? 'bg-rose-50 text-rose-500' : 'bg-indigo-50 text-indigo-600'
                                                }`}>
                                                    <LogOut size={11} strokeWidth={2.5}/>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Duration & Progress track */}
                                        <div className="flex items-center justify-between text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                            <span className="flex items-center gap-1.5">
                                                <span className={`w-1.5 h-1.5 rounded-full ${isCurrent ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}/>
                                                {isCurrent ? 'Ongoing Shift' : `Completed Slot`}
                                            </span>
                                            <span className="font-mono text-slate-600 lowercase">{durationStr}</span>
                                        </div>

                                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                            <div 
                                                className={`h-full rounded-full transition-all duration-700 ${
                                                    isCurrent 
                                                        ? 'bg-gradient-to-r from-indigo-500 to-emerald-400' 
                                                        : 'bg-indigo-500'
                                                }`} 
                                                style={{ width: `${outT ? 100 : slotProgressPct}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            });
                        })()}
                    </div>

                    <div className="mt-auto bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-3 shadow-xs">
                        <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-200">
                            <TrendingUp size={14}/>
                        </div>
                        <div>
                            <h4 className="text-[11px] font-bold text-slate-800">Monthly Target</h4>
                            <p className="text-[9px] text-slate-400 font-medium tracking-tight">≈ 22 working days · 198h standard</p>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};
