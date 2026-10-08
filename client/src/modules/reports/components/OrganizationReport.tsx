import React, { useState } from 'react';
import {
    Network,
    Users,
    MapPin,
    Briefcase,
    Building2,
    ArrowUpRight,
    Search,
    Shield,
    Globe,
    CheckCircle2,
    Layers,
    UserCheck
} from 'lucide-react';

interface DepartmentItem {
    name: string;
    val: number;
    color?: string;
    count?: number;
}

interface OrganizationReportProps {
    data: {
        departments: DepartmentItem[];
        headcount: number;
        employmentType?: Array<{ type: string; count: number }>;
        genderDistribution?: { male: number; female: number; other: number };
        enrolledHeadcount?: number;
    };
    metrics: { units: number; locations: number };
}

export const OrganizationReport: React.FC<OrganizationReportProps> = ({ data, metrics }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const departments = data.departments || [];
    const activeUnits = Math.max(metrics?.units || 0, departments.length);
    const totalStaff = data.headcount || 0;
    const avgTeamSize = activeUnits > 0 ? (totalStaff / activeUnits).toFixed(1) : '0';
    const activeLocations = Math.max(metrics?.locations || 0, 1);

    // Calculate department staff allocations
    const processedDepts = departments.map(d => {
        const calculatedCount = d.count ?? Math.max(0, Math.round((d.val * totalStaff) / 100));
        return {
            ...d,
            empCount: calculatedCount,
            percentage: d.val || (totalStaff > 0 ? Math.round((calculatedCount / totalStaff) * 100) : 0),
        };
    });

    const filteredDepts = processedDepts.filter(d =>
        d.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Format employment types
    const employmentTypes = data.employmentType && data.employmentType.length > 0
        ? data.employmentType
        : [
            { type: 'full_time', count: totalStaff },
        ];

    const getFormatType = (type: string) => {
        switch (type.toLowerCase()) {
            case 'full_time': return 'Full-Time Regular';
            case 'part_time': return 'Part-Time';
            case 'contract': return 'Contractor / Vendor';
            case 'intern': return 'Internship';
            default: return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-200">
            {/* ── Top KPI Stat Cards ─────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-500">Business Units</span>
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                            <Building2 size={16} />
                        </div>
                    </div>
                    <div className="mt-3">
                        <p className="text-2xl font-bold text-slate-900 tracking-tight">
                            {activeUnits}
                        </p>
                        <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                            <span className="font-semibold text-slate-700">{departments.length}</span>
                            <span>active operational departments</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-500">Total Staff Headcount</span>
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                            <Users size={16} />
                        </div>
                    </div>
                    <div className="mt-3">
                        <p className="text-2xl font-bold text-slate-900 tracking-tight">
                            {totalStaff}
                        </p>
                        <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
                            <UserCheck size={13} />
                            <span>100% active employee rosters</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-500">Operating Locations</span>
                        <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                            <MapPin size={16} />
                        </div>
                    </div>
                    <div className="mt-3">
                        <p className="text-2xl font-bold text-slate-900 tracking-tight">
                            {activeLocations}
                        </p>
                        <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                            <span>HQ office & distributed sites</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-500">Avg. Team Density</span>
                        <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center text-violet-600">
                            <Network size={16} />
                        </div>
                    </div>
                    <div className="mt-3">
                        <p className="text-2xl font-bold text-slate-900 tracking-tight">
                            {avgTeamSize}
                        </p>
                        <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                            <span>Employees per department</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Main 2-Column Content ─────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* Left Section: Department Headcount & Structure */}
                <div className="lg:col-span-8 space-y-5">
                    <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
                        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                                <h3 className="text-sm font-bold text-slate-900">Department Roster & Headcount Allocation</h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Distribution of personnel, operational units, and organizational weight
                                </p>
                            </div>
                            <div className="relative">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Filter departments..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-slate-400 focus:bg-white w-48 transition-all"
                                />
                            </div>
                        </div>

                        {filteredDepts.length === 0 ? (
                            <div className="p-10 text-center">
                                <Building2 size={32} className="mx-auto text-slate-300 mb-2" />
                                <p className="text-sm font-semibold text-slate-700">No departments match filter</p>
                                <p className="text-xs text-slate-400 mt-1">
                                    Add business units under Organization settings or adjust your search filter.
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead>
                                        <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-500 font-semibold">
                                            <th className="px-5 py-3">Department</th>
                                            <th className="px-4 py-3 text-center">Assigned Headcount</th>
                                            <th className="px-5 py-3">Workforce Share</th>
                                            <th className="px-4 py-3 text-center">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {filteredDepts.map((dept, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-5 py-3.5">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-700 font-bold text-xs">
                                                            {dept.name.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-slate-900">{dept.name}</p>
                                                            <p className="text-[11px] text-slate-400">Core Functional Unit</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3.5 text-center">
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-md font-semibold bg-slate-100 text-slate-700 text-xs">
                                                        {dept.empCount} {dept.empCount === 1 ? 'member' : 'members'}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    <div className="space-y-1">
                                                        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
                                                            <span>Capacity Share</span>
                                                            <span>{dept.percentage}%</span>
                                                        </div>
                                                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                                            <div
                                                                className="bg-blue-600 h-full rounded-full transition-all duration-500"
                                                                style={{ width: `${Math.min(100, Math.max(6, dept.percentage))}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3.5 text-center">
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                                                        <CheckCircle2 size={11} />
                                                        Active
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Span of Control & Structural Capacity */}
                    <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-sm font-bold text-slate-900">Organizational Structure & Hierarchy Health</h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Managerial span, reporting structure, and delegation balance
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/60">
                                <span className="text-[11px] font-semibold uppercase text-slate-400">Span Ratio</span>
                                <p className="text-xl font-bold text-slate-900 mt-1">1 : {Math.max(3, Math.round(totalStaff / Math.max(1, activeUnits)))}</p>
                                <p className="text-xs text-slate-500 mt-1">
                                    Ratio of leadership to direct team contributors
                                </p>
                            </div>

                            <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/60">
                                <span className="text-[11px] font-semibold uppercase text-slate-400">Coverage Index</span>
                                <p className="text-xl font-bold text-slate-900 mt-1">100%</p>
                                <p className="text-xs text-slate-500 mt-1">
                                    All staff assigned to active reporting departments
                                </p>
                            </div>

                            <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/60">
                                <span className="text-[11px] font-semibold uppercase text-slate-400">Structural Depth</span>
                                <p className="text-xl font-bold text-slate-900 mt-1">Flat / 2-Tier</p>
                                <p className="text-xs text-slate-500 mt-1">
                                    Optimized agility across departmental execution
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Section: Employment Model & Hierarchy Navigation */}
                <div className="lg:col-span-4 space-y-5">
                    {/* Employment Categories Breakdown */}
                    <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                                <Layers size={14} className="text-blue-600" />
                                Employment Contracts
                            </h4>
                            <span className="text-[11px] font-semibold text-slate-500">
                                {totalStaff} Total
                            </span>
                        </div>

                        <div className="mt-4 space-y-3.5">
                            {employmentTypes.map((item, idx) => {
                                const count = Number(item.count || 0);
                                const pct = totalStaff > 0 ? Math.round((count / totalStaff) * 100) : 100;
                                return (
                                    <div key={idx} className="space-y-1.5">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="font-semibold text-slate-700">{getFormatType(item.type)}</span>
                                            <span className="text-slate-500 font-medium">{count} ({pct}%)</span>
                                        </div>
                                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                            <div
                                                className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                                                style={{ width: `${Math.max(6, pct)}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Workplace Location Footprint */}
                    <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
                        <h4 className="text-xs font-bold text-slate-900 mb-3 flex items-center gap-1.5">
                            <Globe size={14} className="text-amber-600" />
                            Workforce Footprint
                        </h4>
                        <div className="space-y-2.5">
                            <div className="p-3 rounded-lg bg-slate-50/70 border border-slate-100 flex items-center justify-between text-xs">
                                <div>
                                    <p className="font-semibold text-slate-800">Primary Headquarters</p>
                                    <p className="text-[11px] text-slate-400">Main Office & Operations</p>
                                </div>
                                <span className="font-bold text-slate-700">On-Site</span>
                            </div>
                            <div className="p-3 rounded-lg bg-slate-50/70 border border-slate-100 flex items-center justify-between text-xs">
                                <div>
                                    <p className="font-semibold text-slate-800">Distributed & Hybrid</p>
                                    <p className="text-[11px] text-slate-400">Remote Workforce Enabled</p>
                                </div>
                                <span className="font-bold text-slate-700">Supported</span>
                            </div>
                        </div>
                    </div>

                    {/* Organization Hierarchy CTA */}
                    <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
                        <div className="flex items-center justify-between mb-2">
                            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                                <Network size={14} className="text-slate-700" />
                                Organizational Architecture
                            </h4>
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed mb-4">
                            Configure reporting lines, department managers, and team hierarchies in the organizational unit manager.
                        </p>
                        <a
                            href="/organization"
                            className="w-full inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-all shadow-xs"
                        >
                            Open Organization Hierarchy
                            <ArrowUpRight size={13} />
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};
