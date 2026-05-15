import React from 'react';
import {
    Users, CheckCircle2, UserMinus, AlertTriangle, CalendarDays,
    ClipboardList, ChevronRight, ArrowUpRight, Clock, TrendingUp
} from 'lucide-react';

interface ManagerStats {
    teamSize: number;
    todayPresent: number;
    todayAbsent: number;
    todayLate: number;
    attendanceRate: number;
    pendingLeaveCount: number;
    teamMembers: any[];
    teamAttendance: any[];
    pendingLeaves: any[];
    lateCheckins: any[];
    timesheetStatus: any;
}

import type { OrgSection } from './OrgSubNav';

interface ManagerDashboardProps {
    data: ManagerStats;
    navigate: (path: string) => void;
    section?: OrgSection;
}

export const ManagerDashboard: React.FC<ManagerDashboardProps> = ({ data: d, navigate, section = 'overview' }) => {
    return (
        <div className="space-y-5 page-enter">

            {/* ── KPI Row ──────────────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Team Size',      value: d.teamSize,          icon: Users,         iconBg: 'bg-indigo-50',  iconColor: 'text-indigo-600', sub: 'Total members' },
                    { label: 'Present Today',  value: d.todayPresent,      icon: CheckCircle2,  iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600', sub: `${d.attendanceRate}% rate`, trend: true },
                    { label: 'Absent Today',   value: d.todayAbsent,       icon: UserMinus,     iconBg: 'bg-rose-50',    iconColor: 'text-rose-600',    sub: 'Not checked in' },
                    { label: 'Late Today',     value: d.todayLate,         icon: AlertTriangle, iconBg: 'bg-amber-50',   iconColor: 'text-amber-600',   sub: 'Late check-ins' },
                ].map(card => (
                    <div
                        key={card.label}
                        className="bg-white rounded-2xl border border-slate-100 p-5 text-left transition-all duration-200 group"
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className={`w-9 h-9 ${card.iconBg} rounded-xl flex items-center justify-center`}>
                                <card.icon size={17} className={card.iconColor} />
                            </div>
                            {card.trend && (
                                <span className="flex items-center gap-0.5 text-[11px] font-bold px-2 py-0.5 rounded-full text-emerald-600 bg-emerald-50">
                                    <TrendingUp size={10} /> {d.attendanceRate}%
                                </span>
                            )}
                        </div>
                        <p className="text-[26px] font-black text-slate-800 leading-none tabular-nums truncate" title={String(card.value)}>{card.value}</p>
                        <p className="text-[11px] font-semibold text-slate-500 mt-1.5 uppercase tracking-wide">{card.label}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5 truncate" title={card.sub}>{card.sub}</p>
                    </div>
                ))}
            </div>

            {/* ── Main Content Grid ────────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full items-stretch">

                {/* Pending Leave Requests */}
                <div className="bg-white rounded-2xl border border-slate-100 p-5 flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-[14px] font-bold text-slate-800">Leave Requests</h3>
                        <button onClick={() => navigate('/leave')}
                            className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                            Manage <ArrowUpRight size={11} />
                        </button>
                    </div>
                    <div className="space-y-2.5 flex-1">
                        {d.pendingLeaves.length > 0 ? d.pendingLeaves.slice(0, 4).map((lr: any) => (
                            <div key={lr.id}
                                className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all cursor-pointer group">
                                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border border-slate-200 flex-shrink-0">
                                    <CalendarDays size={14} className="text-indigo-500" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[12px] font-semibold text-slate-800 truncate">{lr.applicant_name}</p>
                                    <p className="text-[11px] text-slate-400">{lr.leave_type}</p>
                                </div>
                                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full flex-shrink-0">
                                    Pending
                                </span>
                            </div>
                        )) : (
                            <div className="py-12 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 flex flex-col items-center justify-center h-full min-h-[140px]">
                                <CalendarDays size={20} className="text-slate-200 mb-1.5" />
                                <p className="text-[11px] text-slate-400">No pending requests</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Timesheet Status */}
                <div className="bg-white rounded-2xl border border-slate-100 p-5 flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-[14px] font-bold text-slate-800">Timesheets</h3>
                        <button onClick={() => navigate('/timesheet')}
                            className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                            View <ArrowUpRight size={11} />
                        </button>
                    </div>
                    <div className="flex flex-col justify-center flex-1 space-y-3">
                        <div className="grid grid-cols-1 gap-2.5">
                            {[
                                { label: 'Submitted Timesheets', val: d.timesheetStatus?.submitted || 0, color: 'text-indigo-600', bg: 'bg-indigo-50',  border: 'border-indigo-100' },
                                { label: 'Approved Timesheets',  val: d.timesheetStatus?.approved  || 0, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
                                { label: 'Pending Approval',     val: d.timesheetStatus?.pending   || 0, color: 'text-amber-600',  bg: 'bg-amber-50',   border: 'border-amber-100' },
                            ].map(s => (
                                <div key={s.label} className={`flex items-center justify-between p-3.5 rounded-xl ${s.bg} border ${s.border}`}>
                                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">{s.label}</p>
                                    <p className={`text-[20px] font-black ${s.color} tabular-nums`}>{s.val}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Operational Pulse / Late Check-ins */}
                <div className="bg-white rounded-2xl border border-slate-100 p-5 flex flex-col">
                    <h3 className="text-[14px] font-bold text-slate-800 mb-4">Operational Pulse</h3>
                    <div className="space-y-2.5 flex-1">
                        {d.lateCheckins?.length > 0 ? (
                            <div className="space-y-2">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Recent Late Arrivals</p>
                                {d.lateCheckins.slice(0, 4).map((lc: any, i: number) => (
                                    <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl bg-amber-50 border border-amber-100">
                                        <Clock size={13} className="text-amber-600 flex-shrink-0" />
                                        <p className="text-[12px] font-medium text-amber-800 truncate flex-1">{lc.name}</p>
                                        <span className="text-[10px] font-bold text-amber-600 flex-shrink-0">
                                            {lc.check_in ? new Date(lc.check_in).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '—'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-12 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 flex flex-col items-center justify-center h-full min-h-[140px]">
                                <CheckCircle2 size={24} className="text-emerald-200 mb-2" />
                                <p className="text-[12px] font-bold text-slate-800">Perfect Punctuality</p>
                                <p className="text-[10px] text-slate-400 mt-0.5">No late arrivals recorded today</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
