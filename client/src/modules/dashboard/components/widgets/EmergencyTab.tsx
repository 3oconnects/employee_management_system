import React from 'react';
import { Heart } from 'lucide-react';

interface EmergencyTabProps {
    contacts: any[];
}

const EmergencyTab: React.FC<EmergencyTabProps> = ({ contacts }) => {
    if (!contacts || contacts.length === 0) {
        return (
            <div className="text-center py-10 text-slate-400">
                <Heart size={28} className="mx-auto mb-2 opacity-30"/>
                <p className="text-[12px] font-bold">No emergency contacts added</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {contacts.map((c: any) => (
                <div key={c.id} className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center flex-shrink-0">
                        <Heart size={15} className="text-rose-500"/>
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-bold text-slate-800">{c.name}
                            <span className="ml-2 text-[10px] font-bold text-slate-400">({c.relationship})</span>
                        </p>
                        <p className="text-[12px] font-mono text-slate-500 mt-0.5">{c.phone}</p>
                    </div>
                    {c.is_primary && (
                        <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-600 flex-shrink-0">Primary</span>
                    )}
                </div>
            ))}
        </div>
    );
};

export default EmergencyTab;
