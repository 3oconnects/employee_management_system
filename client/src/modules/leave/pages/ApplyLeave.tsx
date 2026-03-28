import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { CalendarDays, ClipboardList, CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react';
import api from '../../../services/api';
import { useAuthStore } from '../../../store/authStore';

/* ─── Schema ─────────────────────────────────────────────── */
const leaveSchema = z.object({
    leave_type_id: z.string().min(1, 'Please select a leave type'),
    startDate:     z.string().min(1, 'Start date is required'),
    endDate:       z.string().min(1, 'End date is required'),
    reason:        z.string().min(10, 'Reason must be at least 10 characters'),
}).refine(d => new Date(d.endDate) >= new Date(d.startDate), {
    message: 'End date cannot be before start date',
    path: ['endDate'],
});
type LeaveForm = z.infer<typeof leaveSchema>;

/* ─── Types ─────────────────────────────────────────────── */
interface LeaveType    { id: string; name: string; }
interface LeaveRequest { id: string; leave_type_name: string; start_date: string; end_date: string; reason: string; status: string; }

/* ─── Status helpers ─────────────────────────────────────── */
const statusMeta: Record<string, { label: string; bg: string; text: string; icon: React.ElementType }> = {
    pending:  { label: 'Pending',  bg: 'bg-amber-50',   text: 'text-amber-600',  icon: Clock },
    approved: { label: 'Approved', bg: 'bg-emerald-50', text: 'text-emerald-600',icon: CheckCircle },
    rejected: { label: 'Rejected', bg: 'bg-rose-50',    text: 'text-rose-600',   icon: XCircle },
};
function getStatus(s: string) {
    return statusMeta[s] ?? { label: s, bg: 'bg-gray-50', text: 'text-gray-500', icon: AlertCircle };
}

/* ─── Form field wrapper ─────────────────────────────────── */
const Field: React.FC<{ label: string; error?: string; required?: boolean; children: React.ReactNode }> = ({ label, error, required, children }) => (
    <div className="space-y-1.5">
        <label className="block text-[12px] font-semibold text-gray-600">
            {label} {required && <span className="text-rose-400">*</span>}
        </label>
        {children}
        {error && <p className="text-[11px] text-rose-500 font-medium">{error}</p>}
    </div>
);

/* ─── Page ───────────────────────────────────────────────── */
const ApplyLeave: React.FC = () => {
    const { user } = useAuthStore();
    const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
    const [requests,   setRequests]   = useState<LeaveRequest[]>([]);
    const [activeTab,  setActiveTab]  = useState<'apply' | 'requests'>('apply');
    const [success,    setSuccess]    = useState(false);

    const { register, handleSubmit, formState: { errors, isSubmitting }, reset } =
        useForm<LeaveForm>({ resolver: zodResolver(leaveSchema) });

    const fetchLeaveTypes = async () => {
        const { data } = await api.get('/leave-types');
        setLeaveTypes(data.items || []);
    };
    const fetchRequests = async () => {
        if (!user?.id) return;
        const { data } = await api.get('/leave/requests', { params: { userId: user.id } });
        setRequests(data.items || []);
    };

    useEffect(() => {
        fetchLeaveTypes();
        if (user?.id) fetchRequests();
    }, [user?.id]);

    const onSubmit = async (data: LeaveForm) => {
        if (!user?.id) return;
        try {
            await api.post('/leave/apply', {
                userId: user.id,
                leave_type_id: data.leave_type_id,
                start_date: data.startDate,
                end_date: data.endDate,
                reason: data.reason,
            });
            setSuccess(true);
            reset();
            fetchRequests();
            setTimeout(() => setSuccess(false), 4000);
        } catch {
            alert('Failed to submit leave application.');
        }
    };

    const inputCls = "w-full text-[13px] text-gray-800 bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 outline-none placeholder-gray-300 focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all";

    return (
        <div className="p-6 space-y-5 page-enter">

            {/* ── Leave balance strip ───────────────────────── */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: 'Casual Leave',  used: 3,  total: 12, color: 'text-blue-600',   bar: 'bg-blue-500',    bg: 'bg-blue-50' },
                    { label: 'Sick Leave',    used: 1,  total: 10, color: 'text-rose-600',   bar: 'bg-rose-400',    bg: 'bg-rose-50' },
                    { label: 'Earned Leave',  used: 0,  total: 15, color: 'text-emerald-600',bar: 'bg-emerald-500', bg: 'bg-emerald-50' },
                ].map(l => (
                    <div key={l.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 card-hover">
                        <div className="flex items-end justify-between mb-1">
                            <p className="text-[11.5px] font-semibold text-gray-500">{l.label}</p>
                            <span className={`text-[10.5px] font-bold ${l.color}`}>{l.used}/{l.total} used</span>
                        </div>
                        <p className={`text-[30px] font-bold ${l.color} leading-none mb-2`}>{l.total - l.used}</p>
                        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full ${l.bar} rounded-full transition-all`} style={{ width: `${(l.used/l.total)*100}%` }}></div>
                        </div>
                        <p className="text-[10.5px] text-gray-400 mt-1.5">days remaining</p>
                    </div>
                ))}
            </div>

            {/* ── Tabs ─────────────────────────────────────── */}
            <div className="flex items-center gap-1 border-b border-gray-100">
                <button
                    onClick={() => setActiveTab('apply')}
                    className={`flex items-center gap-2 px-4 py-3 text-[13px] font-semibold border-b-2 transition-all ${activeTab === 'apply' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-700'}`}
                >
                    <CalendarDays size={14} /> Apply Leave
                </button>
                <button
                    onClick={() => setActiveTab('requests')}
                    className={`flex items-center gap-2 px-4 py-3 text-[13px] font-semibold border-b-2 transition-all ${activeTab === 'requests' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-700'}`}
                >
                    <ClipboardList size={14} /> My Requests
                    {requests.filter(r => r.status === 'pending').length > 0 && (
                        <span className="w-4 h-4 bg-amber-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center">
                            {requests.filter(r => r.status === 'pending').length}
                        </span>
                    )}
                </button>
            </div>

            {/* ── Apply Form ───────────────────────────────── */}
            {activeTab === 'apply' && (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
                        <div>
                            <h2 className="text-[14px] font-bold text-gray-900">Apply for Leave</h2>
                            <p className="text-[11.5px] text-gray-400 mt-0.5">Fill in the details below and submit for approval.</p>
                        </div>
                    </div>

                    {success && (
                        <div className="mx-6 mt-4 flex items-center gap-3 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
                            <CheckCircle size={16} className="text-emerald-500" />
                            <p className="text-[13px] font-semibold text-emerald-700">Leave application submitted successfully!</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
                        <Field label="Leave Type" error={errors.leave_type_id?.message} required>
                            <select {...register('leave_type_id')} className={inputCls}>
                                <option value="">Select leave type…</option>
                                {leaveTypes.map(lt => (
                                    <option key={lt.id} value={lt.id}>{lt.name}</option>
                                ))}
                            </select>
                        </Field>

                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Start Date" error={errors.startDate?.message} required>
                                <input type="date" {...register('startDate')} className={inputCls} />
                            </Field>
                            <Field label="End Date" error={errors.endDate?.message} required>
                                <input type="date" {...register('endDate')} className={inputCls} />
                            </Field>
                        </div>

                        <Field label="Reason" error={errors.reason?.message} required>
                            <textarea
                                rows={4}
                                {...register('reason')}
                                placeholder="Briefly describe the reason for your leave…"
                                className={`${inputCls} resize-none`}
                            />
                        </Field>

                        <div className="flex items-center gap-3 pt-1">
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white text-[13.5px] font-semibold rounded-xl hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm shadow-blue-200"
                            >
                                {isSubmitting && <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>}
                                {isSubmitting ? 'Submitting…' : 'Submit Application'}
                            </button>
                            <button
                                type="button"
                                onClick={() => reset()}
                                className="px-5 py-2.5 rounded-xl text-[13.5px] font-semibold text-gray-500 hover:bg-gray-100 transition-colors"
                            >
                                Reset
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* ── Requests Table ───────────────────────────── */}
            {activeTab === 'requests' && (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-50">
                        <h2 className="text-[14px] font-bold text-gray-900">My Leave Requests</h2>
                        <p className="text-[11.5px] text-gray-400 mt-0.5">All your submitted leave applications and their status.</p>
                    </div>

                    {requests.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-gray-300">
                            <CalendarDays size={40} className="mb-3 opacity-40" />
                            <p className="text-[13px] font-semibold text-gray-500">No requests yet</p>
                            <p className="text-[11.5px] text-gray-400 mt-1">Apply for leave to see your history here.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-[13px]">
                                <thead>
                                    <tr className="border-b border-gray-100 bg-gray-50">
                                        <th className="px-5 py-3 text-left text-[10.5px] font-semibold text-gray-400 uppercase tracking-wider">Leave Type</th>
                                        <th className="px-5 py-3 text-left text-[10.5px] font-semibold text-gray-400 uppercase tracking-wider">Start</th>
                                        <th className="px-5 py-3 text-left text-[10.5px] font-semibold text-gray-400 uppercase tracking-wider">End</th>
                                        <th className="px-5 py-3 text-left text-[10.5px] font-semibold text-gray-400 uppercase tracking-wider">Reason</th>
                                        <th className="px-5 py-3 text-left text-[10.5px] font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {requests.map(r => {
                                        const s = getStatus(r.status);
                                        const Icon = s.icon;
                                        return (
                                            <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                                                <td className="px-5 py-3.5 font-semibold text-gray-800">{r.leave_type_name}</td>
                                                <td className="px-5 py-3.5 text-gray-500">{new Date(r.start_date).toLocaleDateString('en-IN',{day:'2-digit',month:'short'})}</td>
                                                <td className="px-5 py-3.5 text-gray-500">{new Date(r.end_date).toLocaleDateString('en-IN',{day:'2-digit',month:'short'})}</td>
                                                <td className="px-5 py-3.5 text-gray-500 max-w-[200px] truncate">{r.reason}</td>
                                                <td className="px-5 py-3.5">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-semibold ${s.bg} ${s.text}`}>
                                                        <Icon size={10} />
                                                        {s.label}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ApplyLeave;