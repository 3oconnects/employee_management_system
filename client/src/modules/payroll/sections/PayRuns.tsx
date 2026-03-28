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
        <div className="space-y-5">

            {/* ── Run engine card ──────────────────────────── */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-50">
                    <h3 className="text-[13px] font-bold text-gray-800">Execute Monthly Payroll Cycle</h3>
                    <p className="text-[11.5px] text-gray-400 mt-0.5">
                        Calculates Indian income tax, PF, ESI, and professional deductions automatically.
                    </p>
                </div>

                <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5 items-end">
                    {/* Period selectors */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Month</label>
                            <select
                                value={month}
                                onChange={e => setMonth(e.target.value)}
                                className="w-full text-[13px] text-gray-800 bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-blue-300 focus:bg-white transition-all"
                            >
                                {MONTHS.map((m, i) => <option key={m} value={i+1}>{m}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Year</label>
                            <select
                                value={year}
                                onChange={e => setYear(e.target.value)}
                                className="w-full text-[13px] text-gray-800 bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-blue-300 focus:bg-white transition-all"
                            >
                                <option value="2024">2024</option>
                                <option value="2025">2025</option>
                                <option value="2026">2026</option>
                            </select>
                        </div>
                    </div>

                    {/* Run button + status */}
                    <div className="flex flex-col gap-3">
                        {status === 'SUCCESS' && (
                            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2.5 text-emerald-600 text-[12px] font-semibold">
                                <CheckCircle2 size={14} /> Payroll cycle processed successfully!
                            </div>
                        )}
                        {status === 'ERROR' && (
                            <div className="flex items-center gap-2 bg-rose-50 border border-rose-100 rounded-xl px-4 py-2.5 text-rose-600 text-[12px] font-semibold">
                                <AlertCircle size={14} /> Processing failed — please try again.
                            </div>
                        )}
                        <button
                            onClick={handleRun}
                            disabled={status === 'PROCESSING'}
                            className="flex items-center justify-center gap-2.5 py-3 bg-blue-600 text-white rounded-xl text-[13.5px] font-semibold hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-60 shadow-sm shadow-blue-200"
                        >
                            {status === 'PROCESSING'
                                ? <><Loader2 size={15} className="animate-spin" /> Processing…</>
                                : <><Play size={14} /> Process Payroll for {MONTHS[Number(month)-1]} {year}</>
                            }
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Live financial estimates ──────────────────── */}
            {loadingSum ? (
                <div className="flex items-center justify-center py-16 gap-2 text-gray-400">
                    <Loader2 size={16} className="animate-spin text-blue-400" />
                    <span className="text-[12.5px]">Loading estimates…</span>
                </div>
            ) : summary && (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-50">
                        <h3 className="text-[13px] font-bold text-gray-800">Financial Estimates</h3>
                        <p className="text-[11.5px] text-gray-400 mt-0.5">Based on active payroll profiles</p>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-gray-50">
                        {[
                            { label: 'Total Monthly Gross',   value: inr(summary.totalGross),      icon: IndianRupee,  color: 'text-gray-900',   bg: '' },
                            { label: 'Statutory Deductions',  value: inr(summary.totalDeductions),  icon: TrendingDown, color: 'text-rose-600',   bg: '' },
                            { label: 'Net Fund Outflow',      value: inr(summary.netOutflow),       icon: TrendingUp,   color: 'text-emerald-600',bg: '' },
                            { label: 'Govt. Payables',        value: inr(summary.govtPayables),     icon: Landmark,     color: 'text-blue-600',  bg: '' },
                        ].map(s => {
                            const Icon = s.icon;
                            return (
                                <div key={s.label} className="p-5 flex flex-col gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center">
                                        <Icon size={15} className="text-gray-400" />
                                    </div>
                                    <div>
                                        <p className="text-[10.5px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{s.label}</p>
                                        <p className={`text-[18px] font-bold ${s.color} leading-none`}>{s.value}</p>
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
