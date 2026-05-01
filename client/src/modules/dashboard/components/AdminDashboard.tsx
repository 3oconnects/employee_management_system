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
        <div className="space-y-6 page-enter">

            {/* ── KPI Row: Command Center ─────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KpiCard
                    label="Total Workforce"
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
                    label="Operations Health"
                    value={`${presentRate}%`}
                    icon={CheckCircle2}
                    iconBg="bg-sky-50" iconColor="text-sky-600"
                    sub={`${d.todayPresent} present today`}
                    onClick={() => navigate('/attendance')}
                />
                <KpiCard
                    label="Action Required"
                    value={d.pendingLeaves + d.pendingTimesheets}
                    icon={ShieldCheck}
                    iconBg="bg-amber-50" iconColor="text-amber-600"
                    sub="Pending approvals"
                    onClick={() => navigate('/leave')}
                />
            </div>

            {/* ── OVERVIEW: High-level Snapshot ────────────────────── */}
            {section === 'overview' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full items-stretch">
                    
                    {/* Primary Operations (Leave/TS) */}
                    <div className="bg-white rounded-2xl border border-slate-100 p-6 flex flex-col">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-[14px] font-bold text-slate-800">Operational Pulse</h3>
                            <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full uppercase tracking-wider">Live</span>
                        </div>
                        <div className="space-y-3 flex-1">
                            {[
                                { label: 'Pending Leave Requests', val: d.pendingLeaves,     color: 'text-amber-600',   bg: 'bg-amber-50',  path: '/leave' },
                                { label: 'Pending Timesheets',     val: d.pendingTimesheets, color: 'text-indigo-600',  bg: 'bg-indigo-50', path: '/timesheet' },
                                { label: 'New Hires (Month)',      val: d.newHiresThisMonth, color: 'text-emerald-600', bg: 'bg-emerald-50',path: '/onboarding' },
                            ].map(o => (
                                <button key={o.label} onClick={() => navigate(o.path)}
                                    className="w-full flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all group">
                                    <span className="text-[12px] font-semibold text-slate-600 group-hover:text-slate-900 transition-colors">{o.label}</span>
                                    <div className={`px-2.5 py-0.5 rounded-lg ${o.bg} ${o.color} text-[15px] font-black tabular-nums border border-transparent group-hover:border-current/10`}>
                                        {o.val}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Quick Access Grid */}
                    <div className="bg-white rounded-2xl border border-slate-100 p-6 flex flex-col">
                        <h3 className="text-[14px] font-bold text-slate-800 mb-5">Command Shortcuts</h3>
                        <div className="grid grid-cols-2 gap-3 flex-1">
                            {SHORTCUTS.slice(0, 4).map(a => (
                                <button key={a.label} onClick={() => navigate(a.path)}
                                    className="flex flex-col items-center justify-center p-4 rounded-xl bg-slate-50 border border-slate-100 hover:border-indigo-200 hover:bg-white hover:shadow-md transition-all group">
                                    <div className={`w-10 h-10 ${a.bg} rounded-xl flex items-center justify-center mb-2.5`}>
                                        <a.icon size={18} className={a.color} />
                                    </div>
                                    <span className="text-[11px] font-bold text-slate-600 group-hover:text-slate-900 text-center leading-tight">{a.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Today's Snapshot */}
                    <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl p-6 text-white flex flex-col justify-between shadow-lg shadow-indigo-500/20">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-[12px] font-bold text-white/70 uppercase tracking-widest">Today's Pulse</h3>
                            <Activity size={14} className="text-white/40" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { label: 'Present', val: d.todayPresent, icon: '✅' },
                                { label: 'Away',    val: d.onLeaveToday,  icon: '🏖️' },
                            ].map(s => (
                                <div key={s.label} className="bg-white/10 rounded-xl p-4 border border-white/10">
                                    <p className="text-[22px] font-black tabular-nums leading-none mb-1">{s.val}</p>
                                    <p className="text-[10px] text-white/60 uppercase font-bold">{s.label}</p>
                                </div>
                            ))}
                        </div>
                        <div className="mt-4 pt-4 border-t border-white/10">
                            <button onClick={() => navigate('/attendance')}
                                className="w-full py-2 bg-white/10 hover:bg-white/20 rounded-xl text-[11px] font-bold transition-all">
                                View Detailed Attendance
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── ORGANIZATION: People ───────────────────────────── */}
            {section === 'people' && (
                <div className="grid grid-cols-12 gap-4">
                    {/* Department Distribution */}
                    <div className="col-span-12 lg:col-span-7 bg-white rounded-2xl border border-slate-100 p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-[15px] font-bold text-slate-800">Workforce by Department</h3>
                                <p className="text-[11px] text-slate-400 mt-0.5">{d.totalEmployees} total employees</p>
                            </div>
                            <button onClick={() => navigate('/employees')} className="text-[11px] font-semibold text-indigo-600 flex items-center gap-1">
                                Directory <ArrowUpRight size={12} />
                            </button>
                        </div>
                        <div className="space-y-4">
                            {d.departmentDistribution.map((dept, i) => (
                                <div key={dept.name}>
                                    <div className="flex justify-between items-center mb-1.5">
                                        <span className="text-[13px] font-medium text-slate-700">{dept.name}</span>
                                        <span className="text-[13px] font-bold text-slate-800">{dept.count}</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                        <div className="h-full rounded-full bg-indigo-500" style={{ width: `${dept.percentage}%`, backgroundColor: DEPT_COLORS[i % 6] }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Hiring Trends */}
                    <div className="col-span-12 lg:col-span-5 bg-white rounded-2xl border border-slate-100 p-6">
                        <h3 className="text-[15px] font-bold text-slate-800 mb-5">Hiring vs. Attrition</h3>
                        <div className="space-y-4">
                            {d.monthlyHiringTrend.slice(-5).map(m => (
                                <div key={m.month} className="flex items-center gap-3">
                                    <span className="text-[11px] text-slate-400 w-12">{m.month.split(' ')[0]}</span>
                                    <div className="flex-1 flex gap-0.5 h-6">
                                        <div className="bg-indigo-500 rounded-l" style={{ width: `${(m.hires / 10) * 100}%` }} />
                                        <div className="bg-rose-400 rounded-r" style={{ width: `${(m.exits / 10) * 100}%` }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-4 mt-6 text-[10px] font-bold uppercase text-slate-400">
                            <span className="flex items-center gap-1.5"><div className="w-2 h-2 bg-indigo-500 rounded-full" /> Hires</span>
                            <span className="flex items-center gap-1.5"><div className="w-2 h-2 bg-rose-400 rounded-full" /> Exits</span>
                        </div>
                    </div>
                </div>
            )}

            {/* ── ORGANIZATION: Finance ──────────────────────────── */}
            {section === 'finance' && (
                <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-12 bg-white rounded-2xl border border-slate-100 p-6">
                        <h3 className="text-[15px] font-bold text-slate-800 mb-6">Payroll Summary</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="p-5 bg-emerald-50 border border-emerald-100 rounded-2xl">
                                <p className="text-[11px] font-bold text-emerald-600 uppercase mb-2">Total Monthly Payout</p>
                                <p className="text-[32px] font-black text-emerald-700">{fmtCurrency(d.totalPayrollCost)}</p>
                            </div>
                            <div className="p-5 bg-indigo-50 border border-indigo-100 rounded-2xl">
                                <p className="text-[11px] font-bold text-indigo-600 uppercase mb-2">Average Salary</p>
                                <p className="text-[32px] font-black text-indigo-700">{fmtCurrency(d.avgSalary)}</p>
                            </div>
                            <div className="p-5 bg-slate-50 border border-slate-100 rounded-2xl">
                                <p className="text-[11px] font-bold text-slate-500 uppercase mb-2">Attrition Cost (Est.)</p>
                                <p className="text-[32px] font-black text-slate-700">{d.attritionRate}%</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── ORGANIZATION: Audit/Activity ───────────────────── */}
            {(section === 'overview' || section === 'pulse') && (
                <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                        <h3 className="text-[15px] font-bold text-slate-800">Recent System Activity</h3>
                        <button onClick={() => navigate('/audit-logs')} className="text-[11px] font-bold text-indigo-600">Audit Logs</button>
                    </div>
                    <div className="divide-y divide-slate-50">
                        {d.recentActivities.slice(0, 5).map((act, i) => (
                            <div key={i} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors">
                                <div className="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center"><Activity size={14} className="text-slate-400" /></div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[13px] font-semibold text-slate-800">{act.action}</p>
                                    <p className="text-[11px] text-slate-400">by {act.user_name || 'System'}</p>
                                </div>
                                <span className="text-[11px] text-slate-400">{new Date(act.created_at).toLocaleTimeString()}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
