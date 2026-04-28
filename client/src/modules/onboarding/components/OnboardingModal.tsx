import React from 'react';
import { X, Plus, User as UserIcon, Briefcase, Calendar, Upload, Shield, Phone, Loader2, Mail, MapPin, IndianRupee, Cpu, Zap, Activity, Building2 } from 'lucide-react';
import { createPortal } from 'react-dom';

interface OnboardingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (e: React.FormEvent) => void;
    form: any;
    setForm: (form: any) => void;
    departments: any[];
    managers: any[];
    loading: boolean;
}

const InputField = ({ label, required, value, onChange, type = 'text', placeholder, icon: Icon }: any) => (
    <div className="space-y-1.5 group">
        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-0.5 group-focus-within:text-indigo-600 transition-colors">
            {label} {required && <span className="text-rose-500">*</span>}
        </label>
        <div className="relative">
            {Icon && <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-400 transition-colors"><Icon size={14} /></div>}
            <input 
                type={type} 
                required={required} 
                placeholder={placeholder}
                value={value}
                onChange={e => onChange(e.target.value)}
                className={`w-full bg-slate-50 border border-slate-100 ${Icon ? 'pl-10' : 'px-4'} py-2.5 rounded-xl text-[12px] font-bold text-slate-900 focus:bg-white focus:border-indigo-400 outline-none transition-all shadow-sm placeholder:text-slate-300 placeholder:font-black placeholder:uppercase placeholder:tracking-widest placeholder:text-[9px]`} 
            />
        </div>
    </div>
);

const SelectField = ({ label, options, value, onChange, icon: Icon }: any) => (
    <div className="space-y-1.5 group">
        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-0.5 group-focus-within:text-indigo-600 transition-colors">{label}</label>
        <div className="relative">
            {Icon && <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-400 transition-colors"><Icon size={14} /></div>}
            <select 
                className={`w-full bg-slate-50 border border-slate-100 ${Icon ? 'pl-10' : 'px-4'} py-2.5 rounded-xl text-[12px] font-bold text-slate-900 focus:bg-white focus:border-indigo-400 outline-none appearance-none cursor-pointer shadow-sm capitalize`}
                value={value}
                onChange={e => onChange(e.target.value)}
            >
                {options.map((o: any) => (
                    <option key={typeof o === 'string' ? o : o.id} value={typeof o === 'string' ? o : o.id}>
                        {typeof o === 'string' ? o.replace('_', ' ') : o.name}
                    </option>
                ))}
            </select>
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300">
                <Zap size={12} className="opacity-40" />
            </div>
        </div>
    </div>
);

const SectionHeader = ({ icon: Icon, title, subtitle }: any) => (
    <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center">
            <Icon size={16} />
        </div>
        <div>
            <h3 className="text-[12px] font-black text-slate-900 tracking-tight uppercase">{title}</h3>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{subtitle}</p>
        </div>
    </div>
);

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ 
    isOpen, onClose, onSubmit, form, setForm, departments, managers, loading 
}) => {

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div 
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300"
                onClick={onClose}
            />
            
            <div className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 ring-1 ring-slate-200/50 flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
                            {form.id ? <Briefcase size={20} /> : <Plus size={20} />}
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-[#0F172A] tracking-tight uppercase">
                                {form.id ? 'Edit Personnel Profile' : 'Initialize Personnel'}
                            </h2>
                            <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.2em] mt-0.5">
                                {form.id ? 'System Update Sequence' : 'Deployment Protocol'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-300 hover:text-slate-600 hover:bg-white transition-all"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Form Content */}
                <form onSubmit={onSubmit} className="flex-1 overflow-y-auto no-scrollbar">
                    <div className="p-8 space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            
                            {/* Identity Node */}
                            <div className="space-y-6">
                                <SectionHeader icon={UserIcon} title="Identity" subtitle="Core Metrics" />
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-3">
                                        <InputField label="First Name" required value={form.firstName} onChange={(v: string) => setForm({...form, firstName: v})} />
                                        <InputField label="Last Name" required value={form.lastName} onChange={(v: string) => setForm({...form, lastName: v})} />
                                    </div>
                                    <InputField label="Neural Link (Email)" type="email" icon={Mail} required value={form.email} onChange={(v: string) => setForm({...form, email: v})} />
                                    <InputField label="Comms Channel" icon={Phone} value={form.phone} onChange={(v: string) => setForm({...form, phone: v})} />
                                    <div className="grid grid-cols-2 gap-3">
                                        <SelectField label="Classification" options={['Male', 'Female', 'Other']} value={form.gender} onChange={(v: string) => setForm({...form, gender: v})} />
                                        <InputField label="Birth Origin" type="date" value={form.dateOfBirth} onChange={(v: string) => setForm({...form, dateOfBirth: v})} />
                                    </div>
                                </div>
                            </div>

                            {/* Placement Node */}
                            <div className="space-y-6">
                                <SectionHeader icon={Cpu} title="Organizational" subtitle="Functional Grid" />
                                <div className="space-y-4">
                                    <SelectField label="Departmental Hub" icon={Building2} options={departments} value={form.departmentId} onChange={(v: string) => setForm({...form, departmentId: v})} />
                                    <InputField label="Role Designation" icon={Briefcase} value={form.position} placeholder="System Architect" onChange={(v: string) => setForm({...form, position: v})} />
                                    <SelectField label="Reporting Authority" icon={Shield} options={managers} value={form.reportingManagerId} onChange={(v: string) => setForm({...form, reportingManagerId: v})} />
                                    <SelectField label="Execution Model" icon={Activity} options={['full_time', 'part_time', 'contract', 'intern']} value={form.employmentType} onChange={(v: string) => setForm({...form, employmentType: v})} />
                                </div>
                            </div>

                            {/* Assets & Lifecycle Node */}
                            <div className="space-y-6">
                                <SectionHeader icon={Zap} title="Lifecycle" subtitle="Temporal Metrics" />
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-3">
                                        <InputField label="Sequence Start" type="date" value={form.joinDate} onChange={(v: string) => setForm({...form, joinDate: v})} />
                                        <InputField label="Audit Threshold" type="date" value={form.probationEndDate} onChange={(v: string) => setForm({...form, probationEndDate: v})} />
                                    </div>
                                    <InputField label="Annual Capital" icon={IndianRupee} type="number" value={form.annualCTC} placeholder="Resource Value" onChange={(v: string) => setForm({...form, annualCTC: v})} />
                                    
                                    <div className="p-6 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all cursor-pointer shadow-sm mt-4 text-center">
                                        <Upload size={24} className="mx-auto text-slate-300 mb-2" />
                                        <p className="text-[11px] font-black text-slate-900 uppercase tracking-tight">Sync Binary</p>
                                        <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest mt-1">SECURE PDF • 15MB</p>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                    
                    {/* Footer */}
                    <div className="px-8 py-5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2.5 text-slate-400 hover:text-slate-600 text-[10px] font-black tracking-widest uppercase transition-all"
                        >
                            Abort Protocol
                        </button>
                            <button 
                                type="submit"
                                disabled={loading}
                                className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-2.5 rounded-lg text-[10px] font-black tracking-widest uppercase transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-2 disabled:opacity-50"
                            >
                                {loading ? <Loader2 size={14} className="animate-spin" /> : <Shield size={14} />}
                                {form.id ? 'Authorize Update' : 'Authorize Deployment'}
                            </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
};
