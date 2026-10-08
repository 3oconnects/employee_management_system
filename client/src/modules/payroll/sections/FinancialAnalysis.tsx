import React, { useState, useEffect } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
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
            setSummary(sumRes.data || {});
        } catch {
            setError('Unable to load payroll analytics. Please check your connection and try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const enrolledEmployees = employees.filter(e => e.hasProfile).length;
    const totalEmployees    = employees.length;
    const totalPayroll      = Number(summary.netOutflow) || 0;
    const avgSalary         = enrolledEmployees > 0 ? totalPayroll / enrolledEmployees : 0;

    // Dynamically calculate department breakdown
    const rawDepts = Array.from(new Set(employees.map(e => (e.department || 'General').trim())));
    const deptDist = rawDepts.map(name => {
        const matchingEmps = employees.filter(e => (e.department || 'General').trim() === name);
        const cost = matchingEmps.reduce((acc, e) => {
            const annual = Number(e.annualCTC || e.annual_ctc || 0);
            if (annual > 0) return acc + (annual / 12);
            const gross = Number(e.grossSalary || e.gross_salary || 0);
            return acc + gross;
        }, 0);
        return {
            name,
            cost: Math.round(cost),
            headcount: matchingEmps.length,
        };
    }).filter(d => d.cost > 0 || d.headcount > 0);

    const maxCost = Math.max(...deptDist.map(d => d.cost), 1);

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-28 gap-3 text-slate-400">
            <div className="w-8 h-8 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
            <span className="text-xs font-medium text-slate-500">Loading payroll analytics…</span>
        </div>
    );

    return (
        <div className="space-y-5 animate-in fade-in duration-300">
            {error && (
                <div className="flex items-center justify-between gap-3 bg-rose-50 border border-rose-200/80 rounded-xl px-4 py-3 text-rose-700 text-sm">
                    <div className="flex items-center gap-2.5">
                        <AlertCircle size={16} className="text-rose-500 shrink-0" />
                        <span>{error}</span>
                    </div>
                    <button
                        onClick={fetchData}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700 hover:text-rose-900 underline"
                    >
                        <RefreshCw size={12} />
                        Retry
                    </button>
                </div>
            )}

            {/* ── Top Metric Cards ───────────────────────── */}
            <FinancialAnalysisStats 
                summary={summary}
                enrolledEmployees={enrolledEmployees}
                totalEmployees={totalEmployees}
                pendingCount={pendingCount}
                inr={inr}
            />

            {/* ── Cost Breakdown & Department Distribution ─ */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                <div className="lg:col-span-7">
                    <FiscalIntegrityMatrix 
                        summary={summary}
                        avgSalary={avgSalary}
                        inr={inr}
                    />
                </div>

                <div className="lg:col-span-5">
                    <AllocationIndex 
                        deptDist={deptDist}
                        totalPayroll={totalPayroll}
                        maxCost={maxCost}
                        inr={inr}
                    />
                </div>
            </div>

            {/* ── Recent Pay Runs & Audit Trail ─────────── */}
            <div>
                <OperationalStream activity={activity} />
            </div>
        </div>
    );
};

export default FinancialAnalysis;
