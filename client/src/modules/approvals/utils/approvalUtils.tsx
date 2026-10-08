import React from 'react';
import { 
    Shield, Calendar, Users, Briefcase, Inbox, Clock, Building2, Layers, KeyRound, Receipt, FileSpreadsheet, ArrowRightLeft, UserCheck
} from 'lucide-react';
import { fmtCurrency } from '../../../utils/formatters';

export const getTypeIcon = (type: string) => {
    switch (type?.toLowerCase()) {
        case 'claim':
        case 'claims':
        case 'reimbursement':
            return <Receipt size={16} />;
        case 'timesheet':
        case 'timesheets':
            return <FileSpreadsheet size={16} />;
        case 'role_change':
            return <Shield size={16} />;
        case 'leave':
            return <Calendar size={16} />;
        case 'team_change':
            return <ArrowRightLeft size={16} />;
        case 'promotion':
            return <Briefcase size={16} />;
        case 'attendance':
            return <Clock size={16} />;
        case 'department_creation':
            return <Building2 size={16} />;
        case 'team_creation':
            return <Layers size={16} />;
        case 'password_reset':
            return <KeyRound size={16} />;
        case 'onboarding':
            return <UserCheck size={16} />;
        default:
            return <Inbox size={16} />;
    }
};

export const getTypeName = (type: string) => {
    if (!type) return 'Request';
    const lower = type.toLowerCase();
    switch (lower) {
        case 'claim':
        case 'claims':
            return 'Expense Claim';
        case 'timesheet':
        case 'timesheets':
            return 'Timesheet';
        case 'leave':
            return 'Leave';
        case 'role_change':
            return 'Role Change';
        case 'team_change':
            return 'Team Transfer';
        case 'team_creation':
            return 'New Team';
        case 'department_creation':
            return 'New Department';
        case 'password_reset':
            return 'Password Reset';
        case 'promotion':
            return 'Promotion';
        case 'attendance':
            return 'Attendance Regularization';
        default:
            return type
                .split('_')
                .map(w => w.charAt(0).toUpperCase() + w.slice(1))
                .join(' ');
    }
};

export const getTypeColor = (type: string) => {
    switch (type?.toLowerCase()) {
        case 'claim':
        case 'claims':
        case 'reimbursement':
            return {
                bg: 'bg-amber-500/10',
                text: 'text-amber-700',
                border: 'border-amber-300/70',
                iconBg: 'bg-amber-100 text-amber-700',
                stripe: 'from-amber-500 to-orange-500',
                badgeBg: 'bg-amber-50 text-amber-800 border-amber-200'
            };
        case 'timesheet':
        case 'timesheets':
            return {
                bg: 'bg-sky-500/10',
                text: 'text-sky-700',
                border: 'border-sky-300/70',
                iconBg: 'bg-sky-100 text-sky-700',
                stripe: 'from-sky-500 to-blue-500',
                badgeBg: 'bg-sky-50 text-sky-800 border-sky-200'
            };
        case 'leave':
            return {
                bg: 'bg-emerald-500/10',
                text: 'text-emerald-700',
                border: 'border-emerald-300/70',
                iconBg: 'bg-emerald-100 text-emerald-700',
                stripe: 'from-emerald-500 to-teal-500',
                badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-200'
            };
        case 'role_change':
            return {
                bg: 'bg-purple-500/10',
                text: 'text-purple-700',
                border: 'border-purple-300/70',
                iconBg: 'bg-purple-100 text-purple-700',
                stripe: 'from-purple-500 to-indigo-500',
                badgeBg: 'bg-purple-50 text-purple-800 border-purple-200'
            };
        case 'team_creation':
        case 'team_change':
            return {
                bg: 'bg-indigo-500/10',
                text: 'text-indigo-700',
                border: 'border-indigo-300/70',
                iconBg: 'bg-indigo-100 text-indigo-700',
                stripe: 'from-indigo-500 to-blue-600',
                badgeBg: 'bg-indigo-50 text-indigo-800 border-indigo-200'
            };
        case 'department_creation':
            return {
                bg: 'bg-blue-500/10',
                text: 'text-blue-700',
                border: 'border-blue-300/70',
                iconBg: 'bg-blue-100 text-blue-700',
                stripe: 'from-blue-500 to-cyan-500',
                badgeBg: 'bg-blue-50 text-blue-800 border-blue-200'
            };
        case 'promotion':
            return {
                bg: 'bg-violet-500/10',
                text: 'text-violet-700',
                border: 'border-violet-300/70',
                iconBg: 'bg-violet-100 text-violet-700',
                stripe: 'from-violet-500 to-pink-500',
                badgeBg: 'bg-violet-50 text-violet-800 border-violet-200'
            };
        case 'password_reset':
            return {
                bg: 'bg-rose-500/10',
                text: 'text-rose-700',
                border: 'border-rose-300/70',
                iconBg: 'bg-rose-100 text-rose-700',
                stripe: 'from-rose-500 to-red-500',
                badgeBg: 'bg-rose-50 text-rose-800 border-rose-200'
            };
        case 'attendance':
            return {
                bg: 'bg-teal-500/10',
                text: 'text-teal-700',
                border: 'border-teal-300/70',
                iconBg: 'bg-teal-100 text-teal-700',
                stripe: 'from-teal-500 to-emerald-500',
                badgeBg: 'bg-teal-50 text-teal-800 border-teal-200'
            };
        default:
            return {
                bg: 'bg-slate-500/10',
                text: 'text-slate-700',
                border: 'border-slate-300/70',
                iconBg: 'bg-slate-100 text-slate-700',
                stripe: 'from-slate-400 to-slate-600',
                badgeBg: 'bg-slate-50 text-slate-800 border-slate-200'
            };
    }
};

/** Formats claim currency values cleanly without raw decimals */
export const formatAmount = (val: any): string => {
    if (val === undefined || val === null || val === '') return '—';
    const num = Number(val);
    if (isNaN(num)) return String(val);
    
    // For normal values, show 2 decimals nicely formatted
    if (num < 100000) {
        return `₹${num.toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}`;
    }
    return fmtCurrency(num);
};

/** Formats dates or date ranges nicely e.g. "12 Dec – 15 Dec 2026" */
export const formatDateSpan = (start?: any, end?: any): string => {
    if (!start) return '—';
    const s = new Date(start);
    if (isNaN(s.getTime())) return String(start);

    const sStr = s.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    if (!end || end === start) return sStr;

    const e = new Date(end);
    if (isNaN(e.getTime())) return `${sStr} – ${String(end)}`;
    
    const eStr = e.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    return `${sStr} – ${eStr}`;
};
