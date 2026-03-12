import React, { useState } from 'react';
import {
    IndianRupee,
    CheckCircle2,
    LayoutDashboard,
    Users,
    History,
    ClipboardCheck,
    ShieldCheck,
    CreditCard,
    Files
} from 'lucide-react';
import PayRuns from '../sections/PayRuns';
import EmployeePayrollManagement from '../sections/EmployeePayrollManagement';
import FinancialAnalysis from '../sections/FinancialAnalysis';
import Approvals from '../sections/Approvals';
import TaxStatutory from '../sections/TaxStatutory';
import DocumentsPayslips from '../sections/DocumentsPayslips';

import { useAuthStore } from '../../../store/authStore';
import EmployeePayroll from '../sections/EmployeePayroll';

const GeneratePayroll: React.FC = () => {
    const { user } = useAuthStore();
    const storedUser = localStorage.getItem('user');
    const currentUser = storedUser ? JSON.parse(storedUser) : (user as any);
    const userName = currentUser?.name || currentUser?.email || 'User';

    const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'hr';
    const [activeTab, setActiveTab] = useState(isAdmin ? 'dashboard' : 'my_payroll');

    const adminTabs = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'management', label: 'Employee Management', icon: Users },
        { id: 'runs', label: 'Pay Runs', icon: History },
        { id: 'approvals', label: 'Approvals', icon: ClipboardCheck },
        { id: 'tax', label: 'Tax & Statutory', icon: ShieldCheck },
        { id: 'documents', label: 'Documents', icon: Files }
    ];

    const employeeTabs = [
        { id: 'my_payroll', label: 'My Payroll', icon: CreditCard }
    ];

    const tabs = isAdmin ? adminTabs : employeeTabs;

    return (
        <div className="min-h-screen bg-[#F8FAFC] p-8 space-y-12 font-sans pb-32">
            {/* Header Section */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-200">
                <div className="space-y-1">
                    <div className="flex items-center space-x-3">
                        <div className="p-3 bg-slate-900 rounded-2xl text-white shadow-xl shadow-slate-200">
                            <IndianRupee size={24} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                                {isAdmin ? 'Unified Payroll Hub' : 'My Financial Hub'}
                            </h1>
                            <p className="text-slate-500 text-sm font-medium italic">
                                {isAdmin ? 'Enterprise-grade Payroll & Financial Compliance System' : `Secure Payroll Portfolio for ${userName}`}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2 text-emerald-600 bg-emerald-50 px-4 py-2 rounded-full border border-emerald-100">
                        <CheckCircle2 size={16} />
                        <span className="text-[10px] font-black tracking-widest uppercase">Compliance In-Sync</span>
                    </div>
                </div>
            </div>

            {/* Internal Tab Navigation */}
            <div className="flex space-x-1 p-1 bg-slate-200/50 rounded-2xl w-fit border border-slate-200 overflow-x-auto max-w-full no-scrollbar">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center space-x-2 px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id
                            ? 'bg-white text-blue-600 shadow-sm shadow-blue-900/10'
                            : 'text-slate-500 hover:bg-white/50 hover:text-slate-900'
                            }`}
                    >
                        <tab.icon size={14} />
                        <span className="whitespace-nowrap">{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* Sub-sections Container */}
            <div className="min-h-[600px] animate-in fade-in duration-700">
                {activeTab === 'dashboard' && <FinancialAnalysis />}
                {activeTab === 'management' && <EmployeePayrollManagement />}
                {activeTab === 'runs' && <PayRuns />}
                {activeTab === 'approvals' && <Approvals />}
                {activeTab === 'tax' && <TaxStatutory />}
                {activeTab === 'documents' && <DocumentsPayslips />}
                {activeTab === 'my_payroll' && <EmployeePayroll />}
            </div>
        </div>
    );
};

export default GeneratePayroll;
