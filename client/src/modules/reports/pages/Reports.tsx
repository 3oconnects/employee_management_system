import React, { useState } from 'react';
import {
    BarChart3,
    LineChart,
    Filter,
    ChevronDown,
    TrendingUp,
    TrendingDown,
    Calendar,
    Users,
    DollarSign,
    Zap,
    Activity,
    ArrowUpRight,
    ArrowDownRight,
    PieChart,
    FileText,
    Download
} from 'lucide-react';

const Reports: React.FC = () => {
    return (
        <div className="min-h-screen bg-[#F4F7F9] p-8 space-y-10 font-sans pb-20">

            {/* Header Area */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">Workforce Intelligence Center</h1>
                    <p className="text-sm text-slate-500 font-medium italic mt-1 flex items-center">
                        <Activity size={14} className="mr-2 text-indigo-500" />
                        Generating aggregate strategic reports for HR and Leadership.
                    </p>
                </div>
                <button className="flex items-center space-x-2 bg-white border border-slate-200 px-4 py-2 rounded-xl text-[12px] font-black uppercase text-slate-700 hover:bg-slate-50 transition-all shadow-sm active:scale-95">
                    <Download size={14} />
                    <span>Export Analytics</span>
                </button>
            </div>

            {/* 1. Global Filter Panel (Additive Optimization) */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-4 gap-6 items-end">
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date Parameter</label>
                    <div className="flex items-center space-x-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 cursor-pointer hover:border-blue-400 transition-all group">
                        <Calendar size={14} className="text-slate-400 group-hover:text-blue-500" />
                        <span className="text-[13px] font-bold text-slate-700">Last 30 Days</span>
                        <ChevronDown size={14} className="ml-auto text-slate-400" />
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Department</label>
                    <div className="flex items-center space-x-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 cursor-pointer hover:border-blue-400 transition-all">
                        <span className="text-[13px] font-bold text-slate-700">All Departments</span>
                        <ChevronDown size={14} className="ml-auto text-slate-400" />
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Structural Role</label>
                    <div className="flex items-center space-x-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 cursor-pointer hover:border-blue-400 transition-all">
                        <span className="text-[13px] font-bold text-slate-700">Software Engineer</span>
                        <ChevronDown size={14} className="ml-auto text-slate-400" />
                    </div>
                </div>
                <button className="h-11 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[12px] font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-100 flex items-center justify-center space-x-2">
                    <Filter size={16} />
                    <span>Execute Intelligence Filter</span>
                </button>
            </div>

            {/* 2. Operational Reports (Presence & Compliance) */}
            <div className="space-y-6">
                <div className="flex items-center space-x-4">
                    <div className="w-1.5 h-6 bg-blue-600 rounded-full"></div>
                    <h2 className="text-[12px] font-black text-slate-400 uppercase tracking-[0.2em]">Tier 1: Operational Efficiency</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {[
                        { label: 'Attendance Compliance', val: '94.2%', trend: '+2.1%', up: true, desc: 'Daily presence across all hubs' },
                        { label: 'Leave Utilization', val: '12.4%', trend: '-0.5%', up: true, desc: 'Percentage of total PTO consumed' },
                        { label: 'Timesheet Submissions', val: '88.1%', trend: '+4.8%', up: true, desc: 'Weekly accountability rate' }
                    ].map((rep, i) => (
                        <div key={i} className="bg-white rounded-[24px] border border-slate-200 shadow-sm p-8 group hover:shadow-md transition-all">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{rep.label}</span>
                                <div className={`p-2 rounded-lg ${rep.up ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                    {rep.up ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                                </div>
                            </div>
                            <h3 className="text-3xl font-black text-slate-900 tracking-tight">{rep.val}</h3>
                            <p className="text-[11px] text-slate-400 font-bold mt-2 uppercase tracking-tighter">{rep.desc}</p>
                            <div className="mt-8 h-20 w-full flex items-end space-x-1">
                                {Array.from({ length: 12 }).map((_, j) => (
                                    <div
                                        key={j}
                                        className={`flex-1 rounded-t-sm transition-all hover:bg-blue-600 ${j % 3 === 0 ? 'bg-blue-500 h-[60%]' : j % 2 === 0 ? 'bg-blue-200 h-[40%]' : 'bg-slate-100 h-[80%]'}`}
                                    ></div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* 3. Financial Reports (Cost Intelligence) */}
            <div className="space-y-6">
                <div className="flex items-center space-x-4">
                    <div className="w-1.5 h-6 bg-indigo-600 rounded-full"></div>
                    <h2 className="text-[12px] font-black text-slate-400 uppercase tracking-[0.2em]">Tier 2: Financial Integrity</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm p-8 flex flex-col">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-[12px] font-black text-slate-400 uppercase tracking-widest">Global Payroll Cost Trend</h3>
                            <LineChart size={20} className="text-indigo-400" />
                        </div>
                        <div className="flex-1 flex flex-col justify-center items-center py-10 relative">
                            <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] scale-150">
                                <PieChart size={200} />
                            </div>
                            <h4 className="text-4xl font-black text-indigo-600 tracking-tighter">€1.42M</h4>
                            <p className="text-[11px] font-black text-slate-400 uppercase mt-2 tracking-widest">Average Monthly Cycle</p>
                        </div>
                    </div>
                    <div className="bg-[#0F172A] rounded-[32px] p-8 text-white flex flex-col relative overflow-hidden group shadow-xl">
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-600/10 rounded-full blur-[100px] -ml-32 -mb-32"></div>
                        <div className="flex items-center justify-between mb-8 relative z-10">
                            <h3 className="text-[12px] font-black text-indigo-300 uppercase tracking-widest">Overtime Impact Analysis</h3>
                            <Zap size={20} className="text-amber-400" />
                        </div>
                        <div className="space-y-6 relative z-10">
                            {[
                                { label: 'Tech Dept', cost: '€12,400', pct: 82 },
                                { label: 'Sales Operations', cost: '€2,100', pct: 14 }
                            ].map((d, i) => (
                                <div key={i} className="space-y-2">
                                    <div className="flex justify-between text-xs font-black">
                                        <span className="text-slate-300">{d.label}</span>
                                        <span>{d.cost} <span className="text-indigo-400 ml-2">[{d.pct}%]</span></span>
                                    </div>
                                    <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${d.pct}%` }}></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* 4. Strategic Reports (Growth & Performance) */}
            <div className="space-y-6">
                <div className="flex items-center space-x-4">
                    <div className="w-1.5 h-6 bg-slate-900 rounded-full"></div>
                    <h2 className="text-[12px] font-black text-slate-400 uppercase tracking-[0.2em]">Tier 3: Strategic Performance</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {[
                        { icon: Users, label: 'Headcount Growth', val: '+4.2%', color: 'blue' },
                        { icon: TrendingDown, label: 'Attrition Rate', val: '2.1%', color: 'rose' },
                        { icon: Zap, label: 'Productivity Index', val: '8.4/10', color: 'emerald' },
                        { icon: Activity, label: 'Operational Health', val: 'P-99', color: 'indigo' }
                    ].map((s, i) => (
                        <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col space-y-4 hover:shadow-md transition-all">
                            <div className={`w-10 h-10 rounded-xl bg-${s.color}-50 flex items-center justify-center text-${s.color}-600`}>
                                <s.icon size={20} strokeWidth={2.5} />
                            </div>
                            <div>
                                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">{s.label}</h4>
                                <span className={`text-2xl font-black text-slate-900 tracking-tight`}>{s.val}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Reports;
