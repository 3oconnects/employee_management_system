import React from 'react';
import { Loader2, AlertTriangle, Users, Shield, Settings, Plus, Edit } from 'lucide-react';

interface PayrollProfile {
    id: string;
    name: string;
    email: string;
    department: string;
    role: string;
    status: 'active' | 'onboarding' | 'terminated';
    hasProfile: boolean;
    annualCTC: number;
    monthlyGross: number;
    netSalary: number;
    taxRegime: 'Old' | 'New';
    bankAccount: string;
    lastProcessed?: string;
}

interface PayrollPersonnelTableProps {
    loading: boolean;
    error: string | null;
    profiles: PayrollProfile[];
    formatter: Intl.NumberFormat;
    maskAccount: (acc: string) => string;
    onOpenSettings: (profile: PayrollProfile) => void;
    onCreateProfile: (profile: PayrollProfile) => void;
    onRetry: () => void;
}

const PayrollPersonnelTable: React.FC<PayrollPersonnelTableProps> = ({
    loading,
    error,
    profiles,
    formatter,
    maskAccount,
    onOpenSettings,
    onCreateProfile,
    onRetry,
}) => {
    if (loading) return (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs flex flex-col items-center justify-center py-28 gap-3 text-slate-400">
            <Loader2 size={22} className="animate-spin text-blue-600" />
            <p className="text-xs font-medium text-slate-500">Loading employee payroll records…</p>
        </div>
    );

    if (error) return (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs flex flex-col items-center justify-center py-20 text-center gap-3">
            <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-xl flex items-center justify-center border border-rose-100">
                <AlertTriangle size={24} />
            </div>
            <div>
                <p className="text-sm font-semibold text-slate-900">Failed to load payroll data</p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm px-4">{error}</p>
            </div>
            <button
                onClick={onRetry}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-all shadow-xs"
            >
                Try Again
            </button>
        </div>
    );

    if (profiles.length === 0) return (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs flex flex-col items-center justify-center py-20 text-center gap-3">
            <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-xl flex items-center justify-center">
                <Users size={24} />
            </div>
            <div>
                <p className="text-sm font-semibold text-slate-900">No Employees Found</p>
                <p className="text-xs text-slate-500 mt-1">Try adjusting your search terms or filter settings.</p>
            </div>
        </div>
    );

    return (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto no-scrollbar">
                <table className="w-full text-left text-xs">
                    <thead>
                        <tr className="bg-slate-50/75 text-slate-500 font-semibold border-b border-slate-200/80">
                            <th className="px-5 py-3.5">Employee</th>
                            <th className="px-5 py-3.5">Salary & CTC</th>
                            <th className="px-5 py-3.5">Bank & Account</th>
                            <th className="px-5 py-3.5">Tax Regime</th>
                            <th className="px-5 py-3.5 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {profiles.map((p) => (
                            <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                                <td className="px-5 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold shadow-xs shrink-0 ${
                                            !p.hasProfile 
                                                ? 'bg-amber-50 text-amber-700 border border-amber-200/70' 
                                                : 'bg-slate-100 text-slate-700 border border-slate-200/70'
                                        }`}>
                                            {p.name.charAt(0)}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-slate-900">{p.name}</span>
                                                {!p.hasProfile && (
                                                    <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200/60 rounded text-[10px] font-semibold">
                                                        Setup Needed
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[11px] text-slate-400 mt-0.5">
                                                ID: {p.id} • {p.department}
                                            </p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-5 py-4">
                                    <div>
                                        <div className="font-semibold text-slate-900">
                                            {formatter.format(p.annualCTC)} <span className="text-[11px] font-normal text-slate-400">/ yr</span>
                                        </div>
                                        <p className="text-[11px] text-slate-500 mt-0.5">
                                            {p.hasProfile ? `${formatter.format(p.netSalary)} Net / mo` : 'Not configured'}
                                        </p>
                                    </div>
                                </td>
                                <td className="px-5 py-4">
                                    <div className="flex items-center gap-2 text-slate-600">
                                        <Shield size={13} className="text-slate-400 shrink-0" />
                                        <span className="font-mono text-xs">{maskAccount(p.bankAccount)}</span>
                                    </div>
                                </td>
                                <td className="px-5 py-4">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                                        p.taxRegime === 'New' 
                                            ? 'bg-blue-50 text-blue-700 border border-blue-100' 
                                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                                    }`}>
                                        {p.taxRegime} Regime
                                    </span>
                                </td>
                                <td className="px-5 py-4 text-right">
                                    {p.hasProfile ? (
                                        <button
                                            onClick={() => onOpenSettings(p)}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all shadow-xs"
                                        >
                                            <Edit size={13} className="text-slate-500" />
                                            Edit Structure
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => onCreateProfile(p)}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-all shadow-xs"
                                        >
                                            <Plus size={13} />
                                            Set Salary
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default PayrollPersonnelTable;
