import React from 'react';
import { Edit2, Save, Loader2 } from 'lucide-react';
import { Row, fmtDate } from './ProfileShared';

interface PersonalTabProps {
    emp: any;
    editing: boolean;
    saving: boolean;
    form: Record<string, string>;
    onFormChange: (form: Record<string, string>) => void;
    onSave: () => void;
    onEdit: () => void;
    onCancel: () => void;
}

const FIELDS = [
    { k: 'phone',          l: 'Phone' },
    { k: 'personal_email', l: 'Personal Email' },
    { k: 'blood_group',    l: 'Blood Group' },
    { k: 'marital_status', l: 'Marital Status' },
    { k: 'address_line1',  l: 'Address' },
    { k: 'city',           l: 'City' },
    { k: 'state',          l: 'State' },
    { k: 'pincode',        l: 'Pincode' },
];

const PersonalTab: React.FC<PersonalTabProps> = ({ emp, editing, saving, form, onFormChange, onSave, onEdit, onCancel }) => {
    if (editing) {
        return (
            <div className="grid grid-cols-2 gap-4">
                {FIELDS.map(f => (
                    <div key={f.k}>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{f.l}</label>
                        <input value={form[f.k] || ''} onChange={e => onFormChange({ ...form, [f.k]: e.target.value })}
                            className="w-full px-3 py-2 text-[12px] font-semibold bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-400 focus:bg-white transition-colors"/>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-0 divide-x divide-slate-50">
            <div className="pr-6 space-y-0">
                <Row label="Full Name"      value={emp?.name} />
                <Row label="Work Email"     value={emp?.email} />
                <Row label="Personal Email" value={emp?.personal_email} />
                <Row label="Phone"          value={emp?.phone} />
            </div>
            <div className="px-6 space-y-0">
                <Row label="Date of Birth"  value={fmtDate(emp?.date_of_birth)} />
                <Row label="Gender"         value={emp?.gender} />
                <Row label="Blood Group"    value={emp?.blood_group} />
                <Row label="Marital Status" value={emp?.marital_status} />
            </div>
            <div className="pl-6 space-y-0">
                <Row label="Nationality"    value={emp?.nationality} />
                <Row label="Address"        value={emp?.address_line1} />
                <Row label="City / State"   value={[emp?.city, emp?.state].filter(Boolean).join(', ')} />
                <Row label="Pincode"        value={emp?.pincode} />
            </div>
        </div>
    );
};

export default PersonalTab;
