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
    CreditCard
} from 'lucide-react';
import api from '../../../services/api';

// Reusable Components
import { ReportStatCard } from '../components/ReportStatCard';
import { AttendanceTrendChart } from '../components/AttendanceTrendChart';
import { DepartmentBreakdownCard } from '../components/DepartmentBreakdownCard';
import { WorkforceComposition } from '../components/WorkforceComposition';
import { DiversityMetricsCard } from '../components/DiversityMetricsCard';
import { RecentReportsList } from '../components/RecentReportsList';

import { OrganizationReport } from '../components/OrganizationReport';
import { PayrollReport } from '../components/PayrollReport';
import { AttendanceReport } from '../components/AttendanceReport';

interface ReportData {
    headcount: number;
    enrolledHeadcount: number;
    avgSalary: number;
    attritionRate: string;
    attendance: {
        avgCompliance: string;
        todayPresent: number;
    };
    leave: {
        pending: number;
        approved: number;
    };
    payroll: {
        monthlyPayout: number;
    };
    departments: Array<{ name: string; val: number; color: string }>;
    attendanceTrend: number[];
    genderDistribution: { male: number; female: number; other: number };
    employmentType: Array<{ type: string; count: number }>;
    todayAttendanceLog: any[];
    salaryDistribution: any[];
    orgMetrics: { units: number; locations: number };
    recentReports: any[];
}

const Reports: React.FC = () => {
    const [activeTab, setActiveTab] = useState('overview');
    const [data, setData] = useState<ReportData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

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

    if (loading || !data) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-200px)]">
                <div className="flex flex-col items-center gap-4">
                    <RefreshCw className="text-indigo-600 animate-spin" size={32} />
                    <p className="text-[13px] font-bold text-slate-500 animate-pulse uppercase tracking-widest">Compiling Analytics...</p>
                </div>
            </div>
        );
    }

    const tabs = [
        { id: 'overview', label: 'Overview', icon: Activity },
        { id: 'attendance', label: 'Attendance', icon: Calendar },
        { id: 'payroll', label: 'Payroll', icon: CreditCard },
        { id: 'team', label: 'Organization', icon: Users },
    ];

    return (
        <div className="p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-700">
            {/* ── Header ────────────────────── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-[28px] font-black text-slate-900 tracking-tight">Reports & Analytics</h1>
                    <p className="text-[14px] text-slate-500 mt-1 font-medium">Real-time organizational insights and workforce intelligence</p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-[13px] font-bold hover:bg-slate-50 transition-all shadow-sm">
                        <Filter size={16} /> Filter
                    </button>
                    <button className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-[13px] font-bold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100">
                        <Download size={16} /> Export PDF
                    </button>
                </div>
            </div>

            {/* ── Navigation ────────────────── */}
            <div className="flex items-center gap-1 bg-slate-50 p-1.5 rounded-2xl border border-slate-100 w-fit">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[13px] font-bold transition-all ${
                            activeTab === tab.id 
                                ? 'bg-white text-indigo-600 shadow-sm border border-slate-100' 
                                : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
                        }`}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ── Content ───────────────────── */}
            <div className="space-y-8">
                {activeTab === 'overview' && (
                    <>
                        {/* KPI Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
                                value={`\u20B9${(data.avgSalary/12).toLocaleString()}`} 
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

                        {/* Analysis Grid - Row 1 */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2">
                                <AttendanceTrendChart 
                                    data={data.attendanceTrend} 
                                    avgCompliance={data.attendance.avgCompliance} 
                                />
                            </div>
                            <DepartmentBreakdownCard departments={data.departments} />
                        </div>

                        {/* Analysis Grid - Row 2 */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <WorkforceComposition 
                                types={data.employmentType} 
                                total={data.headcount} 
                            />
                            <DiversityMetricsCard 
                                data={data.genderDistribution} 
                                total={data.headcount} 
                            />
                        </div>

                        {/* Recent Reports */}
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
