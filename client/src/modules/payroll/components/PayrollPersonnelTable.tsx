import React from 'react';
import { Loader2, AlertTriangle, Users, Shield, Settings } from 'lucide-react';

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
    onRetry
}) => {
    if (loading) return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center py-32 gap-4 text-slate-400">
            <Loader2 size={24} className="animate-spin text-indigo-400" />
            <p className="text-[10px] font-black uppercase tracking-widest">Synchronizing Matrix...</p>
        </div>
    );

    if (error) return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center py-32 text-center gap-5">
            <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center border border-rose-100"><AlertTriangle size={32} /></div>
            <div>
                <p className="text-[15px] font-black text-slate-900 uppercase tracking-tight">Access Restricted</p>
                <p className="text-[11px] text-slate-400 mt-1.5 max-w-xs px-6 font-bold uppercase tracking-widest leading-relaxed">{error}</p>
            </div>
            <button onClick={onRetry} className="px-8 py-3 bg-indigo-600 text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-indigo-500 transition-all">Retry Sync</button>
        </div>
    );

    if (profiles.length === 0) return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center py-32 text-center gap-5">
            <div className="w-16 h-16 bg-slate-50 text-slate-200 rounded-2xl flex items-center justify-center border border-slate-100"><Users size={32} /></div>
            <div>
                <p className="text-[15px] font-black text-slate-900 uppercase tracking-tight">No Agents Detected</p>
                <p className="text-[11px] text-slate-400 mt-1.5 font-bold uppercase tracking-widest">Adjust filters to broaden your search.</p>
            </div>
        </div>
    );

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
            <div className="overflow-x-auto no-scrollbar">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-slate-50/50 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                            <th className="px-6 py-4">Personnel Identity</th>
                            <th className="px-6 py-4">Compensation Value</th>
                            <th className="px-6 py-4">Financial Metadata</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-right">Controls</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {profiles.map(p => (
                            <tr key={p.id} className="hover:bg-slate-50/50 transition-all group">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3.5">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-[14px] font-black transition-all shadow-sm ${!p.hasProfile ? 'bg-amber-50 text-amber-500 border border-amber-100' : 'bg-white border border-slate-100 text-slate-900 group-hover:border-indigo-200 group-hover:text-indigo-600'}`}>
                                            {p.name.charAt(0)}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="text-[13px] font-black text-slate-800 tracking-tight group-hover:text-indigo-600 transition-colors uppercase">{p.name}</p>
                                                {!p.hasProfile && (
                                                    <span className="px-1.5 py-0.5 bg-amber-50 text-amber-600 border border-amber-100 rounded text-[7px] font-black uppercase tracking-widest">Pending</span>
                                                )}
                                            </div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{p.id} • {p.department}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="space-y-0.5">
                                        <div className="flex items-baseline gap-1.5">
                                            <p className="text-[14px] font-black text-slate-900 tracking-tight">{formatter.format(p.annualCTC)}</p>
                                            <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest">p.a.</span>
                                        </div>
                                        <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">
                                            {p.hasProfile ? `${formatter.format(p.netSalary)} Monthly` : 'Profile Locked'}
                                        </p>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2.5 group/acc">
                                        <div className="p-1.5 bg-slate-50 rounded-lg group-hover/acc:bg-indigo-50 group-hover/acc:text-indigo-600 transition-all border border-slate-100">
                                            <Shield size={12} />
                                        </div>
                                        <span className="text-[11px] font-bold text-slate-600 tracking-tight">{maskAccount(p.bankAccount)}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all ${p.taxRegime === 'New' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                                        {p.taxRegime} Regime
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button 
                                        onClick={() => p.hasProfile ? onOpenSettings(p) : onCreateProfile(p)}
                                        className={`p-2 rounded-lg transition-all shadow-sm group/btn ${p.hasProfile ? 'bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50' : 'bg-amber-50 border border-amber-100 text-amber-600 hover:bg-amber-100'}`}
                                    >
                                        <Settings size={16} className="group-hover/btn:rotate-90 transition-transform duration-500" />
                                    </button>
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
