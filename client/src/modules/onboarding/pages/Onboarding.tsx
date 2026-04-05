import React, { useState, useEffect } from 'react';
import {
    ChevronDown,
    Plus,
    Search,
    Maximize2,
    SlidersHorizontal,
    MoreHorizontal,
    X,
    User as UserIcon,
    Upload,
    Eye,
    ArrowUpDown,
    Filter,
    Loader2,
    Calendar,
    Briefcase,
    Building2,
    Shield,
    Phone,
    Mail
} from 'lucide-react';
import api from '../../../services/api';

const Onboarding: React.FC = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [candidates, setCandidates] = useState<any[]>([]);
    const [managers, setManagers] = useState<any[]>([]);
    const [departments, setDepartments] = useState<any[]>([]);
    const [loadingData, setLoadingData] = useState(false);
    
    // Form State
    const [form, setForm] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        departmentId: '',
        position: '',
        joinDate: new Date().toISOString().split('T')[0],
        annualCTC: '',
        gender: 'Male',
        dateOfBirth: '',
        employmentType: 'full_time',
        reportingManagerId: '',
        probationEndDate: ''
    });
    const [loading, setLoading] = useState(false);

    const fetchData = async () => {
        setLoadingData(true);
        try {
            const [candRes, mgrRes, deptRes] = await Promise.all([
                api.get('/employees', { params: { status: 'onboarding' } }),
                api.get('/users'), // Fetching all users for now, can filter by role later
                api.get('/reports/departments')
            ]);
            setCandidates(candRes.data.items || []);
            setManagers(mgrRes.data.items || []);
            setDepartments(deptRes.data.items || []);
        } catch (err) {
            console.error('Failed to fetch onboarding data', err);
        } finally {
            setLoadingData(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post('/employees', {
                name: `${form.firstName} ${form.lastName}`.trim(),
                email: form.email,
                phone: form.phone,
                departmentId: form.departmentId || null,
                position: form.position || 'Onboarding Candidate',
                joinDate: form.joinDate,
                annualCTC: Number(form.annualCTC) || 0,
                gender: form.gender,
                dateOfBirth: form.dateOfBirth || null,
                employmentType: form.employmentType,
                reportingManagerId: form.reportingManagerId || null,
                probationEndDate: form.probationEndDate || null,
                status: 'onboarding'
            });
            setIsModalOpen(false);
            setForm({
                firstName: '', lastName: '', email: '', phone: '', 
                departmentId: '', position: '', joinDate: new Date().toISOString().split('T')[0], 
                annualCTC: '', gender: 'Male', dateOfBirth: '', 
                employmentType: 'full_time', reportingManagerId: '', probationEndDate: '' 
            });
            fetchData();
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to add candidate');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#f4f7f9] font-sans">
            {/* Tab Header */}
            <div className="bg-[#1d2b4d] text-white px-6 h-[40px] flex items-center shadow-sm">
                <div className="h-full flex items-center border-b-2 border-blue-500 px-1 font-bold text-[13px] tracking-tight hover:text-blue-200 transition-colors cursor-pointer">
                    Candidate
                </div>
            </div>

            {/* Toolbar */}
            <div className="bg-white border-b border-slate-200 px-6 py-2.5 flex items-center justify-between shadow-sm sticky top-0 z-10">
                <div className="flex items-center space-x-6">
                    <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-1.5 cursor-pointer hover:bg-slate-100 transition-all shadow-sm group">
                        <span className="text-[13px] font-bold text-slate-700 group-hover:text-slate-900">Current Candidates</span>
                        <ChevronDown size={14} className="text-slate-400 group-hover:text-slate-600 transition-transform group-hover:rotate-180" />
                    </div>
                </div>

                <div className="flex items-center space-x-4">
                    {loadingData && <Loader2 size={16} className="animate-spin text-blue-500 mr-2" />}
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-[12px] font-black tracking-tight transition-all shadow-lg shadow-blue-500/20 active:scale-95 flex items-center gap-1.5"
                    >
                        <Plus size={16} />
                        Add Candidate
                    </button>
                    <div className="h-6 w-px bg-slate-200" />
                    <button className="p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600 rounded-lg border border-slate-100 transition-all tooltip" title="Maximize"><Maximize2 size={16} /></button>
                    <button className="p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600 rounded-lg border border-slate-100 transition-all tooltip" title="Filter"><Filter size={16} /></button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 p-6 flex flex-col overflow-hidden">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 flex-1 flex flex-col overflow-hidden">
                    <div className="overflow-x-auto flex-1">
                        <table className="w-full text-left border-collapse min-w-[1400px]">
                            <thead className="bg-slate-50/80 backdrop-blur sticky top-0 border-b border-slate-200 z-10">
                                <tr>
                                    <th className="p-4 w-12 border-r border-slate-100"><SlidersHorizontal size={14} className="text-slate-400 mx-auto" /></th>
                                    {[
                                        'Full Name', 'Email ID', 'Phone', 'Department', 
                                        'Position', 'Join Date', 'Manager', 'Type', 'Status'
                                    ].map((header, i) => (
                                        <th key={i} className="px-5 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest border-r border-slate-100 whitespace-nowrap group hover:bg-slate-100/50 transition-colors cursor-pointer">
                                            <div className="flex items-center justify-between">
                                                <span>{header}</span>
                                                <ArrowUpDown size={12} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-all" />
                                            </div>
                                        </th>
                                    ))}
                                    <th className="px-5 py-4 w-20 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {candidates.length === 0 ? (
                                    <tr>
                                        <td colSpan={11} className="py-24 text-center">
                                            <div className="flex flex-col items-center">
                                                <div className="w-48 h-48 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
                                                    <UserIcon size={64} className="text-slate-200" />
                                                </div>
                                                <p className="text-[15px] font-bold text-slate-800">No Onboarding Candidates</p>
                                                <p className="text-[12px] text-slate-400 mt-1 uppercase tracking-widest font-medium">Add a candidate to get started</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    candidates.map((c: any) => (
                                        <tr key={c.id} className="hover:bg-blue-50/30 transition-all group border-b border-slate-50 last:border-0">
                                            <td className="p-4 border-r border-slate-100 text-center">
                                                <input type="checkbox" className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                                            </td>
                                            <td className="px-5 py-5 border-r border-slate-100">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white text-[12px] font-black shadow-md shadow-blue-200">
                                                        {c.name.split(' ').map((n:any)=>n[0]).join('').toUpperCase().slice(0,2)}
                                                    </div>
                                                    <div>
                                                        <p className="text-[13.5px] font-bold text-slate-900 group-hover:text-blue-700 transition-colors tracking-tight">{c.name}</p>
                                                        <p className="text-[11px] text-slate-400 font-medium">#{c.id}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-5 text-[13px] font-medium text-slate-600 border-r border-slate-100 italic">{c.email}</td>
                                            <td className="px-5 py-5 text-[13px] font-medium text-slate-600 border-r border-slate-100 truncate max-w-[150px]">{c.phone || '—'}</td>
                                            <td className="px-5 py-5 text-[13px] font-bold text-slate-700 border-r border-slate-100">{c.department_name || c.department}</td>
                                            <td className="px-5 py-5 text-[13px] font-medium text-slate-500 border-r border-slate-100">{c.position}</td>
                                            <td className="px-5 py-5 text-[13px] font-bold text-slate-800 border-r border-slate-100">{new Date(c.join_date).toLocaleDateString('en-IN', { day:'2-digit', month:'short' })}</td>
                                            <td className="px-5 py-5 text-[13px] font-medium text-slate-600 border-r border-slate-100">{c.manager_name || '—'}</td>
                                            <td className="px-5 py-5 border-r border-slate-100">
                                                <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-500 rounded border border-slate-200">{c.employment_type?.replace('_', ' ')}</span>
                                            </td>
                                            <td className="px-5 py-5 border-r border-slate-100">
                                                <span className="px-2.5 py-1 text-[11px] font-black uppercase tracking-widest bg-amber-50 text-amber-600 rounded-full border border-amber-100 flex items-center w-fit gap-1.5 shadow-sm shadow-amber-100">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                                    {c.status}
                                                </span>
                                            </td>
                                            <td className="px-5 py-5 text-center">
                                                <button className="p-2 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-xl transition-all"><Eye size={16} /></button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Comprehensive Onboarding Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-[2px] animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-[1240px] max-h-[92vh] rounded-[32px] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.15)] flex flex-col overflow-hidden border border-slate-100 animate-in slide-in-from-bottom-8 zoom-in-95 duration-500">
                        {/* Improved Header */}
                        <div className="px-10 py-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50/80 to-white">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
                                    <Plus size={24} />
                                </div>
                                <div>
                                    <h2 className="text-[22px] font-black text-slate-900 leading-tight">Onboard New Team Member</h2>
                                    <p className="text-[12px] text-slate-400 font-bold uppercase tracking-[2px] mt-1">SaaS Enterprise Recruitment Flow</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="w-10 h-10 flex items-center justify-center hover:bg-slate-100 rounded-2xl text-slate-400 hover:text-slate-900 transition-all border border-transparent hover:border-slate-200"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Body with Multi-Column Layout */}
                        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
                            <div className="flex-1 overflow-y-auto p-10 bg-[#FBFDFF] custom-scrollbar">
                                <div className="grid grid-cols-3 gap-10">
                                    
                                    {/* Column 1: Core Identity */}
                                    <div className="space-y-8 bg-white p-8 rounded-[24px] border border-slate-100 shadow-sm">
                                        <SectionHeader icon={UserIcon} title="Basic Identity" />
                                        <div className="space-y-6">
                                            <InputField label="First Name" required value={form.firstName} onChange={(v: string) => setForm({...form, firstName: v})} />
                                            <InputField label="Last Name" required value={form.lastName} onChange={(v: string) => setForm({...form, lastName: v})} />
                                            <InputField label="Personal Email" type="email" required value={form.email} onChange={(v: string) => setForm({...form, email: v})} />
                                            <InputField label="Phone Number" icon={Phone} value={form.phone} onChange={(v: string) => setForm({...form, phone: v})} />
                                            <div className="grid grid-cols-2 gap-4 pt-2">
                                                <SelectField label="Gender" options={['Male', 'Female', 'Other']} value={form.gender} onChange={(v: string) => setForm({...form, gender: v})} />
                                                <InputField label="Birth Date" type="date" value={form.dateOfBirth} onChange={(v: string) => setForm({...form, dateOfBirth: v})} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Column 2: Job Placement */}
                                    <div className="space-y-8 bg-white p-8 rounded-[24px] border border-slate-100 shadow-sm">
                                        <SectionHeader icon={Briefcase} title="Work & Role" />
                                        <div className="space-y-6">
                                            <div className="space-y-1.5">
                                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest pl-1">Department</label>
                                                <select 
                                                    className="w-full bg-slate-50/50 border border-slate-100 py-3 px-4 rounded-xl text-[14px] font-bold focus:bg-white focus:border-blue-500 transition-all outline-none appearance-none cursor-pointer shadow-sm"
                                                    value={form.departmentId}
                                                    onChange={e => setForm({...form, departmentId: e.target.value})}
                                                >
                                                    <option value="">Select Department</option>
                                                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                                </select>
                                            </div>
                                            <InputField label="Job Designation" value={form.position} placeholder="e.g. Senior Backend Engineer" onChange={(v: string) => setForm({...form, position: v})} />
                                            <div className="space-y-1.5">
                                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest pl-1">Reporting Manager</label>
                                                <select 
                                                    className="w-full bg-slate-50/50 border border-slate-100 py-3 px-4 rounded-xl text-[14px] font-bold focus:bg-white focus:border-blue-500 transition-all outline-none appearance-none cursor-pointer shadow-sm"
                                                    value={form.reportingManagerId}
                                                    onChange={e => setForm({...form, reportingManagerId: e.target.value})}
                                                >
                                                    <option value="">Select Manager</option>
                                                    {managers.map(m => <option key={m.id} value={m.id}>{m.name} ({m.role})</option>)}
                                                </select>
                                            </div>
                                            <SelectField label="Employee Type" options={['full_time', 'part_time', 'contract', 'intern']} value={form.employmentType} onChange={(v: string) => setForm({...form, employmentType: v})} />
                                        </div>
                                    </div>

                                    {/* Column 3: Lifecycle & Comp */}
                                    <div className="space-y-8 bg-white p-8 rounded-[24px] border border-slate-100 shadow-sm">
                                        <SectionHeader icon={Calendar} title="Lifecycle & Comp" />
                                        <div className="space-y-6">
                                            <InputField label="Joining Date" type="date" value={form.joinDate} onChange={(v: string) => setForm({...form, joinDate: v})} />
                                            <InputField label="Probation End (Optional)" type="date" value={form.probationEndDate} onChange={(v: string) => setForm({...form, probationEndDate: v})} />
                                            <InputField label="Annual CTC (Gross)" type="number" value={form.annualCTC} placeholder="Enter Amount in ₹" onChange={(v: string) => setForm({...form, annualCTC: v})} />
                                            
                                            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 mt-6 group">
                                                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4">Upload Contract (PDF)</p>
                                                <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:bg-white hover:border-blue-400 transition-all cursor-pointer group-hover:shadow-md">
                                                    <Upload size={24} className="mx-auto text-slate-300 group-hover:text-blue-500 mb-2 transition-colors" />
                                                    <p className="text-[12px] font-bold text-slate-500">Drag & drop or <span className="text-blue-600">Browse</span></p>
                                                    <p className="text-[10px] text-slate-400 mt-1 uppercase font-black">Max 10MB</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                </div>
                            </div>
                            
                            {/* Modal Footer */}
                            <div className="px-10 py-6 bg-white border-t border-slate-100 flex items-center justify-end space-x-4 shadow-[0_-8px_32px_rgba(0,0,0,0.02)] shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-8 py-3 bg-white hover:bg-slate-50 text-slate-500 border border-slate-200 rounded-2xl text-[13px] font-black tracking-widest uppercase transition-all active:scale-95"
                                >
                                    Discard
                                </button>
                                <button 
                                    type="submit"
                                    disabled={loading}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-3 rounded-2xl text-[13px] font-black tracking-widest uppercase transition-all shadow-xl shadow-blue-500/30 flex items-center gap-2 disabled:opacity-50 active:scale-95"
                                >
                                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Shield size={16} />}
                                    Finalize Onboarding
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── LOCAL COMPONENTS ────────────────────────────────────────────────────────

