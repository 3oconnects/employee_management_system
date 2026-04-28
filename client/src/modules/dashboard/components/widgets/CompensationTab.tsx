import React from 'react';
import { CreditCard } from 'lucide-react';
import { Row, fmtMoney } from './ProfileShared';

interface CompensationTabProps {
    comp: any;
}

const CompensationTab: React.FC<CompensationTabProps> = ({ comp }) => {
    if (!comp) {
        return (
            <div className="text-center py-10 text-slate-400">
                <CreditCard size={28} className="mx-auto mb-2 opacity-30"/>
                <p className="text-[12px] font-bold">No compensation data available</p>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { l: 'Annual CTC',    v: fmtMoney(comp.annual_ctc),             c: '#6366f1' },
                    { l: 'Monthly Gross', v: fmtMoney((comp.annual_ctc || 0) / 12), c: '#8b5cf6' },
                    { l: 'Basic Salary',  v: fmtMoney(comp.basic_salary),           c: '#10b981' },
                    { l: 'HRA',           v: fmtMoney(comp.hra),                    c: '#f59e0b' },
                ].map(s => (
                    <div key={s.l} className="rounded-xl border border-slate-100 p-4 bg-slate-50">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{s.l}</p>
                        <p className="text-[18px] font-black mt-1" style={{ color: s.c }}>{s.v}</p>
                    </div>
                ))}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-0 divide-x divide-slate-50">
                <div className="pr-6">
                    <Row label="Bank Account" value={comp.bank_account ? `●●●●${comp.bank_account.slice(-4)}` : '—'} mono />
                    <Row label="Tax Regime"   value={comp.tax_regime} />
                </div>
                <div className="px-6">
                    <Row label="Allowances"   value={fmtMoney(comp.allowances)} />
                    <Row label="Bonus"        value={fmtMoney(comp.bonus)} />
                </div>
                <div className="pl-6">
                    <Row label="PF Number"    value={comp.pf_number} mono />
                    <Row label="ESI Number"   value={comp.esi_number} mono />
                </div>
            </div>
        </div>
    );
};

export default CompensationTab;
