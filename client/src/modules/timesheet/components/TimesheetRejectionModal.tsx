import React from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, X, Loader2 } from 'lucide-react';
import { PendingItem } from '../types';

interface TimesheetRejectionModalProps {
  item: PendingItem | null;
  remarks: string;
  setRemarks: React.Dispatch<React.SetStateAction<string>>;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export const TimesheetRejectionModal: React.FC<TimesheetRejectionModalProps> = ({
  item,
  remarks,
  setRemarks,
  loading,
  onClose,
  onConfirm
}) => {
  if (!item) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200/80 max-w-md w-full p-6 relative overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-200/80 text-rose-600 flex items-center justify-center flex-shrink-0">
              <AlertCircle size={16} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">Request Timesheet Revision</h4>
              <p className="text-xs text-slate-500 font-medium">
                {item.applicant_name || item.applicant_email}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="bg-amber-50/70 border border-amber-200/80 rounded-lg p-3 mb-4 text-xs text-amber-800 leading-relaxed">
          <span className="font-semibold">Notice:</span> Rejecting this submission will return it to draft status, allowing the employee to correct hours or task details.
        </div>

        <div className="mb-4">
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Quick Feedback Remarks
          </label>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {[
              'Task descriptions need more detail',
              'Hours mismatch with attendance telemetry',
              'Please verify Friday overtime hours',
              'Incorrect project assignment selected'
            ].map(phrase => (
              <button
                key={phrase}
                type="button"
                onClick={() => setRemarks(prev => prev ? `${prev}. ${phrase}` : phrase)}
                className="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200/90 text-slate-600 rounded-md text-[11px] font-medium transition-all text-left"
              >
                + {phrase}
              </button>
            ))}
          </div>

          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Reason for Revision <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <textarea
            rows={3}
            value={remarks}
            onChange={e => setRemarks(e.target.value)}
            placeholder="Specify corrections or guidance for the employee..."
            className="w-full bg-slate-50/50 border border-slate-200 rounded-lg p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-rose-400 focus:ring-2 focus:ring-rose-400/10 outline-none resize-none transition-all"
          />
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-3.5 py-2 border border-slate-200/90 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition-all shadow-xs"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold transition-all shadow-xs flex items-center gap-2 disabled:opacity-50"
          >
            {loading && <Loader2 size={13} className="animate-spin" />}
            Confirm Rejection
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
