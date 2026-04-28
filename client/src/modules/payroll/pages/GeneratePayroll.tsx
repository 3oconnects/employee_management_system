import React, { useState } from 'react';
import {
    IndianRupee,
    Users,
    History,
    ClipboardCheck,
    ShieldCheck,
    Files,
    LayoutDashboard,
    CheckCircle2,
    Lock,
    Globe,
    CreditCard,
    Cpu,
    Activity,
    Shield,
    Terminal
} from 'lucide-react';
import PayRuns                  from '../sections/PayRuns';
import EmployeePayrollManagement from '../sections/EmployeePayrollManagement';
import FinancialAnalysis        from '../sections/FinancialAnalysis';
import Approvals                from '../sections/Approvals';
import TaxStatutory             from '../sections/TaxStatutory';
import DocumentsPayslips        from '../sections/DocumentsPayslips';
import EmployeePayroll          from '../sections/EmployeePayroll';
import { useAuthStore }         from '../../../store/authStore';

const GeneratePayroll: React.FC = () => {
    const { user } = useAuthStore();
    const isAdmin = user?.role === 'admin' || user?.role === 'hr';

    const adminTabs = [
        { id: 'dashboard',  label: 'Ledger Analytics', icon: LayoutDashboard },
        { id: 'management', label: 'Personnel Matrix', icon: Users },
        { id: 'runs',       label: 'Cycle History',    icon: History },
        { id: 'approvals',  label: 'Audit Queue',     icon: ClipboardCheck },
        { id: 'tax',        label: 'Compliance',     icon: ShieldCheck },
        { id: 'documents',  label: 'Repository',     icon: Files },
    ];
    const employeeTabs = [
        { id: 'my_payroll', label: 'Compensation Hub', icon: CreditCard },
    ];
    const tabs = isAdmin ? adminTabs : employeeTabs;

    const [activeTab, setActiveTab] = useState(isAdmin ? 'dashboard' : 'my_payroll');

    return (
        <div className="max-w-[1440px] mx-auto px-6 py-6 space-y-6 animate-fade-up">
            {/* ── Financial Header ─────────────────────────── */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
                        <IndianRupee size={20} className="text-white" />
                    </div>
                    <div>
                        <h2 className="text-[18px] font-black text-slate-900 tracking-tight">
                            {isAdmin ? 'Financial Orchestrator' : 'Compensation Hub'}
                        </h2>
                        <div className="flex items-center gap-2.5 mt-1">
                            <span className="flex items-center gap-1 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                <Terminal size={10} className="text-indigo-500"/> v4.2.0
                            </span>
                            <div className="w-1 h-1 bg-slate-200 rounded-full" />
                            <span className="flex items-center gap-1 text-[9px] font-black text-emerald-500 uppercase tracking-widest">
                                <Activity size={10} /> Live Sync
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2.5">
                    <div className="px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg flex items-center gap-2">
                        <Shield size={12} className="text-indigo-500" />
                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">PCI-DSS</span>
                    </div>
                    <div className="px-3 py-1.5 bg-indigo-50 border border-indigo-100 rounded-lg flex items-center gap-2">
                        <Lock size={12} className="text-indigo-600" />
                        <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">AES-256</span>
                    </div>
                </div>
            </div>

            {/* ── Console Tabs ─────────────────────────────── */}
            <div className="bg-white border border-slate-200 p-1.5 rounded-2xl flex items-center gap-1 overflow-x-auto no-scrollbar shadow-sm">
                {tabs.map(tab => {
                    const Icon = tab.icon;
                    const isSelected = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-shrink-0 flex items-center gap-2.5 px-5 py-3 text-[11px] font-black uppercase tracking-widest rounded-xl transition-all duration-300 ${
                                isSelected
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                                    : 'text-slate-400 hover:text-slate-900 hover:bg-slate-50'
                            }`}
                        >
                            <Icon size={14} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* ── Viewport ─────────────────────────────────── */}
            <div className="animate-in fade-in slide-in-from-bottom-3 duration-500">
                {activeTab === 'dashboard'  && <FinancialAnalysis />}
                {activeTab === 'management' && <EmployeePayrollManagement />}
                {activeTab === 'runs'       && <PayRuns />}
                {activeTab === 'approvals'  && <Approvals />}
                {activeTab === 'tax'        && <TaxStatutory />}
                {activeTab === 'documents'  && <DocumentsPayslips />}
                {activeTab === 'my_payroll' && <EmployeePayroll />}
            </div>
        </div>
    );
};

export default GeneratePayroll;

