import React, { useState, useEffect } from 'react';
import {
    LogIn, LogOut as LogOutIcon, CheckCircle, CalendarDays, Users, FileText,
    ClipboardList, Bell, TrendingUp, TrendingDown, AlertCircle, Sun, Moon, Sunset,
    ArrowUpRight, ArrowDownRight, Clock, UserCircle, Shield, Loader2, ChevronRight,
    Activity, CreditCard, DollarSign, UserPlus, BarChart2, Building2, Inbox, Timer,
    UserMinus, AlertTriangle, Briefcase, Target, Eye, MapPin, Coffee
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import { useAuthStore } from '../../../store/authStore';

// ============================================================================
// ZOHO-LEVEL ROLE-BASED DASHBOARD — FULL ANALYTICS
// ============================================================================

/* ─── Types ─────────────────────────────────────────────── */
interface AdminStats {
    totalEmployees: number; activeEmployees: number; inactiveEmployees: number;
    newHiresThisMonth: number; exitedThisMonth: number;
    totalPayrollCost: number; avgSalary: number;
    pendingLeaves: number; pendingTimesheets: number; pendingApprovals?: number;
    todayPresent: number; onLeaveToday: number; avgAttendanceRate: number;
    attritionRate: number; headcountGrowth: number;
    genderDistribution: { male: number; female: number; other: number };
    departmentDistribution: { name: string; count: number; percentage: number }[];
    employmentTypeBreakdown: { type: string; count: number }[];
    monthlyHiringTrend: { month: string; hires: number; exits: number }[];
    payrollTrend: { month: string; amount: number }[];
    recentActivities: any[];
    upcomingHolidays: any[];
}

interface ManagerStats {
    teamSize: number; todayPresent: number; todayAbsent: number; todayLate: number;
    attendanceRate: number; pendingLeaveCount: number;
    teamMembers:any[]; teamAttendance: any[]; pendingLeaves: any[];
    lateCheckins: any[]; timesheetStatus: any;
}

interface EmpDashData {
    attendance: { status: string; checkIn: string | null; totalHoursToday: string };
    monthlySummary: { presentDays: number; avgHours: string; lateDays: number };
    leaveBalances: { leave_type_id: number; name: string; annual_quota: number; used: number; available: number }[];
    upcomingHolidays: any[]; recentPayslip: any; notifications: any[];
    weeklyHours: { day: string; date: string; hours: string }[];
}

/* ─── Helpers ────────────────────────────────────────────── */
function getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return { text: 'Good Morning', icon: Sun, sub: 'Ready to seize the day?' };
    if (h < 17) return { text: 'Good Afternoon', icon: Sunset, sub: 'Stay productive!' };
    return { text: 'Good Evening', icon: Moon, sub: 'Wrapping up for the day?' };
}

