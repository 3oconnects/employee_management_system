import React from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, X, ShieldAlert, Loader2 } from 'lucide-react';

interface DecommissionModalProps {
    confirmData: { type: 'dept' | 'team', id: number, name: string } | null;
    submitting: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

const DecommissionModal: React.FC<DecommissionModalProps> = ({
    confirmData,
    submitting,
    onClose,
    onConfirm
}) => {
    if (!confirmData) return null;

    return createPortal(
        <div className="fixed inset-0 z-[11000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose} />
            <div className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-rose-100">
                
                {/* Threat Indicator */}
                <div className="h-1.5 w-full bg-rose-500" />
                
                <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center">
                            <AlertTriangle size={24} strokeWidth={2.5} />
                        </div>
                        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all">
                            <X size={18} />
                        </button>
                    </div>

                    <div className="space-y-3">
                        <h3 className="text-[18px] font-bold text-slate-900 tracking-tight">
                            Confirm Unit Decommission
                        </h3>
                        <p className="text-[14px] text-slate-500 leading-relaxed font-medium">
                            You are about to dissolve <span className="text-slate-900 font-bold">"{confirmData.name}"</span>. 
                            This operation will permanently remove the unit from the organizational graph.
                        </p>
                    </div>

                    <div className="mt-6 p-4 bg-rose-50 rounded-xl border border-rose-100 flex gap-3">
                        <ShieldAlert size={18} className="text-rose-600 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <p className="text-[12px] font-bold text-rose-900 uppercase tracking-wider">Critical Warning</p>
                            <p className="text-[11px] text-rose-700/80 font-medium leading-relaxed">
                                All subordinate teams and inherited governance rules associated with this node will be orphaned or terminated.
                            </p>
                        </div>
                    </div>

                    <div className="mt-8 grid grid-cols-2 gap-3">
                        <button 
                            onClick={onClose}
                            className="py-3 px-4 bg-slate-50 text-slate-600 rounded-xl text-[13px] font-bold uppercase tracking-widest hover:bg-slate-100 transition-all border border-slate-100"
                        >
                            Cancel
                        </button>
                        <button 
                            disabled={submitting}
                            onClick={onConfirm}
                            className="py-3 px-4 bg-rose-600 text-white rounded-xl text-[13px] font-bold uppercase tracking-widest hover:bg-rose-700 transition-all shadow-lg shadow-rose-600/20 active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                            {submitting ? <Loader2 size={16} className="animate-spin" /> : 'Decommission'}
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default DecommissionModal;
