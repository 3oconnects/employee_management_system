import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import api from '../../../services/api';

const leaveSchema = z.object({
    type: z.string().min(1, 'Please select a leave type'),
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().min(1, 'End date is required'),
    reason: z.string().min(10, 'Reason must be at least 10 characters'),
}).refine((data) => new Date(data.endDate) >= new Date(data.startDate), {
    message: "End date cannot be before start date",
    path: ["endDate"],
});

type LeaveFormValues = z.infer<typeof leaveSchema>;

const ApplyLeave: React.FC = () => {
    const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<LeaveFormValues>({
        resolver: zodResolver(leaveSchema),
    });

    const onSubmit = async (data: LeaveFormValues) => {
        try {
            await api.post('/leave/apply', data);
            alert('Leave application submitted successfully!');
            reset();
        } catch (err) {
            alert('Failed to submit leave application.');
        }
    };

    return (
        <div className="p-8 max-w-2xl mx-auto">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8">
                <h1 className="text-2xl font-bold text-gray-900 mb-6">Apply for Leave</h1>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Leave Type</label>
                        <select
                            {...register('type')}
                            className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none ${errors.type ? 'border-red-500' : 'border-gray-200'}`}
                        >
                            <option value="">Select Type</option>
                            <option value="SICK">Sick Leave</option>
                            <option value="CASUAL">Casual Leave</option>
                            <option value="EARNED">Earned Leave</option>
                            <option value="MATERNITY">Maternity Leave</option>
                        </select>
                        {errors.type && <p className="mt-1 text-xs text-red-500">{errors.type.message}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                            <input
                                type="date"
                                {...register('startDate')}
                                className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none ${errors.startDate ? 'border-red-500' : 'border-gray-200'}`}
                            />
                            {errors.startDate && <p className="mt-1 text-xs text-red-500">{errors.startDate.message}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                            <input
                                type="date"
                                {...register('endDate')}
                                className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none ${errors.endDate ? 'border-red-500' : 'border-gray-200'}`}
                            />
                            {errors.endDate && <p className="mt-1 text-xs text-red-500">{errors.endDate.message}</p>}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Reason</label>
                        <textarea
                            rows={4}
                            {...register('reason')}
                            className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none ${errors.reason ? 'border-red-500' : 'border-gray-200'}`}
                            placeholder="Provide a detailed reason for leave..."
                        ></textarea>
                        {errors.reason && <p className="mt-1 text-xs text-red-500">{errors.reason.message}</p>}
                    </div>

                    <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={() => reset()}
                            className="px-6 py-2.5 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                        >
                            Reset
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-lg shadow-blue-100 disabled:opacity-50"
                        >
                            {isSubmitting ? 'Submitting...' : 'Submit Application'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ApplyLeave;
