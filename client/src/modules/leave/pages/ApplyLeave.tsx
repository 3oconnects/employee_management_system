import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { CalendarDays, ClipboardList, Plus, X } from 'lucide-react';
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
    reason:        z.string().min(10, 'Reason must be at least 10 characters'),
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
    const [editingId,  setEditingId]  = useState<string | null>(null);

    const { register, handleSubmit, formState: { errors, isSubmitting }, reset, setValue } =
        useForm<LeaveFormData>({ resolver: zodResolver(leaveSchema) });

    const fetchLeaveTypes = async () => {
        const { data } = await api.get('/leave/types');
        setLeaveTypes(data.items || []);
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
        reset({ leave_type_id: '', startDate: '', endDate: '', reason: '' });
        setIsModalOpen(true);
    };

    const handleEdit = (req: any) => {
        setEditingId(req.id);
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
        try {
            if (editingId) {
                await api.put(`/leave/requests/${editingId}`, {
                    ...data,
                    start_date: data.startDate,
                    end_date: data.endDate,
                });
            } else {
                await api.post('/leave/apply', {
                    userId: user.id,
                    leave_type_id: data.leave_type_id,
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
            }, 1500);
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="p-6 space-y-8 page-enter max-w-[1600px] mx-auto">

            {/* ── Page Header ──────────────────────────────── */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
                        <CalendarDays size={20} className="text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-[#0F172A] tracking-tight">Leave Management</h2>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-0.5">
                            Apply and track your time off
                        </p>
                    </div>
                </div>

                <button
                    onClick={handleOpenModal}
                    className="flex items-center gap-2.5 px-6 py-3 bg-indigo-600 text-white rounded-xl text-[12px] font-black uppercase tracking-widest shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 transition-all active:scale-95"
                >
                    <Plus size={16} /> Request Absence
                </button>
            </div>

            {/* ── Quota Balances ───────────────────────────── */}
            <LeaveBalances balances={balances} />

            {/* ── Default View: Audit History ──────────────── */}
            <div className="space-y-4">
                <div className="flex items-center gap-2.5 px-1">
                    <ClipboardList size={16} className="text-indigo-600" />
                    <h3 className="text-[12px] font-black text-[#0F172A] uppercase tracking-[0.15em]">Leave History</h3>
                </div>
                <LeaveRequests requests={requests} onEdit={handleEdit} onCancel={handleCancel} />
            </div>

            {/* ── Request Modal (via Portal) ────────────────── */}
            {isModalOpen && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                    <div 
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300"
                        onClick={() => setIsModalOpen(false)}
                    />
                    
                    <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 ring-1 ring-slate-200/50">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <h3 className="text-[16px] font-black text-[#0F172A] tracking-tight">
                                    {editingId ? 'Edit Leave Request' : 'New Leave Request'}
                                </h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.1em] mt-0.5">
                                    {editingId ? 'Modify existing entry' : 'Submit a new application'}
                                </p>
                            </div>
                            <button 
                                onClick={() => setIsModalOpen(false)}
                                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-6 max-h-[85vh] overflow-y-auto no-scrollbar">
                            <form onSubmit={handleSubmit(onSubmit)}>
                                <LeaveForm 
                                    register={register}
                                    errors={errors}
                                    isSubmitting={isSubmitting}
                                    leaveTypes={leaveTypes}
                                    success={success}
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