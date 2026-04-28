import React from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, Pencil, AlertCircle } from 'lucide-react';
import { EditEmployeeForm, inputCls, DEPTS } from './shared';
import Field from './Field';
import ManagerPicker from './ManagerPicker';

interface Props {
    show: boolean; onClose: () => void; onSubmit: (e: React.FormEvent) => void;
    form: EditEmployeeForm; setForm: React.Dispatch<React.SetStateAction<EditEmployeeForm>>;
    loading: boolean; error: string; employeeId: string | null;
}

const EditEmployeeModal: React.FC<Props> = ({ show, onClose, onSubmit, form, setForm, loading, error }) => {
    if (!show) return null;

    const STATUS_OPTIONS = [
        {val:'active',     label:'Active',     cls:'bg-emerald-50 border-emerald-300 text-emerald-700'},
        {val:'onboarding', label:'Onboarding', cls:'bg-amber-50 border-amber-300 text-amber-700'},
        {val:'terminated', label:'Terminated', cls:'bg-rose-50 border-rose-300 text-rose-700'},
    ];

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={onClose}>
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-300"
                onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-violet-600 rounded-xl flex items-center justify-center shadow-sm">
                            <Pencil size={15} className="text-white"/>
                        </div>
                        <div>
                            <h3 className="text-[15px] font-black text-slate-800">Edit Employee</h3>
                            <p className="text-[11px] text-slate-400">Update employee information</p>
                        </div>
                    </div>
                    <button onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 rounded-lg transition-all text-slate-400">
                        <X size={16}/>
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={onSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-4 py-3 text-[12px] font-semibold flex items-center gap-2">
                            <AlertCircle size={14}/> {error}
                        </div>
                    )}

                    <Field label="Full Name *">
                        <input required type="text" value={form.name}
                            onChange={e => setForm(f => ({...f, name: e.target.value}))} className={inputCls}/>
                    </Field>

                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Work Email">
                            <input type="email" value={form.email}
                                onChange={e => setForm(f => ({...f, email: e.target.value}))} className={inputCls}/>
                        </Field>
                        <Field label="Join Date">
                            <input type="date" value={form.joinDate}
                                onChange={e => setForm(f => ({...f, joinDate: e.target.value}))} className={inputCls}/>
                        </Field>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Department *">
                            <select required value={form.department}
                                onChange={e => setForm(f => ({...f, department: e.target.value}))}
                                className={`${inputCls} appearance-none cursor-pointer`}>
                                {DEPTS.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </Field>
                        <Field label="Position / Role *">
                            <input required type="text" value={form.position}
                                onChange={e => setForm(f => ({...f, position: e.target.value}))} className={inputCls}/>
                        </Field>
                    </div>

                    <Field label="Reporting Manager">
                        <ManagerPicker 
                            value={form.reportingManagerId || ''} 
                            displayName={form.reportingManagerName || ''}
                            onChange={(id, name) => setForm(f => ({...f, reportingManagerId: id, reportingManagerName: name}))}
                        />
                    </Field>

                    <Field label="Status">
                        <div className="grid grid-cols-3 gap-2">
                            {STATUS_OPTIONS.map(s => (
                                <button key={s.val} type="button" onClick={() => setForm(f => ({...f, status: s.val}))}
                                    className={`py-2.5 rounded-xl border text-[11px] font-bold transition-all
                                        ${form.status===s.val ? s.cls : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-white'}`}>
                                    {s.label}
                                </button>
                            ))}
                        </div>
                    </Field>

                    <div className="flex gap-3 pt-2 border-t border-slate-100">
                        <button type="button" onClick={onClose}
                            className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-[12px] font-bold hover:bg-slate-50 transition-all">
                            Cancel
                        </button>
                        <button type="submit" disabled={loading}
                            className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-[12px] font-bold shadow-md shadow-indigo-600/20 hover:bg-indigo-500 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                            {loading ? <Loader2 size={13} className="animate-spin"/> : <Pencil size={13}/>}
                            {loading ? 'Saving…' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
};

export default EditEmployeeModal;
