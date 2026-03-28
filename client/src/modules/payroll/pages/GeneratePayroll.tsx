import React, { useState } from 'react';
import {
    IndianRupee,
    Users,
    History,
    ClipboardCheck,
    ShieldCheck,
    CreditCard,
    Files,
    LayoutDashboard,
    CheckCircle2,
    Lock,
    Globe
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
        { id: 'dashboard',  label: 'Dashboard',    icon: LayoutDashboard },
        { id: 'management', label: 'Employee Matrix', icon: Users },
        { id: 'runs',       label: 'Pay Cycles',    icon: History },
        { id: 'approvals',  label: 'Approvals',     icon: ClipboardCheck },
        { id: 'tax',        label: 'Statutory',     icon: ShieldCheck },
        { id: 'documents',  label: 'Documents',     icon: Files },
    ];
    const employeeTabs = [
        { id: 'my_payroll', label: 'My Compensation', icon: CreditCard },
    ];
    const tabs = isAdmin ? adminTabs : employeeTabs;

    const [activeTab, setActiveTab] = useState(isAdmin ? 'dashboard' : 'my_payroll');

    return (
        <div className="min-h-screen bg-[#F8FAFC] pb-20 page-enter">
            {/* ── Page header ─────────────────────────────── */}
            <div className="bg-white border-b border-gray-100 px-8 py-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 sticky top-0 z-40 backdrop-blur-xl bg-white/80">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-100 ring-4 ring-indigo-50">
                        <IndianRupee size={22} className="text-white" />
                    </div>
                    <div>
                        <h2 className="text-[18px] font-black text-gray-900 leading-tight uppercase tracking-tight">
                            {isAdmin ? 'Financial Orchestrator' : 'Compensation Hub'}
                        </h2>
                        <p className="text-[11.5px] text-gray-400 font-bold uppercase tracking-widest mt-0.5 flex items-center gap-2">
                           <Globe size={11}/> Enterprise Compliance Global v1.2
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100 text-[10px] font-black uppercase tracking-widest">
                        <CheckCircle2 size={12} />
                        Audit Ready
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 text-gray-400 rounded-full border border-gray-100 text-[10px] font-black uppercase tracking-widest">
                        <Lock size={12} />
                        Encrypted
                    </div>
                </div>
            </div>

            <div className="max-w-[1500px] mx-auto px-8 py-8 space-y-8">
                {/* ── Tab Container ──────────────────────────── */}
                <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-2 flex items-center gap-1 overflow-x-auto no-scrollbar">
                    {tabs.map(tab => {
                        const Icon = tab.icon;
                        const isSelected = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex-shrink-0 flex items-center gap-3 px-6 py-3.5 text-[12.5px] font-black uppercase tracking-widest rounded-2xl transition-all duration-300 ${
                                    isSelected
                                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'
                                        : 'text-gray-400 hover:text-gray-900 hover:bg-gray-50'
                                }`}
                            >
                                <Icon size={16} />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* ── Section Injector ───────────────────────── */}
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {activeTab === 'dashboard'  && <FinancialAnalysis />}
                    {activeTab === 'management' && <EmployeePayrollManagement />}
                    {activeTab === 'runs'       && <PayRuns />}
                    {activeTab === 'approvals'  && <Approvals />}
                    {activeTab === 'tax'        && <TaxStatutory />}
                    {activeTab === 'documents'  && <DocumentsPayslips />}
                    {activeTab === 'my_payroll' && <EmployeePayroll />}
                </div>
            </div>
        </div>
    );
};

export default GeneratePayroll;
