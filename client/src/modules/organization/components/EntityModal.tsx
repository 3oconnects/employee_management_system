import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Settings, Plus, X, Loader2, Check, Globe, ShieldCheck, ArrowLeft, ArrowRight } from 'lucide-react';

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

    if (!modalType) return null;

    const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, totalSteps));
    const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

    return createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-500" onClick={onClose} />
            <div className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-500 flex flex-col border border-slate-200">
                
                {/* Dynamic Header with Progress */}
                <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-sm">
                                {editingItem ? <Settings size={18} /> : <Plus size={18} strokeWidth={3} />}
                            </div>
                            <div>
                                <h2 className="text-[15px] font-bold text-slate-900 tracking-tight leading-none">
                                    {editingItem ? 'Edit Configuration' : `Initialize ${modalType === 'dept' ? 'Division' : 'Squad'}`}
                                </h2>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1.5">
                                    Step {currentStep} of {totalSteps} • {currentStep === 1 ? 'Basic Information' : currentStep === 2 ? 'Operational Details' : 'Final Review'}
                                </p>
                            </div>
                        </div>
                        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-slate-900 hover:bg-white rounded-lg transition-all border border-transparent hover:border-slate-100">
                            <X size={16} strokeWidth={2.5} />
                        </button>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="flex gap-1.5">
                        {[1, 2, 3].map(step => (
                            <div 
                                key={step} 
                                className={`h-1 flex-1 rounded-full transition-all duration-500 ${step <= currentStep ? 'bg-indigo-600' : 'bg-slate-200'}`} 
                            />
                        ))}
                    </div>
                </div>

                <form onSubmit={onSubmit} className="p-8 space-y-6 bg-white min-h-[340px] flex flex-col">
                    
                    <div className="flex-1">
                        {currentStep === 1 && (
                            <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-500">
                                <div className="space-y-1.5">
                                    <label className="text-[12px] font-bold text-slate-700 flex items-center gap-1">
                                        Unit Name <span className="text-rose-500">*</span>
                                    </label>
                                    <input 
                                        required
                                        type="text" 
                                        value={formData.name}
                                        onChange={e => setFormData({...formData, name: e.target.value})}
                                        placeholder="e.g. Sales Department"
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[14px] font-medium text-slate-900 focus:bg-white focus:border-indigo-500 outline-none transition-all shadow-sm"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[12px] font-bold text-slate-700">Lead Owner</label>
                                        <select 
                                            value={formData.owner_id}
                                            onChange={e => setFormData({...formData, owner_id: e.target.value})}
                                            className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[13px] font-medium text-slate-900 focus:bg-white focus:border-indigo-500 outline-none transition-all cursor-pointer shadow-sm"
                                        >
                                            <option value="">Choose a lead...</option>
                                            {users.map(u => (
                                                <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[12px] font-bold text-slate-700">Business Category</label>
                                        <select 
                                            value={formData.category}
                                            onChange={e => setFormData({...formData, category: e.target.value})}
                                            className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[13px] font-medium text-slate-900 focus:bg-white focus:border-indigo-500 outline-none transition-all cursor-pointer shadow-sm"
                                        >
                                            <option value="core">General Business</option>
                                            <option value="finance">Finance & Accounts</option>
                                            <option value="hr">Human Resources</option>
                                            <option value="sales">Sales & Marketing</option>
                                            <option value="engineering">Engineering</option>
                                            <option value="operations">Operations & Logistics</option>
                                            <option value="legal">Legal & Compliance</option>
                                            <option value="rnd">Research & Dev</option>
                                            <option value="other">Other / Custom</option>
                                        </select>
                                    </div>
                                </div>

                                {formData.category === 'other' && (
                                    <div className="space-y-1.5 animate-in zoom-in-95 duration-300">
                                        <label className="text-[12px] font-bold text-slate-700">Custom Category Name</label>
                                        <input 
                                            type="text" 
                                            placeholder="Enter category name..."
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[14px] font-medium text-slate-900 focus:bg-white focus:border-indigo-500 outline-none transition-all shadow-sm"
                                        />
                                    </div>
                                )}

                                <div className="space-y-1.5">
                                    <label className="text-[12px] font-bold text-slate-700">Description / Purpose</label>
                                    <textarea 
                                        rows={3}
                                        value={formData.description}
                                        onChange={e => setFormData({...formData, description: e.target.value})}
                                        placeholder="Briefly describe the purpose of this unit..."
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[14px] font-medium text-slate-900 focus:bg-white focus:border-indigo-500 outline-none transition-all resize-none shadow-sm"
                                    />
                                </div>
                            </div>
                        )}

                        {currentStep === 2 && (
                            <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-500">
                                {modalType === 'team' && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[12px] font-bold text-slate-700">Parent Division</label>
                                            <select 
                                                required
                                                value={formData.department_id}
                                                onChange={e => setFormData({...formData, department_id: e.target.value})}
                                                className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[13px] font-medium text-slate-900 focus:bg-white focus:border-indigo-500 outline-none transition-all shadow-sm"
                                            >
                                                <option value="">Select Division</option>
                                                {departments.map(d => (
                                                    <option key={d.id} value={d.id}>{d.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[12px] font-bold text-slate-700">Parent Squad</label>
                                            <select 
                                                value={formData.parent_team_id}
                                                onChange={e => setFormData({...formData, parent_team_id: e.target.value})}
                                                className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[13px] font-medium text-slate-900 focus:bg-white focus:border-indigo-500 outline-none transition-all shadow-sm"
                                            >
                                                <option value="">Directly under Division</option>
                                                {teams.filter(t => t.department_id.toString() === formData.department_id && t.id !== editingItem?.id).map(t => (
                                                    <option key={t.id} value={t.id}>{t.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[12px] font-bold text-slate-700">Cost Center</label>
                                        <input 
                                            type="text" 
                                            value={formData.metadata.cost_center}
                                            onChange={e => setFormData({...formData, metadata: { ...formData.metadata, cost_center: e.target.value }})}
                                            placeholder="e.g. CC-ENG-2024"
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[13px] font-medium text-slate-900 focus:bg-white focus:border-indigo-500 outline-none transition-all shadow-sm"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[12px] font-bold text-slate-700">Budget Limit (USD)</label>
                                        <input 
                                            type="number" 
                                            value={formData.metadata.budget_limit}
                                            onChange={e => setFormData({...formData, metadata: { ...formData.metadata, budget_limit: e.target.value }})}
                                            placeholder="Annual limit"
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[13px] font-medium text-slate-900 focus:bg-white focus:border-indigo-500 outline-none transition-all shadow-sm"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                     <div className="space-y-1.5">
                                         <label className="text-[12px] font-bold text-slate-700">Priority Level</label>
                                         <select 
                                             value={formData.metadata.priority}
                                             onChange={e => setFormData({...formData, metadata: { ...formData.metadata, priority: e.target.value }})}
                                             className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[13px] font-medium text-slate-900 focus:bg-white focus:border-indigo-500 outline-none transition-all cursor-pointer shadow-sm"
                                         >
                                             <option value="high">High Priority</option>
                                             <option value="medium">Standard Growth</option>
                                             <option value="low">Low Priority</option>
                                         </select>
                                     </div>
                                     <div className="space-y-1.5">
                                         <label className="text-[12px] font-bold text-slate-700">Current Status</label>
                                         <select 
                                             value={formData.metadata.status}
                                             onChange={e => setFormData({...formData, metadata: { ...formData.metadata, status: e.target.value }})}
                                             className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[13px] font-medium text-slate-900 focus:bg-white focus:border-indigo-500 outline-none transition-all cursor-pointer shadow-sm"
                                         >
                                             <option value="active">Active</option>
                                             <option value="stealth">Hidden / Stealth</option>
                                             <option value="maintenance">Maintenance</option>
                                         </select>
                                     </div>
                                 </div>
                             </div>
                         )}
 
                         {currentStep === 3 && (
                             <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-500">
                                 <div className="space-y-1.5">
                                     <label className="text-[12px] font-bold text-slate-700">Internal Reference Code</label>
                                     <input 
                                         type="text" 
                                         value={formData.metadata.internal_code}
                                         onChange={e => setFormData({...formData, metadata: { ...formData.metadata, internal_code: e.target.value }})}
                                         placeholder="e.g. REF-ENG-001"
                                         className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[14px] font-medium text-slate-900 focus:bg-white focus:border-indigo-500 outline-none transition-all shadow-sm"
                                     />
                                 </div>
 
                                 <div className="space-y-1.5">
                                     <label className="text-[12px] font-bold text-slate-700">Website / Documentation Link</label>
                                     <div className="relative group">
                                         <Globe size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500" />
                                         <input 
                                             type="url" 
                                             value={formData.metadata.website}
                                             onChange={e => setFormData({...formData, metadata: { ...formData.metadata, website: e.target.value }})}
                                             placeholder="https://company.com/docs"
                                             className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[14px] font-medium text-slate-900 focus:bg-white focus:border-indigo-500 outline-none transition-all shadow-sm"
                                         />
                                     </div>
                                 </div>
 
                                 <div className="p-4 bg-indigo-50/30 border border-indigo-100 rounded-xl space-y-2">
                                     <h4 className="text-[11px] font-black text-indigo-900 uppercase tracking-widest flex items-center gap-2">
                                         <ShieldCheck size={14} /> Confirmation Summary
                                     </h4>
                                     <p className="text-[12px] text-indigo-700/70 font-medium leading-relaxed">
                                         You are about to finalize the setup for this unit. All settings and policies will be active once you confirm.
                                     </p>
                                 </div>
                             </div>
                         )}
                    </div>

                    {/* Navigation Actions */}
                    <div className="pt-6 flex items-center gap-3 border-t border-slate-50">
                        {currentStep > 1 && (
                            <button 
                                type="button"
                                onClick={prevStep}
                                className="px-6 py-3.5 bg-white text-slate-600 border border-slate-200 rounded-xl text-[13px] font-bold uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-2"
                            >
                                <ArrowLeft size={16} /> Back
                            </button>
                        )}
                        
                        {currentStep < totalSteps ? (
                            <button 
                                type="button"
                                onClick={nextStep}
                                disabled={!formData.name}
                                className="flex-1 py-3.5 bg-slate-900 text-white rounded-xl text-[13px] font-bold uppercase tracking-widest hover:bg-indigo-600 transition-all flex items-center justify-center gap-2 shadow-xl shadow-slate-900/10 active:scale-[0.98] disabled:opacity-50"
                            >
                                Continue <ArrowRight size={16} />
                            </button>
                        ) : (
                            <button 
                                disabled={submitting}
                                className="flex-1 py-3.5 bg-indigo-600 text-white rounded-xl text-[13px] font-bold uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 shadow-xl shadow-indigo-600/20 active:scale-[0.98] disabled:opacity-50"
                            >
                                {submitting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} strokeWidth={3} />}
                                {editingItem ? 'Finalize Updates' : 'Confirm Initialization'}
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
};

export default EntityModal;
