import React from 'react';
import { Row, fmtDate } from './ProfileShared';

interface JobTabProps {
    emp: any;
    tenureYears: number;
    tenureMonths: number;
    joinDate: Date | null;
}

const JobTab: React.FC<JobTabProps> = ({ emp, tenureYears, tenureMonths, joinDate }) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-0 divide-x divide-slate-50">
        <div className="pr-6">
            <Row label="Employee ID"       value={emp?.id} mono />
            <Row label="Position"          value={emp?.position} />
            <Row label="Department"        value={emp?.department_name || emp?.department} />
            <Row label="Reporting Manager" value={emp?.manager_name} />
        </div>
        <div className="px-6">
            <Row label="Join Date"         value={fmtDate(emp?.join_date)} />
            <Row label="Tenure"            value={joinDate ? `${tenureYears}y ${tenureMonths}m` : '—'} />
            <Row label="Employment Type"   value={emp?.employment_type?.replace('_', ' ')} />
            <Row label="Status"            value={emp?.status} />
        </div>
        <div className="pl-6">
            <Row label="Probation End"     value={fmtDate(emp?.probation_end_date)} />
            <Row label="Confirmation"      value={fmtDate(emp?.confirmation_date)} />
            <Row label="Notice Period"     value={emp?.notice_period_days ? `${emp.notice_period_days} days` : '—'} />
            <Row label="Exit Date"         value={fmtDate(emp?.exit_date)} />
        </div>
    </div>
);

export default JobTab;
