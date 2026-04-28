import React, { useState, useEffect } from 'react';
import {
    BarChart3,
    TrendingUp,
    Calendar,
    Users,
    Activity,
    ArrowUpRight,
    ArrowDownRight,
    FileText,
    Download,
    ChevronDown,
    Clock,
    UserMinus,
    Shell,
    Layers,
    Table as TableIcon,
    Loader2,
    AlertCircle,
    Target
} from 'lucide-react';
import api from '../../../services/api';

const inr = (v: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(v) || 0);

/* ─── Stat Card ─────────────────────────────────────────── */
const ReportStat: React.FC<{
    label: string; value: string; trend: string; up: boolean;
    icon: React.ElementType; iconColor: string; iconBg: string;
}> = ({ label, value, trend, up, icon: Icon, iconColor, iconBg }) => (
    <div className="card-premium p-6 border-primary-light/20 shadow-premium group hover:border-primary-soft/30 transition-all">
        <div className="flex items-start justify-between mb-6">
            <div className={`w-12 h-12 rounded-xl ${iconBg} flex items-center justify-center shadow-sm`}>
                <Icon size={20} className={iconColor} />
            </div>
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-black ${up ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'}`}>
                {up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                {trend}
            </div>
        </div>
        <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-1">{label}</p>
        <p className="text-2xl font-bold text-primary tracking-tight">{value}</p>
    </div>
);

interface ReportData {
    headcount: number;
    avgSalary: number;
    attritionRate: string;
    satisfaction: string;
    departments: { name: string; val: number; color: string }[];
    attendanceTrend: number[];
    recentReports: { name: string; type: string; size: string; date: string }[];
    attendance: { avgCompliance: string; totalCheckins: number };
    leave: { approved: number; pending: number };
    payroll: { monthlyPayout: number };
}

/* ─── Main Component ─────────────────────────────────────── */
const Reports: React.FC = () => {
    const [activeTab, setActiveTab] = useState('overview');
    const [dateRange, setDateRange] = useState('Current Quarter');
    const [data, setData] = useState<ReportData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchReports = async () => {
            try {
                setLoading(true);
                const response = await api.get('/reports/summary');
                setData(response.data);
                setError(null);
            } catch (err: any) {
                console.error('Failed to fetch reports:', err);
                setError('Analytical pipeline synchronisation failed. Protocols compromised.');
            } finally {
                setLoading(false);
            }
        };
        fetchReports();
    }, []);

    const tabs = [
        { id: 'overview',   label: 'Executive Summary',      icon: Layers },
        { id: 'attendance', label: 'Compliance Metrics',    icon: Clock },
        { id: 'leave',      label: 'Resource Availability',   icon: Calendar },
        { id: 'payroll',    label: 'Financial Ledger',       icon: Shell },
        { id: 'team',       label: 'Growth Analytics', icon: Users },
    ];

    if (loading) return (
        <div className="h-[80vh] flex flex-col items-center justify-center gap-6">
            <Loader2 className="animate-spin text-primary" size={40} />
            <p className="text-[12px] font-black text-primary-light uppercase tracking-[0.4em]">Calibrating Workforce Intelligence Matrix...</p>
        </div>
    );

    if (error || !data) return (
        <div className="h-[80vh] flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-700">
            <div className="w-20 h-20 bg-rose-50 rounded-3xl flex items-center justify-center mb-6 shadow-sm">
                <AlertCircle className="text-rose-500" size={32} />
            </div>
            <h3 className="text-xl font-bold text-primary mb-2">Protocol Synchronization Error</h3>
            <p className="text-[13px] text-text-muted max-w-xs mx-auto mb-8 font-medium italic">{error || 'Data retrieval pipeline failed.'}</p>
            <button onClick={() => window.location.reload()} className="btn-premium px-8 py-3 bg-primary text-white rounded-xl text-[12px] font-black uppercase tracking-widest shadow-lg shadow-primary/20">
                Reset Uplink
            </button>
        </div>
    );

    return (
        <div className="page-enter max-w-[1600px] mx-auto p-8 space-y-10">
            
            {/* ── Page Header ──────────────────────────────── */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center shadow-xl shadow-primary/20">
                        <BarChart3 size={24} className="text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-primary tracking-tight">Intelligence & Analytics</h2>
                        <p className="text-[11px] text-text-muted font-black uppercase tracking-[0.2em] mt-1">
                            Workforce Strategic Insight Protocol v2.1
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3 px-4 py-2 bg-primary/5 border border-primary-light/10 rounded-xl text-[12px] font-bold text-primary cursor-pointer hover:bg-white transition-all shadow-sm">
                        <Calendar size={16} className="text-primary-soft"/>
                        {dateRange}
                        <ChevronDown size={14} className="text-primary-light" />
                    </div>
                    <button className="flex items-center gap-3 px-6 py-2.5 bg-primary text-white rounded-xl text-[12px] font-black uppercase tracking-widest hover:bg-primary-soft transition-all shadow-xl shadow-primary/20">
                        <Download size={16} />
                        Export Data
                    </button>
                </div>
            </div>

            {/* ── Tab Bar ──────────────────────────────────── */}
            <div className="bg-primary/5 p-1.5 rounded-2xl border border-primary-light/10 flex items-center gap-1 overflow-x-auto no-scrollbar">
                {tabs.map(tab => {
                    const Icon = tab.icon;
                    const isSelected = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-shrink-0 flex items-center gap-3 px-6 py-3.5 text-[12px] font-bold uppercase tracking-widest rounded-xl transition-all duration-300 ${
                                isSelected
                                    ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-[1.02]'
                                    : 'text-primary-light hover:text-primary hover:bg-white'
                            }`}
                        >
                            <Icon size={16} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* ── Content Area ─────────────────────────────── */}
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                
                {activeTab === 'overview' && (
                    <div className="space-y-10">
                        {/* Summary Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <ReportStat label="Matrix Headcount" value={data.headcount.toString()} trend="+4.2%" up={true} icon={Users} iconBg="bg-primary/5" iconColor="text-primary" />
                            <ReportStat label="Mean Compensation" value={inr(data.avgSalary / 12)} trend="+1.5%" up={true} icon={TrendingUp} iconBg="bg-primary-soft/10" iconColor="text-primary-soft" />
                            <ReportStat label="Attrition Threshold" value={data.attritionRate} trend="-0.8%" up={true} icon={UserMinus} iconBg="bg-rose-50" iconColor="text-rose-600" />
                            <ReportStat label="Sentiment Index" value={data.satisfaction} trend="+0.2" up={true} icon={Activity} iconBg="bg-emerald-50" iconColor="text-emerald-600" />
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                            {/* Attendance Analytics */}
                            <div className="lg:col-span-8 card-premium p-8 border-primary-light/20 shadow-premium">
                                <div className="flex items-center justify-between mb-10">
                                    <div>
                                        <h3 className="text-[16px] font-bold text-primary uppercase tracking-tight">Compliance Temporal Stream</h3>
                                        <p className="text-[11px] text-text-muted font-bold uppercase tracking-widest mt-1">Matrix adherence over 30 cycles</p>
                                    </div>
                                    <div className="flex items-center gap-3 px-3 py-1.5 bg-primary text-white rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20">
                                        <Target size={14} />
                                        Protocol Goal: 95%
                                    </div>
                                </div>
                                
                                <div className="h-60 w-full flex items-end gap-2 px-2">
                                    {data.attendanceTrend.map((h, i) => (
                                        <div key={i} className="group relative flex-1">
                                            <div 
                                                className={`w-full rounded-t-lg transition-all duration-700 ease-out group-hover:bg-primary-soft ${h >= 95 ? 'bg-primary' : h >= 90 ? 'bg-primary-soft' : 'bg-primary-light/30'}`} 
                                                style={{ height: `${Math.max(5, h)}%` }}
                                            />
                                            <div className="absolute -top-12 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all pointer-events-none scale-90 group-hover:scale-100">
                                                <div className="bg-primary text-white text-[10px] font-black px-3 py-1.5 rounded-lg shadow-2xl whitespace-nowrap border border-white/10">
                                                    CYCLE {i+1}: {h}%
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex justify-between items-center mt-10 pt-8 border-t border-primary-light/10">
                                    <div className="flex gap-6">
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full bg-primary shadow-sm"></div>
                                            <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">Optimal Adherence</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full bg-primary-soft shadow-sm opacity-60"></div>
                                            <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">Nominal Threshold</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full bg-primary-light/30 shadow-sm"></div>
                                            <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">Sub-Optimal Range</span>
                                        </div>
                                    </div>
                                    <p className="text-[12px] font-bold text-primary uppercase tracking-tight">
                                        Aggregated Adherence: <span className="text-primary-soft ml-1">{data.attendance.avgCompliance}%</span>
                                    </p>
                                </div>
                            </div>

                            {/* Department Breakdown */}
                            <div className="lg:col-span-4 card-premium p-8 border-primary-light/20 shadow-premium">
                                <h3 className="text-[16px] font-bold text-primary uppercase tracking-tight mb-10">Utilization Matrix</h3>
                                <div className="space-y-8">
                                    {data.departments.length > 0 ? data.departments.map(d => (
                                        <div key={d.name} className="group">
                                            <div className="flex justify-between items-center mb-3">
                                                <span className="text-[12px] font-bold text-primary uppercase tracking-tight group-hover:text-primary-soft transition-colors">{d.name}</span>
                                                <span className="text-[10px] font-black text-primary-soft bg-primary/5 px-2 py-0.5 rounded-lg border border-primary-soft/10">{d.val}%</span>
                                            </div>
                                            <div className="h-1.5 w-full bg-primary-light/10 rounded-full overflow-hidden">
                                                <div className="h-full bg-primary rounded-full transition-all duration-1000 group-hover:bg-primary-soft" style={{ width: `${d.val}%` }} />
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="text-center py-20 opacity-30">
                                            <Users size={40} className="mx-auto mb-4 text-primary-light" />
                                            <p className="text-[10px] font-black uppercase tracking-[0.3em]">No Unit Data Discovered</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'attendance' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-in slide-in-from-bottom-2 duration-500">
                        <ReportStat label="Mean Adherence" value={`${data.attendance.avgCompliance}%`} trend="+0.4%" up={true} icon={Clock} iconBg="bg-primary/5" iconColor="text-primary" />
                        <ReportStat label="Matrix Check-ins" value={Math.round(data.attendance.totalCheckins).toString()} trend="+12%" up={true} icon={Activity} iconBg="bg-primary-soft/10" iconColor="text-primary-soft" />
                        <ReportStat label="Anomalous Latency" value="12" trend="-2" up={true} icon={Clock} iconBg="bg-rose-50" iconColor="text-rose-600" />
                        <div className="md:col-span-3 card-premium p-20 border-primary-light/20 text-center bg-primary/5 border-2 border-dashed">
                            <p className="text-primary-light font-bold text-[14px] uppercase tracking-[0.2em]">Historical Heatmap & Latency Analytics Under Computation</p>
                        </div>
                    </div>
                )}

                {activeTab === 'leave' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in slide-in-from-bottom-2 duration-500">
                        <ReportStat label="Verified Absences" value={data.leave.approved.toString()} trend="Cycle 30" up={true} icon={Calendar} iconBg="bg-emerald-50" iconColor="text-emerald-600" />
                        <ReportStat label="Audit Queue" value={data.leave.pending.toString()} trend="Action Reqd" up={false} icon={Clock} iconBg="bg-amber-50" iconColor="text-amber-600" />
                        <div className="md:col-span-2 card-premium p-20 border-primary-light/20 text-center bg-primary/5 border-2 border-dashed">
                            <p className="text-primary-light font-bold text-[14px] uppercase tracking-[0.2em]">Liability Index & Utilization Forecasts Under Synthesis</p>
                        </div>
                    </div>
                )}

                {activeTab === 'payroll' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in slide-in-from-bottom-2 duration-500">
                        <ReportStat label="Monthly Ledger Payout" value={inr(data.payroll.monthlyPayout)} trend="+5.2%" up={false} icon={Shell} iconBg="bg-primary/5" iconColor="text-primary" />
                        <ReportStat label="Mean Comp index" value={inr(data.avgSalary / 12)} trend="Per Unit" up={true} icon={TrendingUp} iconBg="bg-emerald-50" iconColor="text-emerald-600" />
                        <div className="md:col-span-2 card-premium p-20 border-primary-light/20 text-center bg-primary/5 border-2 border-dashed">
                            <p className="text-primary-light font-bold text-[14px] uppercase tracking-[0.2em]">Budget vs Actual Variance Ledger Stream Compiling</p>
                        </div>
                    </div>
                )}

                {activeTab === 'team' && (
                    <div className="card-premium p-32 flex flex-col items-center justify-center space-y-10 border-primary-light/20 border-2 border-dashed bg-primary/5">
                        <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-premium ring-1 ring-primary/5">
                            <Shell size={40} className="text-primary-soft animate-spin-slow" />
                        </div>
                        <div className="text-center">
                            <h3 className="text-xl font-bold text-primary uppercase tracking-tight">Growth Intelligence Matrix</h3>
                            <p className="text-[12px] text-text-muted font-bold uppercase tracking-widest mt-3 max-w-sm mx-auto">Advanced analytical module for unit expansion and lifecycle predictive modeling is being populated.</p>
                        </div>
                        <button onClick={() => setActiveTab('overview')} className="px-8 py-3 text-[12px] font-black uppercase tracking-widest text-primary-soft bg-white border border-primary-soft/20 rounded-xl hover:bg-primary-soft hover:text-white transition-all shadow-sm">
                            Return to Command Overview
                        </button>
                    </div>
                )}

                {/* ── Standard Reports Repository ───────────────── */}
                <div className="card-premium overflow-hidden border-primary-light/20 shadow-premium mt-10">
                    <div className="px-8 py-6 border-b border-primary-light/10 flex items-center justify-between bg-primary/5">
                        <div>
                            <h3 className="text-[16px] font-bold text-primary uppercase tracking-tight">Standard Reports Repository</h3>
                            <p className="text-[11px] text-text-muted font-bold uppercase tracking-widest mt-1">Audit-Ready Binary Distributions</p>
                        </div>
                        <TableIcon size={20} className="text-primary-soft opacity-50" />
                    </div>
                    <div className="divide-y divide-primary-light/5">
                        {data.recentReports.map((report, i) => (
                            <div key={i} className="flex items-center gap-6 px-8 py-5 hover:bg-primary/5 group cursor-pointer transition-all">
                                <div className="w-12 h-12 bg-primary/5 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:bg-primary group-hover:text-white transition-all shadow-inner">
                                    <FileText size={20} className="text-primary-light group-hover:text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[14px] font-bold text-primary truncate group-hover:text-primary-soft transition-colors uppercase tracking-tight">{report.name}</p>
                                    <div className="flex items-center gap-3 mt-1.5">
                                        <span className="text-[9px] font-black text-primary-soft bg-primary/5 px-2 py-0.5 rounded-lg border border-primary-soft/10 uppercase tracking-widest">{report.type}</span>
                                        <span className="text-[11px] text-text-muted font-bold uppercase tracking-tighter">{report.size} Binary</span>
                                    </div>
                                </div>
                                <div className="text-right flex-shrink-0">
                                    <p className="text-[11px] font-black text-primary uppercase tracking-widest">{report.date}</p>
                                    <button className="text-[10px] font-black text-primary-soft uppercase tracking-[0.2em] hover:text-primary mt-2 flex items-center gap-1.5 ml-auto">
                                        <Download size={12} />
                                        Fetch Asset
                                    </button>
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



