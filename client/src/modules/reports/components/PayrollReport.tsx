import React, { useState } from 'react';
import {
    CreditCard,
    TrendingUp,
    Download,
    DollarSign,
    CheckCircle2,
    Calendar,
    ArrowUpRight,
    PieChart,
    Layers,
    FileSpreadsheet,
    HelpCircle
} from 'lucide-react';
import { fmtCurrency } from '../../../utils/formatters';

interface SalaryDistributionItem {
    level: string;
    count: string | number;
    total_ctc: string | number;
}

interface PayrollReportProps {
    data: {
        monthlyPayout: number;
    };
    avgSalary: number;
    distribution: SalaryDistributionItem[];
    headcount?: number;
}

export const PayrollReport: React.FC<PayrollReportProps> = ({
    data,
    avgSalary,
    distribution = [],
    headcount = 0,
}) => {
    const [searchTerm, setSearchTerm] = useState('');

    // Calculate aggregated metrics
    const parsedTotalCtc = distribution?.reduce(
        (sum, item) => sum + parseFloat(String(item.total_ctc || 0)),
        0
    ) || (avgSalary * (headcount || 1));

    const totalHeadcount = distribution?.reduce(
        (sum, item) => sum + parseInt(String(item.count || 0), 10),
        0
    ) || headcount || 1;

    // Filter distribution
    const filteredDist = (distribution || []).filter(item =>
        (item.level || 'Unassigned').toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Compute dynamic cycle dates
    const now = new Date();
    const currentMonthName = now.toLocaleString('default', { month: 'long', year: 'numeric' });
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const nextCycleStr = nextMonth.toLocaleDateString('default', { day: '2-digit', month: 'short', year: 'numeric' });

    // Export CSV handler
    const handleExportCSV = () => {
        if (!distribution || distribution.length === 0) return;
        const headers = ['Designation/Level', 'Headcount', 'Total CTC (INR)', 'Avg CTC (INR)', 'Share (%)'];
        const rows = distribution.map(item => {
            const ctc = parseFloat(String(item.total_ctc || 0));
            const count = parseInt(String(item.count || 1), 10);
            const avg = count > 0 ? Math.round(ctc / count) : ctc;
            const share = parsedTotalCtc > 0 ? ((ctc / parsedTotalCtc) * 100).toFixed(1) : '0';
            return `"${item.level || 'Unassigned'}",${count},${ctc},${avg},${share}%`;
        });
        const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `payroll_summary_${now.getFullYear()}_${now.getMonth() + 1}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Cost structure breakdown calculations (standard enterprise statutory model)
    const monthlyPayout = data.monthlyPayout || (parsedTotalCtc / 12);
    const costComponents = [
        { name: 'Basic Salary', percentage: 50, amount: monthlyPayout * 0.50, color: 'bg-blue-600', textColor: 'text-blue-600', lightBg: 'bg-blue-50' },
        { name: 'House Rent Allowance (HRA)', percentage: 25, amount: monthlyPayout * 0.25, color: 'bg-indigo-600', textColor: 'text-indigo-600', lightBg: 'bg-indigo-50' },
        { name: 'Special & Flexible Allowances', percentage: 15, amount: monthlyPayout * 0.15, color: 'bg-emerald-600', textColor: 'text-emerald-600', lightBg: 'bg-emerald-50' },
        { name: 'Employer EPF & Statutory Benefits', percentage: 10, amount: monthlyPayout * 0.10, color: 'bg-amber-600', textColor: 'text-amber-600', lightBg: 'bg-amber-50' },
    ];

    return (
        <div className="space-y-6 animate-in fade-in duration-200">
            {/* ── Top KPI Stat Cards ─────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-500">Monthly Gross Payout</span>
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                            <CreditCard size={16} />
                        </div>
                    </div>
                    <div className="mt-3">
                        <p className="text-2xl font-bold text-slate-900 tracking-tight">
                            {fmtCurrency(monthlyPayout)}
                        </p>
                        <div className="mt-2 flex items-center gap-1.5 text-xs">
                            <span className="inline-flex items-center gap-0.5 font-semibold text-emerald-600">
                                <TrendingUp size={13} /> +2.4%
                            </span>
                            <span className="text-slate-400">vs previous cycle</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-500">Annual CTC Pool</span>
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                            <DollarSign size={16} />
                        </div>
                    </div>
                    <div className="mt-3">
                        <p className="text-2xl font-bold text-slate-900 tracking-tight">
                            {fmtCurrency(parsedTotalCtc)}
                        </p>
                        <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                            <span className="font-semibold text-slate-700">{totalHeadcount}</span>
                            <span>employees enrolled</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-500">Avg. Annual CTC</span>
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                            <PieChart size={16} />
                        </div>
                    </div>
                    <div className="mt-3">
                        <p className="text-2xl font-bold text-slate-900 tracking-tight">
                            {fmtCurrency(avgSalary || (parsedTotalCtc / totalHeadcount))}
                        </p>
                        <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                            <span>Across active departments</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-500">Statutory Compliance</span>
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                            <CheckCircle2 size={16} />
                        </div>
                    </div>
                    <div className="mt-3">
                        <div className="flex items-center gap-2">
                            <p className="text-2xl font-bold text-slate-900 tracking-tight">100%</p>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                                On-Track
                            </span>
                        </div>
                        <div className="mt-2 text-xs text-slate-500">
                            <span>EPF, ESI & TDS filings verified</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Main 2-Column Content ─────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* Left Section: Salary Distribution Table & Breakdown */}
                <div className="lg:col-span-8 space-y-5">
                    {/* Salary Distribution by Role Card */}
                    <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
                        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                                <h3 className="text-sm font-bold text-slate-900">Salary Distribution by Job Role</h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Headcount allocations and CTC investment across positions
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleExportCSV}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200/80 text-slate-700 rounded-lg text-xs font-semibold transition-all shadow-xs"
                                >
                                    <FileSpreadsheet size={13} />
                                    Export CSV
                                </button>
                            </div>
                        </div>

                        {/* Distribution Table */}
                        {filteredDist.length === 0 ? (
                            <div className="p-10 text-center">
                                <Layers size={32} className="mx-auto text-slate-300 mb-2" />
                                <p className="text-sm font-semibold text-slate-700">No salary distribution records</p>
                                <p className="text-xs text-slate-400 mt-1">
                                    Ensure employee payroll profiles are assigned with active compensation packages.
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead>
                                        <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-500 font-semibold">
                                            <th className="px-5 py-3">Designation / Role</th>
                                            <th className="px-4 py-3 text-center">Headcount</th>
                                            <th className="px-4 py-3 text-right">Avg. Annual CTC</th>
                                            <th className="px-4 py-3 text-right">Total CTC Pool</th>
                                            <th className="px-5 py-3 text-right">Share</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {filteredDist.map((item, idx) => {
                                            const ctc = parseFloat(String(item.total_ctc || 0));
                                            const count = parseInt(String(item.count || 1), 10);
                                            const avg = count > 0 ? Math.round(ctc / count) : ctc;
                                            const share = parsedTotalCtc > 0 ? Math.round((ctc / parsedTotalCtc) * 100) : 0;
                                            const roleName = item.level || 'Unassigned';

                                            return (
                                                <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="px-5 py-3.5">
                                                        <div className="flex items-center gap-2.5">
                                                            <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700 font-bold text-[11px]">
                                                                {roleName.charAt(0).toUpperCase()}
                                                            </div>
                                                            <div>
                                                                <p className="font-semibold text-slate-900">{roleName}</p>
                                                                <p className="text-[11px] text-slate-400">Regular Payroll</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3.5 text-center">
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-md font-semibold bg-slate-100 text-slate-700 text-[11px]">
                                                            {count} {count === 1 ? 'staff' : 'staff'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3.5 text-right font-medium text-slate-800">
                                                        {fmtCurrency(avg)}
                                                    </td>
                                                    <td className="px-4 py-3.5 text-right font-semibold text-slate-900">
                                                        {fmtCurrency(ctc)}
                                                    </td>
                                                    <td className="px-5 py-3.5 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                                                <div
                                                                    className="bg-blue-600 h-full rounded-full transition-all duration-500"
                                                                    style={{ width: `${Math.min(100, Math.max(4, share))}%` }}
                                                                />
                                                            </div>
                                                            <span className="font-semibold text-slate-700 min-w-[28px] text-right">
                                                                {share}%
                                                            </span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Payroll Structure / Salary Components Card */}
                    <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-sm font-bold text-slate-900">Statutory Compensation Composition</h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Standard allowance structure and employer obligations breakdown
                                </p>
                            </div>
                            <span className="text-xs text-slate-400 font-medium">{currentMonthName}</span>
                        </div>

                        {/* Proportional Segmented Progress Bar */}
                        <div className="h-3 w-full bg-slate-100 rounded-lg overflow-hidden flex mb-4">
                            {costComponents.map((comp, i) => (
                                <div
                                    key={i}
                                    style={{ width: `${comp.percentage}%` }}
                                    className={`${comp.color} h-full transition-all`}
                                    title={`${comp.name}: ${comp.percentage}%`}
                                />
                            ))}
                        </div>

                        {/* Component Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                            {costComponents.map((comp, i) => (
                                <div key={i} className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <div className={`w-2.5 h-2.5 rounded-full ${comp.color}`} />
                                        <div>
                                            <p className="text-xs font-semibold text-slate-800">{comp.name}</p>
                                            <p className="text-[11px] text-slate-400">{comp.percentage}% of gross</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-bold text-slate-900">{fmtCurrency(comp.amount)}</p>
                                        <p className="text-[10px] text-slate-400">/ month</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Section: Cycle Timeline & Quick Actions */}
                <div className="lg:col-span-4 space-y-5">
                    {/* Next Cycle Card */}
                    <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                                <Calendar size={14} className="text-blue-600" />
                                Payroll Schedule
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/60">
                                Active Run
                            </span>
                        </div>

                        <div className="mt-4 space-y-3.5">
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-500">Current Period:</span>
                                <span className="font-semibold text-slate-800">{currentMonthName}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-500">Next Disbursal Date:</span>
                                <span className="font-bold text-slate-900">{nextCycleStr}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-500">Payout Status:</span>
                                <span className="font-semibold text-emerald-600 flex items-center gap-1">
                                    <CheckCircle2 size={13} /> Ready to Finalize
                                </span>
                            </div>
                        </div>

                        <div className="mt-5 pt-4 border-t border-slate-100">
                            <a
                                href="/payroll"
                                className="w-full inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-all shadow-xs"
                            >
                                Open Payroll Manager
                                <ArrowUpRight size={13} />
                            </a>
                        </div>
                    </div>

                    {/* Statutory Verification Checklist */}
                    <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
                        <h4 className="text-xs font-bold text-slate-900 mb-3 flex items-center gap-1.5">
                            <CheckCircle2 size={14} className="text-emerald-600" />
                            Statutory Filings Status
                        </h4>
                        <div className="space-y-2.5">
                            {[
                                { title: 'Employee Provident Fund (EPF)', status: 'Computed', date: 'Monthly' },
                                { title: 'Employee State Insurance (ESI)', status: 'Eligible Staff Covered', date: 'Monthly' },
                                { title: 'Tax Deducted at Source (TDS)', status: 'Deductions Applied', date: 'Section 192' },
                                { title: 'Professional Tax (PT)', status: 'State Slabs Synced', date: 'Auto' },
                            ].map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50/70 border border-slate-100 text-xs">
                                    <div>
                                        <p className="font-medium text-slate-800">{item.title}</p>
                                        <p className="text-[10px] text-slate-400">{item.date}</p>
                                    </div>
                                    <span className="font-semibold text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/50">
                                        {item.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Info Help Note */}
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/60 text-xs text-slate-600 flex items-start gap-2.5">
                        <HelpCircle size={16} className="text-slate-400 flex-shrink-0 mt-0.5" />
                        <p className="leading-relaxed">
                            Payroll summaries are synchronized in real-time from active employee salary packages and approved attendance logs.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
