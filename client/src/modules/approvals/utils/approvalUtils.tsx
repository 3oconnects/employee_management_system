import React from 'react';
import { 
    Shield, Calendar, Users, Briefcase, Inbox, Activity, Clock, Building2, Layers, KeyRound
} from 'lucide-react';
import { ApprovalType } from '../types';

export const getTypeIcon = (type: string) => {
    switch (type) {
        case 'role_change': return <Shield size={16} />;
        case 'leave': return <Calendar size={16} />;
        case 'team_change': return <Users size={16} />;
        case 'promotion': return <Briefcase size={16} />;
        case 'attendance': return <Clock size={16} />;
        case 'department_creation': return <Building2 size={16} />;
        case 'team_creation': return <Layers size={16} />;
        case 'password_reset': return <KeyRound size={16} />;
        default: return <Inbox size={16} />;
    }
};

export const getTypeName = (type: string) => {
    if (!type) return 'Request';
    return type
        .split('_')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
};

export const getTypeColor = (type: string) => {
    switch (type) {
        case 'role_change':
            return { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200/80', iconBg: 'bg-purple-100 text-purple-600' };
        case 'team_creation':
            return { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200/80', iconBg: 'bg-indigo-100 text-indigo-600' };
        case 'department_creation':
            return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200/80', iconBg: 'bg-blue-100 text-blue-600' };
        case 'leave':
            return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200/80', iconBg: 'bg-emerald-100 text-emerald-600' };
        case 'promotion':
            return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200/80', iconBg: 'bg-amber-100 text-amber-600' };
        case 'password_reset':
            return { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200/80', iconBg: 'bg-rose-100 text-rose-600' };
        default:
            return { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200', iconBg: 'bg-slate-100 text-slate-600' };
    }
};
