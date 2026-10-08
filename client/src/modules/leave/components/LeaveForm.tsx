import React from 'react';
import { UseFormRegister, FieldErrors, UseFormWatch } from 'react-hook-form';
import { CalendarDays, CheckCircle, Loader2, AlertCircle } from 'lucide-react';

interface LeaveType {
    id: string | number;
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
    balances?: any[];
    success: boolean;
    apiError?: string | null;
    watch: UseFormWatch<LeaveFormData>;
}

export const LeaveForm: React.FC<LeaveFormProps> = ({
    register,
    errors,
    isSubmitting,
    leaveTypes,
    balances = [],
    success,
    apiError,
    watch,
}) => {
    const selectedTypeId = watch('leave_type_id');
    const startDate = watch('startDate');
    const endDate = watch('endDate');

    const selectedBalance = balances.find(b => String(b.leave_type_id) === String(selectedTypeId));

    let durationDays: number | null = null;
    let exceedsBalance = false;

    if (startDate && endDate) {
        const s = new Date(startDate);
        const e = new Date(endDate);
        if (!isNaN(s.getTime()) && !isNaN(e.getTime()) && e >= s) {
            durationDays = Math.round((e.getTime() - s.getTime()) / 86400000) + 1;
            if (selectedBalance && selectedBalance.available !== undefined && durationDays > Number(selectedBalance.available)) {
                exceedsBalance = true;
            }
        }
    }

    const inputCls = "w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm font-medium text-slate-800 outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:text-slate-400";
    const labelCls = "text-xs font-semibold text-slate-700";

    return (
        <div className="space-y-4">
            {/* Success Notification */}
            {success && (
                <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="w-7 h-7 bg-emerald-600 rounded-full flex items-center justify-center shrink-0">
                        <CheckCircle size={15} className="text-white" />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-emerald-900 leading-none">Request Submitted Successfully</p>
                        <p className="text-[11px] text-emerald-700 mt-1">Your leave application has been routed for manager review.</p>
                    </div>
                </div>
            )}

            {/* API Error Notification */}
            {apiError && (
                <div className="flex items-start gap-2.5 bg-rose-50 border border-rose-200 rounded-lg p-3 text-rose-800 animate-in fade-in duration-200">
                    <AlertCircle size={16} className="text-rose-600 mt-0.5 shrink-0" />
                    <div className="text-xs leading-relaxed">
                        <p className="font-semibold text-rose-900">Unable to Submit Request</p>
                        <p className="mt-0.5 text-rose-700">{apiError}</p>
                    </div>
                </div>
            )}

            {/* Leave Quota & Pending Status Cards */}
            {selectedBalance ? (
                <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold text-slate-700">{selectedBalance.name} Balance</span>
                        <span className="text-[10px] font-semibold text-slate-500">Annual Quota: {selectedBalance.annual_quota} days</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-white p-2 rounded-lg border border-slate-200/80 shadow-xs">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Available</div>
                            <div className="text-sm font-extrabold text-emerald-600">{selectedBalance.available} {selectedBalance.available === 1 ? 'day' : 'days'}</div>
                        </div>
                        <div className="bg-white p-2 rounded-lg border border-slate-200/80 shadow-xs">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pending</div>
                            <div className="text-sm font-extrabold text-amber-600">{selectedBalance.pending || 0} {selectedBalance.pending === 1 ? 'day' : 'days'}</div>
                        </div>
                        <div className="bg-white p-2 rounded-lg border border-slate-200/80 shadow-xs">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Used</div>
                            <div className="text-sm font-extrabold text-slate-600">{selectedBalance.used || 0} {selectedBalance.used === 1 ? 'day' : 'days'}</div>
                        </div>
                    </div>
                </div>
            ) : balances.length > 0 && (
                <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3">
                    <div className="text-[11px] font-bold text-slate-700 mb-2">Your Leave Quotas & Pending</div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                        {balances.slice(0, 3).map((b: any) => (
                            <div key={b.leave_type_id} className="bg-white p-2 rounded-lg border border-slate-200/80 shadow-xs">
                                <div className="text-[11px] font-bold text-slate-800 truncate">{b.name}</div>
                                <div className="text-xs font-extrabold text-emerald-600 mt-0.5">{b.available} left</div>
                                <div className="text-[10px] text-amber-600 font-semibold">{b.pending || 0} pending</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Leave Type Selection */}
            <div className="space-y-1.5">
                <label className={labelCls}>Leave Type</label>
                <select {...register('leave_type_id')} className={`${inputCls} cursor-pointer`}>
                    <option value="">Select leave type…</option>
                    {leaveTypes.map(lt => {
                        const b = balances.find(x => String(x.leave_type_id) === String(lt.id));
                        return (
                            <option key={lt.id} value={lt.id}>
                                {lt.name} {b ? `(${b.available} available, ${b.pending || 0} pending)` : ''}
                            </option>
                        );
                    })}
                </select>
                {errors.leave_type_id && (
                    <p className="text-xs text-rose-600 font-medium mt-1">{errors.leave_type_id.message}</p>
                )}
            </div>

            {/* Date Pickers */}
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                    <label className={labelCls}>Start Date</label>
                    <input type="date" {...register('startDate')} className={inputCls} />
                    {errors.startDate && (
                        <p className="text-xs text-rose-600 font-medium mt-1">{errors.startDate.message}</p>
                    )}
                </div>
                <div className="space-y-1.5">
                    <label className={labelCls}>End Date</label>
                    <input type="date" {...register('endDate')} className={inputCls} />
                    {errors.endDate && (
                        <p className="text-xs text-rose-600 font-medium mt-1">{errors.endDate.message}</p>
                    )}
                </div>
            </div>

            {/* Duration & Quota Status Feedback */}
            {durationDays !== null && durationDays > 0 && (
                <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs py-2 px-3 rounded-lg bg-slate-50 border border-slate-200">
                        <span className="text-slate-600">Calculated Duration:</span>
                        <span className="font-semibold text-slate-900">
                            {durationDays} {durationDays === 1 ? 'day' : 'days'}
                        </span>
                    </div>

                    {exceedsBalance && (
                        <div className="flex items-start gap-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-3 text-xs animate-in fade-in duration-200">
                            <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                            <div className="leading-relaxed">
                                <span className="font-bold">Insufficient leave balance: </span>
                                <span>Requested duration ({durationDays} days) exceeds your available quota of {selectedBalance?.available} {selectedBalance?.available === 1 ? 'day' : 'days'} ({selectedBalance?.pending || 0} days currently pending approval).</span>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Reason Field */}
            <div className="space-y-1.5">
                <label className={labelCls}>Reason for Absence</label>
                <textarea
                    rows={3}
                    {...register('reason')}
                    placeholder="Provide a brief explanation for your leave request…"
                    className={`${inputCls} resize-none font-normal leading-relaxed`}
                />
                {errors.reason && (
                    <p className="text-xs text-rose-600 font-medium mt-1">{errors.reason.message}</p>
                )}
            </div>

            {/* Actions */}
            <div className="pt-2">
                <button
                    type="submit"
                    disabled={isSubmitting || exceedsBalance}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 size={16} className="animate-spin" />
                            <span>Submitting request…</span>
                        </>
                    ) : (
                        <>
                            <CalendarDays size={16} />
                            <span>Submit Leave Request</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};
