import React, { useState } from 'react';
import {
    BarChart3,
    TrendingUp,
    TrendingDown,
    Calendar,
    Users,
    Activity,
    ArrowUpRight,
    ArrowDownRight,
    PieChart,
    FileText,
    Download,
    Filter,
    ChevronDown,
    Zap,
    Clock,
    UserMinus,
    Shell,
    Layers,
    Table as TableIcon
} from 'lucide-react';

const inr = (v: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);

/* ─── Stat Card ─────────────────────────────────────────── */
const ReportStat: React.FC<{
    label: string; value: string; trend: string; up: boolean;
    icon: React.ElementType; iconBg: string; iconColor: string;
}> = ({ label, value, trend, up, icon: Icon, iconBg, iconColor }) => (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 card-hover transition-all">
        <div className="flex items-start justify-between mb-4">
            <div className={`w-10 h-10 rounded-lg ${iconBg} flex items-center justify-center`}>
                <Icon size={18} className={iconColor} />
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${up ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'}`}>
                {up ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                {trend}
            </span>
        </div>
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
        <p className="text-[24px] font-bold text-gray-900 leading-none">{value}</p>
    </div>
);

/* ─── Main Component ─────────────────────────────────────── */
const Reports: React.FC = () => {
    const [activeTab, setActiveTab] = useState('overview');
    const [dateRange, setDateRange] = useState('Last 30 Days');

    const tabs = [
        { id: 'overview',   label: 'Overview',      icon: Layers },
        { id: 'attendance', label: 'Attendance',    icon: Clock },
        { id: 'leave',      label: 'Leave & PTO',   icon: Calendar },
        { id: 'payroll',    label: 'Payroll',       icon: Shell },
        { id: 'team',       label: 'Team & Growth', icon: Users },
    ];

    return (
        <div className="p-6 space-y-5 page-enter">
            
            {/* ── Page Header ──────────────────────────────── */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-sm shadow-blue-200">
                        <BarChart3 size={18} className="text-white" />
                    </div>
                    <div>
                        <h2 className="text-[15px] font-bold text-gray-900 leading-tight">Reports & Analytics</h2>
                        <p className="text-[11.5px] text-gray-400 font-medium leading-tight mt-0.5">
                            Insights and workforce intelligence for strategic planning
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-[12px] font-semibold text-gray-600 cursor-pointer hover:bg-white transition-all">
                        <Calendar size={13} />
                        {dateRange}
                        <ChevronDown size={12} className="text-gray-400" />
                    </div>
                    <button className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-xl text-[12px] font-semibold hover:bg-blue-700 transition-all shadow-sm shadow-blue-200">
                        <Download size={13} />
                        Export
                    </button>
                </div>
            </div>

            {/* ── Tab Bar ──────────────────────────────────── */}
            <div className="flex items-center gap-1 border-b border-gray-100 overflow-x-auto no-scrollbar">
                {tabs.map(tab => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-shrink-0 flex items-center gap-2 px-4 py-3 text-[12.5px] font-semibold border-b-2 transition-all whitespace-nowrap ${
                                activeTab === tab.id
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-gray-400 hover:text-gray-700'
                            }`}
                        >
                            <Icon size={14} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* ── Content Area ─────────────────────────────── */}
            <div className="space-y-6">
                
                {activeTab === 'overview' && (
                    <div className="space-y-6">
                        {/* Summary Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <ReportStat label="Headcount" value="128" trend="+4.2%" up={true} icon={Users} iconBg="bg-blue-50" iconColor="text-blue-600" />
                            <ReportStat label="Revenue / Emp" value={inr(85000)} trend="+1.5%" up={true} icon={TrendingUp} iconBg="bg-emerald-50" iconColor="text-emerald-600" />
                            <ReportStat label="Attrition Rate" value="2.4%" trend="-0.8%" up={true} icon={UserMinus} iconBg="bg-rose-50" iconColor="text-rose-600" />
                            <ReportStat label="Satisfaction" value="4.8/5" trend="+0.2" up={true} icon={Activity} iconBg="bg-purple-50" iconColor="text-purple-600" />
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                            {/* Attendance Analytics */}
                            <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h3 className="text-[14px] font-bold text-gray-800">Attendance Compliance Trend</h3>
                                        <p className="text-[11.5px] text-gray-400 mt-0.5">Performance over the last 30 working days</p>
                                    </div>
                                    <div className="flex items-center gap-2 px-2 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-widest">
                                        Goal: 95%
                                    </div>
                                </div>
                                
                                {/* Mock Chart Visualization */}
                                <div className="h-48 w-full flex items-end gap-1.5 px-2">
                                    {[88, 92, 95, 84, 91, 89, 96, 92, 94, 98, 95, 93, 89, 91, 95, 97, 94, 92, 90, 94, 96, 95, 93, 91, 94, 97, 95, 93, 96, 94].map((h, i) => (
                                        <div key={i} className="group relative flex-1">
                                            <div 
                                                className={`w-full rounded-t-sm transition-all duration-500 hover:bg-blue-500 ${h >= 95 ? 'bg-blue-600' : h >= 90 ? 'bg-blue-300' : 'bg-blue-100'}`} 
                                                style={{ height: `${h}%` }}
                                            />
                                            {/* Tooltip on hover */}
                                            <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all pointer-events-none">
                                                <div className="bg-gray-900 text-white text-[10px] font-bold px-2 py-1 rounded shadow-xl whitespace-nowrap">
                                                    Day {i+1}: {h}%
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-50">
                                    <div className="flex gap-4">
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-2.5 h-2.5 rounded-full bg-blue-600"></div>
                                            <span className="text-[11px] font-medium text-gray-500">Above Target</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-2.5 h-2.5 rounded-full bg-blue-300"></div>
                                            <span className="text-[11px] font-medium text-gray-500">Normal</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-2.5 h-2.5 rounded-full bg-blue-100"></div>
                                            <span className="text-[11px] font-medium text-gray-500">Below Target</span>
                                        </div>
                                    </div>
                                    <p className="text-[11.5px] font-bold text-gray-900">Avg Compliance: 92.4%</p>
                                </div>
                            </div>

                            {/* Department Breakdown */}
                            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                                <h3 className="text-[14px] font-bold text-gray-800 mb-6 font-sans">Utilization by Dept.</h3>
                                <div className="space-y-5">
                                    {[
                                        { name: 'Engineering', val: 88, color: 'bg-blue-500' },
                                        { name: 'Product', val: 94, color: 'bg-indigo-500' },
                                        { name: 'Sales & Mktg', val: 76, color: 'bg-emerald-500' },
                                        { name: 'Operation', val: 82, color: 'bg-amber-500' },
                                        { name: 'HR & Finance', val: 91, color: 'bg-purple-500' },
                                    ].map(d => (
                                        <div key={d.name}>
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-[12px] font-semibold text-gray-600">{d.name}</span>
                                                <span className="text-[11px] font-bold text-gray-900">{d.val}%</span>
                                            </div>
                                            <div className="h-1.5 w-full bg-gray-50 rounded-full overflow-hidden">
                                                <div className={`h-full ${d.color} rounded-full`} style={{ width: `${d.val}%` }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Coming soon states for other tabs */}
                {activeTab !== 'overview' && (
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 flex flex-col items-center justify-center space-y-4">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center">
                            <Shell size={32} className="text-gray-300 animate-pulse" />
                        </div>
                        <div className="text-center">
                            <h3 className="text-[15px] font-bold text-gray-800">Advanced {tabs.find(t => t.id === activeTab)?.label} Reports</h3>
                            <p className="text-[12px] text-gray-400 mt-1 max-w-xs">Detailed analytical module for {tabs.find(t => t.id === activeTab)?.label.toLowerCase()} is being populated with live database metrics.</p>
                        </div>
                        <button onClick={() => setActiveTab('overview')} className="px-5 py-2 text-[12px] font-semibold text-blue-600 bg-blue-50 rounded-xl hover:bg-blue-100 transition-all">
                            Back to Overview
                        </button>
                    </div>
                )}

                {/* ── Recent Reports ─────────────────────────── */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden mt-6">
                    <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
                        <div>
                            <h3 className="text-[14px] font-bold text-gray-800">Available Standard Reports</h3>
                            <p className="text-[11.5px] text-gray-400 mt-0.5">Quick export for compliance and auditing</p>
                        </div>
                        <TableIcon size={16} className="text-gray-300" />
                    </div>
                    <div className="divide-y divide-gray-50">
                        {[
                            { name: 'Monthly Attendance Ledger', type: 'Compliance', size: '2.4 MB', date: 'Mar 14, 2026' },
                            { name: 'Payroll Summary (FY 2025-26)', type: 'Finance', size: '1.8 MB', date: 'Mar 12, 2026' },
                            { name: 'Leave Balance Statement', type: 'HR Ops', size: '840 KB', date: 'Mar 10, 2026' },
                            { name: 'Performance Bell Curve', type: 'Strategic', size: '3.1 MB', date: 'Mar 05, 2026' },
                        ].map((report, i) => (
                            <div key={i} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 group cursor-pointer transition-all">
                                <div className="w-9 h-9 bg-gray-50 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-blue-50 group-hover:text-blue-600 transition-all">
                                    <FileText size={16} className="text-gray-400 group-hover:text-blue-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[13px] font-semibold text-gray-800 truncate">{report.name}</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded leading-none">{report.type}</span>
                                        <span className="text-[11px] text-gray-400">{report.size}</span>
                                    </div>
                                </div>
                                <div className="text-right flex-shrink-0">
                                    <p className="text-[11.5px] font-medium text-gray-500">{report.date}</p>
                                    <button className="text-[11px] font-bold text-blue-600 hover:underline mt-0.5">Download</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Reports;
