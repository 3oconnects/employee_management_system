import React from 'react';
import { IndianRupee, Users, ShieldCheck, Clock, CheckCircle2, AlertCircle } from 'lucide-react';

interface FinancialAnalysisStatsProps {
    summary: {
        netOutflow: number;
        govtPayables: number;
    };
    enrolledEmployees: number;
    totalEmployees: number;
    pendingCount: number;
    inr: (v: number) => string;
}

const FinancialAnalysisStats: React.FC<FinancialAnalysisStatsProps> = ({
    summary,
    enrolledEmployees,
    totalEmployees,
    pendingCount,
    inr,
}) => {
    const enrollmentPct = totalEmployees > 0 ? Math.round((enrolledEmployees / totalEmployees) * 100) : 0;

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Total Net Payroll */}
            <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-slate-500">Monthly Net Payroll</span>
                    <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                        <IndianRupee size={18} />
                    </div>
                </div>
                <div className="text-2xl font-bold text-slate-900 tracking-tight">
                    {inr(Number(summary.netOutflow) || 0)}
                </div>
                <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-500 font-medium">
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700">
                        Current Cycle
                    </span>
                    <span>• {enrolledEmployees} Active Disbursals</span>
                </div>
            </div>

            {/* Card 2: Payroll Enrollment */}
            <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-slate-500">Payroll Enrollment</span>
                    <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                        <Users size={18} />
                    </div>
                </div>
                <div className="text-2xl font-bold text-slate-900 tracking-tight">
                    {enrolledEmployees} <span className="text-sm font-normal text-slate-400">/ {totalEmployees}</span>
                </div>
                <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-500 font-medium">
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold ${
                        enrollmentPct === 100 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                    }`}>
                        {enrollmentPct}% Configured
                    </span>
                    {totalEmployees - enrolledEmployees > 0 && (
                        <span>• {totalEmployees - enrolledEmployees} Pending Setup</span>
                    )}
                </div>
            </div>

            {/* Card 3: Statutory Dues */}
            <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-slate-500">Statutory & Tax Dues</span>
                    <div className="w-9 h-9 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center">
                        <ShieldCheck size={18} />
                    </div>
                </div>
                <div className="text-2xl font-bold text-slate-900 tracking-tight">
                    {inr(Number(summary.govtPayables) || 0)}
                </div>
                <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-500 font-medium">
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold bg-violet-50 text-violet-700">
                        PF, PT & TDS
                    </span>
                    <span>• Monthly Remittance</span>
                </div>
            </div>

            {/* Card 4: Pending Approvals */}
            <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-slate-500">Pending Approvals</span>
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                        pendingCount > 0 ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-600'
                    }`}>
                        <Clock size={18} />
                    </div>
                </div>
                <div className="text-2xl font-bold text-slate-900 tracking-tight">
                    {pendingCount}
                </div>
                <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-500 font-medium">
                    {pendingCount > 0 ? (
                        <span className="inline-flex items-center gap-1 text-amber-600 font-semibold">
                            <AlertCircle size={13} />
                            Action Required
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                            <CheckCircle2 size={13} />
                            All Caught Up
                        </span>
                    )}
                    <span>• Pre-payroll items</span>
                </div>
            </div>
        </div>
    );
};

export default FinancialAnalysisStats;
