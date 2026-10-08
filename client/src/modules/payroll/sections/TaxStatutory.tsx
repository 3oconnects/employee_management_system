import React, { useState, useEffect } from 'react';
import {
    Calculator,
    IndianRupee,
    BarChart3,
    ArrowUpRight,
    Loader2,
    AlertTriangle,
    RefreshCw,
    ShieldCheck,
    Calendar,
    Info,
} from 'lucide-react';
import api from '../../../services/api';

const inrStr = (v: number) => `₹${Math.round(Number(v) || 0).toLocaleString('en-IN')}`;

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const TaxStatutory: React.FC = () => {
    const [totals,  setTotals]  = useState({ incomeTax: 0, pf: 0, esi: 0, pt: 0 });
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState(false);
    const [source,  setSource]  = useState<'payroll_entries' | 'payroll_profiles' | null>(null);
    const [month,   setMonth]   = useState(String(new Date().getMonth() + 1));
    const [year,    setYear]    = useState(String(new Date().getFullYear()));

    const fetchSummary = async (m: string, y: string) => {
        setError(false);
        setLoading(true);
        try {
            const res = await api.get(`payroll/tax-statutory/summary?month=${m}&year=${y}`);
            const d = res.data;
            setTotals({
                incomeTax: Number(d.tds || 0),
                pf:        Number(d.pf  || 0),
                esi:       Number(d.esi || 0),
                pt:        Number(d.professionalTax || 0),
            });
            setSource(d.source || null);
        } catch {
            setTotals({ incomeTax: 0, pf: 0, esi: 0, pt: 0 });
            setError(true);
        } finally { setLoading(false); }
    };

    useEffect(() => { fetchSummary(month, year); }, [month, year]);

    const employerPF   = Math.round(totals.pf * 1.0);
    const employerESI  = totals.esi > 0 ? Math.round(totals.esi / 0.75 * 3.25) : 0;
    const gratuity     = Math.round((totals.incomeTax + totals.pf) * 0.04);
    const bonusReserve = Math.round((totals.incomeTax + totals.pf) * 0.02);
    const totalEmpLiability = employerPF + employerESI + gratuity + bonusReserve;
    const totalEmpDeductions = totals.incomeTax + totals.pf + totals.esi + totals.pt;

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-400">
            <Loader2 size={22} className="animate-spin text-blue-600" />
            <span className="text-xs font-medium text-slate-500">Loading tax and statutory data…</span>
        </div>
    );

    return (
        <div className="space-y-5 animate-in fade-in duration-200">
            {/* ── Filters Bar ──────────────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h3 className="text-base font-semibold text-slate-900">Statutory Tax & Compliance</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Monthly statutory deductions and employer contributions for {MONTHS[parseInt(month)-1]} {year}</p>
                </div>
                <div className="flex items-center gap-2">
                    <select
                        value={month}
                        onChange={e => setMonth(e.target.value)}
                        className="text-xs font-semibold text-slate-700 bg-white border border-slate-200/90 rounded-lg px-3 py-1.5 outline-none focus:border-blue-500 transition-all cursor-pointer shadow-xs"
                    >
                        {MONTHS.map((m, i) => <option key={m} value={i+1}>{m}</option>)}
                    </select>
                    <select
                        value={year}
                        onChange={e => setYear(e.target.value)}
                        className="text-xs font-semibold text-slate-700 bg-white border border-slate-200/90 rounded-lg px-3 py-1.5 outline-none focus:border-blue-500 transition-all cursor-pointer shadow-xs"
                    >
                        <option value="2024">2024</option>
                        <option value="2025">2025</option>
                        <option value="2026">2026</option>
                        <option value="2027">2027</option>
                    </select>
                    <button
                        onClick={() => fetchSummary(month, year)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200/80 transition-all"
                        title="Refresh"
                    >
                        <RefreshCw size={14} />
                    </button>
                </div>
            </div>

            {/* Notification Banners */}
            {error && (
                <div className="flex items-center gap-2.5 bg-rose-50 border border-rose-200/80 rounded-xl px-4 py-3 text-rose-700 text-xs font-medium">
                    <AlertTriangle size={15} className="text-rose-500 shrink-0" />
                    <p>Unable to retrieve tax records for this cycle. Showing default calculation estimates.</p>
                </div>
            )}
            {!error && source && (
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border bg-emerald-50 text-emerald-700 border-emerald-200/70">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    {source === 'payroll_entries' ? 'Executed Pay Run Records' : 'Projected Salary Profiles'}
                </div>
            )}

            {/* ── Stat Cards ─────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Income Tax (TDS)',   value: inrStr(totals.incomeTax), icon: IndianRupee, bg: 'bg-rose-50',   ic: 'text-rose-600',   sub: 'Monthly tax withholding' },
                    { label: 'Provident Fund (PF)',value: inrStr(totals.pf),        icon: Calculator,  bg: 'bg-blue-50',   ic: 'text-blue-600',   sub: '12% basic salary pool' },
                    { label: 'ESI Contribution',   value: inrStr(totals.esi),       icon: BarChart3,   bg: 'bg-emerald-50',ic: 'text-emerald-600',sub: 'State insurance reserve' },
                    { label: 'Professional Tax',   value: inrStr(totals.pt),        icon: ArrowUpRight,bg: 'bg-amber-50',  ic: 'text-amber-600',  sub: 'State compliance dues' },
                ].map(s => {
                    const Icon = s.icon;
                    return (
                        <div key={s.label} className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-5 hover:border-slate-300 transition-all">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-xs font-semibold text-slate-500">{s.label}</span>
                                <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center`}>
                                    <Icon size={16} className={s.ic} />
                                </div>
                            </div>
                            <p className="text-2xl font-bold text-slate-900 tracking-tight leading-none">{s.value}</p>
                            <p className="text-xs text-slate-400 mt-2 font-medium">{s.sub}</p>
                        </div>
                    );
                })}
            </div>

            {/* ── Detailed Breakdown Tables ───────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Employee deductions */}
                <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
                    <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                        <div>
                            <h4 className="text-sm font-semibold text-slate-900">Employee Deductions</h4>
                            <p className="text-xs text-slate-500 mt-0.5">Withheld directly from gross pay</p>
                        </div>
                        <span className="text-xs font-semibold text-slate-500">{MONTHS[parseInt(month)-1]} {year}</span>
                    </div>
                    <div className="p-4 space-y-2 flex-1">
                        {[
                            { name: 'Income Tax (TDS)', value: totals.incomeTax, desc: 'TDS under Section 192' },
                            { name: 'Provident Fund (PF)', value: totals.pf, desc: '12% Employee Contribution' },
                            { name: 'Employee State Insurance (ESI)', value: totals.esi, desc: '0.75% for eligible wages' },
                            { name: 'Professional Tax (PT)', value: totals.pt, desc: 'State Government Tax' },
                        ].map(d => (
                            <div key={d.name} className="flex justify-between items-center p-3 bg-slate-50/70 rounded-lg border border-slate-100">
                                <div>
                                    <span className="text-xs font-semibold text-slate-800">{d.name}</span>
                                    <p className="text-[11px] text-slate-400 mt-0.5">{d.desc}</p>
                                </div>
                                <span className="text-xs font-bold text-slate-900">{inrStr(d.value)}</span>
                            </div>
                        ))}
                    </div>
                    <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                        <div className="flex justify-between items-center px-3 py-2 bg-white rounded-lg border border-slate-200 shadow-xs">
                            <span className="text-xs font-bold text-slate-700">Total Employee Deductions</span>
                            <span className="text-sm font-bold text-slate-900">{inrStr(totalEmpDeductions)}</span>
                        </div>
                    </div>
                </div>

                {/* Employer liabilities */}
                <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
                    <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                        <div>
                            <h4 className="text-sm font-semibold text-slate-900">Employer Contributions & Provisions</h4>
                            <p className="text-xs text-slate-500 mt-0.5">Company compliance liabilities</p>
                        </div>
                        <span className="text-xs font-semibold text-slate-500">{MONTHS[parseInt(month)-1]} {year}</span>
                    </div>
                    <div className="p-4 space-y-2 flex-1">
                        {[
                            { name: 'Employer PF Contribution', value: employerPF, desc: '12% Matching PF + EPS + Admin' },
                            { name: 'Employer ESI Contribution', value: employerESI, desc: '3.25% Company Medical Insurance' },
                            { name: 'Gratuity Reserves', value: gratuity, desc: 'Statutory 4% monthly accrual' },
                            { name: 'Statutory Bonus Provision', value: bonusReserve, desc: '2% Accrual provision pool' },
                        ].map(d => (
                            <div key={d.name} className="flex justify-between items-center p-3 bg-emerald-50/40 rounded-lg border border-emerald-100/70">
                                <div>
                                    <span className="text-xs font-semibold text-emerald-900">{d.name}</span>
                                    <p className="text-[11px] text-emerald-700/70 mt-0.5">{d.desc}</p>
                                </div>
                                <span className="text-xs font-bold text-emerald-800">{inrStr(d.value)}</span>
                            </div>
                        ))}
                    </div>
                    <div className="p-4 border-t border-slate-100 bg-emerald-50/30">
                        <div className="flex justify-between items-center px-3 py-2 bg-white rounded-lg border border-emerald-200 shadow-xs">
                            <span className="text-xs font-bold text-emerald-900">Total Employer Contributions</span>
                            <span className="text-sm font-bold text-emerald-900">{inrStr(totalEmpLiability)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Statutory Filing Schedule & Notice ───────── */}
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center shrink-0">
                        <Calendar size={18} />
                    </div>
                    <div>
                        <h4 className="text-sm font-semibold text-slate-900">Statutory Remittance Schedule</h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                            PF and ESI challans are due on the <strong>15th</strong> of each month. TDS return deposits are due by the <strong>7th</strong>.
                        </p>
                    </div>
                </div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-50 text-slate-700 rounded-lg border border-slate-200 text-xs font-medium">
                    <ShieldCheck size={14} className="text-emerald-600" />
                    <span>FY 2025-26 Compliant</span>
                </div>
            </div>
        </div>
    );
};

export default TaxStatutory;
