import React, { useState } from 'react';
import { Plus, X, IndianRupee, Zap, Loader2 } from 'lucide-react';
import api from '../../../services/api';

interface CreateProfileModalProps {
    employee: {
        id: string;
        name: string;
    };
    onClose: () => void;
    onSuccess: () => void;
}

const CreateProfileModal: React.FC<CreateProfileModalProps> = ({ employee, onClose, onSuccess }) => {
    const [ctc, setCtc] = useState('');
    const [saving, setSaving] = useState(false);

    const handleCreate = async () => {
        if(!ctc) return;
        setSaving(true);
        try {
            await api.post('/payroll/profiles', {
                employee_id: employee.id,
                annualCTC: Number(ctc),
                taxRegime: 'New'
            });
            onSuccess();
            onClose();
        } catch (err) {
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-200">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-600/20">
                            <Plus size={16} className="text-white" />
                        </div>
                        <div>
                            <h3 className="text-[14px] font-black text-slate-900 tracking-tight">Initialize Node</h3>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{employee.name}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 rounded-lg transition-all text-slate-400"><X size={16}/></button>
                </div>
                <div className="p-6 space-y-6">
                    <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Annual Allocation</label>
                        <div className="relative">
                            <IndianRupee size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input 
                                type="number" 
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 pl-10 text-[13px] font-bold text-slate-900 outline-none focus:bg-white focus:border-indigo-400 transition-all"
                                placeholder="Enter value..."
                                value={ctc}
                                onChange={e => setCtc(e.target.value)}
                            />
                        </div>
                    </div>
                    <button onClick={handleCreate} disabled={saving} className="w-full px-6 py-3 bg-indigo-600 text-white rounded-xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 transition-all flex items-center justify-center gap-2">
                        {saving ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                        Authorize Lifecycle
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreateProfileModal;
