import React from 'react';
import { 
    Shield, Calendar, Users, Briefcase, Inbox, Activity, Clock
} from 'lucide-react';
import { ApprovalType } from '../types';

export const getTypeIcon = (type: string) => {
    switch (type) {
        case 'role_change': return <Shield size={18} />;
        case 'leave': return <Calendar size={18} />;
        case 'team_change': return <Users size={18} />;
        case 'promotion': return <Briefcase size={18} />;
        case 'attendance': return <Clock size={18} />;
        default: return <Inbox size={18} />;
    }
};

export const getTypeName = (type: string) => {
    return type.replace(/_/g, ' ');
};
