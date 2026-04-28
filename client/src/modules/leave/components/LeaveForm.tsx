import React from 'react';
import { UseFormRegister, FieldErrors } from 'react-hook-form';
import { CalendarDays, CheckCircle, Loader2 } from 'lucide-react';

interface LeaveType {
    id: string;
    name: string;
}

interface LeaveFormData {
    leave_type_id: string;
    startDate: string;
    endDate: string;
    reason: string;
}

interface LeaveFormProps {
    register: UseFormRegister<LeaveFormData>;
    errors: FieldErrors<LeaveFormData>;
    isSubmitting: boolean;
    leaveTypes: LeaveType[];
    success: boolean;
}

export const LeaveForm: React.FC<LeaveFormProps> = ({ register, errors, isSubmitting, leaveTypes, success }) => {
    const inputCls = "w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2 text-[13px] font-semibold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/5 transition-all placeholder:text-slate-400";
    const labelCls = "text-[9px] font-black text-slate-400 uppercase tracking-[0.1em]";

    return (
        <div className="space-y-4">
            {success && (
                <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-100/50 rounded-lg px-4 py-3 animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="w-7 h-7 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/20 flex-shrink-0">
                        <CheckCircle size={14} className="text-white" />
                    </div>
                    <div>
                        <p className="text-[11px] font-black text-emerald-900 uppercase tracking-tight leading-none">Transmission Complete</p>
                        <p className="text-[9px] text-emerald-600 font-bold uppercase tracking-widest mt-1">Audit entry filed successfully</p>
                    </div>
                </div>
            )}

            <div className="space-y-1.5">
                <label className={labelCls}>Leave Classification</label>
                <select {...register('leave_type_id')} className={`${inputCls} cursor-pointer`}>
                    <option value="">Select Protocol Classification…</option>
                    {leaveTypes.map(lt => (
                        <option key={lt.id} value={lt.id}>{lt.name}</option>
                    ))}
                </select>
                {errors.leave_type_id && <p className="text-[9px] text-rose-500 font-bold uppercase mt-1 tracking-wide">{errors.leave_type_id.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                    <label className={labelCls}>Commencement</label>
                    <input type="date" {...register('startDate')} className={inputCls} />
                    {errors.startDate && <p className="text-[9px] text-rose-500 font-bold uppercase mt-1 tracking-wide">{errors.startDate.message}</p>}
                </div>
                <div className="space-y-1.5">
                    <label className={labelCls}>Conclusion</label>
                    <input type="date" {...register('endDate')} className={inputCls} />
                    {errors.endDate && <p className="text-[9px] text-rose-500 font-bold uppercase mt-1 tracking-wide">{errors.endDate.message}</p>}
                </div>
            </div>

            <div className="space-y-1.5">
                <label className={labelCls}>Justification / Reason</label>
                <textarea
                    rows={2}
                    {...register('reason')}
                    placeholder="Detail the necessity for absence…"
                    className={`${inputCls} resize-none font-medium leading-relaxed`}
                />
                {errors.reason && <p className="text-[9px] text-rose-500 font-bold uppercase mt-1 tracking-wide">{errors.reason.message}</p>}
            </div>

            <div className="pt-1">
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-600 text-white text-[12px] font-black uppercase tracking-widest rounded-lg hover:bg-indigo-500 transition-all active:scale-[0.98] disabled:opacity-60 shadow-lg shadow-indigo-600/20"
                >
                    {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <CalendarDays size={16} />}
                    {isSubmitting ? 'Transmitting...' : 'Confirm Submission'}
                </button>
            </div>
        </div>
    );
};
