import React from 'react';
import { CheckCircle2, XCircle, Clock } from 'lucide-react';

interface AttendanceReportProps {
    data: {
        avgCompliance: string;
        todayPresent: number;
    };
    totalEmployees: number;
    log: any[];
}

export const AttendanceReport: React.FC<AttendanceReportProps> = ({ data, totalEmployees, log }) => {
    const absent = Math.max(0, totalEmployees - data.todayPresent);
    
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* ... stats ... */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* stats blocks remain same */}
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                            <CheckCircle2 size={20} />
                        </div>
                        <div>
                            <p className="text-[11px] font-bold text-slate-400 uppercase">Today Present</p>
                            <p className="text-2xl font-black text-slate-800">{data.todayPresent}</p>
                        </div>
                    </div>
                    <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500" style={{ width: `${(data.todayPresent / (totalEmployees || 1)) * 100}%` }} />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600">
                            <XCircle size={20} />
                        </div>
                        <div>
                            <p className="text-[11px] font-bold text-slate-400 uppercase">Today Absent</p>
                            <p className="text-2xl font-black text-slate-800">{absent}</p>
                        </div>
                    </div>
                    <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
                        <div className="h-full bg-rose-500" style={{ width: `${(absent / (totalEmployees || 1)) * 100}%` }} />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                            <Clock size={20} />
                        </div>
                        <div>
                            <p className="text-[11px] font-bold text-slate-400 uppercase">Avg. Compliance</p>
                            <p className="text-2xl font-black text-slate-800">{data.avgCompliance}%</p>
                        </div>
                    </div>
                    <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500" style={{ width: `${data.avgCompliance}%` }} />
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="text-[15px] font-bold text-slate-800">Operational Attendance Log</h3>
                    <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">Live Data</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase">Employee</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase">Status</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase">Check In</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase">Location</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {log?.map((entry, i) => (
                                <tr key={entry.id || i} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">
                                                {entry.id?.toString().slice(-4)}
                                            </div>
                                            <div>
                                                <p className="text-[13px] font-bold text-slate-800">{entry.name}</p>
                                                <p className="text-[11px] text-slate-400">{entry.department}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-1.5 h-1.5 rounded-full ${entry.check_in ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                                            <span className="text-[12px] font-bold text-slate-700">
                                                {entry.check_in ? 'Present' : 'Absent'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-[12px] font-medium text-slate-600">
                                        {entry.check_in ? new Date(entry.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                    </td>
                                    <td className="px-6 py-4 text-[12px] font-medium text-slate-600">
                                        {entry.location || 'Main Office'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
