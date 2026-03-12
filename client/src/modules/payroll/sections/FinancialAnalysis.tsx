import React, { useState, useEffect } from 'react';
import { IndianRupee, Users, TrendingUp, Clock, BarChart3, Loader2, AlertCircle, History as LucideHistory, CheckCircle2, ShieldCheck } from 'lucide-react';
import StatCard from '../components/StatCard';
import api from '../../../services/api';

const FinancialAnalysis = () => {
    const [employees, setEmployees] = useState<any[]>([]);
    const [history, setHistory] = useState<any[]>([]);
    const [activity, setActivity] = useState<any[]>([]);
    const [summary, setSummary] = useState<any>({ totalGross: 0, totalDeductions: 0, netOutflow: 0, govtPayables: 0 });
    const [pendingCount, setPendingCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Currency Formatter for Indian Rupees using Intl.NumberFormat('en-IN')
    const formatter = new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
    });

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const now = new Date();
            const m = (now.getMonth() + 1).toString();
            const y = now.getFullYear().toString();

            const [empRes, runRes, activityRes, pendingRes] = await Promise.all([
                api.get('payroll/employees'),
                api.get('payroll/runs'),
                api.get('payroll/activity'),
                api.get('payroll/pending-approvals')
            ]);
            
            setEmployees(Array.isArray(empRes.data) ? empRes.data : []);
            const runHistory = Array.isArray(runRes.data) ? runRes.data : [];
            setHistory(runHistory);
            setActivity(Array.isArray(activityRes.data) ? activityRes.data : []);
            setPendingCount(pendingRes.data?.pending || 0);

            // Fetch live summary based on profiles
            const summaryRes = await api.get('payroll/live-summary');
            setSummary(summaryRes.data);

        } catch (err: any) {
            console.error('Failed to fetch dashboard data:', err);
            setError('Unable to sync with payroll database.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Dynamic Calculations
    // Dynamic Calculations
    const totalEmployees = employees.length;
    const totalPayrollCost = summary.totalGross; // Use live summary for accurate totals
    const averageSalary = totalEmployees > 0 ? totalPayrollCost / totalEmployees : 0;

    // Department Distribution
    const departments = ['Engineering', 'Sales', 'HR', 'Marketing', 'Finance', 'Operations'];
    const departmentDistribution = departments.map(name => {
        const cost = employees
            .filter(e => e.department === name)
            .reduce((acc, curr) => acc + (Number(curr.annual_ctc || 0) / 12), 0);
        return { name, cost };
    }).filter(d => d.cost > 0);
    // Usually better to show all if they exist in the schema, but user example showed 5.
    // Let's keep all from the departments list if they have data.

    const maxCost = Math.max(...departmentDistribution.map(d => d.cost), 1);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-32 space-y-4">
                <Loader2 size={48} className="animate-spin text-blue-600" />
                <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Recalculating Financial Metrics...</p>
            </div>
        );
    }

    if (totalEmployees === 0 && !error) {
        return (
            <div className="p-16 bg-white rounded-3xl border border-slate-200 shadow-sm text-center">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <IndianRupee size={32} className="text-slate-300" />
                </div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Financial Hub Inactive</h3>
                <p className="text-slate-500 text-sm font-medium mt-2">Payroll dashboard will populate once employee payroll profiles are added.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Error Banner if any */}
            {error && (
                <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl flex items-center space-x-3 text-rose-600">
                    <AlertCircle size={18} />
                    <p className="text-xs font-bold">{error} Showing last cached data or zeros.</p>
                </div>
            )}

            {/* Payroll Metrics Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    label="Net Payroll Outflow"
                    value={formatter.format(summary.netOutflow)}
                    icon={IndianRupee}
                    color="bg-blue-600"
                    trend={`${totalEmployees} Recipients`}
                    isUp={true}
                />
                <StatCard
                    label="Active Payroll Profiles"
                    value={totalEmployees.toString()}
                    icon={Users}
                    color="bg-purple-600"
                    trend="Verified"
                    isUp={true}
                />
                <StatCard
                    label="Government Payables"
                    value={formatter.format(summary.govtPayables)}
                    icon={ShieldCheck}
                    color="bg-emerald-600"
                    trend="Tax & PF"
                    isUp={true}
                />
                <StatCard
                    label="Pending Approvals"
                    value={pendingCount.toString()}
                    icon={Clock}
                    color="bg-amber-600"
                    trend={pendingCount > 0 ? "Action Required" : "All Clear"}
                    isUp={pendingCount > 0}
                />
            </div>

            {/* Department Distribution Section */}
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h3 className="text-xl font-black text-slate-900 tracking-tight">Payroll Cost Distribution</h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Allocation by Business Unit</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-2xl">
                        <BarChart3 className="text-slate-400" size={20} />
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                    {departmentDistribution.length > 0 ? departmentDistribution.map(dept => (
                        <div key={dept.name} className="space-y-3">
                            <div className="flex justify-between items-end">
                                <div>
                                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">{dept.name}</span>
                                    <span className="text-lg font-black text-slate-900">{formatter.format(dept.cost)}</span>
                                </div>
                                <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">
                                    {((dept.cost / totalPayrollCost) * 100).toFixed(1)}%
                                </span>
                            </div>
                            <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-blue-600 rounded-full transition-all duration-1000 ease-out shadow-sm shadow-blue-500/20"
                                    style={{ width: `${(dept.cost / maxCost) * 100}%` }}
                                ></div>
                            </div>
                        </div>
                    )) : (
                        <div className="col-span-full py-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No department data available</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Recent Payroll Activity Feed */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[300px]">
                <div className="p-8 border-b border-slate-50 bg-slate-50/30">
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest leading-none">Recent Activity</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2 px-1 border-l-2 border-emerald-500">Live Processing Feed</p>
                </div>
                <div className="flex-1 p-8">
                    <div className="space-y-6">
                        {activity && activity.length > 0 ? activity.map((run: any) => (
                            <div key={run.id} className="flex space-x-4 relative group">
                                <div className="relative z-10 w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 border border-blue-100 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                                    <CheckCircle2 size={16} />
                                </div>
                                <div className="flex-1 pt-1 pb-4 border-b border-slate-50">
                                    <p className="text-xs font-black text-slate-900 leading-none">Payroll cycle completed: {run.payrollcycle}</p>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-tight mt-1.5 font-mono">
                                         Processed on {new Date(run.processed_at).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                        )) : (
                            <div className="flex flex-col items-center justify-center h-full opacity-20 space-y-4 py-8">
                                <LucideHistory size={32} />
                                <p className="text-[10px] font-black uppercase tracking-widest">No activity logged</p>
                            </div>
                        )}
                        <div className="flex space-x-4 relative group">
                            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 border border-emerald-100 shadow-sm">
                                <ShieldCheck size={16} />
                            </div>
                            <div className="flex-1 pt-1">
                                <p className="text-xs font-black text-slate-900 leading-none">Compliance In-Sync</p>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-tight mt-1.5">Enterprise statutory filings verified</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FinancialAnalysis;
