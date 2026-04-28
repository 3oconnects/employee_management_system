import React from 'react';

/* ─── Shared helpers & types ─────────────────────────────── */
export const fmtDate  = (d?: string | null) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
export const fmtMoney = (n?: number | null) => n ? `₹${Math.round(n).toLocaleString('en-IN')}` : '—';

export interface ProfileData {
    employee: any;
    compensation: any;
    documents: any[];
    emergencyContacts: any[];
    performanceReviews: any[];
    attendanceSummary: any;
    leaveBalances: any[];
}

/* ── Reusable field row for data grids ───────────────────── */
export const Row: React.FC<{
    label: string;
    value?: string | number | null;
    mono?: boolean;
    span?: boolean;
}> = ({ label, value, mono, span }) => (
    <div className={`flex flex-col gap-0.5 py-3 border-b border-slate-50 last:border-0 ${span ? 'col-span-2' : ''}`}>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
        <p className={`text-[13px] font-semibold text-slate-800 ${mono ? 'font-mono text-[11px]' : ''}`}>{value ?? '—'}</p>
    </div>
);
