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
        <div className="space-y-5 animate-in fade-in duration-300">
            {/* ── Run engine card ──────────────────────────── */}
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <div>
                        <h3 className="text-base font-semibold text-slate-900">Execute Monthly Pay Run</h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Automated calculation cycle for salaries, PF, ESI, Professional Tax, and TDS
                        </p>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                        <CreditCard size={16} />
                    </div>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                    {/* Period selectors */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="block text-xs font-semibold text-slate-600">Cycle Month</label>
                            <select
                                value={month}
                                onChange={e => setMonth(e.target.value)}
                                className="w-full text-xs font-medium text-slate-900 bg-slate-50 border border-slate-200/90 rounded-lg px-3 py-2 outline-none focus:border-blue-500 focus:bg-white transition-all cursor-pointer"
                            >
                                {MONTHS.map((m, i) => <option key={m} value={i+1}>{m}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-xs font-semibold text-slate-600">Cycle Year</label>
                            <select
                                value={year}
                                onChange={e => setYear(e.target.value)}
                                className="w-full text-xs font-medium text-slate-900 bg-slate-50 border border-slate-200/90 rounded-lg px-3 py-2 outline-none focus:border-blue-500 focus:bg-white transition-all cursor-pointer"
                            >
                                <option value="2024">2024</option>
                                <option value="2025">2025</option>
                                <option value="2026">2026</option>
                                <option value="2027">2027</option>
                            </select>
                        </div>
                    </div>

                    {/* Run button + status */}
                    <div className="flex flex-col gap-3">
                        {status === 'SUCCESS' && (
                            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200/80 rounded-lg px-3.5 py-2 text-emerald-700 text-xs font-semibold animate-in slide-in-from-top-1">
                                <CheckCircle2 size={15} /> Payroll cycle completed successfully
                            </div>
                        )}
                        {status === 'ERROR' && (
                            <div className="flex items-center gap-2 bg-rose-50 border border-rose-200/80 rounded-lg px-3.5 py-2 text-rose-700 text-xs font-semibold animate-in slide-in-from-top-1">
                                <AlertCircle size={15} /> Failed to execute payroll cycle. Check error logs.
                            </div>
                        )}
                        <button
                            onClick={handleRun}
                            disabled={status === 'PROCESSING'}
                            className="flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-all shadow-xs active:scale-[0.99] disabled:opacity-50"
                        >
                            {status === 'PROCESSING'
                                ? <><Loader2 size={14} className="animate-spin" /> Processing payroll…</>
                                : <><Play size={14} /> Run Payroll for {MONTHS[Number(month)-1]} {year}</>
                            }
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Live financial estimates ──────────────────── */}
            {loadingSum ? (
                <div className="flex items-center justify-center py-16 gap-3 text-slate-400">
                    <Loader2 size={18} className="animate-spin text-blue-600" />
                    <span className="text-xs font-medium text-slate-500">Loading payroll projections…</span>
                </div>
            ) : summary && (
                <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                        <div>
                            <h3 className="text-base font-semibold text-slate-900">Current Cycle Projections</h3>
                            <p className="text-xs text-slate-500 mt-0.5">Calculated across active employee profiles</p>
                        </div>
                        <Landmark size={16} className="text-slate-400" />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-100">
                        {[
                            { label: 'Total Gross Pay',      value: inr(summary.totalGross),      icon: IndianRupee,  color: 'text-slate-900',   bg: 'bg-slate-50' },
                            { label: 'Total Deductions',     value: inr(summary.totalDeductions),  icon: TrendingDown, color: 'text-rose-600',    bg: 'bg-rose-50' },
                            { label: 'Net Disbursable',      value: inr(summary.netOutflow),       icon: TrendingUp,   color: 'text-emerald-600', bg: 'bg-emerald-50' },
                            { label: 'Employer Liabilities', value: inr(summary.govtPayables),     icon: Landmark,     color: 'text-indigo-600',  bg: 'bg-indigo-50' },
                        ].map(s => {
                            const Icon = s.icon;
                            return (
                                <div key={s.label} className="p-5 flex flex-col gap-3 hover:bg-slate-50/50 transition-colors">
                                    <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center`}>
                                        <Icon size={15} className={s.color} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-slate-500 mb-1">{s.label}</p>
                                        <p className={`text-xl font-bold ${s.color} tracking-tight leading-none`}>{s.value}</p>
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
