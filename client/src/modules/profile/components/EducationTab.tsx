import React, { useState } from 'react';
import { GraduationCap, Edit2, Trash2, Plus, Save, Loader2, X } from 'lucide-react';
import api from '../../../services/api';
import type { EduEntry } from '../../employees/components/modals/shared';

const DEGREES = [
    'High School', 'Diploma',
    "Bachelor's (B.E/B.Tech/B.Sc)", "Bachelor's (B.Com/BBA)",
    "Master's (M.Tech/M.Sc)", "Master's (MBA/MCA)",
    'PhD / Doctorate', 'Other',
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
        open: false, idx: null, form: BLANK,
    });

    const openAdd  = () => setModal({ open: true, idx: null, form: { ...BLANK } });
    const openEdit = (i: number) => setModal({ open: true, idx: i, form: { ...list[i] } });
    const close    = () => setModal(m => ({ ...m, open: false }));
    const set      = (patch: Partial<EduEntry>) => setModal(m => ({ ...m, form: { ...m.form, ...patch } }));

    const syncToApi = async (entries: EduEntry[]) => {
        if (!empId) return;
        setSaving(true);
        try   { await api.put(`/employees/${empId}/education`, { entries }); }
        catch { throw new Error('Save failed'); }
        finally { setSaving(false); }
    };

    const handleSave = async () => {
        const next = modal.idx !== null
            ? list.map((e, i) => (i === modal.idx ? modal.form : e))
            : [...list, modal.form];
        const prev = list;
        setList(next);
        try   { await syncToApi(next); close(); }
        catch (err: any) { alert(err.message); setList(prev); }
    };

    const handleDelete = async (i: number) => {
        const next = list.filter((_, idx) => idx !== i);
        const prev = list;
        setList(next);
        try   { await syncToApi(next); }
        catch { setList(prev); }
    };

    return (
        <>
            {/* ── Card list ── */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-2">
                        <GraduationCap size={14} className="text-indigo-500"/>
                        <h3 className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">Education History</h3>
                        <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[10px] font-bold">{list.length}</span>
                    </div>
                    {isOwn && (
                        <button onClick={openAdd} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-[11px] font-bold hover:bg-indigo-500 transition-all">
                            <Plus size={11}/> Add Education
                        </button>
                    )}
                </div>

                <div className="p-5">
                    {list.length > 0 ? (
                        <div className="space-y-3">
                            {list.map((e, i) => (
                                <div key={i} className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-indigo-100 transition-colors group">
                                    <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center flex-shrink-0">
                                        <GraduationCap size={16} className="text-indigo-500"/>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[13px] font-bold text-slate-800">{e.degree}{e.field ? ` — ${e.field}` : ''}</p>
                                        <p className="text-[12px] text-slate-500 mt-0.5">{e.institution}</p>
                                        <p className="text-[11px] text-slate-400 mt-0.5">{e.year}{e.grade ? ` · ${e.grade}` : ''}</p>
                                    </div>
                                    {isOwn && (
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => openEdit(i)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-300 transition-all"><Edit2 size={11}/></button>
                                            <button onClick={() => handleDelete(i)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-rose-500 hover:border-rose-300 transition-all"><Trash2 size={11}/></button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center py-14 text-slate-300">
                            <GraduationCap size={36} className="mb-3"/>
                            <p className="text-[13px] font-semibold text-slate-400">No education history added</p>
                            {isOwn && <button onClick={openAdd} className="mt-4 px-4 py-2 text-[11px] font-bold text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-all">+ Add Education</button>}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Modal ── */}
            {modal.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-100 overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
                            <h3 className="text-[14px] font-black text-slate-800">{modal.idx !== null ? 'Edit Education' : 'Add Education'}</h3>
                            <button onClick={close} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-200 text-slate-400 transition-all"><X size={14}/></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Degree / Qualification</label>
                                    <select value={modal.form.degree} onChange={e => set({ degree: e.target.value })}
                                        className="w-full px-3 py-2.5 text-[13px] bg-white border border-slate-200 rounded-xl focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 outline-none">
                                        <option value="">Select degree</option>
                                        {DEGREES.map(d => <option key={d}>{d}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Field of Study</label>
                                    <input value={modal.form.field} onChange={e => set({ field: e.target.value })} placeholder="e.g. Computer Science"
                                        className="w-full px-3 py-2.5 text-[13px] bg-white border border-slate-200 rounded-xl focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 outline-none"/>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Institution / University</label>
                                    <input value={modal.form.institution} onChange={e => set({ institution: e.target.value })} placeholder="e.g. IIT Bombay"
                                        className="w-full px-3 py-2.5 text-[13px] bg-white border border-slate-200 rounded-xl focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 outline-none"/>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Year</label>
                                    <input type="number" value={modal.form.year} onChange={e => set({ year: e.target.value })} placeholder="2022" min="1970" max="2030"
                                        className="w-full px-3 py-2.5 text-[13px] bg-white border border-slate-200 rounded-xl focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 outline-none"/>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Grade / Percentage / CGPA</label>
                                <input value={modal.form.grade} onChange={e => set({ grade: e.target.value })} placeholder="e.g. 8.5 CGPA or 85%"
                                    className="w-full px-3 py-2.5 text-[13px] bg-white border border-slate-200 rounded-xl focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 outline-none"/>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50">
                            <button onClick={close} className="px-4 py-2 text-[12px] font-semibold text-slate-500 hover:text-slate-700 transition-colors">Cancel</button>
                            <button disabled={saving} onClick={handleSave}
                                className="flex items-center gap-1.5 px-5 py-2 bg-indigo-600 text-white rounded-xl text-[12px] font-bold hover:bg-indigo-500 transition-all disabled:opacity-50">
                                {saving ? <Loader2 size={12} className="animate-spin"/> : <Save size={12}/>}
                                {saving ? 'Saving…' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default EducationTab;
