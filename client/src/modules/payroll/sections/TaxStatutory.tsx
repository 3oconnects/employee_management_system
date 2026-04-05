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
    ExternalLink,
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
        <div className="flex items-center justify-center py-24 gap-3 text-gray-400">
            <Loader2 size={20} className="animate-spin text-blue-500" />
            <span className="text-[13px]">Loading tax data…</span>
        </div>
    );

    return (
        <div className="space-y-5">

            {/* ── Filters bar ──────────────────────────────── */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h3 className="text-[13px] font-bold text-gray-800">Tax & Statutory Summary</h3>
                    <p className="text-[11.5px] text-gray-400 mt-0.5">FY 2025-26 — statutory liabilities and compliance data</p>
                </div>
                <div className="flex items-center gap-2">
                    <select value={month} onChange={e => setMonth(e.target.value)}
                        className="text-[12.5px] text-gray-700 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-blue-300 transition-all">
                        {MONTHS.map((m, i) => <option key={m} value={i+1}>{m}</option>)}
                    </select>
                    <select value={year} onChange={e => setYear(e.target.value)}
                        className="text-[12.5px] text-gray-700 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-blue-300 transition-all">
                        <option value="2024">2024</option>
                        <option value="2025">2025</option>
                        <option value="2026">2026</option>
                    </select>
                    <button onClick={() => fetchSummary(month, year)}
                        className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors" title="Refresh">
                        <RefreshCw size={15} />
                    </button>
                </div>
            </div>

            {/* Banners */}
            {error && (
                <div className="flex items-center gap-3 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">
                    <AlertTriangle size={15} className="text-rose-500 flex-shrink-0" />
                    <p className="text-[12.5px] text-rose-600 font-medium">Unable to sync database — showing ₹0 for statutory values.</p>
                </div>
            )}
            {!error && source && (
                <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border w-fit text-[11px] font-semibold ${
                    source === 'payroll_entries'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                        : 'bg-amber-50 text-amber-600 border-amber-100'
                }`}>
                    {source === 'payroll_entries' ? '✅ Actual data from payroll run' : '⚡ Projected from salary profiles'}
                </div>
            )}

            {/* ── Stat cards ─────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Monthly TDS',      value: inrStr(totals.incomeTax), icon: IndianRupee, bg: 'bg-rose-50',   ic: 'text-rose-500',   tx: 'text-rose-600'   },
                    { label: 'Provident Fund',   value: inrStr(totals.pf),        icon: Calculator,  bg: 'bg-blue-50',   ic: 'text-blue-500',   tx: 'text-blue-600'   },
                    { label: 'ESI Contribution', value: inrStr(totals.esi),       icon: BarChart3,   bg: 'bg-emerald-50',ic: 'text-emerald-500',tx: 'text-emerald-600'},
                    { label: 'Professional Tax', value: inrStr(totals.pt),        icon: ArrowUpRight,bg: 'bg-amber-50',  ic: 'text-amber-500',  tx: 'text-amber-600'  },
                ].map(s => {
                    const Icon = s.icon;
                    return (
                        <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 card-hover">
                            <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center mb-4`}>
                                <Icon size={16} className={s.ic} />
                            </div>
                            <p className="text-[10.5px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{s.label}</p>
                            <p className={`text-[20px] font-bold ${s.tx} leading-none`}>{s.value}</p>
                        </div>
                    );
                })}
            </div>

            {/* ── Tables ─────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Employee deductions */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
                        <div>
                            <h4 className="text-[13px] font-bold text-gray-800">Employee Deductions</h4>
                            <p className="text-[11px] text-gray-400 mt-0.5">{MONTHS[parseInt(month)-1]} {year}</p>
                        </div>
                    </div>
                    <div className="p-4 space-y-2">
                        {[
                            { name: 'Income Tax (TDS)', value: totals.incomeTax },
                            { name: 'Provident Fund (PF)', value: totals.pf },
                            { name: 'ESI Contribution', value: totals.esi },
                            { name: 'Professional Tax', value: totals.pt },
                        ].map(d => (
                            <div key={d.name} className="flex justify-between items-center px-3 py-2.5 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                                <span className="text-[12.5px] text-gray-600 font-medium">{d.name}</span>
                                <span className="text-[12.5px] font-bold text-gray-900">{inrStr(d.value)}</span>
                            </div>
                        ))}
                        <div className="flex justify-between items-center px-3 py-2.5 bg-blue-50 rounded-xl border border-blue-100">
                            <span className="text-[12.5px] text-blue-700 font-semibold">Total Deductions</span>
                            <span className="text-[13px] font-bold text-blue-900">{inrStr(totalEmpDeductions)}</span>
                        </div>
                    </div>
                </div>

                {/* Employer liabilities */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-50">
                        <h4 className="text-[13px] font-bold text-gray-800">Employer Liabilities</h4>
                        <p className="text-[11px] text-gray-400 mt-0.5">Monthly contributions & reserves</p>
                    </div>
                    <div className="p-4 space-y-2">
                        {[
                            { name: 'Employer PF',         value: employerPF },
                            { name: 'Employer ESI',        value: employerESI },
                            { name: 'Gratuity Allocation', value: gratuity },
                            { name: 'Bonus Reserve',       value: bonusReserve },
                        ].map(d => (
                            <div key={d.name} className="flex justify-between items-center px-3 py-2.5 bg-emerald-50/60 rounded-xl hover:bg-emerald-50 transition-colors">
                                <span className="text-[12.5px] text-emerald-700/80 font-medium">{d.name}</span>
                                <span className="text-[12.5px] font-bold text-emerald-700">{inrStr(d.value)}</span>
                            </div>
                        ))}
                        <div className="mt-2 px-3 py-2.5 text-center bg-gray-50 rounded-xl border border-gray-100">
                            <p className="text-[11px] text-gray-500 font-medium">
                                Total Monthly Liability: <span className="font-bold text-gray-900">{inrStr(totalEmpLiability)}</span>
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Compliance banner ────────────────────────── */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-5 flex items-center justify-between gap-4 text-white">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center flex-shrink-0">
                        <ShieldCheck size={18} className="text-white" />
                    </div>
                    <div>
                        <p className="text-[13.5px] font-bold">Automated Tax Compliance Active</p>
                        <p className="text-[11.5px] text-blue-100 mt-0.5">FY 2025-26 tax slabs loaded. Defaulting to New Tax Regime.</p>
                    </div>
                </div>
                <button
                    onClick={() => window.open(`${api.defaults.baseURL}/tax/slabs`, '_blank')}
                    className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 bg-white text-blue-600 rounded-lg text-[12px] font-semibold hover:bg-blue-50 transition-colors"
                >
                    <ExternalLink size={12} /> View Tax Slabs
                </button>
            </div>
        </div>
    );
};

export default TaxStatutory;
