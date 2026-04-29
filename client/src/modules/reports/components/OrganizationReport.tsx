import React from 'react';
import { Network, Users, MapPin, Briefcase } from 'lucide-react';

interface OrganizationReportProps {
    data: {
        departments: Array<{ name: string; val: number; color: string }>;
        headcount: number;
    };
    metrics: { units: number; locations: number };
}

export const OrganizationReport: React.FC<OrganizationReportProps> = ({ data, metrics }) => {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'Total Business Units', val: metrics.units.toString().padStart(2, '0'), icon: Network, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                    { label: 'Avg. Team Size', val: (data.headcount / (metrics.units || 1)).toFixed(1), icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { label: 'Global Locations', val: metrics.locations.toString().padStart(2, '0'), icon: MapPin, color: 'text-amber-600', bg: 'bg-amber-50' },
                    { label: 'Open Positions', val: '05', icon: Briefcase, color: 'text-sky-600', bg: 'bg-sky-50' }
                ].map((item, i) => (
                    <div key={i} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                        <div className={`w-10 h-10 ${item.bg} rounded-xl flex items-center justify-center ${item.color} mb-4`}>
                            <item.icon size={20} />
                        </div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase">{item.label}</p>
                        <p className="text-2xl font-black text-slate-800">{item.val}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                    <h3 className="text-[15px] font-bold text-slate-800 mb-6">Headcount Distribution by Department</h3>
                    <div className="space-y-6">
                        {data.departments.map(dept => (
                            <div key={dept.name}>
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-[13px] font-bold text-slate-700">{dept.name}</span>
                                    <span className="text-[13px] font-black text-indigo-600">{Math.round((dept.val * data.headcount) / 100)} Employees</span>
                                </div>
                                <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden">
                                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${dept.val}%` }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                        <h3 className="text-[14px] font-bold text-slate-800 mb-4">Span of Control</h3>
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full border-4 border-indigo-500 border-t-transparent flex items-center justify-center text-[14px] font-black text-slate-800">
                                4.2
                            </div>
                            <p className="text-[12px] text-slate-500 leading-tight">
                                Average direct reports per manager across the organization.
                            </p>
                        </div>
                    </div>

                    <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl">
                        <p className="text-[11px] font-bold text-indigo-400 uppercase mb-2">Hiring Velocity</p>
                        <h4 className="text-xl font-black mb-4">+18% MoM</h4>
                        <p className="text-[13px] opacity-70 leading-relaxed">
                            Recruitment pipelines are performing above target for technical roles.
                        </p>
                        <button className="w-full mt-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-[12px] font-bold transition-all">
                            View Vacancy Report
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
