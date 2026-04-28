import React, { useState, useEffect } from 'react';
import {
    CreditCard,
    Loader2,
    CheckCircle2,
    AlertCircle,
    IndianRupee,
    TrendingDown,
    TrendingUp,
    Landmark,
    Play,
} from 'lucide-react';
import api from '../../../services/api';

const inr = (v: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);

const MONTHS  = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const PayRuns: React.FC = () => {
    const [month,   setMonth]   = useState(String(new Date().getMonth() + 1));
    const [year,    setYear]    = useState(String(new Date().getFullYear()));
    const [status,  setStatus]  = useState<'IDLE'|'PROCESSING'|'SUCCESS'|'ERROR'>('IDLE');
    const [summary, setSummary] = useState<any>(null);
    const [loadingSum, setLoadingSum] = useState(true);

    useEffect(() => {
        api.get('payroll/live-summary')
            .then(r => setSummary(r.data))
            .catch(() => {})
            .finally(() => setLoadingSum(false));
    }, []);

    const handleRun = async () => {
        setStatus('PROCESSING');
        try {
            await api.post('payroll/run', { month, year });
            const r = await api.get('payroll/live-summary');
            setSummary(r.data);
            setStatus('SUCCESS');
        } catch {
            setStatus('ERROR');
        }
    };

    return (
        <div className="space-y-6">

            {/* ── Run engine card ──────────────────────────── */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden group">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                    <h3 className="text-[14px] font-black text-slate-900 uppercase tracking-tight">Orchestration Engine</h3>
                    <p className="text-[10px] font-black text-slate-400 mt-1 uppercase tracking-widest">
                        Automated Indian Statutory Calculation Cycle (TDS, PF, ESI, PT)
                    </p>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                    {/* Period selectors */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Cycle Month</label>
                            <select
                                value={month}
                                onChange={e => setMonth(e.target.value)}
                                className="w-full text-[13px] font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-400 focus:bg-white transition-all appearance-none cursor-pointer"
                            >
                                {MONTHS.map((m, i) => <option key={m} value={i+1}>{m}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Cycle Year</label>
                            <select
                                value={year}
                                onChange={e => setYear(e.target.value)}
                                className="w-full text-[13px] font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-400 focus:bg-white transition-all appearance-none cursor-pointer"
                            >
                                <option value="2024">2024</option>
                                <option value="2025">2025</option>
                                <option value="2026">2026</option>
                            </select>
                        </div>
                    </div>

                    {/* Run button + status */}
                    <div className="flex flex-col gap-4">
                        {status === 'SUCCESS' && (
                            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2 text-emerald-600 text-[10px] font-black uppercase tracking-tight animate-in slide-in-from-top-2">
                                <CheckCircle2 size={14} /> Matrix sync successful
                            </div>
                        )}
                        {status === 'ERROR' && (
                            <div className="flex items-center gap-2 bg-rose-50 border border-rose-100 rounded-xl px-4 py-2 text-rose-600 text-[10px] font-black uppercase tracking-tight animate-in slide-in-from-top-2">
                                <AlertCircle size={14} /> Authorization failed
                            </div>
                        )}
                        <button
                            onClick={handleRun}
                            disabled={status === 'PROCESSING'}
                            className="flex items-center justify-center gap-2.5 py-3.5 bg-slate-900 text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg shadow-slate-900/10 active:scale-[0.98] disabled:opacity-40"
                        >
                            {status === 'PROCESSING'
                                ? <><Loader2 size={14} className="animate-spin" /> Processing lifecycle...</>
                                : <><Play size={14} /> Execute Cycle: {MONTHS[Number(month)-1]} {year}</>
                            }
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Live financial estimates ──────────────────── */}
            {loadingSum ? (
                <div className="flex items-center justify-center py-20 gap-3 text-slate-400">
                    <Loader2 size={18} className="animate-spin text-indigo-400" />
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Synchronizing projections...</span>
                </div>
            ) : summary && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden group">
                    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                        <div>
                            <h3 className="text-[14px] font-black text-slate-900 uppercase tracking-tight">Fiscal Projections</h3>
                            <p className="text-[10px] font-black text-slate-400 mt-1 uppercase tracking-widest">Active Personnel Matrix</p>
                        </div>
                        <Landmark size={18} className="text-slate-300" />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-slate-100">
                        {[
                            { label: 'Aggregate Gross',   value: inr(summary.totalGross),      icon: IndianRupee,  color: 'text-slate-900',   bg: 'bg-slate-50' },
                            { label: 'Statutory Pool',    value: inr(summary.totalDeductions),  icon: TrendingDown, color: 'text-rose-500',    bg: 'bg-rose-50' },
                            { label: 'Net Liability',     value: inr(summary.netOutflow),       icon: TrendingUp,   color: 'text-emerald-600', bg: 'bg-emerald-50' },
                            { label: 'Compliance Reserve', value: inr(summary.govtPayables),     icon: Landmark,     color: 'text-indigo-600',  bg: 'bg-indigo-50' },
                        ].map(s => {
                            const Icon = s.icon;
                            return (
                                <div key={s.label} className="p-6 flex flex-col gap-5 hover:bg-slate-50 transition-colors">
                                    <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center border border-slate-100 shadow-sm`}>
                                        <Icon size={14} className={s.color} />
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">{s.label}</p>
                                        <p className={`text-[18px] font-black ${s.color} tracking-tight leading-none`}>{s.value}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PayRuns;
