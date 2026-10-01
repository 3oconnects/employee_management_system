import React, { useState } from 'react';
import { GraduationCap, Edit2, Trash2, Plus, Save, Loader2, X, Building, Calendar, Award } from 'lucide-react';
import api from '../../../services/api';
import type { EduEntry } from '../../employees/components/modals/shared';
import { toast } from '../../../components/ui';

const DEGREES = [
    'High School / Secondary',
    'Diploma / Associate',
    "Bachelor's Degree (B.Tech / B.E / B.Sc)",
    "Bachelor's Degree (B.Com / BBA / BA)",
    "Master's Degree (M.Tech / M.E / M.Sc)",
    "Master's Degree (MBA / MCA / MA)",
    'Doctorate / Ph.D.',
    'Postgraduate Diploma',
    'Certification / Other',
];

const BLANK: EduEntry = { degree: '', field: '', institution: '', year: '', grade: '' };

interface Props {
    empId: string | null;
    isOwn: boolean;
    list: EduEntry[];
    setList: React.Dispatch<React.SetStateAction<EduEntry[]>>;
}

const EducationTab: React.FC<Props> = ({ empId, isOwn, list, setList }) => {
    const [saving, setSaving] = useState(false);
    const [modal, setModal] = useState<{ open: boolean; idx: number | null; form: EduEntry }>({
        open: false,
        idx: null,
        form: BLANK,
    });

    const openAdd  = () => setModal({ open: true, idx: null, form: { ...BLANK } });
    const openEdit = (i: number) => setModal({ open: true, idx: i, form: { ...list[i] } });
    const close    = () => setModal(m => ({ ...m, open: false }));
    const set      = (patch: Partial<EduEntry>) => setModal(m => ({ ...m, form: { ...m.form, ...patch } }));

    const syncToApi = async (entries: EduEntry[]) => {
        if (!empId) return;
        setSaving(true);
        try {
            await api.put(`/employees/${empId}/education`, { entries });
            toast.success('Education history updated');
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to update education');
            throw err;
        } finally {
            setSaving(false);
        }
    };

    const handleSave = async () => {
        if (!modal.form.degree) {
            toast.error('Please select a degree or qualification');
            return;
        }
        if (!modal.form.institution) {
            toast.error('Please enter the institution / university');
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
        if (!window.confirm('Are you sure you want to remove this education record?')) return;
        const next = list.filter((_, idx) => idx !== i);
        const prev = list;
        setList(next);
        try {
            await syncToApi(next);
        } catch {
            setList(prev);
        }
    };

    return (
        <>
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                            <GraduationCap size={16} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-800">Education & Academics</h3>
                            <p className="text-xs text-slate-400">Previous degrees, universities, and academic records</p>
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
                            <Plus size={13} /> Add Qualification
                        </button>
                    )}
                </div>

                <div className="p-6">
                    {list.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {list.map((e, i) => (
                                <div
                                    key={i}
                                    className="p-5 bg-white rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all group relative flex flex-col justify-between"
                                >
                                    <div>
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-indigo-50/80 border border-indigo-100 flex items-center justify-center text-indigo-600 flex-shrink-0">
                                                    <GraduationCap size={18} />
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-bold text-slate-900 leading-snug">
                                                        {e.degree}
                                                    </h4>
                                                    {e.field && (
                                                        <p className="text-xs font-medium text-indigo-600 mt-0.5">
                                                            {e.field}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            {isOwn && (
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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

                                        <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                                            <div className="flex items-center gap-2">
                                                <Building size={13} className="text-slate-400 flex-shrink-0" />
                                                <span className="font-medium truncate">{e.institution}</span>
                                            </div>
                                            <div className="flex items-center justify-between text-slate-500 pt-1">
                                                <span className="flex items-center gap-1.5">
                                                    <Calendar size={13} className="text-slate-400" />
                                                    Year: <strong className="text-slate-700">{e.year || '—'}</strong>
                                                </span>
                                                {e.grade && (
                                                    <span className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md font-semibold text-[11px] border border-emerald-100">
                                                        <Award size={12} />
                                                        {e.grade}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center py-16 text-center">
                            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                                <GraduationCap size={26} />
                            </div>
                            <h4 className="text-sm font-bold text-slate-700">No Education Records</h4>
                            <p className="text-xs text-slate-400 max-w-sm mt-1">
                                Add your previous degrees, diplomas, and certifications to keep your employee file complete.
                            </p>
                            {isOwn && (
                                <button
                                    onClick={openAdd}
                                    className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-all shadow-xs"
                                >
                                    + Add Academic Qualification
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
                                    {modal.idx !== null ? 'Edit Academic Qualification' : 'Add Academic Qualification'}
                                </h3>
                                <p className="text-xs text-slate-500">Enter degree and university credentials</p>
                            </div>
                            <button
                                onClick={close}
                                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-200 text-slate-400 transition-colors"
                            >
                                <X size={15} />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                    Degree / Qualification <span className="text-rose-500">*</span>
                                </label>
                                <select
                                    value={modal.form.degree}
                                    onChange={e => set({ degree: e.target.value })}
                                    className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-50 outline-none transition-all"
                                >
                                    <option value="">Select qualification</option>
                                    {DEGREES.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                    Field of Study / Specialization
                                </label>
                                <input
                                    value={modal.form.field}
                                    onChange={e => set({ field: e.target.value })}
                                    placeholder="e.g. Computer Science, Artificial Intelligence, Business"
                                    className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-50 outline-none transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                    University / Institution <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    value={modal.form.institution}
                                    onChange={e => set({ institution: e.target.value })}
                                    placeholder="e.g. Stanford University / IIT Delhi"
                                    className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-50 outline-none transition-all"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                        Completion Year
                                    </label>
                                    <input
                                        type="number"
                                        value={modal.form.year}
                                        onChange={e => set({ year: e.target.value })}
                                        placeholder="2023"
                                        min="1970"
                                        max="2035"
                                        className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-50 outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                        Grade / GPA / Percentage
                                    </label>
                                    <input
                                        value={modal.form.grade}
                                        onChange={e => set({ grade: e.target.value })}
                                        placeholder="e.g. 9.1 CGPA / First Class"
                                        className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-50 outline-none transition-all"
                                    />
                                </div>
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
                                {saving ? 'Saving...' : 'Save Qualification'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default EducationTab;
