import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import api from '../../../services/api';

const leaveSchema = z.object({
    leave_type_id: z.string().min(1, 'Please select a leave type'),
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().min(1, 'End date is required'),
    reason: z.string().min(10, 'Reason must be at least 10 characters'),
}).refine((data) => new Date(data.endDate) >= new Date(data.startDate), {
    message: "End date cannot be before start date",
    path: ["endDate"],
});

type LeaveFormValues = z.infer<typeof leaveSchema>;

const DEMO_USER = "44444444-4444-4444-4444-444444444444";

interface LeaveType {
    id: string;
    name: string;
}

interface LeaveRequest {
    id: string;
    leave_type_name: string;
    start_date: string;
    end_date: string;
    reason: string;
    status: string;
}

const ApplyLeave: React.FC = () => {

    const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
    const [requests, setRequests] = useState<LeaveRequest[]>([]);
    const [activeTab, setActiveTab] = useState<'apply' | 'requests'>('apply');

    const { register, handleSubmit, formState: { errors, isSubmitting }, reset } =
        useForm<LeaveFormValues>({
            resolver: zodResolver(leaveSchema),
        });

    const fetchLeaveTypes = async () => {

        const { data } = await api.get('/leave-types');
        setLeaveTypes(data.items || []);

    };

    const fetchRequests = async () => {

        const { data } = await api.get('/leave/requests', {
            params: { userId: DEMO_USER }
        });

        setRequests(data.items || []);

    };

    useEffect(() => {

        fetchLeaveTypes();
        fetchRequests();

    }, []);

    const onSubmit = async (data: LeaveFormValues) => {

        try {

            await api.post('/leave/apply', {

                userId: DEMO_USER,
                leave_type_id: data.leave_type_id,
                start_date: data.startDate,
                end_date: data.endDate,
                reason: data.reason

            });

            alert('Leave application submitted successfully!');
            reset();
            fetchRequests();

        } catch {

            alert('Failed to submit leave application.');

        }

    };

    const statusColor = (status:string) => {

        const map:any = {
            pending: "bg-amber-100 text-amber-700",
            approved: "bg-emerald-100 text-emerald-700",
            rejected: "bg-rose-100 text-rose-700"
        };

        return map[status] || "bg-slate-100 text-slate-700";

    };

    return (

        <div className="p-8 max-w-4xl mx-auto space-y-6">

            {/* TABS */}

            <div className="flex space-x-2">

                <button
                    onClick={() => setActiveTab('apply')}
                    className={`px-5 py-2 rounded-lg text-sm font-medium transition ${
                        activeTab === 'apply'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-600'
                    }`}
                >
                    Apply Leave
                </button>

                <button
                    onClick={() => setActiveTab('requests')}
                    className={`px-5 py-2 rounded-lg text-sm font-medium transition ${
                        activeTab === 'requests'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-600'
                    }`}
                >
                    My Leave Requests
                </button>

            </div>


            {/* APPLY LEAVE FORM */}

            {activeTab === 'apply' && (

                <div className="bg-white text-slate-700 rounded-xl border border-gray-100 shadow-sm p-8">

                    <h1 className="text-2xl font-bold mb-6">
                        Apply for Leave
                    </h1>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

                        <div>

                            <label className="block text-sm font-medium mb-2">
                                Leave Type
                            </label>

                            <select
                                {...register('leave_type_id')}
                                className="w-full text-slate-100 p-3 border rounded-lg"
                            >

                                <option value="">Select Type</option>

                                {leaveTypes.map((lt) => (

                                    <option key={lt.id} value={lt.id}>
                                        {lt.name}
                                    </option>

                                ))}

                            </select>

                        </div>

                        <div className="grid text-slate-100 grid-cols-2 gap-4">

                            <input
                                type="date"
                                {...register('startDate')}
                                className="w-full p-3 border rounded-lg"
                            />

                            <input
                                type="date"
                                {...register('endDate')}
                                className="w-full text-slate-100 p-3 border rounded-lg"
                            />

                        </div>

                        <textarea
                            rows={4}
                            {...register('reason')}
                            placeholder="Reason..."
                            className="w-full text-slate-100 p-3 border rounded-lg"
                        />

                        <div className="flex justify-end">

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg"
                            >
                                {isSubmitting ? 'Submitting...' : 'Submit'}
                            </button>

                        </div>

                    </form>

                </div>

            )}


            {/* MY LEAVE REQUESTS */}

            {activeTab === 'requests' && (

                <div className="bg-white text-slate-700 rounded-xl border border-gray-100 shadow-sm overflow-hidden">

                    <div className="p-6 border-b border-gray-100">
                        <h2 className="text-lg font-bold">
                            My Leave Requests
                        </h2>
                    </div>

                    <table className="w-full text-sm">

                        <thead className="bg-gray-50 text-gray-500 text-xs uppercase">

                            <tr>
                                <th className="p-4 text-left">Type</th>
                                <th className="p-4">Start</th>
                                <th className="p-4">End</th>
                                <th className="p-4">Reason</th>
                                <th className="p-4">Status</th>
                            </tr>

                        </thead>

                        <tbody>

                            {requests.map((r) => (

                                <tr key={r.id} className="border-t hover:bg-gray-50">

                                    <td className="p-4">{r.leave_type_name}</td>

                                    <td className="p-4">
                                        {new Date(r.start_date).toLocaleDateString()}
                                    </td>

                                    <td className="p-4">
                                        {new Date(r.end_date).toLocaleDateString()}
                                    </td>

                                    <td className="p-4">{r.reason}</td>

                                    <td className="p-4">

                                        <span className={`px-2 py-1 rounded text-xs font-bold ${statusColor(r.status)}`}>
                                            {r.status}
                                        </span>

                                    </td>

                                </tr>

                            ))}

                        </tbody>

                    </table>

                </div>

            )}

        </div>

    );

};

export default ApplyLeave;