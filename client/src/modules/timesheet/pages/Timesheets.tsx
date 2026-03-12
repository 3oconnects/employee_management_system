import React, { useState } from 'react';
import {
    Clock,
    Target,
    AlertTriangle,
    Zap,
    CheckCircle2,
    ChevronRight,
    LayoutGrid,
    TrendingUp,
    History,
    Info
} from 'lucide-react';

const Timesheets: React.FC = () => {
    const [activeView, setActiveView] = useState('My Timesheets');

    return (
        <div className="min-h-screen bg-[#F4F7F9] font-sans pb-12">
            {/* Module Headers (Zoho Style) */}
            <div className="bg-[#1d2b4d] text-white px-6 h-[40px] flex items-center shadow-sm">
                <div className="h-full flex items-center border-b-2 border-blue-500 px-1 font-bold text-[13px] tracking-tight mr-8">
                    My Timesheets
                </div>
                <div className="h-full flex items-center text-slate-300 hover:text-white cursor-pointer text-[13px] font-medium transition-colors">
                    Team Approvals
                </div>
            </div>

            <div className="max-w-[1550px] mx-auto p-6 space-y-6">

                {/* 1. Intelligence Row (Additive Improvements) */}
                <div className="grid grid-cols-12 gap-6">

                    {/* Weekly Summary Card (Core Strategic Data) */}
                    <div className="col-span-12 lg:col-span-8 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                        <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between">
                            <h3 className="text-[12px] font-black text-slate-400 uppercase tracking-widest">Weekly Performance Summary</h3>
                            <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">Draft Saved</span>
                        </div>
                        <div className="p-6 grid grid-cols-4 gap-6">
                            {[
                                { label: 'Logged Hours', val: '34.5', total: '40', unit: 'Hrs', color: 'blue' },
                                { label: 'Expected', val: '40.0', total: '40', unit: 'Hrs', color: 'slate' },
                                { label: 'Overtime', val: '00', total: '10', unit: 'Hrs', color: 'amber' },
                                { label: 'Billable %', val: '92', total: '100', unit: '%', color: 'indigo' }
                            ].map((stat, i) => (
                                <div key={i} className="flex flex-col space-y-2 border-r border-slate-50 last:border-0 pr-4">
                                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-tighter">{stat.label}</span>
                                    <div className="flex items-baseline space-x-1">
                                        <span className={`text-2xl font-black text-${stat.color === 'slate' ? 'slate-800' : stat.color + '-600'}`}>{stat.val}</span>
                                        <span className="text-[11px] font-bold text-slate-400">{stat.unit}</span>
                                    </div>
                                    <div className="h-1 w-full bg-slate-50 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full bg-${stat.color === 'slate' ? 'slate-300' : stat.color + '-500'} rounded-full`}
                                            style={{ width: `${(Number(stat.val) / Number(stat.total)) * 100}%` }}
                                        ></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Smart Alerts Panel */}
                    <div className="col-span-12 lg:col-span-4 bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
                        <div className="flex items-center space-x-2 text-rose-500 mb-2">
                            <AlertTriangle size={18} strokeWidth={2.5} />
                            <h3 className="text-[12px] font-black uppercase tracking-widest">Active Alerts</h3>
                        </div>
                        <div className="space-y-3">
                            {[
                                { msg: 'Missing entry for Wed, 18 Feb', severity: 'rose' },
                                { msg: 'Uncategorized project logs found', severity: 'amber' }
                            ].map((alert, i) => (
                                <div key={i} className={`p-3 rounded-lg bg-${alert.severity}-50 border border-${alert.severity}-100 flex items-center space-x-3`}>
                                    <div className={`w-1.5 h-1.5 rounded-full bg-${alert.severity}-500 shadow-sm`}></div>
                                    <span className={`text-[12px] font-bold text-${alert.severity}-700`}>{alert.msg}</span>
                                </div>
                            ))}
                        </div>
                        <button className="w-full py-2.5 bg-slate-900 text-white rounded-lg text-[11px] font-black uppercase tracking-[0.15em] hover:bg-slate-800 transition-all shadow-lg active:scale-95 mt-2">
                            Resolve Bottlenecks
                        </button>
                    </div>
                </div>

                {/* 2. Main Content Area (Original Structure) */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[500px] flex flex-col">
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/10">
                        <div className="flex items-center space-x-4">
                            <h2 className="text-[14px] font-bold text-slate-800">Timesheet Entry - Current Week</h2>
                            <Info size={14} className="text-slate-400" />
                        </div>
                        <div className="flex items-center space-x-3">
                            <div className="flex items-center space-x-1.5 bg-blue-50 text-blue-600 px-3 py-1.5 rounded-md border border-blue-100 cursor-pointer hover:bg-blue-100 transition-colors">
                                <Zap size={14} />
                                <span className="text-[11px] font-black uppercase tracking-widest">Auto-Prefill from Logs</span>
                            </div>
                            <button className="px-4 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-md text-[11px] font-black uppercase hover:bg-slate-50">Save Draft</button>
                            <button className="px-4 py-1.5 bg-blue-600 text-white rounded-md text-[11px] font-black uppercase shadow-md shadow-blue-500/20 active:scale-95">Submit</button>
                        </div>
                    </div>

                    {/* Table View Placeholder */}
                    <div className="p-8 flex-1 flex flex-col">
                        <div className="border border-slate-100 rounded-xl overflow-hidden shadow-inner">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 border-b border-slate-100">
                                    <tr className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                                        <th className="p-4 w-64">Project / Task</th>
                                        {['Mon 16', 'Tue 17', 'Wed 18', 'Thu 19', 'Fri 20'].map(d => (
                                            <th key={d} className="p-4 text-center">{d}</th>
                                        ))}
                                        <th className="p-4 text-center">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="text-[13px] font-medium text-slate-600">
                                    {[
                                        { proj: 'PrecisionHub - UI Refactor', hours: [8, 8, 4, 8, 0] },
                                        { proj: 'Client Sync - Internal', hours: [0, 0, 2, 0, 0] }
                                    ].map((row, i) => (
                                        <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                            <td className="p-4 font-bold text-slate-800">{row.proj}</td>
                                            {row.hours.map((h, j) => (
                                                <td key={j} className="p-4 text-center">
                                                    <input
                                                        type="text"
                                                        defaultValue={h === 0 ? '-' : h}
                                                        className={`w-12 text-center py-1.5 rounded border border-transparent focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all outline-none ${h === 0 ? 'text-slate-300' : 'bg-white shadow-sm border-slate-200'}`}
                                                    />
                                                </td>
                                            ))}
                                            <td className="p-4 text-center font-black text-blue-600">{row.hours.reduce((a, b) => a + b, 0)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <button className="w-full p-4 text-[12px] font-black text-slate-400 hover:text-blue-600 transition-colors flex items-center justify-center space-x-2 bg-slate-50/10">
                                <LayoutGrid size={14} />
                                <span>Add New Project Log</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* 3. Manager Intelligence Widget (Additive Insight) */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center space-x-3">
                            <TrendingUp size={20} className="text-indigo-500" />
                            <h4 className="text-[12px] font-black uppercase tracking-widest">Team Accountability Heatmap (Manager View)</h4>
                        </div>
                        <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-1.5"><div className="w-2 h-2 bg-emerald-500 rounded-full"></div><span className="text-[10px] font-bold text-slate-400">Submitted</span></div>
                            <div className="flex items-center space-x-1.5"><div className="w-2 h-2 bg-amber-500 rounded-full"></div><span className="text-[10px] font-bold text-slate-400">Delayed</span></div>
                            <div className="flex items-center space-x-1.5"><div className="w-2 h-2 bg-rose-500 rounded-full"></div><span className="text-[10px] font-bold text-slate-400">Flagged</span></div>
                        </div>
                    </div>
                    <div className="grid grid-cols-6 gap-4">
                        {[
                            { name: 'Karthik', status: 'emerald' },
                            { name: 'Arun', status: 'emerald' },
                            { name: 'Sarah', status: 'amber' },
                            { name: 'Vikram', status: 'rose' },
                            { name: 'Deepa', status: 'emerald' },
                            { name: 'Rahul', status: 'slate' },
                        ].map((m, i) => (
                            <div key={i} className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg group cursor-pointer hover:bg-slate-100 transition-colors">
                                <div className={`w-2 h-2 rounded-full bg-${m.status === 'slate' ? 'slate-300' : m.status + '-500'}`}></div>
                                <span className="text-[12px] font-bold text-slate-700">{m.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Timesheets;
