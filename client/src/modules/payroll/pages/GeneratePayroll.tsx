import React, { useState } from 'react';
import {
    CreditCard,
    Power,
    CheckCircle,
    Loader2,
    TrendingUp,
    TrendingDown,
    ShieldAlert,
    ChevronRight,
    TrendingDown as TrendDownIcon,
    TrendingUp as TrendUpIcon,
    Activity,
    DollarSign,
    PieChart
} from 'lucide-react';
import api from '../../../services/api';

const GeneratePayroll: React.FC = () => {
    const [month, setMonth] = useState('2');
    const [year, setYear] = useState('2026');
    const [status, setStatus] = useState<'IDLE' | 'PROCESSING' | 'SUCCESS' | 'ERROR'>('IDLE');

    const handleGenerate = async () => {
        setStatus('PROCESSING');
        try {
            await api.post('/payroll/generate', { month, year });
            setStatus('SUCCESS');
            setTimeout(() => setStatus('IDLE'), 5000);
        } catch (err) {
            setStatus('ERROR');
            alert('Payroll generation failed.');
        }
    };

    return (
        <div className="min-h-screen bg-[#F4F7F9] p-8 space-y-8 font-sans">

            {/* 1. Intelligence Banner: Payroll Financial Integrity (Additive) */}
            <div className="grid grid-cols-12 gap-8">

                {/* Payroll Overview Card */}
                <div className="col-span-12 lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-sm p-8 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-[12px] font-black text-slate-400 uppercase tracking-widest">Financial Summary Hub</h2>
                            <p className="text-[11px] text-slate-400 font-bold mt-0.5">FEBRUARY 2026 CYCLE PREVIEW</p>
                        </div>
                        <div className="flex items-center space-x-2 text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100/50">
                            <Activity size={14} className="animate-pulse" />
                            <span className="text-[10px] font-black tracking-widest uppercase">System Healthy</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-4 gap-8">
                        {[
                            { label: 'Gross Pay', val: '€142,450', trend: '+4.2%', up: true },
                            { label: 'Deductions', val: '€28,120', trend: '-1.1%', up: false },
                            { label: 'Net Payable', val: '€114,330', trend: '+5.8%', up: true },
                            { label: 'Tax Liability', val: '€18,400', trend: '+2.4%', up: true }
                        ].map((item, i) => (
                            <div key={i} className="space-y-1">
                                <span className="text-[11px] font-black text-slate-400 uppercase tracking-tighter">{item.label}</span>
                                <div className="flex items-baseline space-x-2">
                                    <h3 className="text-xl font-black text-slate-900 tracking-tight">{item.val}</h3>
                                    <span className={`text-[10px] font-bold ${item.up ? 'text-emerald-500' : 'text-rose-500'} flex items-center`}>
                                        {item.up ? <TrendUpIcon size={12} /> : <TrendDownIcon size={12} />}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-8 grid grid-cols-1 gap-4">
                        <div className="space-y-3">
                            <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Structural Breakdown</h4>
                            <div className="h-3 w-full flex rounded-full overflow-hidden shadow-inner">
                                <div className="h-full bg-blue-600 w-[60%] border-r border-white/20" title="Basic"></div>
                                <div className="h-full bg-indigo-500 w-[20%] border-r border-white/20" title="Allowances"></div>
                                <div className="h-full bg-rose-500 w-[15%] border-r border-white/20" title="Tax"></div>
                                <div className="h-full bg-slate-200 w-[5%]" title="Deductions"></div>
                            </div>
                            <div className="flex items-center space-x-6 text-[10px] font-bold text-slate-500 pt-1">
                                <div className="flex items-center"><div className="w-2 h-2 bg-blue-600 rounded-full mr-2"></div>Basic Pay</div>
                                <div className="flex items-center"><div className="w-2 h-2 bg-indigo-500 rounded-full mr-2"></div>Allowances</div>
                                <div className="flex items-center"><div className="w-2 h-2 bg-rose-500 rounded-full mr-2"></div>Tax Liability</div>
                                <div className="flex items-center"><div className="w-2 h-2 bg-slate-300 rounded-full mr-2"></div>Other</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Admin Anomaly Flag Panel */}
                <div className="col-span-12 lg:col-span-4 bg-[#0F172A] rounded-2xl p-8 text-white relative overflow-hidden group shadow-xl">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
                    <div className="relative z-10 flex flex-col h-full">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.2em]">Operational Integrity</h3>
                            <ShieldAlert size={18} className="text-amber-400" />
                        </div>

                        <div className="space-y-6 flex-1">
                            <div className="p-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-all cursor-pointer group/item">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-[12px] font-black text-white">Sudden Increment</span>
                                    <span className="px-2 py-0.5 bg-amber-500/20 text-amber-500 rounded text-[9px] font-black">HIGH</span>
                                </div>
                                <p className="text-[11px] text-slate-400">Sarah Jenkins: +42% vs last cycle. Verification required.</p>
                            </div>

                            <div className="p-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-all cursor-pointer group/item">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-[12px] font-black text-white">Overtime Impact</span>
                                    <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-400 rounded text-[9px] font-black">MEDIUM</span>
                                </div>
                                <p className="text-[11px] text-slate-400">OT cost is 8.4% of total payroll. Target: 5.0%.</p>
                            </div>
                        </div>

                        <button className="mt-8 w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[11px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95">
                            Run Full Audit Report
                        </button>
                    </div>
                </div>
            </div>

            {/* 2. Main Processing Engine (Existing Structure Preserved) */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col items-center">
                <div className="w-full bg-[#1d2b4d] p-8 text-white flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-black tracking-tight">Financial Engine Alpha</h1>
                        <p className="text-slate-400 text-sm mt-1 font-medium italic">Generate and validate monthly salary disbursements.</p>
                    </div>
                    <CreditCard size={40} className="text-blue-500 opacity-30" />
                </div>

                <div className="p-12 w-full max-w-4xl space-y-10">
                    <div className="grid grid-cols-2 gap-10">
                        <div className="space-y-2">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Target Distribution Month</label>
                            <select
                                value={month}
                                onChange={(e) => setMonth(e.target.value)}
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all cursor-pointer"
                            >
                                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, i) => (
                                    <option key={m} value={i + 1}>{m}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Fiscal Year</label>
                            <select
                                value={year}
                                onChange={(e) => setYear(e.target.value)}
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all cursor-pointer"
                            >
                                <option value="2025">Fiscal 2025</option>
                                <option value="2026">Fiscal 2026</option>
                            </select>
                        </div>
                    </div>

                    <div className="bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100 flex items-start space-x-6">
                        <div className="bg-indigo-600 p-3 rounded-2xl text-white shadow-lg shadow-indigo-200">
                            <Power size={22} />
                        </div>
                        <div>
                            <h4 className="text-sm font-black text-slate-900 tracking-tight">Protocol Advisory</h4>
                            <p className="text-sm text-slate-600 mt-1 leading-relaxed font-medium">
                                Initializing payroll will trigger the **Workforce Intelligence Engine** to compute all earnings, statutory deductions, and tax liabilities based on live attendance data.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col items-center pt-10 border-t border-slate-100">
                        {status === 'IDLE' && (
                            <button
                                onClick={handleGenerate}
                                className="px-16 py-4.5 bg-slate-900 text-white rounded-2xl text-[14px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-2xl hover:translate-y-[-4px] active:scale-95"
                            >
                                Execute Payroll Cycle
                            </button>
                        )}

                        {status === 'PROCESSING' && (
                            <div className="flex flex-col items-center">
                                <Loader2 className="animate-spin text-blue-600 mb-6" size={56} />
                                <h3 className="text-xl font-black text-slate-900">Synchronizing Financial Data...</h3>
                                <p className="text-sm text-slate-500 mt-2 font-medium">Validating 10,420 employee records against global policy.</p>
                            </div>
                        )}

                        {status === 'SUCCESS' && (
                            <div className="flex flex-col items-center text-emerald-600">
                                <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-6 border-4 border-emerald-100">
                                    <CheckCircle size={40} strokeWidth={2.5} />
                                </div>
                                <h3 className="text-2xl font-black tracking-tight text-slate-900">Cycle Deployment Successful</h3>
                                <p className="text-sm text-slate-500 mt-1 font-medium">Digital payslips have been provisioned to all employee hubs.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GeneratePayroll;
