import React, { useState, useEffect } from 'react';
import {
    IndianRupee,
    Users,
    Clock,
    ShieldCheck,
    BarChart3,
    Loader2,
    AlertCircle,
    CheckCircle2,
    TrendingUp,
    Activity,
} from 'lucide-react';
import api from '../../../services/api';

/* ─── Currency util ──────────────────────────────────────── */
const inr = (v: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);

/* ─── Stat card ─────────────────────────────────────────── */
const Stat: React.FC<{
    label: string; value: string; sub: string;
    icon: React.ElementType; iconBg: string; iconColor: string;
    up?: boolean;
}> = ({ label, value, sub, icon: Icon, iconBg, iconColor, up }) => (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 card-hover">
        <div className="flex items-start justify-between mb-4">
            <div className={`w-10 h-10 rounded-lg ${iconBg} flex items-center justify-center`}>
                <Icon size={18} className={iconColor} />
            </div>
            {up !== undefined && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${up ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'}`}>
                    {up ? '↑' : '↓'}
                </span>
            )}
        </div>
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
        <p className="text-[22px] font-bold text-gray-900 leading-none">{value}</p>
        <p className="text-[11px] text-gray-400 font-medium mt-1.5">{sub}</p>
    </div>
);

/* ─── Component ─────────────────────────────────────────── */
const FinancialAnalysis: React.FC = () => {
    const [employees, setEmployees] = useState<any[]>([]);
    const [activity,  setActivity]  = useState<any[]>([]);
    const [summary,   setSummary]   = useState<any>({ totalGross: 0, totalDeductions: 0, netOutflow: 0, govtPayables: 0 });
    const [pendingCount, setPendingCount] = useState(0);
    const [loading,   setLoading]   = useState(true);
    const [error,     setError]     = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            setLoading(true);
            setError(null);
            try {
                const [empRes, actRes, pendRes, sumRes] = await Promise.all([
                    api.get('payroll/employees'),
                    api.get('payroll/activity'),
                    api.get('payroll/pending-approvals'),
                    api.get('payroll/live-summary'),
                ]);
                setEmployees(Array.isArray(empRes.data) ? empRes.data : []);
                setActivity(Array.isArray(actRes.data) ? actRes.data : []);
                setPendingCount(pendRes.data?.pending || 0);
                setSummary(sumRes.data);
            } catch {
                setError('Unable to sync with payroll database.');
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const enrolledEmployees = employees.filter(e => e.hasProfile).length;
    const totalEmployees    = employees.length;
    const totalPayroll      = Number(summary.netOutflow) || 0;
    const avgSalary         = enrolledEmployees > 0 ? totalPayroll / enrolledEmployees : 0;


    const departments = ['Engineering', 'Sales', 'HR', 'Marketing', 'Finance', 'Operations'];
    const deptDist = departments.map(name => ({
        name,
        cost: employees.filter(e => e.department === name)
                       .reduce((acc, e) => acc + (Number(e.annual_ctc || 0) / 12), 0),
    })).filter(d => d.cost > 0);
    const maxCost = Math.max(...deptDist.map(d => d.cost), 1);

    if (loading) return (
        <div className="flex items-center justify-center py-24 gap-3 text-gray-400">
            <Loader2 size={20} className="animate-spin text-blue-500" />
            <span className="text-[13px] font-medium">Loading payroll data…</span>
        </div>
    );

    if (totalEmployees === 0 && !error) return (
        <div className="flex flex-col items-center justify-center py-24 text-gray-300">
            <IndianRupee size={40} className="mb-3 opacity-40" />
            <p className="text-[13.5px] font-semibold text-gray-500">No payroll profiles</p>
            <p className="text-[12px] text-gray-400 mt-1">Add employee payroll profiles to see the dashboard.</p>
        </div>
    );

    return (
        <div className="space-y-5">
            {/* Error banner */}
            {error && (
                <div className="flex items-center gap-3 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">
                    <AlertCircle size={15} className="text-rose-500 flex-shrink-0" />
                    <p className="text-[12.5px] text-rose-600 font-medium">{error} Showing last cached data.</p>
                </div>
            )}

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Stat label="Net Payroll Outflow"    value={inr(Number(summary.netOutflow) || 0)}    sub={`${enrolledEmployees} recipients`} icon={IndianRupee} iconBg="bg-blue-50"   iconColor="text-blue-600"   up={true} />
                <Stat label="Enrolled Profiles"       value={String(enrolledEmployees)}  sub={`of ${totalEmployees} total`}          icon={Users}       iconBg="bg-purple-50" iconColor="text-purple-600" up={true} />
                <Stat label="Government Payables"     value={inr(Number(summary.govtPayables) || 0)}  sub="Tax & PF obligations"           icon={ShieldCheck} iconBg="bg-emerald-50"iconColor="text-emerald-600"up={true} />
                <Stat label="Pending Approvals"       value={String(pendingCount)}        sub={pendingCount > 0 ? 'Action required' : 'All clear'} icon={Clock} iconBg="bg-amber-50" iconColor="text-amber-600" up={pendingCount > 0} />
            </div>



            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                {/* ── Financial summary ──────────────────── */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                    <div className="flex items-center justify-between mb-5">
                        <div>
                            <h3 className="text-[13px] font-bold text-gray-800">Financial Summary</h3>
                            <p className="text-[11px] text-gray-400 font-medium mt-0.5">Current month estimates from active profiles</p>
                        </div>
                        <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center">
                            <TrendingUp size={15} className="text-gray-400" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        {[
                            { label: 'Total Gross',        value: inr(summary.totalGross),      bg: 'bg-gray-50',   text: 'text-gray-900',    sub: 'Before deductions' },
                            { label: 'Statutory Deductions',value: inr(summary.totalDeductions), bg: 'bg-rose-50',   text: 'text-rose-600',    sub: 'PF, PT, TDS' },
                            { label: 'Net Fund Outflow',    value: inr(summary.netOutflow),      bg: 'bg-emerald-50',text: 'text-emerald-600', sub: 'Disbursed to employees' },
                            { label: 'Govt. Payables',      value: inr(summary.govtPayables),    bg: 'bg-blue-50',   text: 'text-blue-600',    sub: 'Regulatory remittance' },
                        ].map(s => (
                            <div key={s.label} className={`${s.bg} rounded-xl p-4 border border-gray-100/80`}>
                                <p className="text-[10.5px] font-semibold text-gray-500 mb-1">{s.label}</p>
                                <p className={`text-[18px] font-bold ${s.text} leading-none`}>{s.value}</p>
                                <p className="text-[10px] text-gray-400 mt-1.5">{s.sub}</p>
                            </div>
                        ))}
                    </div>

                    {/* Avg salary bar */}
                    <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between">
                        <p className="text-[11.5px] text-gray-500 font-medium">Avg. salary / employee</p>
                        <p className="text-[13px] font-bold text-gray-900">{inr(avgSalary)}</p>
                    </div>
                </div>

                {/* ── Department Distribution ─────────────── */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                    <div className="flex items-center justify-between mb-5">
                        <h3 className="text-[13px] font-bold text-gray-800">Cost by Dept.</h3>
                        <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center">
                            <BarChart3 size={15} className="text-gray-400" />
                        </div>
                    </div>
                    <div className="space-y-4">
                        {deptDist.length > 0 ? deptDist.map(d => (
                            <div key={d.name}>
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-[11.5px] font-semibold text-gray-600">{d.name}</span>
                                    <span className="text-[10.5px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                                        {((d.cost / (totalPayroll || 1)) * 100).toFixed(1)}%
                                    </span>
                                </div>
                                <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-blue-500 rounded-full transition-all duration-700"
                                        style={{ width: `${(d.cost / maxCost) * 100}%` }}
                                    ></div>
                                </div>
                                <p className="text-[10.5px] text-gray-400 mt-1">{inr(d.cost)}</p>
                            </div>
                        )) : (
                            <div className="flex flex-col items-center justify-center py-10 text-gray-300">
                                <BarChart3 size={28} className="mb-2 opacity-30" />
                                <p className="text-[11.5px] text-gray-400">No department data</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Recent Activity ─────────────────────────── */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
                    <div>
                        <h3 className="text-[13px] font-bold text-gray-800">Recent Activity</h3>
                        <p className="text-[11px] text-gray-400 mt-0.5">Live processing feed</p>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center">
                        <Activity size={14} className="text-gray-400" />
                    </div>
                </div>
                <div className="divide-y divide-gray-50">
                    {activity.length > 0 ? activity.map((run: any) => (
                        <div key={run.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors">
                            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                                <CheckCircle2 size={15} className="text-blue-500" />
                            </div>
                            <div className="flex-1">
                                <p className="text-[12.5px] font-semibold text-gray-800">Payroll cycle completed: {run.payrollcycle}</p>
                                <p className="text-[11px] text-gray-400 mt-0.5">
                                    Processed on {new Date(run.processed_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </p>
                            </div>
                        </div>
                    )) : (
                        <div className="flex items-center gap-4 px-5 py-3.5">
                            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                                <ShieldCheck size={15} className="text-emerald-500" />
                            </div>
                            <div>
                                <p className="text-[12.5px] font-semibold text-gray-800">Compliance In-Sync</p>
                                <p className="text-[11px] text-gray-400 mt-0.5">Enterprise statutory filings verified</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FinancialAnalysis;