function fmtClock(ms: number) {
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function fmtCurrency(n: number) {
    if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
    if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
    if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`;
    return `₹${n}`;
}

/* ─── Mini Bar Chart (SVG) ───────────────────────────────── */
const MiniBarChart: React.FC<{ data: number[]; color?: string; height?: number }> = ({
    data, color = '#3B82F6', height = 48
}) => {
    if (!data.length) return null;
    const max = Math.max(...data, 1);
    const w = 100 / data.length;
    return (
        <svg width="100%" height={height} viewBox={`0 0 100 ${height}`} preserveAspectRatio="none">
            {data.map((v, i) => {
                const barH = (v / max) * (height - 4);
                return (
                    <rect key={i} x={i * w + 0.5} y={height - barH} width={w - 1} height={barH}
                        rx={1} fill={color} opacity={0.8} />
                );
            })}
        </svg>
    );
};

/* ─── Donut Chart (SVG) ──────────────────────────────────── */
const DonutChart: React.FC<{ segments: { value: number; color: string; label: string }[]; size?: number }> = ({
    segments, size = 120
}) => {
    const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
    const r = (size - 8) / 2; const cx = size / 2; const cy = size / 2;
    const circumference = 2 * Math.PI * r;
    let offset = 0;
    return (
        <svg width={size} height={size}>
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth={12} />
            {segments.map((seg, i) => {
                const pct = seg.value / total;
                const dash = circumference * pct;
                const gap = circumference - dash;
                const el = (
                    <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={seg.color}
                        strokeWidth={12} strokeDasharray={`${dash} ${gap}`}
                        strokeDashoffset={-offset} strokeLinecap="round"
                        transform={`rotate(-90 ${cx} ${cy})`}
                        className="transition-all duration-700"
                    />
                );
                offset += dash;
                return el;
            })}
            <text x={cx} y={cy - 4} textAnchor="middle" className="fill-gray-900 text-lg font-black">{total}</text>
            <text x={cx} y={cy + 12} textAnchor="middle" className="fill-gray-400 text-[8px] font-semibold uppercase">Total</text>
        </svg>
    );
};

/* ─── Stat Card ──────────────────────────────────────────── */
const StatCard: React.FC<{
    label: string; value: string | number; icon: React.ElementType;
    color: string; bg: string; trend?: string; trendUp?: boolean; onClick?: () => void;
    sub?: string;
}> = ({ label, value, icon: Icon, color, bg, trend, trendUp, onClick, sub }) => (
    <div onClick={onClick}
        className={`bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-all group ${onClick ? 'cursor-pointer' : ''}`}>
        <div className="flex items-center justify-between mb-3">
            <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center ${color} group-hover:scale-110 transition-transform`}>
                <Icon size={18} />
            </div>
            {trend && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5 ${trendUp !== false ? 'text-emerald-600 bg-emerald-50' : 'text-red-500 bg-red-50'}`}>
                    {trendUp !== false ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                    {trend}
                </span>
            )}
        </div>
        <p className="text-2xl font-black text-gray-900 tracking-tight">{value}</p>
        <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider mt-1">{label}</p>
        {sub && <p className="text-[10px] text-gray-300 mt-0.5">{sub}</p>}
    </div>
);

/* ─── Section Header ─────────────────────────────────────── */
const SectionHeader: React.FC<{ title: string; subtitle?: string; action?: { label: string; onClick: () => void } }> = ({
    title, subtitle, action
}) => (
    <div className="flex items-center justify-between mb-4">
        <div>
            <h3 className="text-sm font-bold text-gray-900">{title}</h3>
            {subtitle && <p className="text-[11px] text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
        {action && (
            <button onClick={action.onClick} className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-0.5">
                {action.label} <ChevronRight size={12} />
            </button>
        )}
    </div>
);

/* ═══════════════════════════════════════════════════════════════════════════
 * ██ MAIN DASHBOARD
 * ═══════════════════════════════════════════════════════════════════════════ */
const Dashboard: React.FC = () => {
    const { user, hasAnyRole } = useAuthStore();
    const navigate = useNavigate();
    const isAdmin = hasAnyRole('admin', 'super_admin');
    const isHR = hasAnyRole('hr');
    const isManager = hasAnyRole('manager');
    const isEmployee = hasAnyRole('employee');
    const isAdminOrHR = isAdmin || isHR;

    const [loading, setLoading] = useState(true);
    const [adminData, setAdminData] = useState<AdminStats | null>(null);
    const [mgrData, setMgrData] = useState<ManagerStats | null>(null);
    const [empData, setEmpData] = useState<EmpDashData | null>(null);
    const [elapsed, setElapsed] = useState(0);
    const [checkingIn, setCheckingIn] = useState(false);

    const initials = user?.name?.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2) ?? 'U';
    const greeting = getGreeting();
    const GreetIcon = greeting.icon;

    // ── Load Data ─────────────────────────────────────
    useEffect(() => {
        if (!user?.id) return;
        const load = async () => {
            try {
                if (isAdminOrHR) {
                    const { data } = await api.get('/reports/dashboard');
                    setAdminData(data);
                } else if (isManager) {
                    const { data } = await api.get('/reports/dashboard/manager', { params: { userId: user.id } });
                    setMgrData(data);
                } else if (isEmployee) {
                    const { data } = await api.get('/reports/dashboard/employee', { params: { userId: user.id } });
                    setEmpData(data);
                }
            } catch (err) { console.error('Dashboard load error:', err); }
            finally { setLoading(false); }
        };
        load();
    }, [user?.id]);

    // ── Live Clock for employee ───────────────────────
    useEffect(() => {
        const checkIn = empData?.attendance?.checkIn || (adminData ? null : null);
        const isIn = empData?.attendance?.status === 'IN';
        if (!isIn || !checkIn) { setElapsed(0); return; }
        const base = new Date(checkIn).getTime();
        const tick = () => setElapsed(Date.now() - base);
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [empData]);

    // ── Attendance Actions ────────────────────────────
    const handleCheckIn = async () => {
        if (!user?.id || checkingIn) return;
        setCheckingIn(true);
        try {
            await api.post('/attendance/check-in', { userId: user.id });
            // Refresh employee data
            const { data } = await api.get('/reports/dashboard/employee', { params: { userId: user.id } });
            setEmpData(data);
        } catch {} finally { setCheckingIn(false); }
    };

    const handleCheckOut = async () => {
        if (!user?.id || checkingIn) return;
        setCheckingIn(true);
        try {
            await api.post('/attendance/check-out', { userId: user.id });
            const { data } = await api.get('/reports/dashboard/employee', { params: { userId: user.id } });
            setEmpData(data);
        } catch {} finally { setCheckingIn(false); }
    };

    if (loading) return (
        <div className="flex items-center justify-center h-[70vh]">
            <div className="flex flex-col items-center gap-3">
                <Loader2 className="animate-spin text-blue-500" size={32} />
                <p className="text-sm text-slate-400 font-medium">Loading dashboard...</p>
            </div>
        </div>
    );

    const todayStr = new Date().toLocaleDateString('en-IN', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });

    return (
        <div className="min-h-screen bg-[#F8FAFC] pb-12">
            <div className="max-w-[1440px] mx-auto px-6 py-6 space-y-6">

                {/* ── HERO HEADER ─────────────────────────────── */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center text-white text-lg font-black shadow-lg shadow-blue-200/50 ring-4 ring-white relative">
                            {initials}
                            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-500 border-[3px] border-white rounded-full" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-bold text-gray-900">{greeting.text}, {user?.name?.split(' ')[0]}!</h1>
                                <GreetIcon size={20} className="text-amber-500" />
                            </div>
                            <p className="text-xs text-gray-400 font-medium mt-0.5">{greeting.sub}</p>
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                            <Shield size={10} />
                            <span>{user?.role?.replace('_', ' ')}</span>
                        </div>
                        <p className="text-xs text-gray-500 font-medium">{todayStr}</p>
                    </div>
                </div>

                {/* ═══ ADMIN / HR DASHBOARD ═══════════════════════════════════ */}
                {isAdminOrHR && adminData && <AdminDashboard data={adminData} navigate={navigate} />}

                {/* ═══ MANAGER DASHBOARD ══════════════════════════════════════ */}
                {isManager && !isAdminOrHR && mgrData && <ManagerDashboardView data={mgrData} navigate={navigate} userId={user!.id} onCheckIn={handleCheckIn} onCheckOut={handleCheckOut} checkingIn={checkingIn} />}

                {/* ═══ EMPLOYEE DASHBOARD ═════════════════════════════════════ */}
                {isEmployee && !isManager && !isAdminOrHR && empData && <EmployeeDashboardView data={empData} navigate={navigate} elapsed={elapsed} onCheckIn={handleCheckIn} onCheckOut={handleCheckOut} checkingIn={checkingIn} />}
            </div>
        </div>
    );
};

/* ═══════════════════════════════════════════════════════════════════════════
 * ██ ADMIN DASHBOARD COMPONENT
 * ═══════════════════════════════════════════════════════════════════════════ */
const AdminDashboard: React.FC<{ data: AdminStats; navigate: any }> = ({ data: d, navigate }) => (
    <>
        {/* Row 1: Primary KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            <StatCard label="Active Employees" value={d.activeEmployees} icon={Users}
                color="text-blue-600" bg="bg-blue-50"
                trend={d.headcountGrowth > 0 ? `+${d.headcountGrowth}%` : `${d.headcountGrowth}%`}
                trendUp={d.headcountGrowth >= 0}
                onClick={() => navigate('/employees')} />
            <StatCard label="Monthly Payroll" value={fmtCurrency(d.totalPayrollCost)} icon={DollarSign}
                color="text-emerald-600" bg="bg-emerald-50"
                onClick={() => navigate('/payroll')} />
            <StatCard label="Present Today" value={d.todayPresent} icon={CheckCircle}
                color="text-green-600" bg="bg-green-50"
                sub={`${d.onLeaveToday} on leave`} onClick={() => navigate('/attendance')} />
            <StatCard label="Pending Approvals" value={d.pendingLeaves + d.pendingTimesheets} icon={ClipboardList}
                color="text-amber-600" bg="bg-amber-50"
                sub={`${d.pendingLeaves} leaves · ${d.pendingTimesheets} timesheets`}
                onClick={() => navigate('/leave')} />
            <StatCard label="New Hires" value={d.newHiresThisMonth} icon={UserPlus}
                color="text-violet-600" bg="bg-violet-50" sub="This month"
                onClick={() => navigate('/onboarding')} />
        </div>

        {/* Row 2: Secondary KPI Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Avg Salary" value={fmtCurrency(d.avgSalary)} icon={CreditCard}
                color="text-indigo-600" bg="bg-indigo-50" sub="Monthly" />
            <StatCard label="Attrition Rate" value={`${d.attritionRate}%`} icon={UserMinus}
                color={d.attritionRate > 5 ? 'text-red-600' : 'text-emerald-600'}
                bg={d.attritionRate > 5 ? 'bg-red-50' : 'bg-emerald-50'}
                trendUp={d.attritionRate <= 5} trend={d.attritionRate <= 5 ? 'Healthy' : 'Monitor'} />
            <StatCard label="Attendance Rate" value={`${d.avgAttendanceRate}%`} icon={Target}
                color="text-sky-600" bg="bg-sky-50" sub="30-day avg" />
            <StatCard label="Exits This Month" value={d.exitedThisMonth} icon={AlertTriangle}
                color="text-rose-600" bg="bg-rose-50" />
        </div>

        {/* Row 3: Charts + Activity */}
        <div className="grid grid-cols-12 gap-6">
            {/* Department Distribution */}
            <div className="col-span-12 lg:col-span-4 bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                <SectionHeader title="Department Distribution" subtitle="Active employees" />
                <div className="flex items-center gap-6">
                    <DonutChart segments={d.departmentDistribution.slice(0, 6).map((dept, i) => ({
                        value: dept.count,
                        color: ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4'][i % 6],
                        label: dept.name,
                    }))} />
                    <div className="flex-1 space-y-2">
                        {d.departmentDistribution.slice(0, 5).map((dept, i) => (
                            <div key={dept.name} className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444'][i % 5] }} />
                                <span className="text-[11px] text-gray-600 flex-1">{dept.name}</span>
                                <span className="text-[11px] font-bold text-gray-800">{dept.count}</span>
                                <span className="text-[10px] text-gray-400">{dept.percentage}%</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Hiring Trend */}
            <div className="col-span-12 lg:col-span-4 bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                <SectionHeader title="Hiring vs Exits" subtitle="Last 6 months" />
                <div className="mt-4">
                    <MiniBarChart data={d.monthlyHiringTrend.map(m => m.hires)} color="#3B82F6" height={56} />
                    <div className="flex items-center gap-4 mt-3">
                        {d.monthlyHiringTrend.map(m => (
                            <div key={m.month} className="flex-1 text-center">
                                <p className="text-[9px] text-gray-400 font-medium">{m.month.split(' ')[0]}</p>
                                <p className="text-[11px] font-bold text-blue-600">{m.hires}</p>
                                {m.exits > 0 && <p className="text-[10px] text-red-400">-{m.exits}</p>}
                            </div>
                        ))}
                    </div>
                </div>
                <div className="flex items-center gap-4 mt-4 pt-3 border-t border-gray-50">
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-500" /><span className="text-[10px] text-gray-500">Hires</span></div>
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-400" /><span className="text-[10px] text-gray-500">Exits</span></div>
                </div>
            </div>

            {/* Upcoming Holidays + Gender */}
            <div className="col-span-12 lg:col-span-4 space-y-5">
                {/* Holidays */}
                <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                    <SectionHeader title="Upcoming Holidays" />
                    {d.upcomingHolidays.length > 0 ? d.upcomingHolidays.slice(0, 4).map((h: any) => (
                        <div key={h.name} className="flex items-center gap-3 py-2">
                            <div className="w-10 h-10 bg-amber-50 rounded-xl flex flex-col items-center justify-center">
                                <span className="text-[10px] font-bold text-amber-600">{new Date(h.date).toLocaleDateString('en-IN', { month: 'short' })}</span>
                                <span className="text-sm font-black text-amber-700 leading-none">{new Date(h.date).getDate()}</span>
                            </div>
                            <div>
                                <p className="text-[13px] font-semibold text-gray-800">{h.name}</p>
                                <p className="text-[10px] text-gray-400">{new Date(h.date).toLocaleDateString('en-IN', { weekday: 'long' })}</p>
                            </div>
                        </div>
                    )) : <p className="text-sm text-gray-400 py-4">No upcoming holidays</p>}
                </div>

                {/* Gender Split */}
                <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Gender Split</p>
                    <div className="flex items-center gap-3">
                        {[
                            { label: 'Male', val: d.genderDistribution.male, color: 'bg-blue-500' },
                            { label: 'Female', val: d.genderDistribution.female, color: 'bg-pink-500' },
                            { label: 'Other', val: d.genderDistribution.other, color: 'bg-gray-400' },
                        ].map(g => (
                            <div key={g.label} className="flex-1 text-center">
                                <p className="text-lg font-black text-gray-900">{g.val}</p>
                                <div className={`h-1.5 rounded-full ${g.color} mt-1`} style={{ width: `${Math.max(10, (g.val / Math.max(d.activeEmployees, 1)) * 100)}%`, margin: '0 auto' }} />
                                <p className="text-[10px] text-gray-400 mt-1">{g.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>

        {/* Row 4: Quick Actions + Recent Activity */}
        <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 lg:col-span-4 bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                <SectionHeader title="Quick Actions" />
                {[
                    { icon: UserPlus, label: 'Add Employee', path: '/onboarding', color: 'text-blue-500', bg: 'bg-blue-50' },
                    { icon: DollarSign, label: 'Run Payroll', path: '/payroll', color: 'text-emerald-500', bg: 'bg-emerald-50' },
                    { icon: BarChart2, label: 'View Reports', path: '/reports', color: 'text-violet-500', bg: 'bg-violet-50' },
                    { icon: CalendarDays, label: 'Leave Approvals', path: '/leave', color: 'text-amber-500', bg: 'bg-amber-50' },
                    { icon: Users, label: 'Employee Directory', path: '/employees', color: 'text-sky-500', bg: 'bg-sky-50' },
                ].map(a => (
                    <button key={a.label} onClick={() => navigate(a.path)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-all group">
                        <div className={`w-8 h-8 ${a.bg} ${a.color} rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform`}>
                            <a.icon size={14} />
                        </div>
                        <span className="text-[13px] font-semibold text-gray-600">{a.label}</span>
                        <ChevronRight size={12} className="ml-auto text-gray-300" />
                    </button>
                ))}
            </div>

            <div className="col-span-12 lg:col-span-8 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-50">
                    <SectionHeader title="Recent Activity" subtitle="Latest system events"
                        action={{ label: 'Audit Logs', onClick: () => navigate('/audit-logs') }} />
                </div>
                <div className="divide-y divide-gray-50/50">
                    {d.recentActivities.length > 0 ? d.recentActivities.slice(0, 6).map((act: any, i: number) => (
                        <div key={act.id || i} className="flex items-start gap-3 px-5 py-3.5 hover:bg-gray-50/80">
                            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                                <Activity size={14} className="text-blue-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[13px] font-semibold text-gray-800">{act.action}</p>
                                <p className="text-[11px] text-gray-400">{act.entity_type} {act.entity_id ? `#${act.entity_id}` : ''} · {act.user_name || 'System'}</p>
                            </div>
                            <span className="text-[10px] text-gray-300 flex-shrink-0">{new Date(act.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                    )) : (
                        <div className="py-12 text-center text-sm text-gray-400">No recent activity</div>
                    )}
                </div>
            </div>
        </div>
    </>
);

