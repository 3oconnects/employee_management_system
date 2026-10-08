import React, { useState, useEffect } from 'react';
import {
    Users,
    Calendar,
    Wallet,
    TrendingUp,
    Download,
    RefreshCw,
    Activity,
    CreditCard,
    BarChart2,
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
    { id: 'overview',    label: 'Overview & Insights',  icon: Activity   },
    { id: 'attendance',  label: 'Attendance Analytics', icon: Calendar   },
    { id: 'payroll',     label: 'Payroll Reports',      icon: CreditCard },
    { id: 'team',        label: 'Organization Units',   icon: Users      },
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
            <div className="w-full min-w-0 max-w-[1440px] mx-auto px-6 py-6 space-y-5 animate-pulse">
                <div className="flex items-center justify-between">
                    <div className="space-y-2">
                        <div className="h-6 w-48 bg-slate-200 rounded-md" />
                        <div className="h-3.5 w-72 bg-slate-100 rounded-md" />
                    </div>
                    <div className="flex gap-2">
                        <div className="h-9 w-24 bg-slate-200 rounded-lg" />
                    </div>
                </div>
                <div className="h-10 w-96 bg-slate-200 rounded-xl" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1,2,3,4].map(i => (
                        <div key={i} className="h-28 bg-white border border-slate-200/80 rounded-xl" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="w-full min-w-0 max-w-[1440px] mx-auto px-6 py-6 space-y-5 animate-in fade-in duration-200">
            {/* ── Page Header ──────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 tracking-tight">Reports & Analytics</h1>
                    <p className="text-xs text-slate-500 mt-0.5">
                        Comprehensive workforce metrics, attendance patterns, and payroll insights
                    </p>
                </div>
                <div className="flex items-center gap-2.5">
                    <button
                        onClick={fetchData}
                        className="p-2 bg-white border border-slate-200/90 text-slate-500 hover:text-slate-800 rounded-lg transition-all shadow-xs"
                        title="Refresh Data"
                    >
                        <RefreshCw size={15} />
                    </button>
                    <button 
                        onClick={() => window.print()}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-all shadow-xs"
                    >
                        <Download size={14} />
                        Export Report
                    </button>
                </div>
            </div>

            {/* ── Tab Bar ──────────────────────────────────────────── */}
            <div className="flex items-center gap-1.5 p-1 bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-x-auto no-scrollbar">
                {TABS.map((tab) => {
                    const Icon = tab.icon;
                    const isSelected = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-shrink-0 flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all ${
                                isSelected
                                    ? 'bg-slate-900 text-white shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                            }`}
                        >
                            <Icon size={14} className={isSelected ? 'text-white' : 'text-slate-400'} />
                            <span>{tab.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* ── Tab Content ──────────────────────────────────────── */}
            <div className="space-y-5">
                {activeTab === 'overview' && (
                    <>
                        {/* KPI row */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <ReportStatCard
                                label="Total Workforce"
                                value={data.headcount.toString()}
                                trend="+4.2%"
                                up={true}
                                icon={Users}
                                iconColor="text-blue-600"
                                iconBg="bg-blue-50"
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
                                label="Attendance Compliance"
                                value={`${data.attendance.avgCompliance}%`}
                                trend="+2.1%"
                                up={true}
                                icon={Activity}
                                iconColor="text-violet-600"
                                iconBg="bg-violet-50"
                            />
                        </div>

                        {/* Row 2: chart + dept */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                            <div className="lg:col-span-7">
                                <AttendanceTrendChart
                                    data={data.attendanceTrend}
                                    avgCompliance={data.attendance.avgCompliance}
                                />
                            </div>
                            <div className="lg:col-span-5">
                                <DepartmentBreakdownCard departments={data.departments} />
                            </div>
                        </div>

                        {/* Row 3: composition + diversity */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
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
                        headcount={data.headcount}
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
