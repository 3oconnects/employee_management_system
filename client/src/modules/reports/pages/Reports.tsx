import React, { useState, useEffect } from 'react';
import {
    Users,
    Calendar,
    Wallet,
    TrendingUp,
    Filter,
    Download,
    RefreshCw,
    Activity,
    CreditCard,
    BarChart2
} from 'lucide-react';
import api from '../../../services/api';

import { ReportStatCard }        from '../components/ReportStatCard';
import { AttendanceTrendChart }  from '../components/AttendanceTrendChart';
import { DepartmentBreakdownCard } from '../components/DepartmentBreakdownCard';
import { WorkforceComposition }  from '../components/WorkforceComposition';
import { DiversityMetricsCard }  from '../components/DiversityMetricsCard';
import { RecentReportsList }     from '../components/RecentReportsList';
import { OrganizationReport }    from '../components/OrganizationReport';
import { PayrollReport }         from '../components/PayrollReport';
import { AttendanceReport }      from '../components/AttendanceReport';
import { fmtCurrency }           from '../../../utils/formatters';

interface ReportData {
    headcount: number;
    enrolledHeadcount: number;
    avgSalary: number;
    attritionRate: string;
    attendance: { avgCompliance: string; todayPresent: number };
    leave: { pending: number; approved: number };
    payroll: { monthlyPayout: number };
    departments: Array<{ name: string; val: number; color: string }>;
    attendanceTrend: number[];
    genderDistribution: { male: number; female: number; other: number };
    employmentType: Array<{ type: string; count: number }>;
    todayAttendanceLog: any[];
    salaryDistribution: any[];
    orgMetrics: { units: number; locations: number };
    recentReports: any[];
}

const TABS = [
    { id: 'overview',    label: 'Overview',      icon: Activity  },
    { id: 'attendance',  label: 'Attendance',     icon: Calendar  },
    { id: 'payroll',     label: 'Payroll',        icon: CreditCard },
    { id: 'team',        label: 'Organization',   icon: Users     },
];

const Reports: React.FC = () => {
    const [activeTab, setActiveTab] = useState('overview');
    const [data, setData]           = useState<ReportData | null>(null);
    const [loading, setLoading]     = useState(true);

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await api.get('/reports/summary');
            setData(res.data);
        } catch (err) {
            console.error('Failed to fetch report data', err);
        } finally {
            setLoading(false);
        }
    };

    /* ── Loading skeleton ─────────────────────────────────── */
    if (loading || !data) {
        return (
            <div className="p-8 space-y-6 max-w-[1600px]">
                {/* Header skeleton */}
                <div className="flex items-center justify-between">
                    <div className="space-y-2">
                        <div className="h-5 w-40 bg-slate-100 rounded-lg animate-pulse" />
                        <div className="h-3 w-64 bg-slate-50 rounded-lg animate-pulse" />
                    </div>
                    <div className="flex gap-2">
                        <div className="h-9 w-24 bg-slate-100 rounded-xl animate-pulse" />
                        <div className="h-9 w-28 bg-indigo-100 rounded-xl animate-pulse" />
                    </div>
                </div>
                {/* Tab skeleton */}
                <div className="h-10 w-72 bg-slate-100 rounded-xl animate-pulse" />
                {/* KPI row skeleton */}
                <div className="grid grid-cols-4 gap-4">
                    {[1,2,3,4].map(i => (
                        <div key={i} className="h-28 bg-white border border-slate-100 rounded-2xl animate-pulse" />
                    ))}
                </div>
                {/* Chart row skeleton */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2 h-72 bg-white border border-slate-100 rounded-2xl animate-pulse" />
                    <div className="h-72 bg-white border border-slate-100 rounded-2xl animate-pulse" />
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 space-y-6 max-w-[1600px]">

            {/* ── Page Header ──────────────────────────────────────── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/20 flex-shrink-0">
                        <BarChart2 size={20} className="text-white" />
                    </div>
                    <div>
                        <h2 className="text-[20px] font-black text-slate-900 tracking-tight">Reports & Analytics</h2>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-0.5">
                            Real-time workforce intelligence
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={fetchData}
                        className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-indigo-600 hover:border-indigo-300 transition-all shadow-sm"
                    >
                        <RefreshCw size={16} />
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-[12px] font-bold hover:border-slate-300 transition-all shadow-sm">
                        <Filter size={14} /> Filter
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-[12px] font-bold hover:bg-indigo-500 transition-all shadow-md shadow-indigo-600/20">
                        <Download size={14} /> Export PDF
                    </button>
                </div>
            </div>

            {/* ── Tab Bar ──────────────────────────────────────────── */}
            <div className="flex items-center gap-1 bg-slate-100/70 p-1 rounded-xl w-fit border border-slate-200/50">
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-[10px] text-[12px] font-bold transition-all whitespace-nowrap ${
                            activeTab === tab.id
                                ? 'bg-white text-indigo-600 shadow-sm shadow-slate-200/80 border border-slate-200/60'
                                : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        <tab.icon size={14} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ── Tab Content ──────────────────────────────────────── */}
            <div className="space-y-5">

                {activeTab === 'overview' && (
                    <>
                        {/* KPI row */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <ReportStatCard
                                label="Total Employees"
                                value={data.headcount.toString()}
                                trend="+4.2%"
                                up={true}
                                icon={Users}
                                iconColor="text-indigo-600"
                                iconBg="bg-indigo-50"
                            />
                            <ReportStatCard
                                label="Avg. Monthly Salary"
                                value={fmtCurrency(data.avgSalary / 12)}
                                trend="+1.5%"
                                up={true}
                                icon={Wallet}
                                iconColor="text-emerald-600"
                                iconBg="bg-emerald-50"
                            />
                            <ReportStatCard
                                label="Attrition Rate"
                                value={data.attritionRate}
                                trend="-0.8%"
                                up={false}
                                icon={TrendingUp}
                                iconColor="text-amber-600"
                                iconBg="bg-amber-50"
                            />
                            <ReportStatCard
                                label="Attendance Rate"
                                value={`${data.attendance.avgCompliance}%`}
                                trend="+2.1%"
                                up={true}
                                icon={Activity}
                                iconColor="text-sky-600"
                                iconBg="bg-sky-50"
                            />
                        </div>

                        {/* Row 2: chart + dept */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                            <div className="lg:col-span-2">
                                <AttendanceTrendChart
                                    data={data.attendanceTrend}
                                    avgCompliance={data.attendance.avgCompliance}
                                />
                            </div>
                            <DepartmentBreakdownCard departments={data.departments} />
                        </div>

                        {/* Row 3: composition + diversity */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <WorkforceComposition types={data.employmentType} total={data.headcount} />
                            <DiversityMetricsCard data={data.genderDistribution} total={data.headcount} />
                        </div>

                        {/* Row 4: recent reports */}
                        <RecentReportsList reports={data.recentReports} />
                    </>
                )}

                {activeTab === 'attendance' && (
                    <AttendanceReport
                        data={data.attendance}
                        totalEmployees={data.headcount}
                        log={data.todayAttendanceLog}
                    />
                )}

                {activeTab === 'payroll' && (
                    <PayrollReport
                        data={data.payroll}
                        avgSalary={data.avgSalary}
                        distribution={data.salaryDistribution}
                    />
                )}

                {activeTab === 'team' && (
                    <OrganizationReport
                        data={data}
                        metrics={data.orgMetrics}
                    />
                )}
            </div>
        </div>
    );
};

export default Reports;
