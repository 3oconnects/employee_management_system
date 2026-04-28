import React from 'react';
import {
    Users, CreditCard, CheckCircle2, Clock, UserPlus,
    ArrowUpRight, Activity, TrendingUp, TrendingDown,
    BarChart2, CalendarDays, ShieldCheck, FileText,
    AlertCircle, ChevronRight, DollarSign
} from 'lucide-react';

interface AdminStats {
    totalEmployees: number;
    activeEmployees: number;
    inactiveEmployees: number;
    newHiresThisMonth: number;
    exitedThisMonth: number;
    totalPayrollCost: number;
    avgSalary: number;
    pendingLeaves: number;
    pendingTimesheets: number;
    pendingApprovals?: number;
    todayPresent: number;
    onLeaveToday: number;
    avgAttendanceRate: number;
    attritionRate: number;
    headcountGrowth: number;
    genderDistribution: { male: number; female: number; other: number };
    departmentDistribution: { name: string; count: number; percentage: number }[];
    employmentTypeBreakdown: { type: string; count: number }[];
    monthlyHiringTrend: { month: string; hires: number; exits: number }[];
    payrollTrend: { month: string; amount: number }[];
    recentActivities: any[];
    upcomingHolidays: any[];
}

import type { OrgSection } from './OrgSubNav';

interface AdminDashboardProps {
    data: AdminStats;
    navigate: (path: string) => void;
    section?: OrgSection;
}

const fmtCurrency = (n: number) => {
    if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
    if (n >= 100000)   return `₹${(n / 100000).toFixed(1)}L`;
    if (n >= 1000)     return `₹${(n / 1000).toFixed(0)}K`;
    return `₹${n}`;
};

const DEPT_COLORS = ['#4F46E5','#7C3AED','#2563EB','#059669','#DB2777','#D97706'];

