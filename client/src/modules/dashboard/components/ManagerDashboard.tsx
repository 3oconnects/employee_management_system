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
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {[
                    { label: 'Team Size',      value: d.teamSize,          icon: Users,         iconBg: 'bg-indigo-50',  iconColor: 'text-indigo-600', sub: 'Total members' },
                    { label: 'Present Today',  value: d.todayPresent,      icon: CheckCircle2,  iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600', sub: `${d.attendanceRate}% rate`, trend: true },
                    { label: 'Absent Today',   value: d.todayAbsent,       icon: UserMinus,     iconBg: 'bg-rose-50',    iconColor: 'text-rose-600',    sub: 'Not checked in' },
                    { label: 'Late Today',     value: d.todayLate,         icon: AlertTriangle, iconBg: 'bg-amber-50',   iconColor: 'text-amber-600',   sub: 'Late check-ins' },
                    { label: 'Pending Leaves', value: d.pendingLeaveCount, icon: CalendarDays,  iconBg: 'bg-violet-50',  iconColor: 'text-violet-600',  sub: 'Awaiting approval', onClick: () => navigate('/leave') },
                ].map(card => (
                    <button
                        key={card.label}
                        onClick={card.onClick}
                        className={`bg-white rounded-2xl border border-slate-100 p-5 text-left transition-all duration-200 group
                            ${card.onClick ? 'hover:border-indigo-200 hover:shadow-md hover:shadow-indigo-50 cursor-pointer' : 'cursor-default'}`}
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
                            {card.onClick && <ChevronRight size={14} className="text-slate-200 group-hover:text-indigo-400 transition-colors mt-0.5" />}
                        </div>
                        <p className="text-[26px] font-black text-slate-800 leading-none tabular-nums">{card.value}</p>
                        <p className="text-[11px] font-semibold text-slate-500 mt-1.5 uppercase tracking-wide">{card.label}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{card.sub}</p>
                    </button>
                ))}
            </div>

            {/* ── Main Grid ────────────────────────────────────── */}
            <div className="grid grid-cols-12 gap-4">

                {/* Team Attendance Table */}
                <div className="col-span-12 lg:col-span-8 bg-white rounded-2xl border border-slate-100 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                        <div>
                            <h3 className="text-[15px] font-bold text-slate-800">Team Attendance</h3>
                            <p className="text-[11px] text-slate-400 mt-0.5">{d.todayPresent} of {d.teamSize} present today</p>
                        </div>
                        <button onClick={() => navigate('/attendance')}
                            className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700">
                            Full View <ArrowUpRight size={12} />
                        </button>
                    </div>

                    {/* Attendance Rate Bar */}
                    <div className="px-6 py-3 bg-slate-50 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                            <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                                <div
                                    className="h-full rounded-full transition-all duration-700"
                                    style={{
                                        width: `${d.attendanceRate}%`,
                                        background: d.attendanceRate >= 80
                                            ? 'linear-gradient(90deg,#34d399,#059669)'
                                            : d.attendanceRate >= 60
                                            ? 'linear-gradient(90deg,#fbbf24,#d97706)'
                                            : 'linear-gradient(90deg,#f87171,#dc2626)'
                                    }}
                                />
                            </div>
                            <span className="text-[12px] font-bold text-slate-600 flex-shrink-0">{d.attendanceRate}%</span>
                        </div>
                    </div>

                    <div className="divide-y divide-slate-50 max-h-[400px] overflow-y-auto">
                        {d.teamAttendance.length > 0 ? d.teamAttendance.map((member: any, i: number) => {
                            const initials = member.name?.split(' ').map((p: string) => p[0]).join('').slice(0, 2) ?? '??';
                            const statusColor =
                                member.att_status === 'on_time' ? { dot: 'bg-emerald-500', badge: 'text-emerald-700 bg-emerald-50 border-emerald-100', label: 'Present' } :
                                member.att_status === 'late'    ? { dot: 'bg-amber-500',   badge: 'text-amber-700 bg-amber-50 border-amber-100',     label: 'Late'    } :
                                                                  { dot: 'bg-rose-400',    badge: 'text-rose-700 bg-rose-50 border-rose-100',         label: 'Absent'  };
                            return (
                                <div key={i} className="flex items-center gap-4 px-6 py-3.5 hover:bg-slate-50 transition-colors">
                                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-[12px] font-bold text-white flex-shrink-0">
                                        {initials}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[13px] font-semibold text-slate-800 truncate">{member.name}</p>
                                        {member.check_in && (
                                            <p className="text-[11px] text-slate-400 mt-0.5">
                                                Checked in at {new Date(member.check_in).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                            </p>
                                        )}
                                    </div>
                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${statusColor.badge}`}>
                                        {statusColor.label}
                                    </span>
                                </div>
                            );
                        }) : (
                            <div className="py-16 text-center">
                                <Users size={28} className="text-slate-200 mx-auto mb-2" />
                                <p className="text-[12px] text-slate-400">No team members assigned yet</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Panel */}
                <div className="col-span-12 lg:col-span-4 space-y-4">

                    {/* Pending Leave Requests */}
                    <div className="bg-white rounded-2xl border border-slate-100 p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-[14px] font-bold text-slate-800">Leave Requests</h3>
                            <button onClick={() => navigate('/leave')}
                                className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                                Manage <ArrowUpRight size={11} />
                            </button>
                        </div>
                        <div className="space-y-2.5">
                            {d.pendingLeaves.slice(0, 4).map((lr: any) => (
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
                            ))}
                            {d.pendingLeaves.length === 0 && (
                                <div className="py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                    <CalendarDays size={20} className="text-slate-200 mx-auto mb-1.5" />
                                    <p className="text-[11px] text-slate-400">No pending requests</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Timesheet Status */}
                    <div className="bg-white rounded-2xl border border-slate-100 p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-[14px] font-bold text-slate-800">Timesheets</h3>
                            <button onClick={() => navigate('/timesheet')}
                                className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                                View <ArrowUpRight size={11} />
                            </button>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { label: 'Submitted', val: d.timesheetStatus?.submitted || 0, color: 'text-indigo-600', bg: 'bg-indigo-50',  border: 'border-indigo-100' },
                                { label: 'Approved',  val: d.timesheetStatus?.approved  || 0, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
                                { label: 'Pending',   val: d.timesheetStatus?.pending   || 0, color: 'text-amber-600',  bg: 'bg-amber-50',   border: 'border-amber-100' },
                            ].map(s => (
                                <div key={s.label} className={`text-center p-3 rounded-xl ${s.bg} border ${s.border}`}>
                                    <p className={`text-[22px] font-black ${s.color} tabular-nums`}>{s.val}</p>
                                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wide mt-1">{s.label}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Late Check-ins */}
                    {d.lateCheckins?.length > 0 && (
                        <div className="bg-white rounded-2xl border border-slate-100 p-5">
                            <h3 className="text-[14px] font-bold text-slate-800 mb-3">Late Check-ins</h3>
                            <div className="space-y-2">
                                {d.lateCheckins.slice(0, 3).map((lc: any, i: number) => (
                                    <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-amber-50 border border-amber-100">
                                        <Clock size={13} className="text-amber-600 flex-shrink-0" />
                                        <p className="text-[12px] font-medium text-amber-800 truncate flex-1">{lc.name}</p>
                                        <span className="text-[10px] font-bold text-amber-600 flex-shrink-0">
                                            {lc.check_in ? new Date(lc.check_in).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '—'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
