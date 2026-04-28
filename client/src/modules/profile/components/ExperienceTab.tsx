import React, { useState } from 'react';
import { Briefcase, Edit2, Trash2, Plus, Save, Loader2, X } from 'lucide-react';
import api from '../../../services/api';
import type { ExpEntry } from '../../employees/components/modals/shared';

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
        open: false, idx: null, form: BLANK,
    });

    const openAdd  = () => setModal({ open: true, idx: null, form: { ...BLANK } });
    const openEdit = (i: number) => setModal({ open: true, idx: i, form: { ...list[i] } });
    const close    = () => setModal(m => ({ ...m, open: false }));
    const set      = (patch: Partial<ExpEntry>) => setModal(m => ({ ...m, form: { ...m.form, ...patch } }));

    const syncToApi = async (entries: ExpEntry[]) => {
        if (!empId) return;
        setSaving(true);
        try   { await api.put(`/employees/${empId}/experience`, { entries }); }
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
                        <Briefcase size={14} className="text-violet-500"/>
                        <h3 className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">Work Experience</h3>
                        <span className="px-1.5 py-0.5 bg-violet-50 text-violet-600 rounded text-[10px] font-bold">{list.length}</span>
                    </div>
                    {isOwn && (
                        <button onClick={openAdd} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-[11px] font-bold hover:bg-indigo-500 transition-all">
                            <Plus size={11}/> Add Experience
                        </button>
                    )}
                </div>

                <div className="p-5">
                    {list.length > 0 ? (
                        <div className="space-y-3">
                            {list.map((e, i) => (
                                <div key={i} className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-violet-100 transition-colors group">
                                    <div className="w-10 h-10 bg-violet-50 rounded-xl flex items-center justify-center flex-shrink-0">
                                        <Briefcase size={16} className="text-violet-500"/>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="text-[13px] font-bold text-slate-800">{e.jobTitle}</p>
                                            {e.current && <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[9px] font-bold rounded border border-emerald-100 uppercase">Current</span>}
                                        </div>
                                        <p className="text-[12px] text-slate-500 mt-0.5">{e.company}</p>
                                        <p className="text-[11px] text-slate-400 mt-0.5">{e.startDate} — {e.current ? 'Present' : e.endDate}</p>
                                        {e.description && <p className="text-[11px] text-slate-500 mt-2 leading-relaxed border-t border-slate-100 pt-2">{e.description}</p>}
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
                            <Briefcase size={36} className="mb-3"/>
                            <p className="text-[13px] font-semibold text-slate-400">No work experience added</p>
                            {isOwn && <button onClick={openAdd} className="mt-4 px-4 py-2 text-[11px] font-bold text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-all">+ Add Experience</button>}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Modal ── */}
            {modal.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-100 overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
                            <h3 className="text-[14px] font-black text-slate-800">{modal.idx !== null ? 'Edit Experience' : 'Add Experience'}</h3>
                            <button onClick={close} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-200 text-slate-400 transition-all"><X size={14}/></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Job Title / Role</label>
                                    <input value={modal.form.jobTitle} onChange={e => set({ jobTitle: e.target.value })} placeholder="e.g. Software Engineer"
                                        className="w-full px-3 py-2.5 text-[13px] bg-white border border-slate-200 rounded-xl focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 outline-none"/>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Company / Organisation</label>
                                    <input value={modal.form.company} onChange={e => set({ company: e.target.value })} placeholder="e.g. Infosys"
                                        className="w-full px-3 py-2.5 text-[13px] bg-white border border-slate-200 rounded-xl focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 outline-none"/>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Start Date</label>
                                    <input type="date" value={modal.form.startDate} onChange={e => set({ startDate: e.target.value })}
                                        className="w-full px-3 py-2.5 text-[13px] bg-white border border-slate-200 rounded-xl focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 outline-none"/>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">End Date</label>
                                    <input type="date" value={modal.form.endDate} disabled={modal.form.current} onChange={e => set({ endDate: e.target.value })}
                                        className="w-full px-3 py-2.5 text-[13px] bg-white border border-slate-200 rounded-xl focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 outline-none disabled:opacity-40 disabled:cursor-not-allowed"/>
                                </div>
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={modal.form.current}
                                    onChange={e => set({ current: e.target.checked, endDate: e.target.checked ? '' : modal.form.endDate })}
                                    className="w-4 h-4 accent-indigo-600 rounded"/>
                                <span className="text-[12px] font-semibold text-slate-600">Currently working here</span>
                            </label>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Description / Responsibilities</label>
                                <textarea value={modal.form.description} onChange={e => set({ description: e.target.value })} rows={3} placeholder="Brief description of your role..."
                                    className="w-full px-3 py-2.5 text-[13px] bg-white border border-slate-200 rounded-xl focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 outline-none resize-none"/>
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

export default ExperienceTab;
