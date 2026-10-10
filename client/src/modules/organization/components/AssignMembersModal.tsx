import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { UserPlus, Search, Check, X, Loader2, Users, Building2, Layers } from 'lucide-react';
import api from '../../../services/api';
import { toast } from '../../../components/ui';

interface AssignMembersModalProps {
    isOpen: boolean;
    onClose: () => void;
    targetType: 'dept' | 'team';
    targetId: string;
    targetName: string;
    parentDeptId?: number | string | null;
    currentMemberIds: string[];
    onSuccess: () => void;
}

export const AssignMembersModal: React.FC<AssignMembersModalProps> = ({
    isOpen,
    onClose,
    targetType,
    targetId,
    targetName,
    parentDeptId,
    currentMemberIds,
    onSuccess
}) => {
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    useEffect(() => {
        if (!isOpen) return;
        const fetchAllEmployees = async () => {
            setLoading(true);
            try {
                const res = await api.get('/employees?limit=100');
                const all = (res.data.items || []).filter((e: any) => 
                    e.status !== 'terminated' && !e.deleted_at
                );
                setEmployees(all);
                setSelectedIds([]);
            } catch (err) {
                toast.error('Failed to load personnel list');
            } finally {
                setLoading(false);
            }
        };
        fetchAllEmployees();
    }, [isOpen]);

    if (!isOpen) return null;

    const filtered = employees.filter(e => 
        e.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.position?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const toggleSelect = (empId: string) => {
        setSelectedIds(prev => 
            prev.includes(empId) ? prev.filter(id => id !== empId) : [...prev, empId]
        );
    };

    const handleAssign = async () => {
        if (selectedIds.length === 0) return;
        setSubmitting(true);
        try {
            // Assign each selected employee to this division or squad
            await Promise.all(selectedIds.map(async (empId) => {
                const payload: any = {};
                if (targetType === 'dept') {
                    payload.department_id = Number(targetId);
                    payload.department = targetName;
                } else {
                    payload.team_id = Number(targetId);
                    if (parentDeptId) {
                        payload.department_id = Number(parentDeptId);
                    }
                }
                return api.put(`/employees/${empId}`, payload);
            }));

            toast.success(`Assigned ${selectedIds.length} member${selectedIds.length > 1 ? 's' : ''} to ${targetName}`);
            onSuccess();
            onClose();
        } catch (err: any) {
            toast.error('Failed to assign members');
        } finally {
            setSubmitting(false);
        }
    };

    const unitLabel = targetType === 'dept' ? 'Division' : 'Squad';

    return createPortal(
        <div className="fixed inset-0 z-[12000] flex items-center justify-center p-4">
            <div 
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity animate-in fade-in duration-300"
                onClick={onClose}
            />

            <div className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 z-10 max-h-[85vh]">
                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-100 bg-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#2563EB] border border-blue-100 flex items-center justify-center shadow-xs">
                            <UserPlus size={19} strokeWidth={2.2} />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-[#17213D] tracking-tight">
                                Assign Members to {unitLabel}
                            </h2>
                            <p className="text-xs text-slate-500 font-medium">
                                Target: <span className="font-semibold text-slate-900">{targetName}</span>
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

                {/* Search Filter */}
                <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                    <div className="relative">
                        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                            type="text"
                            placeholder="Search active personnel by name, email or role..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 outline-none transition-all placeholder:text-slate-400"
                            autoFocus
                        />
                    </div>
                </div>

                {/* Employee List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar min-h-[260px] max-h-[380px]">
                    {loading ? (
                        <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
                            <Loader2 size={24} className="animate-spin text-[#2563EB]" />
                            <span className="text-xs font-medium">Loading corporate directory...</span>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="py-12 text-center text-slate-400 text-xs">
                            No matching personnel found
                        </div>
                    ) : (
                        filtered.map(emp => {
                            const isAlreadyMember = currentMemberIds.includes(String(emp.id));
                            const isSelected = selectedIds.includes(String(emp.id));

                            return (
                                <div 
                                    key={emp.id}
                                    onClick={() => !isAlreadyMember && toggleSelect(String(emp.id))}
                                    className={`p-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                                        isAlreadyMember 
                                            ? 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
                                            : isSelected
                                                ? 'bg-blue-50/60 border-blue-200 shadow-xs'
                                                : 'bg-white border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/40'
                                    }`}
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-9 h-9 rounded-lg bg-[#17213D] text-white flex items-center justify-center font-bold text-xs shrink-0">
                                            {emp.name?.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <h4 className="text-xs font-bold text-[#17213D] truncate">{emp.name}</h4>
                                                {isAlreadyMember && (
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-200/70 px-1.5 py-0.2 rounded">
                                                        Already in {unitLabel}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[11px] text-slate-500 truncate mt-0.5">
                                                {emp.position || 'Staff'} · <span className="text-slate-400">{emp.department || 'Unassigned'}</span>
                                            </p>
                                        </div>
                                    </div>

                                    {!isAlreadyMember && (
                                        <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                                            isSelected 
                                                ? 'bg-[#2563EB] border-[#2563EB] text-white' 
                                                : 'border-slate-300 bg-white'
                                        }`}>
                                            {isSelected && <Check size={12} strokeWidth={3} />}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer Actions */}
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-500">
                        {selectedIds.length} personnel selected
                    </span>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 bg-white text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-colors shadow-xs"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            disabled={submitting || selectedIds.length === 0}
                            onClick={handleAssign}
                            className="px-5 py-2 bg-[#2563EB] hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-all shadow-xs disabled:opacity-50 disabled:pointer-events-none flex items-center gap-2 active:scale-[0.98]"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 size={14} className="animate-spin" />
                                    <span>Assigning...</span>
                                </>
                            ) : (
                                <span>Assign to {unitLabel}</span>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default AssignMembersModal;