/* ═══════════════════════════════════════════════════════════════════════════
 * ██ MANAGER DASHBOARD COMPONENT
 * ═══════════════════════════════════════════════════════════════════════════ */
const ManagerDashboardView: React.FC<{
    data: ManagerStats; navigate: any; userId: number;
    onCheckIn: () => void; onCheckOut: () => void; checkingIn: boolean;
}> = ({ data: d, navigate, onCheckIn, onCheckOut, checkingIn }) => (
    <>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <StatCard label="Team Size" value={d.teamSize} icon={Users} color="text-blue-600" bg="bg-blue-50" />
            <StatCard label="Present Today" value={d.todayPresent} icon={CheckCircle} color="text-emerald-600" bg="bg-emerald-50"
                sub={`${d.attendanceRate}% attendance`} />
            <StatCard label="Absent Today" value={d.todayAbsent} icon={UserMinus} color="text-red-600" bg="bg-red-50" />
            <StatCard label="Late Today" value={d.todayLate} icon={AlertTriangle} color="text-amber-600" bg="bg-amber-50" />
            <StatCard label="Pending Leaves" value={d.pendingLeaveCount} icon={CalendarDays} color="text-violet-600" bg="bg-violet-50"
                onClick={() => navigate('/leave')} />
        </div>

        <div className="grid grid-cols-12 gap-6">
            {/* Team Attendance Status */}
            <div className="col-span-12 lg:col-span-8 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-50">
                    <SectionHeader title="Team Attendance Today" subtitle={`${d.todayPresent}/${d.teamSize} present`} />
                </div>
                <div className="divide-y divide-gray-50">
                    {d.teamAttendance.map((member: any, i: number) => (
                        <div key={i} className="flex items-center gap-3 px-5 py-3">
                            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-[10px] font-bold text-gray-600">
                                {member.name?.split(' ').map((p: string) => p[0]).join('').slice(0, 2)}
                            </div>
                            <div className="flex-1">
                                <p className="text-[13px] font-semibold text-gray-800">{member.name}</p>
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                member.att_status === 'on_time' ? 'bg-emerald-50 text-emerald-600' :
                                member.att_status === 'late' ? 'bg-amber-50 text-amber-600' :
                                'bg-red-50 text-red-500'
                            }`}>
                                {member.att_status === 'on_time' ? '● Present' :
                                 member.att_status === 'late' ? '⚡ Late' : '○ Absent'}
                            </span>
                            {member.check_in && (
                                <span className="text-[10px] text-gray-400">{new Date(member.check_in).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                            )}
                        </div>
                    ))}
                    {d.teamAttendance.length === 0 && (
                        <div className="py-8 text-center text-sm text-gray-400">No team members assigned.</div>
                    )}
                </div>
            </div>

            {/* Pending Leaves + Actions */}
            <div className="col-span-12 lg:col-span-4 space-y-5">
                <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                    <SectionHeader title="Pending Leave Requests" action={{ label: 'View All', onClick: () => navigate('/leave') }} />
                    {d.pendingLeaves.slice(0, 4).map((lr: any) => (
                        <div key={lr.id} className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
                            <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
                                <CalendarDays size={14} className="text-amber-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[12px] font-semibold text-gray-800 truncate">{lr.applicant_name}</p>
                                <p className="text-[10px] text-gray-400">{lr.leave_type}</p>
                            </div>
                        </div>
                    ))}
                    {d.pendingLeaves.length === 0 && <p className="text-sm text-gray-400 py-4 text-center">No pending requests</p>}
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                    <SectionHeader title="Timesheet Status" />
                    <div className="grid grid-cols-3 gap-2 mt-2">
                        {[
                            { label: 'Submitted', val: d.timesheetStatus?.submitted || 0, color: 'text-blue-600 bg-blue-50' },
                            { label: 'Approved', val: d.timesheetStatus?.approved || 0, color: 'text-emerald-600 bg-emerald-50' },
                            { label: 'Pending', val: d.timesheetStatus?.pending || 0, color: 'text-amber-600 bg-amber-50' },
                        ].map(s => (
                            <div key={s.label} className={`text-center py-3 rounded-xl ${s.color.split(' ')[1]}`}>
                                <p className={`text-xl font-black ${s.color.split(' ')[0]}`}>{s.val}</p>
                                <p className="text-[9px] uppercase font-bold tracking-wider text-gray-500 mt-1">{s.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    </>
);

/* ═══════════════════════════════════════════════════════════════════════════
 * ██ EMPLOYEE DASHBOARD COMPONENT
 * ═══════════════════════════════════════════════════════════════════════════ */
const EmployeeDashboardView: React.FC<{
    data: EmpDashData; navigate: any; elapsed: number;
    onCheckIn: () => void; onCheckOut: () => void; checkingIn: boolean;
}> = ({ data: d, navigate, elapsed, onCheckIn, onCheckOut, checkingIn }) => {
    const isIn = d.attendance.status === 'IN';
    const isDone = d.attendance.status === 'COMPLETED';

    return (
        <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Present Days" value={d.monthlySummary.presentDays} icon={CheckCircle}
                    color="text-emerald-600" bg="bg-emerald-50" sub="This month" />
                <StatCard label="Avg Hours" value={`${d.monthlySummary.avgHours}h`} icon={Clock}
                    color="text-blue-600" bg="bg-blue-50" sub="Daily average" />
                <StatCard label="Late Days" value={d.monthlySummary.lateDays} icon={AlertTriangle}
                    color={d.monthlySummary.lateDays > 3 ? 'text-red-600' : 'text-amber-600'}
                    bg={d.monthlySummary.lateDays > 3 ? 'bg-red-50' : 'bg-amber-50'} sub="This month" />
                <StatCard label="Today" value={`${d.attendance.totalHoursToday}h`} icon={Timer}
                    color="text-violet-600" bg="bg-violet-50"
                    sub={isIn ? '● Clocked In' : isDone ? '✓ Done' : 'Not started'} />
            </div>

            <div className="grid grid-cols-12 gap-6">
                {/* Attendance Clock */}
                <div className="col-span-12 lg:col-span-4 space-y-5">
                    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                        <SectionHeader title="Today's Attendance" />
                        <div className="flex flex-col items-center py-4">
                            <div className={`w-36 h-36 rounded-full border-4 flex flex-col items-center justify-center transition-all ${isIn ? 'border-blue-500 bg-blue-50 shadow-[0_0_30px_-10px_rgba(59,130,246,0.3)]' : 'border-gray-100 bg-gray-50'}`}>
                                <p className={`text-3xl font-mono font-black tabular-nums ${isIn ? 'text-blue-600' : 'text-gray-200'}`}>
                                    {isIn ? fmtClock(elapsed) : '00:00:00'}
                                </p>
                                <p className={`text-[9px] font-bold uppercase tracking-widest mt-1 ${isIn ? 'text-blue-400' : 'text-gray-300'}`}>
                                    {isIn ? 'Live' : isDone ? 'Complete' : 'Idle'}
                                </p>
                            </div>
                        </div>
                        {!isDone ? (
                            <button onClick={isIn ? onCheckOut : onCheckIn} disabled={checkingIn}
                                className={`w-full py-3 rounded-xl text-sm font-bold transition-all active:scale-95 flex items-center justify-center gap-2 ${
                                    isIn ? 'bg-rose-50 text-rose-600 border border-rose-200' : 'bg-blue-600 text-white shadow-lg shadow-blue-200/50'
                                }`}>
                                {checkingIn ? <Loader2 size={16} className="animate-spin" /> : isIn ? <LogOutIcon size={16} /> : <LogIn size={16} />}
                                {isIn ? 'Clock Out' : 'Clock In'}
                            </button>
                        ) : (
                            <div className="w-full py-3 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold">
                                <CheckCircle size={16} /> Day Complete
                            </div>
                        )}
                    </div>

                    {/* Weekly Hours */}
                    {d.weeklyHours.length > 0 && (
                        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                            <SectionHeader title="Weekly Hours" />
                            <MiniBarChart data={d.weeklyHours.map(w => parseFloat(w.hours))} color="#3B82F6" height={48} />
                            <div className="flex mt-2">
                                {d.weeklyHours.map(w => (
                                    <div key={w.date} className="flex-1 text-center">
                                        <p className="text-[9px] text-gray-400">{w.day}</p>
                                        <p className="text-[10px] font-bold text-gray-600">{w.hours}h</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right: Leave + Holidays + Actions */}
                <div className="col-span-12 lg:col-span-8 space-y-5">
                    {/* Leave Balances */}
                    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                        <SectionHeader title="Leave Balances" action={{ label: 'Apply Leave', onClick: () => navigate('/leave') }} />
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {d.leaveBalances.map(lb => (
                                <div key={lb.leave_type_id} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                                    <p className="text-[11px] text-gray-500 font-medium">{lb.name}</p>
                                    <div className="flex items-end gap-1 mt-1">
                                        <span className="text-2xl font-black text-gray-900">{lb.available}</span>
                                        <span className="text-xs text-gray-400 mb-0.5">/ {lb.annual_quota}</span>
                                    </div>
                                    <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                        <div className={`h-full rounded-full ${lb.available > lb.annual_quota * 0.3 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                                            style={{ width: `${(lb.available / Math.max(lb.annual_quota, 1)) * 100}%` }} />
                                    </div>
                                    <p className="text-[10px] text-gray-400 mt-1">{lb.used} used</p>
                                </div>
                            ))}
                            {d.leaveBalances.length === 0 && (
                                <p className="text-sm text-gray-400 col-span-3 text-center py-4">No leave data</p>
                            )}
                        </div>
                    </div>

                    {/* Upcoming Holidays */}
                    {d.upcomingHolidays.length > 0 && (
                        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                            <SectionHeader title="Upcoming Holidays" />
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {d.upcomingHolidays.slice(0, 4).map((h: any) => (
                                    <div key={h.name} className="flex items-center gap-3 p-3 bg-amber-50/40 rounded-xl border border-amber-100/50">
                                        <div className="w-10 h-10 bg-amber-100 rounded-xl flex flex-col items-center justify-center">
                                            <span className="text-[10px] font-bold text-amber-700">{new Date(h.date).toLocaleDateString('en-IN', { month: 'short' })}</span>
                                            <span className="text-sm font-black text-amber-800 leading-none">{new Date(h.date).getDate()}</span>
                                        </div>
                                        <div>
                                            <p className="text-[13px] font-semibold text-gray-800">{h.name}</p>
                                            <p className="text-[10px] text-gray-400">{new Date(h.date).toLocaleDateString('en-IN', { weekday: 'long' })}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Quick Module Links */}
                    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                        <SectionHeader title="Quick Access" />
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {[
                                { icon: Clock, label: 'Attendance History', path: '/attendance', bg: 'bg-blue-50', color: 'text-blue-600' },
                                { icon: CalendarDays, label: 'Apply Leave', path: '/leave', bg: 'bg-emerald-50', color: 'text-emerald-600' },
                                { icon: ClipboardList, label: 'My Timesheet', path: '/timesheet', bg: 'bg-violet-50', color: 'text-violet-600' },
                                { icon: CreditCard, label: 'View Payslip', path: '/payroll', bg: 'bg-amber-50', color: 'text-amber-600' },
                                { icon: UserCircle, label: 'My Profile', path: '/profile', bg: 'bg-rose-50', color: 'text-rose-600' },
                                { icon: Building2, label: 'Company Info', path: '/dashboard', bg: 'bg-gray-50', color: 'text-gray-600' },
                            ].map(a => (
                                <button key={a.label} onClick={() => navigate(a.path)}
                                    className="flex items-center gap-3 p-3.5 rounded-xl border border-gray-100 hover:bg-gray-50 hover:border-gray-200 transition-all group text-left">
                                    <div className={`w-9 h-9 ${a.bg} ${a.color} rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform`}>
                                        <a.icon size={16} />
                                    </div>
                                    <span className="text-[13px] font-semibold text-gray-700">{a.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Dashboard;