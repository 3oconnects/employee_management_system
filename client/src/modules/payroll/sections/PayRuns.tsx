import React, { useState, useEffect } from 'react';
import { CreditCard, History, IndianRupee, Loader2, CheckCircle2, Calculator, ArrowRight, FileText, Users } from 'lucide-react';
import api from '../../../services/api';

const PayRuns = () => {
    const [month, setMonth] = useState('3');
    const [year, setYear] = useState('2026');
    const [status, setStatus] = useState<'IDLE' | 'PROCESSING' | 'SUCCESS' | 'ERROR'>('IDLE');
    const [summary, setSummary] = useState<any>(null);

    useEffect(() => {
        fetchSummary();
    }, []);

    const fetchSummary = async () => {
        try {
            const res = await api.get('payroll/live-summary');
            setSummary(res.data);
        } catch (err) {
            console.error('Failed to fetch summary:', err);
        }
    };

    const handleRun = async () => {
        setStatus('PROCESSING');
        try {
            await api.post('payroll/run', { month, year });
            await fetchSummary();
            setStatus('SUCCESS');
        } catch (err) {
            console.error('Payroll generation error:', err);
            setStatus('ERROR');
        }
    };

    const formatter = new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
    });

    return (
        <div className="space-y-12 animate-in fade-in duration-500">
            {/* Payroll Generation Engine */}
            <div className="bg-[#0F172A] rounded-2xl p-8 text-white relative overflow-hidden">
                <div className="relative z-10 grid grid-cols-12 gap-8 items-center">
                    <div className="col-span-12 lg:col-span-7 space-y-4">
                        <div className="inline-flex items-center space-x-2 px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full border border-blue-500/20">
                            <Calculator size={14} />
                            <span className="text-[10px] font-black uppercase tracking-widest text-[#60A5FA]">Calculated Engine v2.4</span>
                        </div>
                        <h2 className="text-3xl font-black tracking-tight">Execute Monthly Payroll Cycle</h2>
                        <p className="text-slate-400 text-sm max-w-lg">Advanced statutory calculations for Indian income tax, PF, ESI, and other professional deductions.</p>
                    </div>
                    <div className="col-span-12 lg:col-span-5 flex justify-end">
                        <div className="bg-white/5 p-6 rounded-2xl border border-white/10 backdrop-blur-sm w-full max-w-md space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Month</label>
                                    <select value={month} onChange={(e) => setMonth(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs font-bold text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all">
                                        {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, i) => (<option key={m} value={i + 1}>{m}</option>))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Year</label>
                                    <select value={year} onChange={(e) => setYear(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs font-bold text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all">
                                        <option value="2025">2025</option>
                                        <option value="2026">2026</option>
                                    </select>
                                </div>
                            </div>
                            <button onClick={handleRun} disabled={status === 'PROCESSING'} className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 disabled:opacity-50 flex items-center justify-center space-x-2">
                                {status === 'PROCESSING' ? (<><Loader2 size={16} className="animate-spin" /><span>Initialising...</span></>) : (<><CreditCard size={16} /><span>Process Payroll</span></>)}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Live Payroll Summary */}
            {summary && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-8">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-xl font-black text-slate-900 tracking-tight">Financial Estimates</h3>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Based on active payroll profiles</p>
                        </div>
                        {status === 'SUCCESS' && (
                            <div className="px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center space-x-2 text-emerald-600 animate-in fade-in slide-in-from-top-2">
                                <CheckCircle2 size={16} />
                                <span className="text-[10px] font-black uppercase tracking-widest">Cycle Processed</span>
                            </div>
                        )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                        <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Total Monthly Gross</span>
                            <div className="text-xl font-black text-slate-900">{formatter.format(summary.totalGross)}</div>
                        </div>
                        <div className="p-6 bg-rose-50/30 rounded-2xl border border-rose-100 space-y-3">
                            <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest block">Statutory Deductions</span>
                            <div className="text-xl font-black text-rose-600">{formatter.format(summary.totalDeductions)}</div>
                        </div>
                        <div className="p-6 bg-emerald-50/30 rounded-2xl border border-emerald-100 space-y-3">
                            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest block">Net Fund Outflow</span>
                            <div className="text-xl font-black text-emerald-600">{formatter.format(summary.netOutflow)}</div>
                        </div>
                        <div className="p-6 bg-blue-50/30 rounded-2xl border border-blue-100 space-y-3">
                            <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest block">Govt. Payables</span>
                            <div className="text-xl font-black text-blue-600">{formatter.format(summary.govtPayables)}</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PayRuns;
