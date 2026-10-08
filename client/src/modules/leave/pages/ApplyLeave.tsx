import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { CalendarDays, Plus, X } from 'lucide-react';
import api from '../../../services/api';
import { useAuthStore } from '../../../store/authStore';
import { LeaveBalances } from '../components/LeaveBalances';
import { LeaveForm } from '../components/LeaveForm';
import { LeaveRequests } from '../components/LeaveRequests';

/* ─── Schema ─────────────────────────────────────────────── */
const leaveSchema = z.object({
    leave_type_id: z.string().min(1, 'Please select a leave type'),
    startDate:     z.string().min(1, 'Start date is required'),
    endDate:       z.string().min(1, 'End date is required'),
    reason:        z.string().min(5, 'Reason must be at least 5 characters'),
}).refine(d => new Date(d.endDate) >= new Date(d.startDate), {
    message: 'End date cannot be before start date',
    path: ['endDate'],
});
type LeaveFormData = z.infer<typeof leaveSchema>;

/* ─── Page ───────────────────────────────────────────────── */
const ApplyLeave: React.FC = () => {
    const { user } = useAuthStore();
    const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
    const [requests,   setRequests]   = useState<any[]>([]);
    const [balances,   setBalances]   = useState<any[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [success,    setSuccess]    = useState(false);
    const [apiError,   setApiError]   = useState<string | null>(null);
    const [editingId,  setEditingId]  = useState<string | null>(null);

    const { register, handleSubmit, formState: { errors, isSubmitting }, reset, watch } =
        useForm<LeaveFormData>({ resolver: zodResolver(leaveSchema) });

    const fetchLeaveTypes = async () => {
        try {
            const { data } = await api.get('/leave/types');
            setLeaveTypes(data.items || []);
        } catch (err) {
            console.error("ApplyLeave: Error fetching leave types:", err);
        }
    };

    const fetchRequests = async () => {
        if (!user?.id) return;
        try {
            const { data } = await api.get('/leave/requests', { params: { userId: user.id } });
            setRequests(data.items || []);
        } catch (err) {
            console.error("ApplyLeave: Error fetching requests:", err);
        }
    };

    const fetchBalances = async () => {
        if (!user?.id) return;
        try {
            const { data } = await api.get('/leave/balance', { params: { userId: user.id } });
            setBalances(data.balances || []);
        } catch { /* ignore */ }
    };

    useEffect(() => {
        fetchLeaveTypes();
        fetchBalances();
        if (user?.id) fetchRequests();
    }, [user?.id]);

    const handleOpenModal = () => {
        setEditingId(null);
        setApiError(null);
        setSuccess(false);
        reset({ leave_type_id: '', startDate: '', endDate: '', reason: '' });
        setIsModalOpen(true);
    };

    const handleEdit = (req: any) => {
        setEditingId(req.id);
        setApiError(null);
        setSuccess(false);
        reset({
            leave_type_id: req.leave_type_id?.toString() || '',
            startDate: req.start_date ? new Date(req.start_date).toISOString().split('T')[0] : '',
            endDate: req.end_date ? new Date(req.end_date).toISOString().split('T')[0] : '',
            reason: req.reason || '',
        });
        setIsModalOpen(true);
    };

    const handleCancel = async (id: string) => {
        if (!window.confirm('Are you sure you want to cancel this leave request?')) return;
        try {
            await api.delete(`/leave/requests/${id}`);
            fetchRequests();
            fetchBalances();
        } catch (err) {
            console.error(err);
        }
    };

    const onSubmit = async (data: LeaveFormData) => {
        if (!user?.id) return;
        setApiError(null);

        const selectedBal = balances.find(b => String(b.leave_type_id) === String(data.leave_type_id));
        if (selectedBal && selectedBal.available !== undefined) {
            const s = new Date(data.startDate);
            const e = new Date(data.endDate);
            if (!isNaN(s.getTime()) && !isNaN(e.getTime()) && e >= s) {
                const diffDays = Math.round((e.getTime() - s.getTime()) / 86400000) + 1;
                if (diffDays > Number(selectedBal.available)) {
                    setApiError(`Insufficient leave balance: You requested ${diffDays} days, but only ${selectedBal.available} ${selectedBal.available === 1 ? 'day is' : 'days are'} available (${selectedBal.pending || 0} days currently pending approval).`);
                    return;
                }
            }
        }

        try {
            if (editingId) {
                await api.put(`/leave/requests/${editingId}`, {
                    leave_type_id: Number(data.leave_type_id),
                    start_date: data.startDate,
                    end_date: data.endDate,
                    reason: data.reason,
                });
            } else {
                await api.post('/leave/apply', {
                    userId: user.id,
                    leave_type_id: Number(data.leave_type_id),
                    start_date: data.startDate,
                    end_date: data.endDate,
                    reason: data.reason,
                });
            }
            setSuccess(true);
            fetchRequests();
            fetchBalances();
            setTimeout(() => {
                setSuccess(false);
                setIsModalOpen(false);
                setEditingId(null);
                setApiError(null);
            }, 1200);
        } catch (err: any) {
            console.error('ApplyLeave submission error:', err);
            let message = err.message || err.response?.data?.message || 'Failed to submit leave request.';
            if (err.errors && typeof err.errors === 'object') {
                const firstKey = Object.keys(err.errors)[0];
                if (firstKey && Array.isArray(err.errors[firstKey]) && err.errors[firstKey][0]) {
                    message = err.errors[firstKey][0];
                }
            }
            setApiError(message);
        }
    };

    return (
        <div className="p-6 space-y-5 page-enter max-w-[1600px] mx-auto">

            {/* ── Page Header ──────────────────────────────── */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center">
                        <CalendarDays size={20} />
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold text-slate-900">Leave Management</h2>
                        <p className="text-sm text-slate-500">Apply for time off and manage your leave requests</p>
                    </div>
                </div>

                <button
                    onClick={handleOpenModal}
                    className="inline-flex items-center gap-2 px-4 h-10 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 transition-colors"
                >
                    <Plus size={16} /> Request Absence
                </button>
            </div>

            {/* ── Quota Balances ───────────────────────────── */}
            <LeaveBalances balances={balances} />

            {/* ── Leave Transaction History & Cards ──────────── */}
            <LeaveRequests 
                requests={requests} 
                onEdit={handleEdit} 
                onCancel={handleCancel} 
                onRequestNew={handleOpenModal}
            />

            {/* ── Request Modal (via Portal) ────────────────── */}
            {isModalOpen && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                    <div 
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200"
                        onClick={() => setIsModalOpen(false)}
                    />
                    
                    <div className="relative w-full max-w-lg bg-white rounded-xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-semibold text-slate-900">
                                    {editingId ? 'Edit Leave Request' : 'New Leave Request'}
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    {editingId ? 'Modify an existing leave submission' : 'Submit a leave request for manager approval'}
                                </p>
                            </div>
                            <button 
                                onClick={() => setIsModalOpen(false)}
                                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-6 max-h-[85vh] overflow-y-auto">
                            <form onSubmit={handleSubmit(onSubmit)}>
                                <LeaveForm 
                                    register={register}
                                    errors={errors}
                                    isSubmitting={isSubmitting}
                                    leaveTypes={leaveTypes}
                                    balances={balances}
                                    success={success}
                                    apiError={apiError}
                                    watch={watch}
                                />
                            </form>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default ApplyLeave;