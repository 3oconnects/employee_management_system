import React from 'react';
import { BarChart3, Activity, IndianRupee, ShieldCheck, Target, ArrowRight } from 'lucide-react';

interface FiscalIntegrityMatrixProps {
    summary: {
        totalGross: number;
        totalDeductions: number;
        netOutflow: number;
        govtPayables: number;
    };
    avgSalary: number;
    inr: (v: number) => string;
}

const FiscalIntegrityMatrix: React.FC<FiscalIntegrityMatrixProps> = ({ summary, avgSalary, inr }) => {
    return (
        <div className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-xs flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-base font-semibold text-slate-900">Payroll Cost Breakdown</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Consolidated monthly compensation and liability distribution</p>
                </div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Verified Ledger
                </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-6">
                {/* Gross Value */}
                <div className="p-4 rounded-lg border border-slate-100 bg-slate-50/60 hover:bg-white hover:border-slate-200 hover:shadow-xs transition-all">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-7 h-7 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center">
                            <BarChart3 size={14} />
                        </div>
                        <span className="text-xs font-semibold text-slate-600">Total Gross Salary</span>
                    </div>
                    <p className="text-xl font-bold text-slate-900 tracking-tight">{inr(summary.totalGross)}</p>
                    <p className="text-xs text-slate-400 mt-1">Pre-deduction baseline</p>
                </div>

                {/* Deductions */}
                <div className="p-4 rounded-lg border border-slate-100 bg-slate-50/60 hover:bg-white hover:border-slate-200 hover:shadow-xs transition-all">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-7 h-7 rounded-md bg-rose-50 text-rose-600 flex items-center justify-center">
                            <Activity size={14} />
                        </div>
                        <span className="text-xs font-semibold text-slate-600">Employee Deductions</span>
                    </div>
                    <p className="text-xl font-bold text-slate-900 tracking-tight">{inr(summary.totalDeductions)}</p>
                    <p className="text-xs text-slate-400 mt-1">Provident Fund, PT & TDS</p>
                </div>

                {/* Net Payable */}
                <div className="p-4 rounded-lg border border-slate-100 bg-slate-50/60 hover:bg-white hover:border-slate-200 hover:shadow-xs transition-all">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-7 h-7 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <IndianRupee size={14} />
                        </div>
                        <span className="text-xs font-semibold text-slate-600">Net Take-Home Pay</span>
                    </div>
                    <p className="text-xl font-bold text-slate-900 tracking-tight">{inr(summary.netOutflow)}</p>
                    <p className="text-xs text-slate-400 mt-1">Direct employee disbursements</p>
                </div>

                {/* Govt Dues */}
                <div className="p-4 rounded-lg border border-slate-100 bg-slate-50/60 hover:bg-white hover:border-slate-200 hover:shadow-xs transition-all">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-7 h-7 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center">
                            <ShieldCheck size={14} />
                        </div>
                        <span className="text-xs font-semibold text-slate-600">Employer & Govt Dues</span>
                    </div>
                    <p className="text-xl font-bold text-slate-900 tracking-tight">{inr(summary.govtPayables)}</p>
                    <p className="text-xs text-slate-400 mt-1">Compliance & tax remittance</p>
                </div>
            </div>

            <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                        <Target size={16} />
                    </div>
                    <div>
                        <p className="text-xs font-medium text-slate-500">Average Monthly Salary</p>
                        <p className="text-sm font-bold text-slate-900 mt-0.5">{inr(avgSalary)} <span className="text-xs font-normal text-slate-400">/ employee</span></p>
                    </div>
                </div>
                <div className="text-xs text-slate-400 font-medium">
                    Calculated across active profiles
                </div>
            </div>
        </div>
    );
};

export default FiscalIntegrityMatrix;
