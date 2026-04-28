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
        <div className="space-y-6">

            {/* ── Filters bar ──────────────────────────────── */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h3 className="text-[14px] font-black text-slate-800 uppercase tracking-tight">Compliance Ledger</h3>
                    <p className="text-[10px] font-black text-slate-400 mt-1 uppercase tracking-widest">FY 2025-26 — statutory liabilities</p>
                </div>
                <div className="flex items-center gap-2">
                    <select value={month} onChange={e => setMonth(e.target.value)}
                        className="text-[11px] font-black uppercase tracking-widest text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-400 transition-all">
                        {MONTHS.map((m, i) => <option key={m} value={i+1}>{m}</option>)}
                    </select>
                    <select value={year} onChange={e => setYear(e.target.value)}
                        className="text-[11px] font-black uppercase tracking-widest text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-400 transition-all">
                        <option value="2024">2024</option>
                        <option value="2025">2025</option>
                        <option value="2026">2026</option>
                    </select>
                    <button onClick={() => fetchSummary(month, year)}
                        className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors" title="Refresh">
                        <RefreshCw size={15} />
                    </button>
                </div>
            </div>

            {/* Banners */}
            {error && (
                <div className="flex items-center gap-3 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">
                    <AlertTriangle size={15} className="text-rose-500 flex-shrink-0" />
                    <p className="text-[11px] text-rose-600 font-black uppercase tracking-tight">Sync Restricted — Database Unreachable.</p>
                </div>
            )}
            {!error && source && (
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border w-fit text-[9px] font-black uppercase tracking-widest ${
                    source === 'payroll_entries'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                        : 'bg-amber-50 text-amber-600 border-amber-100'
                }`}>
                    {source === 'payroll_entries' ? '✅ Executed Data' : '⚡ Projected Matrix'}
                </div>
            )}

            {/* ── Stat cards ─────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Monthly TDS',      value: inrStr(totals.incomeTax), icon: IndianRupee, bg: 'bg-rose-50',   ic: 'text-rose-500',   tx: 'text-rose-600'   },
                    { label: 'Provident Fund',   value: inrStr(totals.pf),        icon: Calculator,  bg: 'bg-indigo-50', ic: 'text-indigo-500', tx: 'text-indigo-600' },
                    { label: 'ESI Contribution', value: inrStr(totals.esi),       icon: BarChart3,   bg: 'bg-emerald-50',ic: 'text-emerald-500',tx: 'text-emerald-600'},
                    { label: 'Professional Tax', value: inrStr(totals.pt),        icon: ArrowUpRight,bg: 'bg-amber-50',  ic: 'text-amber-500',  tx: 'text-amber-600'  },
                ].map(s => {
                    const Icon = s.icon;
                    return (
                        <div key={s.label} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 hover:border-indigo-100 transition-all group">
                            <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center mb-4 transition-transform group-hover:scale-110`}>
                                <Icon size={16} className={s.ic} />
                            </div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{s.label}</p>
                            <p className={`text-[20px] font-black ${s.tx} tracking-tight leading-none`}>{s.value}</p>
                        </div>
                    );
                })}
            </div>

            {/* ── Tables ─────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Employee deductions */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
                        <div>
                            <h4 className="text-[13px] font-black text-slate-800 uppercase tracking-tight">Personnel Deductions</h4>
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">{MONTHS[parseInt(month)-1]} {year}</p>
                        </div>
                    </div>
                    <div className="p-4 space-y-2 flex-1">
                        {[
                            { name: 'Income Tax (TDS)', value: totals.incomeTax },
                            { name: 'Provident Fund (PF)', value: totals.pf },
                            { name: 'ESI Contribution', value: totals.esi },
                            { name: 'Professional Tax', value: totals.pt },
                        ].map(d => (
                            <div key={d.name} className="flex justify-between items-center px-3 py-2.5 bg-slate-50/50 rounded-xl hover:bg-white border border-transparent hover:border-slate-100 transition-all">
                                <span className="text-[12px] text-slate-600 font-bold uppercase tracking-tight">{d.name}</span>
                                <span className="text-[12px] font-black text-slate-900">{inrStr(d.value)}</span>
                            </div>
                        ))}
                    </div>
                    <div className="p-4 border-t border-slate-100 bg-indigo-50/30">
                        <div className="flex justify-between items-center px-3 py-2.5 bg-white rounded-xl border border-indigo-100 shadow-sm">
                            <span className="text-[11px] text-indigo-600 font-black uppercase tracking-widest">Aggregate</span>
                            <span className="text-[14px] font-black text-indigo-900 tracking-tight">{inrStr(totalEmpDeductions)}</span>
                        </div>
                    </div>
                </div>

                {/* Employer liabilities */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/30">
                        <h4 className="text-[13px] font-black text-slate-800 uppercase tracking-tight">Employer Liabilities</h4>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Monthly Reserves</p>
                    </div>
                    <div className="p-4 space-y-2 flex-1">
                        {[
                            { name: 'Employer PF Share',   value: employerPF },
                            { name: 'Employer ESI Share',  value: employerESI },
                            { name: 'Gratuity Reserves',   value: gratuity },
                            { name: 'Bonus Provisions',    value: bonusReserve },
                        ].map(d => (
                            <div key={d.name} className="flex justify-between items-center px-3 py-2.5 bg-emerald-50/30 rounded-xl hover:bg-emerald-50 transition-colors">
                                <span className="text-[12px] text-emerald-700/80 font-bold uppercase tracking-tight">{d.name}</span>
                                <span className="text-[12px] font-black text-emerald-700">{inrStr(d.value)}</span>
                            </div>
                        ))}
                    </div>
                    <div className="p-4 border-t border-slate-100 bg-slate-50/30 text-center">
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest leading-relaxed">
                            Total Liability Pool: <span className="font-black text-slate-900">{inrStr(totalEmpLiability)}</span>
                        </p>
                    </div>
                </div>
            </div>

            {/* ── Compliance banner ────────────────────────── */}
            <div className="bg-slate-900 rounded-2xl p-5 flex items-center justify-between gap-4 text-white shadow-xl shadow-slate-900/10 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full -mr-16 -mt-16 blur-3xl transition-all group-hover:bg-indigo-500/20" />
                <div className="relative flex items-center gap-4">
                    <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                        <ShieldCheck size={18} className="text-indigo-400" />
                    </div>
                    <div>
                        <p className="text-[14px] font-black uppercase tracking-tight">Compliance Protocol Active</p>
                        <p className="text-[10px] text-white/40 mt-1 uppercase tracking-widest font-bold">FY 2025-26 tax slabs initialized.</p>
                    </div>
                </div>
                <button
                    onClick={() => window.open(`${api.defaults.baseURL}/tax/slabs`, '_blank')}
                    className="relative flex-shrink-0 flex items-center gap-2 px-5 py-2.5 bg-white text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-50 transition-all shadow-lg"
                >
                    <ExternalLink size={12} /> View Slabs
                </button>
            </div>
        </div>
    );
};

export default TaxStatutory;
