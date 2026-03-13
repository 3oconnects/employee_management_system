import React, { useState, useEffect } from 'react';
import { History, BarChart3, ArrowUpRight, Calculator, IndianRupee, Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import api from '../../../services/api';
import StatCard from '../components/StatCard';

const TaxStatutory = () => {
    const [totals, setTotals] = useState({ incomeTax: 0, pf: 0, esi: 0, pt: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [source, setSource] = useState<'payroll_entries' | 'payroll_profiles' | null>(null);
    const [month, setMonth] = useState('3');
    const [year, setYear] = useState('2026');

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
        } catch (err) {
            console.error('Tax & Statutory: API request failed —', err);
            setTotals({ incomeTax: 0, pf: 0, esi: 0, pt: 0 });
            setError(true);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSummary(month, year);
    }, [month, year]);

    // Derive employer contributions from employee figures (standard ratios)
    const employerPF    = Math.round(totals.pf * 1.0);     // employer matches employee @ 12%
    const employerESI   = totals.esi > 0 ? Math.round(totals.esi / 0.75 * 3.25) : 0; // ESI employer rate 3.25%
    const gratuity      = Math.round((totals.incomeTax + totals.pf) * 0.04);
    const bonusReserve  = Math.round((totals.incomeTax + totals.pf) * 0.02);
    const totalEmployerLiability = employerPF + employerESI + gratuity + bonusReserve;

    if (loading) return (
        <div className="flex justify-center p-20">
            <Loader2 size={40} className="animate-spin text-slate-400" />
        </div>
    );

    return (
        <div className="space-y-12 animate-in fade-in duration-500">

            {/* Error banner */}
            {error && (
                <div className="flex items-center gap-3 p-4 bg-rose-950/60 border border-rose-700/60 rounded-2xl text-rose-300">
                    <AlertTriangle size={18} className="shrink-0 text-rose-400" />
                    <p className="text-xs font-bold uppercase tracking-wide">
                        Unable to sync with payroll database — displaying ₹0 for all statutory values
                    </p>
                </div>
            )}

            {/* Source indicator */}
            {!error && source && (
                <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border w-fit text-[10px] font-black uppercase tracking-widest ${
                    source === 'payroll_entries'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                    <span>{source === 'payroll_entries' ? '✅ Data from completed payroll run' : '⚡ Projected from salary profiles (no payroll run yet)'}</span>
                </div>
            )}

            {/* Context Filters */}
            <div className="bg-[#0F172A] p-6 rounded-2xl flex items-center justify-between border border-slate-800 shadow-xl">
                <div className="flex items-center space-x-4">
                    <div className="p-2 bg-blue-600/20 rounded-lg text-blue-400">
                        <Calculator size={20} />
                    </div>
                    <div>
                        <h4 className="text-white text-xs font-black uppercase tracking-widest">Compliance Period</h4>
                        <p className="text-slate-400 text-[10px] font-bold uppercase mt-0.5 tracking-tight">Statutory Liabilities for FY 2025-26</p>
                    </div>
                </div>
                <div className="flex items-center space-x-3">
                    <select
                        value={month}
                        onChange={(e) => setMonth(e.target.value)}
                        className="bg-slate-900 border border-slate-700 text-white text-[10px] font-black uppercase py-2 px-4 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    >
                        {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, i) => (
                            <option key={m} value={i + 1}>{m}</option>
                        ))}
                    </select>
                    <select
                        value={year}
                        onChange={(e) => setYear(e.target.value)}
                        className="bg-slate-900 border border-slate-700 text-white text-[10px] font-black uppercase py-2 px-4 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    >
                        <option value="2024">2024</option>
                        <option value="2025">2025</option>
                        <option value="2026">2026</option>
                    </select>
                    <button
                        onClick={() => fetchSummary(month, year)}
                        className="p-2 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 rounded-xl transition-all"
                        title="Refresh"
                    >
                        <RefreshCw size={16} />
                    </button>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard label="Monthly TDS" value={`₹${totals.incomeTax.toLocaleString('en-IN')}`} icon={IndianRupee} color="bg-rose-600" />
                <StatCard label="Provident Fund (PF)" value={`₹${totals.pf.toLocaleString('en-IN')}`} icon={Calculator} color="bg-blue-600" />
                <StatCard label="ESI Contribution" value={`₹${totals.esi.toLocaleString('en-IN')}`} icon={BarChart3} color="bg-emerald-600" />
                <StatCard label="Professional Tax" value={`₹${totals.pt.toLocaleString('en-IN')}`} icon={ArrowUpRight} color="bg-amber-600" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
                {/* Employee Deductions */}
                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm transition-all hover:border-blue-200">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-black text-slate-900">Employee Statutory Deductions</h3>
                        <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-lg uppercase tracking-widest">
                            {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][parseInt(month)-1]} {year}
                        </span>
                    </div>
                    <div className="space-y-4">
                        {[
                            { name: 'Income Tax (TDS)', value: totals.incomeTax },
                            { name: 'Provident Fund (PF)', value: totals.pf },
                            { name: 'ESI Contribution', value: totals.esi },
                            { name: 'Professional Tax', value: totals.pt }
                        ].map(d => (
                            <div key={d.name} className="flex justify-between items-center text-xs font-bold p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                                <span className="text-slate-500">{d.name}</span>
                                <span className="text-slate-900">₹{(d.value || 0).toLocaleString('en-IN')}</span>
                            </div>
                        ))}
                        <div className="flex justify-between items-center text-xs font-black p-3 bg-blue-50 rounded-xl border border-blue-100">
                            <span className="text-blue-700">Total Employee Deductions</span>
                            <span className="text-blue-900">₹{(totals.incomeTax + totals.pf + totals.esi + totals.pt).toLocaleString('en-IN')}</span>
                        </div>
                    </div>
                </div>

                {/* Employer Liabilities */}
                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm transition-all hover:border-emerald-200">
                    <h3 className="text-lg font-black text-slate-900 mb-6">Employer's Liabilities (Monthly)</h3>
                    <div className="space-y-4">
                        {[
                            { name: "Employer PF Contribution", value: employerPF },
                            { name: "Employer ESI Contribution", value: employerESI },
                            { name: "Gratuity Pool Allocation", value: gratuity },
                            { name: "Statutory Bonus Reserve", value: bonusReserve }
                        ].map(d => (
                            <div key={d.name} className="flex justify-between items-center text-xs font-bold p-3 bg-emerald-50/50 rounded-xl hover:bg-emerald-50 transition-colors">
                                <span className="text-emerald-700/80">{d.name}</span>
                                <span className="text-emerald-700 font-black">₹{(Math.round(d.value || 0)).toLocaleString('en-IN')}</span>
                            </div>
                        ))}
                    </div>
                    <div className="mt-8 pt-6 border-t border-emerald-100/50 text-center">
                        <p className="text-[10px] font-black text-emerald-900 uppercase tracking-widest">
                            Total Liability: ₹{totalEmployerLiability.toLocaleString('en-IN')}/Mo
                        </p>
                    </div>
                </div>
            </div>

            {/* Compliance Banner */}
            <div className="p-8 bg-blue-600 rounded-3xl text-white shadow-2xl shadow-blue-200 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32" />
                <div className="relative z-10">
                    <h3 className="text-xl font-black mb-2">Automated Tax Compliance</h3>
                    <p className="text-blue-100 text-sm max-w-lg mb-6">Financial Year 2025-26 Tax Slabs are active. System is operating under New Tax Regime by default.</p>
                    <button 
                        onClick={() => window.open(`${api.defaults.baseURL}/tax/slabs`, "_blank")}
                        className="px-6 py-2 bg-white text-blue-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-50 transition-all active:scale-95 shadow-lg"
                    >
                        Download FY-26 Tax Slabs
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TaxStatutory;