const SectionHeader = ({ icon: Icon, title }: { icon: any, title: string }) => (
    <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
        <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
            <Icon size={20} />
        </div>
        <h3 className="text-[16px] font-black text-slate-800 tracking-tight">{title}</h3>
    </div>
);

const InputField = ({ label, required, value, onChange, type = 'text', placeholder, icon: Icon }: { label: string, required?: boolean, value: string, onChange: (v: string) => void, type?: string, placeholder?: string, icon?: any }) => (
    <div className="space-y-1.5 group">
        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest pl-1 transition-colors group-focus-within:text-blue-500">
            {label} {required && <span className="text-rose-500">*</span>}
        </label>
        <div className="relative">
            {Icon && <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-400 transition-colors"><Icon size={14} /></div>}
            <input 
                type={type} 
                required={required} 
                placeholder={placeholder}
                value={value}
                onChange={e => onChange(e.target.value)}
                className={`w-full bg-slate-50/50 border border-slate-100 ${Icon ? 'pl-11' : 'px-4'} py-3.5 rounded-xl text-[14px] font-bold text-slate-900 focus:bg-white focus:border-blue-500 transition-all outline-none shadow-sm placeholder:text-slate-300 placeholder:font-medium`} 
            />
        </div>
    </div>
);

const SelectField = ({ label, options, value, onChange }: { label: string, options: string[], value: string, onChange: (v: string) => void }) => (
    <div className="space-y-1.5">
        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest pl-1">{label}</label>
        <select 
            className="w-full bg-slate-50/50 border border-slate-100 py-3.5 px-4 rounded-xl text-[14px] font-bold focus:bg-white focus:border-blue-500 transition-all outline-none appearance-none cursor-pointer shadow-sm capitalize"
            value={value}
            onChange={e => onChange(e.target.value)}
        >
            {options.map((o: string) => <option key={o} value={o}>{o.replace('_', ' ')}</option>)}
        </select>
    </div>
);

export default Onboarding;
