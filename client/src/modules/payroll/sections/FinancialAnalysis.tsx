import React, { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import api from '../../../services/api';

// Components
import FinancialAnalysisStats from '../components/FinancialAnalysisStats';
import FiscalIntegrityMatrix from '../components/FiscalIntegrityMatrix';
import AllocationIndex from '../components/AllocationIndex';
import OperationalStream from '../components/OperationalStream';

/* ─── Currency util ──────────────────────────────────────── */
const inr = (v: number) =>
    new Intl.NumberFormat('en-IN', { 
        style: 'currency', 
        currency: 'INR', 
        maximumFractionDigits: 0 
    }).format(v);

const FinancialAnalysis: React.FC = () => {
    const [employees, setEmployees] = useState<any[]>([]);
    const [activity,  setActivity]  = useState<any[]>([]);
    const [summary,   setSummary]   = useState<any>({ 
        totalGross: 0, 
        totalDeductions: 0, 
        netOutflow: 0, 
        govtPayables: 0 
    });
    const [pendingCount, setPendingCount] = useState(0);
    const [loading,   setLoading]   = useState(true);
    const [error,     setError]     = useState<string | null>(null);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const [empRes, actRes, pendRes, sumRes] = await Promise.all([
                api.get('payroll/employees'),
                api.get('payroll/activity'),
                api.get('payroll/pending-approvals'),
                api.get('payroll/live-summary'),
            ]);
            setEmployees(Array.isArray(empRes.data) ? empRes.data : []);
            setActivity(Array.isArray(actRes.data) ? actRes.data : []);
            setPendingCount(pendRes.data?.pending || 0);
            setSummary(sumRes.data);
        } catch {
            setError('System synchronization failed. Protocol Restricted.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const enrolledEmployees = employees.filter(e => e.hasProfile).length;
    const totalEmployees    = employees.length;
    const totalPayroll      = Number(summary.netOutflow) || 0;
    const avgSalary         = enrolledEmployees > 0 ? totalPayroll / enrolledEmployees : 0;

    const departments = ['Engineering', 'Sales', 'HR', 'Marketing', 'Finance', 'Operations'];
    const deptDist = departments.map(name => ({
        name,
        cost: employees.filter(e => e.department === name)
                       .reduce((acc, e) => acc + (Number(e.annual_ctc || 0) / 12), 0),
    })).filter(d => d.cost > 0);
    const maxCost = Math.max(...deptDist.map(d => d.cost), 1);

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-48 gap-5 text-slate-400">
            <div className="w-10 h-10 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">Synchronizing Ledger Matrix...</span>
        </div>
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-12">
            {error && (
                <div className="flex items-center gap-4 bg-rose-50 border border-rose-100 rounded-2xl px-6 py-4">
                    <AlertCircle size={18} className="text-rose-500 flex-shrink-0" />
                    <p className="text-[11px] text-rose-600 font-black uppercase tracking-tight">{error}</p>
                </div>
            )}

            <FinancialAnalysisStats 
                summary={summary}
                enrolledEmployees={enrolledEmployees}
                totalEmployees={totalEmployees}
                pendingCount={pendingCount}
                inr={inr}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <FiscalIntegrityMatrix 
                        summary={summary}
                        avgSalary={avgSalary}
                        inr={inr}
                    />
                    <OperationalStream activity={activity} />
                </div>

                <AllocationIndex 
                    deptDist={deptDist}
                    totalPayroll={totalPayroll}
                    maxCost={maxCost}
                    inr={inr}
                />
            </div>
        </div>
    );
};

export default FinancialAnalysis;
