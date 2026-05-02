import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import api from '../../../../services/api';
import {
    X, Loader2, UserPlus, AlertCircle, ChevronRight,
    User, Building2, CreditCard, GraduationCap, Briefcase
} from 'lucide-react';
import { AddEmployeeForm, EduEntry, ExpEntry, inputCls, EMP_TYPES, emptyEdu, emptyExp } from './shared';
import Field from './Field';
import ManagerPicker from './ManagerPicker';
import EducationSection from './EducationSection';
import ExperienceSection from './ExperienceSection';

const TABS = [
    {id:'personal',   label:'Personal',   Icon:User},
    {id:'work',       label:'Work',       Icon:Building2},
    {id:'payroll',    label:'Payroll',    Icon:CreditCard},
    {id:'education',  label:'Education',  Icon:GraduationCap},
    {id:'experience', label:'Experience', Icon:Briefcase},
] as const;
type TabId = typeof TABS[number]['id'];

interface Props {
    show: boolean; onClose: () => void; onSubmit: (e: React.FormEvent) => void;
    form: AddEmployeeForm; setForm: React.Dispatch<React.SetStateAction<AddEmployeeForm>>;
    loading: boolean; error: string;
}

const AddEmployeeModal: React.FC<Props> = ({ show, onClose, onSubmit, form, setForm, loading, error }) => {
    const [tab, setTab] = useState<TabId>('personal');
    const [eduList, setEduList] = useState<EduEntry[]>([]);
    const [expList, setExpList] = useState<ExpEntry[]>([]);
    if (!show) return null;

    const set = (k: keyof AddEmployeeForm) => (e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement>) =>
        setForm(f => ({...f, [k]: e.target.value}));

    const handleSubmit = (e: React.FormEvent) => {
        setForm(f => ({...f,
            educationHistory: JSON.stringify(eduList) as any,
            experienceHistory: JSON.stringify(expList) as any,
        }));
        onSubmit(e);
    };

    const nextTab = () => {
        if (tab==='personal')  setTab('work');
        else if (tab==='work')       setTab('payroll');
        else if (tab==='payroll')    setTab('education');
        else if (tab==='education')  setTab('experience');
    };
    const isLast   = tab === 'experience';
    const isIntern = form.employmentType === 'intern';

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose}>
            <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300"
                onClick={e => e.stopPropagation()}>

                {/* ── Header ── */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shadow-sm">
                            <UserPlus size={16} className="text-white"/>
                        </div>
                        <div>
                            <h3 className="text-[15px] font-black text-slate-800">Add New Employee</h3>
                            <p className="text-[11px] text-slate-400">Complete all sections to create the employee profile</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 rounded-lg transition-all text-slate-400">
                        <X size={16}/>
                    </button>
                </div>

                {/* ── Tab bar ── */}
                <div className="flex border-b border-slate-100 bg-white flex-shrink-0">
                    {TABS.map((t, idx) => (
                        <button key={t.id} onClick={() => setTab(t.id)}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 text-[12px] font-bold transition-all border-b-2
                                ${tab===t.id ? 'border-indigo-600 text-indigo-600 bg-indigo-50/40' : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}>
                            <t.Icon size={13}/>
                            <span>{t.label}</span>
                            <span className={`w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center
                                ${tab===t.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>{idx+1}</span>
                        </button>
                    ))}
                </div>

                {/* ── Body (scrollable) ── */}
                <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-6">
                        {error && (
                            <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-4 py-3 text-[12px] font-semibold flex items-center gap-2">
                                <AlertCircle size={14}/> {error}
                            </div>
                        )}

                        {tab==='personal'   && <PersonalTab form={form} set={set}/>}
                        {tab==='work'        && <WorkTab form={form} set={set} setForm={setForm} isIntern={isIntern}/>}
                        {tab==='payroll'     && <PayrollTab form={form} set={set}/>}
                        {tab==='education'   && <EducationSection  list={eduList} setList={setEduList}/>}
                        {tab==='experience'  && <ExperienceSection list={expList} setList={setExpList}/>}
                    </div>

                    {/* ── Footer ── */}
                    <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-3 flex-shrink-0">
                        <div className="flex items-center gap-1.5">
                            {TABS.map(t => (
                                <div key={t.id} className={`h-1.5 rounded-full transition-all duration-300 ${tab===t.id ? 'w-6 bg-indigo-600' : 'w-1.5 bg-slate-200'}`}/>
                            ))}
                        </div>
                        <div className="flex items-center gap-2">
                            <button type="button" onClick={onClose}
                                className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-[12px] font-bold hover:bg-slate-50 transition-all">
                                Cancel
                            </button>
                            {!isLast ? (
                                <button type="button" onClick={nextTab}
                                    className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-xl text-[12px] font-bold hover:bg-indigo-500 transition-all">
                                    Next <ChevronRight size={13}/>
                                </button>
                            ) : (
                                <button type="submit" disabled={loading}
                                    className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-xl text-[12px] font-bold shadow-md shadow-indigo-600/20 hover:bg-indigo-500 transition-all disabled:opacity-50">
                                    {loading ? <Loader2 size={13} className="animate-spin"/> : <UserPlus size={13}/>}
                                    {loading ? 'Creating…' : 'Create Employee'}
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

/* ── Tab sub-components (inline, small) ── */
const PersonalTab: React.FC<{form:AddEmployeeForm; set:any}> = ({form,set}) => (
    <div className="space-y-4">
        <Field label="Full Name *"><input required type="text" placeholder="e.g. Priya Sharma" value={form.name} onChange={set('name')} className={inputCls}/></Field>
        <div className="grid grid-cols-2 gap-4">
            <Field label="Work Email *"><input required type="email" placeholder="priya@company.com" value={form.email} onChange={set('email')} className={inputCls}/></Field>
            <Field label="Personal Email"><input type="email" placeholder="priya@gmail.com" value={form.personalEmail} onChange={set('personalEmail')} className={inputCls}/></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
            <Field label="Phone"><input type="tel" placeholder="+91 98765 43210" value={form.phone} onChange={set('phone')} className={inputCls}/></Field>
            <Field label="Date of Birth"><input type="date" value={form.dateOfBirth} onChange={set('dateOfBirth')} className={inputCls}/></Field>
        </div>
        <Field label="Gender">
            <select value={form.gender} onChange={set('gender')} className={`${inputCls} appearance-none cursor-pointer`}>
                <option value="">Select gender</option>
                <option value="male">Male</option><option value="female">Female</option>
                <option value="non_binary">Non-Binary</option><option value="prefer_not_to_say">Prefer not to say</option>
            </select>
        </Field>
        <div className="border-t border-slate-100 pt-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-3">Address</p>
            <Field label="Street Address"><input type="text" placeholder="123 Main Street" value={form.addressLine1} onChange={set('addressLine1')} className={inputCls}/></Field>
            <div className="grid grid-cols-3 gap-3 mt-3">
                <Field label="City"><input type="text" placeholder="Mumbai" value={form.city} onChange={set('city')} className={inputCls}/></Field>
                <Field label="State"><input type="text" placeholder="Maharashtra" value={form.state} onChange={set('state')} className={inputCls}/></Field>
                <Field label="Pincode"><input type="text" placeholder="400001" value={form.pincode} onChange={set('pincode')} className={inputCls}/></Field>
            </div>
        </div>
    </div>
);

const WorkTab: React.FC<{form:AddEmployeeForm; set:any; setForm:any; isIntern:boolean}> = ({form,set,setForm,isIntern}) => {
    const [departments, setDepartments] = useState<any[]>([]);
    const [teams, setTeams] = useState<any[]>([]);

    useEffect(() => {
        api.get('/organization/departments').then(res => setDepartments(res.data.data || []));
    }, []);

    useEffect(() => {
        if (form.department_id) {
            api.get(`/organization/teams?department_id=${form.department_id}`).then(res => setTeams(res.data.data || []));
        } else {
            setTeams([]);
        }
    }, [form.department_id]);

    const handleDeptChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const deptId = e.target.value;
        const deptName = departments.find(d => d.id.toString() === deptId)?.name || '';
        setForm((f: any) => ({ ...f, department_id: deptId, department: deptName, team_id: '' }));
    };

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <Field label="Department *">
                    <select required value={form.department_id} onChange={handleDeptChange} className={`${inputCls} appearance-none cursor-pointer`}>
                        <option value="">Select department</option>
                        {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                </Field>
                <Field label="Team / Squad">
                    <select value={form.team_id} onChange={set('team_id')} className={`${inputCls} appearance-none cursor-pointer`} disabled={!form.department_id}>
                        <option value="">Select team</option>
                        {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <Field label="Position / Role"><input type="text" placeholder="e.g. Senior Engineer" value={form.position} onChange={set('position')} className={inputCls}/></Field>
                <Field label="Join Date *"><input required type="date" value={form.joinDate} onChange={set('joinDate')} className={inputCls}/></Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <Field label="Employment Type">
                    <select value={form.employmentType} onChange={set('employmentType')} className={`${inputCls} appearance-none cursor-pointer`}>
                        {EMP_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                </Field>
                <Field label="Reporting Manager">
                    <ManagerPicker value={form.reportingManagerId} displayName={form.reportingManagerName}
                        onChange={(id,name) => setForm((f:any) => ({...f, reportingManagerId:id, reportingManagerName:name}))}/>
                </Field>
            </div>
            {isIntern && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                    <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wide">Internship Details</p>
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Start Date *"><input required type="date" value={form.internshipStartDate} onChange={set('internshipStartDate')} className={inputCls}/></Field>
                        <Field label="End Date *"><input required type="date" value={form.internshipEndDate} onChange={set('internshipEndDate')} className={inputCls}/></Field>
                    </div>
                    {form.internshipStartDate && form.internshipEndDate && (() => {
                        const d = Math.ceil((new Date(form.internshipEndDate).getTime()-new Date(form.internshipStartDate).getTime())/86400000);
                        return d>0 ? <div className="flex justify-between bg-amber-100 rounded-lg px-3 py-2 text-[10px] font-bold text-amber-700"><span>Duration</span><span>{Math.round(d/30)} months ({d} days)</span></div> : null;
                    })()}
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Monthly Stipend (₹)"><input type="number" placeholder="e.g. 15000" value={form.internshipStipend} onChange={set('internshipStipend')} className={inputCls}/></Field>
                        <Field label="Supervisor"><input type="text" placeholder="Supervisor name" value={form.internshipSupervisor} onChange={set('internshipSupervisor')} className={inputCls}/></Field>
                    </div>
                    <Field label="College / Institute"><input type="text" placeholder="e.g. VIT University" value={form.internshipCollege} onChange={set('internshipCollege')} className={inputCls}/></Field>
                </div>
            )}
            <Field label="Initial Status">
                <div className="grid grid-cols-3 gap-2">
                    {[{val:'onboarding',label:'Onboarding',color:'bg-amber-50 border-amber-300 text-amber-700'},{val:'active',label:'Active',color:'bg-emerald-50 border-emerald-300 text-emerald-700'},{val:'terminated',label:'Terminated',color:'bg-rose-50 border-rose-300 text-rose-700'}].map(s=>(
                        <button key={s.val} type="button" onClick={()=>setForm((f:any)=>({...f,status:s.val}))}
                            className={`py-2.5 rounded-xl border text-[11px] font-bold transition-all ${form.status===s.val?s.color:'bg-slate-50 border-slate-200 text-slate-400 hover:bg-white'}`}>
                            {s.label}
                        </button>
                    ))}
                </div>
            </Field>
        </div>
    );
};

const PayrollTab: React.FC<{form:AddEmployeeForm; set:any}> = ({form,set}) => (
    <div className="space-y-4">
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 text-[11px] text-indigo-700 font-medium">
            💡 CTC breakdown (Basic 50%, HRA 20%, Allowances 25%, Bonus 5%) is calculated automatically.
        </div>
        <Field label="Annual CTC (₹) *"><input required type="number" placeholder="e.g. 800000" value={form.annualCTC} onChange={set('annualCTC')} className={inputCls}/></Field>
        <div className="grid grid-cols-2 gap-4">
            <Field label="Bank Account No."><input type="text" placeholder="Optional" value={form.bankAccountNumber} onChange={set('bankAccountNumber')} className={inputCls}/></Field>
            <Field label="Tax Regime">
                <select value={form.taxRegime} onChange={set('taxRegime')} className={`${inputCls} appearance-none cursor-pointer`}>
                    <option value="New">New Regime</option><option value="Old">Old Regime</option>
                </select>
            </Field>
        </div>
        {form.annualCTC && Number(form.annualCTC) > 0 && (
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-3">Monthly Breakdown Preview</p>
                <div className="grid grid-cols-2 gap-2">
                    {[{label:'Basic Salary',pct:0.50},{label:'HRA',pct:0.20},{label:'Allowances',pct:0.25},{label:'Bonus',pct:0.05}].map(row => {
                        const val = Math.round(Number(form.annualCTC)/12*row.pct);
                        return <div key={row.label} className="bg-white rounded-lg px-3 py-2 flex items-center justify-between border border-slate-100"><span className="text-[11px] text-slate-500">{row.label}</span><span className="text-[12px] font-bold text-slate-800">₹{val.toLocaleString('en-IN')}</span></div>;
                    })}
                </div>
                <div className="mt-2 flex items-center justify-between bg-indigo-600 text-white rounded-lg px-3 py-2">
                    <span className="text-[11px] font-semibold">Total Monthly Gross</span>
                    <span className="text-[13px] font-black">₹{Math.round(Number(form.annualCTC)/12).toLocaleString('en-IN')}</span>
                </div>
            </div>
        )}
    </div>
);

export default AddEmployeeModal;
