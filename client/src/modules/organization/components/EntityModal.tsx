import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
    Building2, Layers, User, UserCheck, Users, Check, ChevronDown, 
    Search, X, ArrowLeft, ArrowRight, ShieldCheck, Globe, 
    DollarSign, Activity, Settings, Plus, Loader2, Briefcase, FileText
} from 'lucide-react';

interface EntityModalProps {
    modalType: 'dept' | 'team' | null;
    editingItem: any;
    formData: any;
    setFormData: (data: any) => void;
    submitting: boolean;
    departments: any[];
    teams: any[];
    users: any[];
    onSubmit: (e: React.FormEvent) => void;
    onClose: () => void;
}

const CATEGORIES = [
    { value: 'core', label: 'General Business' },
    { value: 'engineering', label: 'Engineering & Technology' },
    { value: 'finance', label: 'Finance & Accounts' },
    { value: 'hr', label: 'Human Resources' },
    { value: 'sales', label: 'Sales & Marketing' },
    { value: 'operations', label: 'Operations & Logistics' },
    { value: 'legal', label: 'Legal & Compliance' },
    { value: 'rnd', label: 'Research & Development' },
    { value: 'other', label: 'Custom / Other' }
];

const EntityModal: React.FC<EntityModalProps> = ({
    modalType,
    editingItem,
    formData,
    setFormData,
    submitting,
    departments,
    teams,
    users,
    onSubmit,
    onClose
}) => {
    const [currentStep, setCurrentStep] = useState(1);
    const totalSteps = 3;

    // Lead selector dropdown state
    const [leadDropdownOpen, setLeadDropdownOpen] = useState(false);
    const [leadSearchTerm, setLeadSearchTerm] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close lead dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setLeadDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (!modalType) return null;

    // Filter active users only (strict safeguard)
    const activeUsers = users.filter((u: any) => 
        u.is_active !== false && 
        !u.deleted_at && 
        !u.email?.toLowerCase().startsWith('deleted_') &&
        !u.name?.toLowerCase().startsWith('deleted_')
    );

    const filteredUsers = activeUsers.filter((u: any) => 
        u.name?.toLowerCase().includes(leadSearchTerm.toLowerCase()) ||
        u.email?.toLowerCase().includes(leadSearchTerm.toLowerCase()) ||
        u.role?.toLowerCase().includes(leadSearchTerm.toLowerCase())
    );

    const selectedLead = activeUsers.find((u: any) => String(u.id) === String(formData.owner_id));

    const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, totalSteps));
    const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

    const getRoleBadgeColor = (role: string = '') => {
        const r = role.toLowerCase();
        if (r.includes('super_admin') || r.includes('admin')) return 'bg-purple-50 text-[#8B3DFF] border-purple-100';
        if (r.includes('manager')) return 'bg-blue-50 text-[#2563EB] border-blue-100';
        if (r.includes('hr')) return 'bg-emerald-50 text-[#65B814] border-emerald-100';
        return 'bg-slate-100 text-slate-600 border-slate-200';
    };

    return createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity animate-in fade-in duration-300" 
                onClick={onClose} 
            />

            {/* Modal Dialog */}
            <div className="relative bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 z-10">
                
                {/* Header */}
                <div className="px-7 pt-6 pb-5 border-b border-slate-100 bg-white">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3.5">
                            <div className="w-11 h-11 bg-blue-50 text-[#2563EB] border border-blue-100 rounded-xl flex items-center justify-center shadow-xs">
                                {editingItem ? (
                                    <Settings size={20} strokeWidth={2.2} />
                                ) : modalType === 'dept' ? (
                                    <Building2 size={20} strokeWidth={2.2} />
                                ) : (
                                    <Layers size={20} strokeWidth={2.2} />
                                )}
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-lg font-bold text-[#17213D] tracking-tight">
                                        {editingItem ? 'Edit Configuration' : `Create ${modalType === 'dept' ? 'Division' : 'Squad'}`}
                                    </h2>
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                                        {modalType === 'dept' ? 'Division' : 'Squad'}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500 font-medium mt-0.5">
                                    Configure structure, designated lead, and operational policies
                                </p>
                            </div>
                        </div>
                        <button 
                            type="button"
                            onClick={onClose} 
                            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            <X size={18} strokeWidth={2} />
                        </button>
                    </div>

                    {/* Step Navigation Bar */}
                    <div className="mt-5 grid grid-cols-3 gap-2">
                        {[
                            { step: 1, title: 'Classification', desc: 'Identity & Lead' },
                            { step: 2, title: 'Operations', desc: 'Hierarchy & Budget' },
                            { step: 3, title: 'Governance', desc: 'Review & Launch' }
                        ].map((s) => {
                            const isCurrent = currentStep === s.step;
                            const isCompleted = currentStep > s.step;
                            return (
                                <button
                                    key={s.step}
                                    type="button"
                                    onClick={() => {
                                        if (s.step < currentStep || formData.name) setCurrentStep(s.step);
                                    }}
                                    className={`flex items-center gap-2.5 p-2 rounded-xl text-left transition-all ${
                                        isCurrent 
                                            ? 'bg-blue-50/80 border border-blue-200 text-[#2563EB]' 
                                            : isCompleted
                                                ? 'bg-emerald-50/50 border border-emerald-100 text-emerald-700'
                                                : 'bg-slate-50 border border-slate-100 text-slate-400'
                                    }`}
                                >
                                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                                        isCurrent
                                            ? 'bg-[#2563EB] text-white shadow-xs'
                                            : isCompleted
                                                ? 'bg-[#65B814] text-white'
                                                : 'bg-slate-200 text-slate-600'
                                    }`}>
                                        {isCompleted ? <Check size={12} strokeWidth={3} /> : s.step}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-xs font-bold truncate leading-tight">{s.title}</div>
                                        <div className="text-[10px] text-slate-400 truncate hidden sm:block">{s.desc}</div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Form Content */}
                <form onSubmit={onSubmit} className="flex flex-col flex-1">
                    <div className="p-7 space-y-5 flex-1 min-h-[350px]">
                        
                        {/* ──────────────── STEP 1: CLASSIFICATION ──────────────── */}
                        {currentStep === 1 && (
                            <div className="space-y-4 animate-in fade-in duration-300">
                                
                                {/* Unit Name */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-[#17213D] flex items-center gap-1">
                                        Unit Name <span className="text-rose-500">*</span>
                                    </label>
                                    <input 
                                        required
                                        type="text" 
                                        value={formData.name}
                                        onChange={e => setFormData({...formData, name: e.target.value})}
                                        placeholder={modalType === 'dept' ? 'e.g. Core Engineering' : 'e.g. Backend Platform Squad'}
                                        className="w-full px-3.5 py-2.5 bg-slate-50/60 hover:bg-white focus:bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 outline-none transition-all shadow-xs"
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    
                                    {/* Lead Owner (Custom Polished Dropdown) */}
                                    <div className="space-y-1.5 relative" ref={dropdownRef}>
                                        <label className="text-xs font-semibold text-[#17213D] flex items-center justify-between">
                                            <span>Team Lead / Owner</span>
                                            <span className="text-[11px] font-normal text-slate-400">Active personnel</span>
                                        </label>
                                        
                                        {/* Dropdown Trigger */}
                                        <button
                                            type="button"
                                            onClick={() => setLeadDropdownOpen(!leadDropdownOpen)}
                                            className={`w-full px-3.5 py-2.5 bg-slate-50/60 hover:bg-white focus:bg-white border rounded-xl text-sm text-left flex items-center justify-between transition-all shadow-xs ${
                                                leadDropdownOpen ? 'border-[#2563EB] ring-2 ring-blue-100 bg-white' : 'border-slate-200'
                                            }`}
                                        >
                                            {selectedLead ? (
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <div className="w-6 h-6 rounded-md bg-[#17213D] text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                                                        {selectedLead.name.substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <span className="font-semibold text-slate-900 truncate text-xs">
                                                        {selectedLead.name}
                                                    </span>
                                                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border shrink-0 ${getRoleBadgeColor(selectedLead.role)}`}>
                                                        {selectedLead.role}
                                                    </span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 text-slate-400 text-xs">
                                                    <UserCheck size={14} className="text-slate-400" />
                                                    <span>Choose a lead...</span>
                                                </div>
                                            )}
                                            <ChevronDown size={14} className={`text-slate-400 transition-transform ${leadDropdownOpen ? 'rotate-180 text-[#2563EB]' : ''}`} />
                                        </button>

                                        {/* Custom Popover Menu */}
                                        {leadDropdownOpen && (
                                            <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-2 space-y-2 animate-in fade-in zoom-in-95 duration-150">
                                                <div className="relative">
                                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                                    <input 
                                                        type="text"
                                                        value={leadSearchTerm}
                                                        onChange={(e) => setLeadSearchTerm(e.target.value)}
                                                        placeholder="Search leads..."
                                                        className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-[#2563EB] focus:bg-white"
                                                        autoFocus
                                                    />
                                                </div>

                                                <div className="max-h-48 overflow-y-auto space-y-1 custom-scrollbar">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setFormData({ ...formData, owner_id: '' });
                                                            setLeadDropdownOpen(false);
                                                        }}
                                                        className={`w-full px-3 py-2 rounded-lg text-xs font-medium text-left flex items-center justify-between hover:bg-slate-50 transition-colors ${
                                                            !formData.owner_id ? 'bg-blue-50/70 text-[#2563EB] font-semibold' : 'text-slate-500'
                                                        }`}
                                                    >
                                                        <span>None (Unassigned)</span>
                                                        {!formData.owner_id && <Check size={12} strokeWidth={2.5} />}
                                                    </button>

                                                    {filteredUsers.map(u => {
                                                        const isSelected = String(formData.owner_id) === String(u.id);
                                                        return (
                                                            <button
                                                                key={u.id}
                                                                type="button"
                                                                onClick={() => {
                                                                    setFormData({ ...formData, owner_id: u.id.toString() });
                                                                    setLeadDropdownOpen(false);
                                                                }}
                                                                className={`w-full px-3 py-2 rounded-lg text-xs text-left flex items-center justify-between hover:bg-slate-50 transition-colors ${
                                                                    isSelected ? 'bg-blue-50/70 text-[#2563EB]' : 'text-slate-800'
                                                                }`}
                                                            >
                                                                <div className="flex items-center gap-2.5 min-w-0">
                                                                    <div className="w-6 h-6 rounded-md bg-[#17213D] text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                                                                        {u.name.substring(0, 2).toUpperCase()}
                                                                    </div>
                                                                    <div className="truncate">
                                                                        <div className="font-semibold text-slate-900 truncate leading-tight">{u.name}</div>
                                                                        <div className="text-[10px] text-slate-400 truncate">{u.email}</div>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-2 shrink-0">
                                                                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border ${getRoleBadgeColor(u.role)}`}>
                                                                        {u.role}
                                                                    </span>
                                                                    {isSelected && <Check size={12} strokeWidth={2.5} className="text-[#2563EB]" />}
                                                                </div>
                                                            </button>
                                                        );
                                                    })}

                                                    {filteredUsers.length === 0 && (
                                                        <div className="py-4 text-center text-xs text-slate-400">
                                                            No matching active leads found
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Business Category */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-[#17213D]">Business Category</label>
                                        <div className="relative">
                                            <select 
                                                value={formData.category}
                                                onChange={e => setFormData({...formData, category: e.target.value})}
                                                className="w-full px-3.5 py-2.5 bg-slate-50/60 hover:bg-white focus:bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 outline-none transition-all cursor-pointer shadow-xs appearance-none pr-8"
                                            >
                                                {CATEGORIES.map(cat => (
                                                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                                                ))}
                                            </select>
                                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                        </div>
                                    </div>
                                </div>

                                {formData.category === 'other' && (
                                    <div className="space-y-1.5 animate-in fade-in duration-200">
                                        <label className="text-xs font-semibold text-[#17213D]">Custom Category Name</label>
                                        <input 
                                            type="text" 
                                            placeholder="Specify custom department category..."
                                            className="w-full px-3.5 py-2.5 bg-slate-50/60 hover:bg-white focus:bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 outline-none transition-all shadow-xs"
                                        />
                                    </div>
                                )}

                                {/* Description / Purpose */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-[#17213D]">Description & Purpose</label>
                                    <textarea 
                                        rows={3}
                                        value={formData.description}
                                        onChange={e => setFormData({...formData, description: e.target.value})}
                                        placeholder="Describe the operational purpose, strategic focus, and responsibilities..."
                                        className="w-full px-3.5 py-2.5 bg-slate-50/60 hover:bg-white focus:bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 outline-none transition-all resize-none shadow-xs placeholder:text-slate-400"
                                    />
                                </div>
                            </div>
                        )}

                        {/* ──────────────── STEP 2: OPERATIONS & HIERARCHY ──────────────── */}
                        {currentStep === 2 && (
                            <div className="space-y-4 animate-in fade-in duration-300">
                                
                                {modalType === 'team' && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold text-[#17213D]">
                                                Parent Division <span className="text-rose-500">*</span>
                                            </label>
                                            <div className="relative">
                                                <select 
                                                    required
                                                    value={formData.department_id}
                                                    onChange={e => setFormData({...formData, department_id: e.target.value})}
                                                    className="w-full px-3.5 py-2.5 bg-slate-50/60 hover:bg-white focus:bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 outline-none transition-all cursor-pointer shadow-xs appearance-none pr-8"
                                                >
                                                    <option value="">Select Division...</option>
                                                    {departments.map(d => (
                                                        <option key={d.id} value={d.id}>{d.name}</option>
                                                    ))}
                                                </select>
                                                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                            </div>
                                        </div>
                                        
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold text-[#17213D]">Parent Squad (Optional)</label>
                                            <div className="relative">
                                                <select 
                                                    value={formData.parent_team_id}
                                                    onChange={e => setFormData({...formData, parent_team_id: e.target.value})}
                                                    className="w-full px-3.5 py-2.5 bg-slate-50/60 hover:bg-white focus:bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 outline-none transition-all cursor-pointer shadow-xs appearance-none pr-8"
                                                >
                                                    <option value="">Directly under Division</option>
                                                    {teams.filter(t => String(t.department_id) === String(formData.department_id) && t.id !== editingItem?.id).map(t => (
                                                        <option key={t.id} value={t.id}>{t.name}</option>
                                                    ))}
                                                </select>
                                                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-[#17213D] flex items-center gap-1.5">
                                            <Briefcase size={13} className="text-slate-400" /> Cost Center ID
                                        </label>
                                        <input 
                                            type="text" 
                                            value={formData.metadata.cost_center}
                                            onChange={e => setFormData({...formData, metadata: { ...formData.metadata, cost_center: e.target.value }})}
                                            placeholder="e.g. CC-ENG-2026"
                                            className="w-full px-3.5 py-2.5 bg-slate-50/60 hover:bg-white focus:bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 outline-none transition-all shadow-xs"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-[#17213D] flex items-center gap-1.5">
                                            <DollarSign size={13} className="text-slate-400" /> Budget Limit (USD)
                                        </label>
                                        <input 
                                            type="number" 
                                            value={formData.metadata.budget_limit}
                                            onChange={e => setFormData({...formData, metadata: { ...formData.metadata, budget_limit: e.target.value }})}
                                            placeholder="e.g. 50000"
                                            className="w-full px-3.5 py-2.5 bg-slate-50/60 hover:bg-white focus:bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 outline-none transition-all shadow-xs"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-[#17213D]">Priority Level</label>
                                        <div className="relative">
                                            <select 
                                                value={formData.metadata.priority}
                                                onChange={e => setFormData({...formData, metadata: { ...formData.metadata, priority: e.target.value }})}
                                                className="w-full px-3.5 py-2.5 bg-slate-50/60 hover:bg-white focus:bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 outline-none transition-all cursor-pointer shadow-xs appearance-none pr-8"
                                            >
                                                <option value="high">High Priority</option>
                                                <option value="medium">Standard Growth</option>
                                                <option value="low">Low Priority</option>
                                            </select>
                                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-[#17213D]">Operational Status</label>
                                        <div className="relative">
                                            <select 
                                                value={formData.metadata.status}
                                                onChange={e => setFormData({...formData, metadata: { ...formData.metadata, status: e.target.value }})}
                                                className="w-full px-3.5 py-2.5 bg-slate-50/60 hover:bg-white focus:bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 outline-none transition-all cursor-pointer shadow-xs appearance-none pr-8"
                                            >
                                                <option value="active">Active (Operational)</option>
                                                <option value="stealth">Hidden / Stealth</option>
                                                <option value="maintenance">Maintenance</option>
                                            </select>
                                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ──────────────── STEP 3: GOVERNANCE & REVIEW ──────────────── */}
                        {currentStep === 3 && (
                            <div className="space-y-4 animate-in fade-in duration-300">
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-[#17213D]">Internal Code</label>
                                        <input 
                                            type="text" 
                                            value={formData.metadata.internal_code}
                                            onChange={e => setFormData({...formData, metadata: { ...formData.metadata, internal_code: e.target.value }})}
                                            placeholder="e.g. REF-ENG-001"
                                            className="w-full px-3.5 py-2.5 bg-slate-50/60 hover:bg-white focus:bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 outline-none transition-all shadow-xs"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-[#17213D]">Docs / Portal URL</label>
                                        <div className="relative">
                                            <Globe size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input 
                                                type="url" 
                                                value={formData.metadata.website}
                                                onChange={e => setFormData({...formData, metadata: { ...formData.metadata, website: e.target.value }})}
                                                placeholder="https://wiki.company.com/unit"
                                                className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50/60 hover:bg-white focus:bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 outline-none transition-all shadow-xs"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Review Blueprint Card */}
                                <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-3">
                                    <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Unit Blueprint Preview</span>
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                            formData.metadata.status === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-200 text-slate-700'
                                        }`}>
                                            {formData.metadata.status || 'Active'}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 text-xs">
                                        <div>
                                            <span className="text-slate-400 text-[11px]">Unit Name:</span>
                                            <p className="font-semibold text-slate-900">{formData.name || 'Untitled Unit'}</p>
                                        </div>
                                        <div>
                                            <span className="text-slate-400 text-[11px]">Designated Lead:</span>
                                            <p className="font-semibold text-slate-900">{selectedLead ? selectedLead.name : 'Unassigned'}</p>
                                        </div>
                                        <div>
                                            <span className="text-slate-400 text-[11px]">Category:</span>
                                            <p className="font-medium text-slate-700 capitalize">{formData.category}</p>
                                        </div>
                                        <div>
                                            <span className="text-slate-400 text-[11px]">Priority:</span>
                                            <p className="font-medium text-slate-700 capitalize">{formData.metadata.priority}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-start gap-2.5 p-3 bg-blue-50/60 border border-blue-100 rounded-xl">
                                    <ShieldCheck size={16} className="text-[#2563EB] shrink-0 mt-0.5" />
                                    <p className="text-xs text-blue-900/80 leading-relaxed">
                                        All permissions, hierarchy reporting, and governance boundaries will automatically synchronize across the enterprise graph upon submission.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer Actions */}
                    <div className="px-7 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                        {currentStep > 1 ? (
                            <button 
                                type="button"
                                onClick={prevStep}
                                className="px-4 py-2 bg-white text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-xs"
                            >
                                <ArrowLeft size={14} /> Back
                            </button>
                        ) : (
                            <button 
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 bg-white text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-colors shadow-xs"
                            >
                                Cancel
                            </button>
                        )}

                        <div className="flex items-center gap-2">
                            {currentStep < totalSteps ? (
                                <button 
                                    type="button"
                                    onClick={nextStep}
                                    disabled={!formData.name?.trim()}
                                    className="px-5 py-2.5 bg-[#2563EB] hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-2 shadow-xs disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]"
                                >
                                    Continue <ArrowRight size={14} />
                                </button>
                            ) : (
                                <button 
                                    type="submit"
                                    disabled={submitting || !formData.name?.trim()}
                                    className="px-5 py-2.5 bg-[#2563EB] hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-2 shadow-xs disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]"
                                >
                                    {submitting ? (
                                        <>
                                            <Loader2 size={14} className="animate-spin" />
                                            <span>Processing...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Check size={14} strokeWidth={2.5} />
                                            <span>{editingItem ? 'Save Changes' : `Create ${modalType === 'dept' ? 'Division' : 'Squad'}`}</span>
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
};

export default EntityModal;
