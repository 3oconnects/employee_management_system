import React from 'react';
import { createPortal } from 'react-dom';
import { Trash2, X, AlertTriangle, Loader2 } from 'lucide-react';

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

    const unitLabel = confirmData.type === 'dept' ? 'Division' : 'Squad';

    return createPortal(
        <div className="fixed inset-0 z-[11000] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity animate-in fade-in duration-300" 
                onClick={onClose} 
            />

            {/* Modal Dialog */}
            <div className="relative bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200/80 overflow-hidden animate-in zoom-in-95 duration-200 z-10">
                
                <div className="p-6">
                    {/* Header with Icon and Close Button */}
                    <div className="flex items-start justify-between mb-4">
                        <div className="w-10 h-10 rounded-xl bg-rose-50 text-[#EF3434] border border-rose-100 flex items-center justify-center shadow-xs">
                            <Trash2 size={19} strokeWidth={2.2} />
                        </div>
                        <button 
                            type="button"
                            onClick={onClose} 
                            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            <X size={18} strokeWidth={2} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="space-y-2">
                        <h3 className="text-base font-bold text-[#17213D] tracking-tight">
                            Delete {unitLabel}
                        </h3>
                        <p className="text-sm text-slate-600 leading-relaxed font-normal">
                            Are you sure you want to delete <span className="font-semibold text-slate-900">"{confirmData.name}"</span>? 
                            This action will remove this {unitLabel.toLowerCase()} from the organizational hierarchy.
                        </p>
                    </div>

                    {/* Notice Callout */}
                    <div className="mt-4 p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl flex items-start gap-2.5">
                        <AlertTriangle size={15} className="text-[#FFAA0A] shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-900/90 leading-relaxed font-medium">
                            Assigned personnel and reporting chains linked to this unit will be unlinked and need to be reassigned.
                        </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-6 flex items-center justify-end gap-2.5 pt-2">
                        <button 
                            type="button"
                            onClick={onClose}
                            disabled={submitting}
                            className="px-4 py-2.5 bg-white text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-colors shadow-xs disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button 
                            type="button"
                            disabled={submitting}
                            onClick={onConfirm}
                            className="px-4 py-2.5 bg-[#EF3434] hover:bg-red-700 text-white rounded-xl text-xs font-semibold transition-all shadow-xs disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98]"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 size={14} className="animate-spin" />
                                    <span>Deleting...</span>
                                </>
                            ) : (
                                <span>Delete {unitLabel}</span>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default DecommissionModal;
