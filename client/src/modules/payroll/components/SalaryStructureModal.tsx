import React, { useState } from 'react';
import { Cpu, X, IndianRupee, Activity, Loader2, Shield } from 'lucide-react';
import api from '../../../services/api';

interface SalaryStructureModalProps {
    employee: {
        id: string;
        name: string;
        annualCTC: number;
        taxRegime: 'Old' | 'New';
    };
    onClose: () => void;
    onSuccess: () => void;
}

const SalaryStructureModal: React.FC<SalaryStructureModalProps> = ({ employee, onClose, onSuccess }) => {
    const [ctc, setCtc] = useState<any>(employee.annualCTC);
    const [regime, setRegime] = useState(employee.taxRegime);
    const [saving, setSaving] = useState(false);

    const handleUpdate = async () => {
        setSaving(true);
        try {
            await api.put(`/payroll/employees/${employee.id}`, {
                annualCTC: ctc,
                taxRegime: regime
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
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-200">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-600/20">
                            <Cpu size={16} className="text-white" />
                        </div>
                        <div>
                            <h3 className="text-[14px] font-black text-slate-900 tracking-tight">Configure Node</h3>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{employee.name} — {employee.id}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 rounded-lg transition-all text-slate-400"><X size={16}/></button>
                </div>
                
                <div className="p-6 space-y-6">
                    <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Annual CTC (INR)</label>
                        <div className="relative">
                            <IndianRupee size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input 
                                type="number" 
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 pl-10 text-[13px] font-bold text-slate-900 focus:bg-white focus:border-indigo-400 outline-none transition-all"
                                value={ctc}
                                onChange={e => setCtc(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Tax Regime</label>
                        <div className="grid grid-cols-2 gap-3">
                            {['Old', 'New'].map(r => (
                                <button
                                    key={r}
                                    onClick={() => setRegime(r as any)}
                                    className={`px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest border transition-all ${regime === r ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-600/20' : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-white hover:border-indigo-200 hover:text-indigo-600'}`}
                                >
                                    {r} Regime
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl px-4 py-3 flex gap-3">
                        <Activity size={16} className="text-indigo-500 shrink-0 mt-0.5" />
                        <p className="text-[10px] text-indigo-700 font-bold leading-relaxed uppercase tracking-tight">Cascading recalibration will trigger for the next cycle.</p>
                    </div>
                </div>

                <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex gap-3">
                    <button onClick={onClose} className="flex-1 px-4 py-2.5 bg-white border border-slate-200 text-slate-500 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all hover:bg-slate-100">Abort</button>
                    <button onClick={handleUpdate} disabled={saving} className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 transition-all flex items-center justify-center gap-2">
                        {saving ? <Loader2 size={14} className="animate-spin" /> : <Shield size={14} />}
                        Sync Matrix
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SalaryStructureModal;
