import React from 'react';
import {
    CheckCircle2, Clock, AlertTriangle, CalendarDays,
    CreditCard, ArrowUpRight, ChevronRight, BarChart2,
    Smile, UserCircle
} from 'lucide-react';

interface EmpDashData {
    attendance:      { status: string; checkIn: string | null; totalHoursToday: string };
    monthlySummary:  { presentDays: number; avgHours: string; lateDays: number };
    leaveBalances:   { leave_type_id: number; name: string; annual_quota: number; used: number; available: number }[];
    upcomingHolidays: any[];
    recentPayslip:   any;
    notifications:   any[];
    weeklyHours:     { day: string; date: string; hours: string }[];
}

interface EmployeeDashboardProps {
    data:       EmpDashData;
    navigate:   (path: string) => void;
    elapsed:    number;
    onCheckIn:  () => void;
    onCheckOut: () => void;
    checkingIn: boolean;
}

const LEAVE_COLORS = ['#4F46E5', '#059669', '#D97706', '#7C3AED', '#DB2777'];

export const EmployeeDashboard: React.FC<EmployeeDashboardProps> = ({
    data: d, navigate
}) => {
    const hoursToday = parseFloat(d.attendance.totalHoursToday) || 0;
    const maxWeekHours = Math.max(...(d.weeklyHours.map(w => parseFloat(w.hours) || 0)), 8);

    return (
        <div className="space-y-5 page-enter">

            {/* ── Monthly Summary KPIs ──────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                    {
                        label: 'Days Present',
                        value: d.monthlySummary.presentDays,
                        icon: CheckCircle2,
                        iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600',
                        sub: 'This month',
                    },
                    {
                        label: 'Avg Daily Hours',
                        value: `${d.monthlySummary.avgHours}h`,
                        icon: Clock,
                        iconBg: 'bg-indigo-50', iconColor: 'text-indigo-600',
                        sub: 'Working hours',
                    },
                    {
                        label: 'Late Arrivals',
                        value: d.monthlySummary.lateDays,
                        icon: AlertTriangle,
                        iconBg: d.monthlySummary.lateDays > 3 ? 'bg-rose-50' : 'bg-amber-50',
                        iconColor: d.monthlySummary.lateDays > 3 ? 'text-rose-600' : 'text-amber-600',
                        sub: 'This month',
                    },
                    {
                        label: 'Hours Today',
                        value: `${hoursToday.toFixed(1)}h`,
                        icon: BarChart2,
                        iconBg: 'bg-violet-50', iconColor: 'text-violet-600',
                        sub: d.attendance.status === 'IN' ? '● Session active' : d.attendance.status === 'COMPLETED' ? '✓ Day complete' : 'Not started',
                    },
                ].map(card => (
                    <div key={card.label} className="bg-white rounded-2xl border border-slate-100 p-5">
                        <div className={`w-9 h-9 ${card.iconBg} rounded-xl flex items-center justify-center mb-4`}>
                            <card.icon size={17} className={card.iconColor} />
                        </div>
                        <p className="text-[26px] font-black text-slate-800 leading-none tabular-nums">{card.value}</p>
                        <p className="text-[11px] font-semibold text-slate-500 mt-1.5 uppercase tracking-wide">{card.label}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{card.sub}</p>
                    </div>
                ))}
            </div>

            {/* ── Main Content Grid ─────────────────────────────── */}
            <div className="grid grid-cols-12 gap-4">

                {/* Leave Balances */}
                <div className="col-span-12 lg:col-span-7 bg-white rounded-2xl border border-slate-100 p-6">
                    <div className="flex items-center justify-between mb-5">
                        <div>
                            <h3 className="text-[15px] font-bold text-slate-800">Leave Balance</h3>
                            <p className="text-[11px] text-slate-400 mt-0.5">Your leave allowances for {new Date().getFullYear()}</p>
                        </div>
                        <button
                            onClick={() => navigate('/leave')}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-[11px] font-semibold rounded-xl hover:bg-indigo-500 transition-all shadow-sm shadow-indigo-500/20"
                        >
                            Apply Leave <ArrowUpRight size={11} />
                        </button>
                    </div>

                    {d.leaveBalances.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {d.leaveBalances.map((lb, i) => {
                                const pct = lb.annual_quota > 0 ? Math.round((lb.available / lb.annual_quota) * 100) : 0;
                                const color = LEAVE_COLORS[i % 5];
                                return (
                                    <div key={lb.leave_type_id}
                                        className="p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/20 transition-all">
                                        <div className="flex items-center justify-between mb-3">
                                            <p className="text-[12px] font-semibold text-slate-600">{lb.name}</p>
                                            <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold border`}
                                                style={{ color, backgroundColor: `${color}15`, borderColor: `${color}30` }}>
                                                {lb.available} left
                                            </div>
                                        </div>
                                        <div className="flex items-end gap-2 mb-2.5">
                                            <span className="text-[28px] font-black text-slate-800 leading-none tabular-nums">{lb.available}</span>
                                            <span className="text-[13px] text-slate-400 mb-0.5">/ {lb.annual_quota} days</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                                            <div
                                                className="h-full rounded-full transition-all duration-700 ease-out"
                                                style={{ width: `${pct}%`, backgroundColor: color }}
                                            />
                                        </div>
                                        <p className="text-[10px] text-slate-400 mt-2">{lb.used} used · {pct}% remaining</p>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="py-12 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                            <CalendarDays size={24} className="text-slate-200 mx-auto mb-2" />
                            <p className="text-[12px] text-slate-400">Leave balances will appear here</p>
                        </div>
                    )}
                </div>

                {/* Right Column */}
                <div className="col-span-12 lg:col-span-5 space-y-4">

                    {/* Weekly Hours Chart */}
                    {d.weeklyHours.length > 0 && (
                        <div className="bg-white rounded-2xl border border-slate-100 p-5">
                            <h3 className="text-[14px] font-bold text-slate-800 mb-4">This Week's Hours</h3>
                            <div className="flex items-end gap-2 h-28">
                                {d.weeklyHours.map((w, i) => {
                                    const hrs = parseFloat(w.hours) || 0;
                                    const heightPct = maxWeekHours > 0 ? (hrs / maxWeekHours) * 100 : 0;
                                    const isToday = w.date === new Date().toISOString().slice(0, 10);
                                    return (
                                        <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                                            <span className="text-[9px] font-bold text-slate-400 tabular-nums">{hrs > 0 ? `${hrs.toFixed(1)}` : ''}</span>
                                            <div className="w-full flex items-end" style={{ height: '72px' }}>
                                                <div
                                                    className={`w-full rounded-t-lg transition-all duration-500 ${isToday ? 'bg-indigo-600' : 'bg-slate-200'}`}
                                                    style={{ height: `${Math.max(heightPct, hrs > 0 ? 8 : 0)}%` }}
                                                />
                                            </div>
                                            <span className={`text-[10px] font-semibold ${isToday ? 'text-indigo-600' : 'text-slate-400'}`}>{w.day}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Upcoming Holidays */}
                    <div className="bg-white rounded-2xl border border-slate-100 p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-[14px] font-bold text-slate-800">Upcoming Holidays</h3>
                        </div>
                        {d.upcomingHolidays.length > 0 ? (
                            <div className="space-y-2.5">
                                {d.upcomingHolidays.slice(0, 4).map((h: any) => {
                                    const daysUntil = Math.ceil((new Date(h.date).getTime() - Date.now()) / 86400000);
                                    return (
                                        <div key={h.name} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-indigo-200 transition-all">
                                            <div className="w-10 h-10 bg-white rounded-xl flex flex-col items-center justify-center border border-slate-200 flex-shrink-0">
                                                <span className="text-[8px] font-bold text-indigo-500 uppercase">{new Date(h.date).toLocaleDateString('en-IN', { month: 'short' })}</span>
                                                <span className="text-[14px] font-black text-slate-800 leading-none">{new Date(h.date).getDate()}</span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[12px] font-semibold text-slate-700 truncate">{h.name}</p>
                                                <p className="text-[10px] text-slate-400">{new Date(h.date).toLocaleDateString('en-IN', { weekday: 'long' })}</p>
                                            </div>
                                            {daysUntil <= 7 && daysUntil >= 0 && (
                                                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full flex-shrink-0">
                                                    {daysUntil === 0 ? 'Today' : `${daysUntil}d`}
                                                </span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                <Smile size={20} className="text-slate-200 mx-auto mb-1.5" />
                                <p className="text-[11px] text-slate-400">No holidays coming up soon</p>
                            </div>
                        )}
                    </div>

                    {/* Recent Payslip */}
                    {d.recentPayslip && (
                        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-5 text-white">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
                                        <CreditCard size={15} className="text-white" />
                                    </div>
                                    <div>
                                        <p className="text-[12px] font-bold text-white">Latest Payslip</p>
                                        <p className="text-[10px] text-white/50">{d.recentPayslip.month} {d.recentPayslip.year}</p>
                                    </div>
                                </div>
                                <button onClick={() => navigate('/payroll')}
                                    className="text-[10px] font-semibold text-white/60 hover:text-white/90 flex items-center gap-1">
                                    Details <ArrowUpRight size={11} />
                                </button>
                            </div>
                            <p className="text-[28px] font-black tabular-nums">
                                ₹{Number(d.recentPayslip.net_salary || 0).toLocaleString('en-IN')}
                            </p>
                            <p className="text-[10px] text-white/40 mt-1 uppercase tracking-wide">Net Take-home</p>
                            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/10">
                                <div>
                                    <p className="text-[10px] text-white/40 uppercase">Gross</p>
                                    <p className="text-[13px] font-bold">₹{Number(d.recentPayslip.gross_salary || 0).toLocaleString('en-IN')}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-white/40 uppercase">Deductions</p>
                                    <p className="text-[13px] font-bold text-rose-400">₹{Number(d.recentPayslip.deductions || 0).toLocaleString('en-IN')}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Quick Links */}
                    <div className="bg-white rounded-2xl border border-slate-100 p-5">
                        <h3 className="text-[14px] font-bold text-slate-800 mb-3">Quick Access</h3>
                        <div className="space-y-1.5">
                            {[
                                { icon: Clock,       label: 'Attendance History', path: '/attendance', color: 'text-indigo-600',  bg: 'bg-indigo-50' },
                                { icon: CalendarDays,label: 'Apply for Leave',    path: '/leave',      color: 'text-emerald-600', bg: 'bg-emerald-50' },
                                { icon: CreditCard,  label: 'Payroll & Payslips', path: '/payroll',    color: 'text-violet-600',  bg: 'bg-violet-50' },
                                { icon: UserCircle,  label: 'My Profile',         path: '/profile',    color: 'text-slate-600',   bg: 'bg-slate-100' },
                            ].map(a => (
                                <button key={a.label} onClick={() => navigate(a.path)}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all group text-left">
                                    <div className={`w-8 h-8 ${a.bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                                        <a.icon size={14} className={a.color} />
                                    </div>
                                    <span className="text-[12px] font-medium text-slate-700 group-hover:text-slate-900 flex-1">{a.label}</span>
                                    <ChevronRight size={13} className="text-slate-200 group-hover:text-slate-400 transition-colors" />
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