/* ─── Mini KPI card ─────────────────────────────────────────── */
interface KpiCardProps {
    label:   string;
    value:   string | number;
    icon:    React.ElementType;
    iconBg:  string;
    iconColor: string;
    sub?:    string;
    trend?:  { value: string; up: boolean };
    onClick?: () => void;
}
const KpiCard: React.FC<KpiCardProps> = ({ label, value, icon: Icon, iconBg, iconColor, sub, trend, onClick }) => (
    <button
        onClick={onClick}
        className={`bg-white rounded-2xl border border-slate-100 p-5 text-left transition-all duration-200 group
            ${onClick ? 'hover:border-indigo-200 hover:shadow-md hover:shadow-indigo-50 cursor-pointer' : 'cursor-default'}`}
    >
        <div className="flex items-start justify-between mb-4">
            <div className={`w-10 h-10 ${iconBg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                <Icon size={18} className={iconColor} />
            </div>
            {trend && (
                <span className={`flex items-center gap-0.5 text-[11px] font-bold px-2 py-0.5 rounded-full
                    ${trend.up ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'}`}>
                    {trend.up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                    {trend.value}
                </span>
            )}
            {onClick && <ChevronRight size={14} className="text-slate-200 group-hover:text-indigo-400 transition-colors mt-0.5" />}
        </div>
        <p className="text-[26px] font-black text-slate-800 leading-none tabular-nums">{value}</p>
        <p className="text-[11px] font-semibold text-slate-500 mt-1.5 uppercase tracking-wide">{label}</p>
        {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
    </button>
);

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ data: d, navigate, section = 'overview' }) => {
    const presentRate = d.activeEmployees > 0
        ? Math.round((d.todayPresent / d.activeEmployees) * 100)
        : 0;

    const SHORTCUTS = [
        { icon: UserPlus,    label: 'New Onboarding',     path: '/onboarding',  color: 'text-indigo-600', bg: 'bg-indigo-50' },
        { icon: DollarSign,  label: 'Run Payroll',         path: '/payroll',     color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { icon: BarChart2,   label: 'View Reports',        path: '/reports',     color: 'text-violet-600',  bg: 'bg-violet-50' },
        { icon: CalendarDays,label: 'Leave Requests',      path: '/leave',       color: 'text-amber-600',   bg: 'bg-amber-50' },
        { icon: ShieldCheck, label: 'Audit Logs',          path: '/audit-logs',  color: 'text-rose-600',    bg: 'bg-rose-50' },
        { icon: FileText,    label: 'Timesheets',          path: '/timesheet',   color: 'text-sky-600',     bg: 'bg-sky-50' },
    ];

    return (
        <div className="space-y-5 page-enter">

            {/* ── KPI Row (show in: pulse, people, finance, attendance) ── */}
            {(section === 'overview' || section === 'people' || section === 'finance' || section === 'attendance') && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                <KpiCard
                    label="Active Employees"
                    value={d.activeEmployees}
                    icon={Users}
                    iconBg="bg-indigo-50" iconColor="text-indigo-600"
                    trend={{ value: `${d.headcountGrowth > 0 ? '+' : ''}${d.headcountGrowth}%`, up: d.headcountGrowth >= 0 }}
                    onClick={() => navigate('/employees')}
                />
                <KpiCard
                    label="Monthly Payroll"
                    value={fmtCurrency(d.totalPayrollCost)}
                    icon={CreditCard}
                    iconBg="bg-emerald-50" iconColor="text-emerald-600"
                    sub={`Avg ${fmtCurrency(d.avgSalary)}/emp`}
                    onClick={() => navigate('/payroll')}
                />
                <KpiCard
                    label="Present Today"
                    value={`${presentRate}%`}
                    icon={CheckCircle2}
                    iconBg="bg-sky-50" iconColor="text-sky-600"
                    sub={`${d.todayPresent} of ${d.activeEmployees}`}
                    onClick={() => navigate('/attendance')}
                />
                <KpiCard
                    label="Pending Leaves"
                    value={d.pendingLeaves}
                    icon={CalendarDays}
                    iconBg="bg-amber-50" iconColor="text-amber-600"
                    onClick={() => navigate('/leave')}
                />
                <KpiCard
                    label="New Hires"
                    value={d.newHiresThisMonth}
                    icon={UserPlus}
                    iconBg="bg-violet-50" iconColor="text-violet-600"
                    sub="This month"
                    onClick={() => navigate('/onboarding')}
                />
                <KpiCard
                    label="Attrition Rate"
                    value={`${d.attritionRate}%`}
                    icon={Activity}
                    iconBg="bg-rose-50" iconColor="text-rose-600"
                    sub="Annualized"
                />
            </div>
            )}

            {/* ── Main Content Grid (show in: pulse, people, approvals) ── */}
            {(section === 'overview' || section === 'people' || section === 'approvals') && (
            <div className="grid grid-cols-12 gap-4">

                {/* Department Distribution */}
                <div className="col-span-12 lg:col-span-7 bg-white rounded-2xl border border-slate-100 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-[15px] font-bold text-slate-800">Workforce by Department</h3>
                            <p className="text-[11px] text-slate-400 mt-0.5">{d.totalEmployees} total employees across {d.departmentDistribution.length} departments</p>
                        </div>
                        <button onClick={() => navigate('/employees')}
                            className="flex items-center gap-1.5 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 transition-colors">
                            View All <ArrowUpRight size={12} />
                        </button>
                    </div>

                    <div className="space-y-3.5">
                        {d.departmentDistribution.slice(0, 7).map((dept, i) => (
                            <div key={dept.name} className="group">
                                <div className="flex justify-between items-center mb-1.5">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: DEPT_COLORS[i % 6] }} />
                                        <span className="text-[13px] font-medium text-slate-700">{dept.name}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-[11px] text-slate-400">{dept.percentage}%</span>
                                        <span className="text-[13px] font-bold text-slate-800 w-6 text-right">{dept.count}</span>
                                    </div>
                                </div>
                                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full rounded-full transition-all duration-700 ease-out"
                                        style={{ width: `${dept.percentage}%`, backgroundColor: DEPT_COLORS[i % 6] }}
                                    />
                                </div>
                            </div>
                        ))}
                        {d.departmentDistribution.length === 0 && (
                            <div className="py-12 text-center">
                                <Users size={32} className="text-slate-200 mx-auto mb-2" />
                                <p className="text-[12px] text-slate-400">No department data yet</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="col-span-12 lg:col-span-5 space-y-4">
                    <div className="bg-white rounded-2xl border border-slate-100 p-6">
                        <h3 className="text-[15px] font-bold text-slate-800 mb-4">Quick Actions</h3>
                        <div className="space-y-2">
                            {SHORTCUTS.map(a => (
                                <button
                                    key={a.label}
                                    onClick={() => navigate(a.path)}
                                    className="w-full flex items-center gap-3.5 p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all group"
                                >
                                    <div className={`w-9 h-9 ${a.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                                        <a.icon size={16} className={a.color} />
                                    </div>
                                    <span className="text-[13px] font-medium text-slate-700 group-hover:text-slate-900 flex-1 text-left">{a.label}</span>
                                    <ArrowUpRight size={14} className="text-slate-200 group-hover:text-indigo-400 transition-colors" />
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Today Summary */}
                    <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl p-6 text-white">
                        <h3 className="text-[13px] font-bold text-white/70 uppercase tracking-wide mb-4">Today's Snapshot</h3>
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { label: 'Present',       val: d.todayPresent,        icon: '✅' },
                                { label: 'On Leave',      val: d.onLeaveToday,         icon: '🏖️' },
                                { label: 'Pending TS',    val: d.pendingTimesheets,    icon: '📋' },
                                { label: 'Exits / Month', val: d.exitedThisMonth,      icon: '🚪' },
                            ].map(s => (
                                <div key={s.label} className="bg-white/10 rounded-xl p-3">
                                    <p className="text-[18px] font-black tabular-nums">{s.val}</p>
                                    <p className="text-[10px] text-white/60 uppercase tracking-wide mt-0.5">{s.icon} {s.label}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            )}

            {/* ── Hiring Trend + Recent Activity (show in: pulse, finance) ── */}
            {(section === 'overview' || section === 'finance') && (
            <div className="grid grid-cols-12 gap-4">

                {/* Hiring Trend */}
                {d.monthlyHiringTrend.length > 0 && (
                    <div className="col-span-12 lg:col-span-5 bg-white rounded-2xl border border-slate-100 p-6">
                        <h3 className="text-[15px] font-bold text-slate-800 mb-1">Hiring vs. Attrition</h3>
                        <p className="text-[11px] text-slate-400 mb-5">Last 6 months trend</p>
                        <div className="space-y-3">
                            {d.monthlyHiringTrend.slice(-6).map(m => {
                                const maxVal = Math.max(...d.monthlyHiringTrend.map(x => Math.max(x.hires, x.exits)), 1);
                                return (
                                    <div key={m.month} className="flex items-center gap-3">
                                        <span className="text-[11px] text-slate-400 w-14 flex-shrink-0">{m.month.split(' ')[0]}</span>
                                        <div className="flex-1 space-y-1">
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(m.hires / maxVal) * 100}%` }} />
                                                </div>
                                                <span className="text-[11px] font-bold text-indigo-600 w-4 text-right">{m.hires}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                    <div className="h-full bg-rose-400 rounded-full" style={{ width: `${(m.exits / maxVal) * 100}%` }} />
                                                </div>
                                                <span className="text-[11px] font-bold text-rose-500 w-4 text-right">{m.exits}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-100">
                            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-indigo-500 rounded-full" /><span className="text-[11px] text-slate-500">Hires</span></div>
                            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-rose-400 rounded-full" /><span className="text-[11px] text-slate-500">Exits</span></div>
                        </div>
                    </div>
                )}

                {/* Recent Activity */}
                <div className={`${d.monthlyHiringTrend.length > 0 ? 'col-span-12 lg:col-span-7' : 'col-span-12'} bg-white rounded-2xl border border-slate-100 overflow-hidden`}>
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                        <div>
                            <h3 className="text-[15px] font-bold text-slate-800">Recent Activity</h3>
                            <p className="text-[11px] text-slate-400 mt-0.5">System audit log</p>
                        </div>
                        <button onClick={() => navigate('/audit-logs')}
                            className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                            View all <ArrowUpRight size={12} />
                        </button>
                    </div>
                    <div className="divide-y divide-slate-50">
                        {d.recentActivities.length > 0 ? d.recentActivities.slice(0, 6).map((act: any, i: number) => (
                            <div key={act.id || i} className="flex items-center gap-4 px-6 py-3.5 hover:bg-slate-50 transition-colors">
                                <div className="w-8 h-8 bg-indigo-50 rounded-xl flex items-center justify-center flex-shrink-0">
                                    <Activity size={14} className="text-indigo-500" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="text-[13px] font-semibold text-slate-800 truncate">{act.action}</p>
                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-500 uppercase flex-shrink-0">{act.entity_type}</span>
                                    </div>
                                    <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                                        by <span className="font-medium text-slate-600">{act.user_name || 'System'}</span>
                                    </p>
                                </div>
                                <p className="text-[11px] text-slate-400 flex-shrink-0">
                                    {new Date(act.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                        )) : (
                            <div className="py-16 text-center">
                                <Activity size={28} className="text-slate-200 mx-auto mb-2" />
                                <p className="text-[12px] text-slate-400">No recent activity</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            )}

            {/* ── Upcoming Holidays (show in: pulse, attendance) ── */}
            {(section === 'overview' || section === 'attendance') && d.upcomingHolidays.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-100 p-6">
                    <h3 className="text-[15px] font-bold text-slate-800 mb-4">Upcoming Holidays</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                        {d.upcomingHolidays.slice(0, 5).map((h: any) => (
                            <div key={h.name} className="flex items-center gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-100 hover:border-indigo-200 transition-all">
                                <div className="w-10 h-10 bg-white rounded-xl flex flex-col items-center justify-center border border-slate-200 flex-shrink-0 shadow-sm">
                                    <span className="text-[9px] font-bold text-indigo-500 uppercase">{new Date(h.date).toLocaleDateString('en-IN', { month: 'short' })}</span>
                                    <span className="text-[15px] font-black text-slate-800 leading-none">{new Date(h.date).getDate()}</span>
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[12px] font-semibold text-slate-700 truncate">{h.name}</p>
                                    <p className="text-[10px] text-slate-400">{new Date(h.date).toLocaleDateString('en-IN', { weekday: 'short' })}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
