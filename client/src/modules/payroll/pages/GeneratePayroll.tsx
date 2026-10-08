import React, { useState } from 'react';
import {
    IndianRupee,
    Users,
    History,
    ClipboardCheck,
    ShieldCheck,
    Files,
    LayoutDashboard,
    CreditCard,
    Plus,
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
    const { user, hasPermission } = useAuthStore();
    const canManagePayroll = hasPermission('payroll.process') || hasPermission('payroll:manage');
    const isAdmin = canManagePayroll;

    const adminTabs = [
        { id: 'dashboard',  label: 'Overview & Analytics',  icon: LayoutDashboard },
        { id: 'management', label: 'Employee Salaries',     icon: Users },
        { id: 'runs',       label: 'Pay Runs',              icon: History },
        { id: 'approvals',  label: 'Approvals',             icon: ClipboardCheck },
        { id: 'tax',        label: 'Tax & Compliance',      icon: ShieldCheck },
        { id: 'documents',  label: 'Payslips & Docs',       icon: Files },
    ];
    const employeeTabs = [
        { id: 'my_payroll', label: 'My Payroll', icon: CreditCard },
    ];
    const tabs = isAdmin ? adminTabs : employeeTabs;

    const [activeTab, setActiveTab] = useState(isAdmin ? 'dashboard' : 'my_payroll');

    return (
        <div className="w-full min-w-0 max-w-[1440px] mx-auto px-6 py-6 space-y-5">
            {/* ── Page Header ────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                        {isAdmin ? 'Payroll Management' : 'My Payroll'}
                    </h1>
                    <p className="text-xs text-slate-500 mt-0.5">
                        {isAdmin
                            ? 'Manage pay runs, salary structures, statutory compliance, and disbursement cycles'
                            : 'View your payslips, earnings breakdown, and submitted reimbursement claims'}
                    </p>
                </div>
                {isAdmin && (
                    <div className="flex items-center gap-2.5">
                        <button
                            onClick={() => setActiveTab('management')}
                            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200/90 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all shadow-xs"
                        >
                            <Users size={14} className="text-slate-500" />
                            Manage Salaries
                        </button>
                        <button
                            onClick={() => setActiveTab('runs')}
                            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-all shadow-xs"
                        >
                            <History size={14} />
                            Execute Pay Run
                        </button>
                    </div>
                )}
            </div>

            {/* ── Navigation Tabs ─────────────────────────────────── */}
            {tabs.length > 1 && (
                <div className="flex items-center gap-1.5 p-1 bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-x-auto no-scrollbar">
                    {tabs.map((tab) => {
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
            )}

            {/* ── Viewport ────────────────────────────────────────── */}
            <div className="animate-in fade-in duration-200">
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
