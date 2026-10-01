import React, { useState } from 'react';
import { Briefcase, Edit2, Trash2, Plus, Save, Loader2, X, Building, Calendar, CheckCircle2 } from 'lucide-react';
import api from '../../../services/api';
import type { ExpEntry } from '../../employees/components/modals/shared';
import { toast } from '../../../components/ui';

const BLANK: ExpEntry = { jobTitle: '', company: '', startDate: '', endDate: '', current: false, description: '' };

interface Props {
    empId: string | null;
    isOwn: boolean;
    list: ExpEntry[];
    setList: React.Dispatch<React.SetStateAction<ExpEntry[]>>;
}

const ExperienceTab: React.FC<Props> = ({ empId, isOwn, list, setList }) => {
    const [saving, setSaving] = useState(false);
    const [modal, setModal] = useState<{ open: boolean; idx: number | null; form: ExpEntry }>({
        open: false,
        idx: null,
        form: BLANK,
    });

    const openAdd  = () => setModal({ open: true, idx: null, form: { ...BLANK } });
    const openEdit = (i: number) => setModal({ open: true, idx: i, form: { ...list[i] } });
    const close    = () => setModal(m => ({ ...m, open: false }));
    const set      = (patch: Partial<ExpEntry>) => setModal(m => ({ ...m, form: { ...m.form, ...patch } }));

    const syncToApi = async (entries: ExpEntry[]) => {
        if (!empId) return;
        setSaving(true);
        try {
            await api.put(`/employees/${empId}/experience`, { entries });
            toast.success('Work experience updated');
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to update experience');
            throw err;
        } finally {
            setSaving(false);
        }
    };

    const handleSave = async () => {
        if (!modal.form.jobTitle?.trim()) {
            toast.error('Please enter the job title');
            return;
        }
        if (!modal.form.company?.trim()) {
            toast.error('Please enter the company name');
            return;
        }

        const next = modal.idx !== null
            ? list.map((e, i) => (i === modal.idx ? modal.form : e))
            : [...list, modal.form];
        const prev = list;
        setList(next);
        try {
            await syncToApi(next);
            close();
        } catch {
            setList(prev);
        }
    };

    const handleDelete = async (i: number) => {
        if (!window.confirm('Are you sure you want to remove this experience record?')) return;
        const next = list.filter((_, idx) => idx !== i);
        const prev = list;
        setList(next);
        try {
            await syncToApi(next);
        } catch {
            setList(prev);
        }
    };

    const formatDate = (d?: string) => {
        if (!d) return '';
        try {
            return new Date(d).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
        } catch {
            return d;
        }
    };

    return (
        <>
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                            <Briefcase size={16} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-800">Career & Work Experience</h3>
                            <p className="text-xs text-slate-400">Previous companies, job positions, and roles held</p>
                        </div>
                        <span className="ml-2 px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-xs font-semibold">
                            {list.length}
                        </span>
                    </div>

                    {isOwn && (
                        <button
                            onClick={openAdd}
                            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-all shadow-xs"
                        >
                            <Plus size={13} /> Add Experience
                        </button>
                    )}
                </div>

                <div className="p-6">
                    {list.length > 0 ? (
                        <div className="space-y-4">
                            {list.map((e, i) => (
                                <div
                                    key={i}
                                    className="p-5 bg-white rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all group"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-start gap-3.5">
                                            <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 flex-shrink-0 mt-0.5">
                                                <Building size={18} />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <h4 className="text-sm font-bold text-slate-900">
                                                        {e.jobTitle}
                                                    </h4>
                                                    {e.current && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                            <CheckCircle2 size={10} /> CURRENT ROLE
                                                        </span>
                                                    )}
                                                </div>

                                                <p className="text-xs font-medium text-slate-700 mt-0.5">
                                                    {e.company}
                                                </p>

                                                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                                                    <Calendar size={12} className="text-slate-400" />
                                                    {formatDate(e.startDate)} — {e.current ? 'Present' : (formatDate(e.endDate) || '—')}
                                                </p>

                                                {e.description && (
                                                    <p className="text-xs text-slate-600 mt-3 pt-3 border-t border-slate-100 leading-relaxed whitespace-pre-line">
                                                        {e.description}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {isOwn && (
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                                <button
                                                    onClick={() => openEdit(i)}
                                                    className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                                                    title="Edit"
                                                >
                                                    <Edit2 size={13} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(i)}
                                                    className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center py-16 text-center">
                            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                                <Briefcase size={26} />
                            </div>
                            <h4 className="text-sm font-bold text-slate-700">No Prior Experience Added</h4>
                            <p className="text-xs text-slate-400 max-w-sm mt-1">
                                Record your previous employment history, roles, and accomplishments.
                            </p>
                            {isOwn && (
                                <button
                                    onClick={openAdd}
                                    className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-all shadow-xs"
                                >
                                    + Add Work Experience
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Modal */}
            {modal.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 animate-in fade-in duration-150">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
                            <div>
                                <h3 className="text-sm font-bold text-slate-900">
                                    {modal.idx !== null ? 'Edit Experience' : 'Add Work Experience'}
                                </h3>
                                <p className="text-xs text-slate-500">Record your previous role and organization</p>
                            </div>
                            <button
                                onClick={close}
                                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-200 text-slate-400 transition-colors"
                            >
                                <X size={15} />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                        Job Title / Role <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        value={modal.form.jobTitle}
                                        onChange={e => set({ jobTitle: e.target.value })}
                                        placeholder="e.g. Senior Software Engineer"
                                        className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-50 outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                        Company / Organization <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        value={modal.form.company}
                                        onChange={e => set({ company: e.target.value })}
                                        placeholder="e.g. Google / Microsoft"
                                        className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-50 outline-none transition-all"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                        Start Date
                                    </label>
                                    <input
                                        type="date"
                                        value={modal.form.startDate}
                                        onChange={e => set({ startDate: e.target.value })}
                                        className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-50 outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                        End Date
                                    </label>
                                    <input
                                        type="date"
                                        value={modal.form.endDate}
                                        disabled={modal.form.current}
                                        onChange={e => set({ endDate: e.target.value })}
                                        className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-50 outline-none transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                    />
                                </div>
                            </div>

                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={modal.form.current}
                                    onChange={e => set({ current: e.target.checked, endDate: e.target.checked ? '' : modal.form.endDate })}
                                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                                />
                                <span className="text-xs font-medium text-slate-700">I currently work in this role</span>
                            </label>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                    Responsibilities & Key Achievements
                                </label>
                                <textarea
                                    value={modal.form.description}
                                    onChange={e => set({ description: e.target.value })}
                                    rows={3}
                                    placeholder="Summarize your main responsibilities, impact, and projects handled..."
                                    className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-50 outline-none transition-all resize-none"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/70">
                            <button
                                onClick={close}
                                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                disabled={saving}
                                onClick={handleSave}
                                className="flex items-center gap-2 px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-all shadow-xs disabled:opacity-50"
                            >
                                {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                                {saving ? 'Saving...' : 'Save Experience'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default ExperienceTab;
