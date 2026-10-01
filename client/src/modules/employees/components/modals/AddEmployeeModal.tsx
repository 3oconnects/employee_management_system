import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import api from '../../../../services/api';
import {
    X, Loader2, UserPlus, AlertCircle, ChevronRight,
    User, Building2, CreditCard, GraduationCap, Briefcase,
    Sparkles, Check, AtSign
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
    const [emailConflict, setEmailConflict] = useState<{
        hasConflict: boolean;
        message: string;
        checking: boolean;
    }>({ hasConflict: false, message: '', checking: false });
    const [personalEmailConflict, setPersonalEmailConflict] = useState<{
        hasConflict: boolean;
        message: string;
        checking: boolean;
    }>({ hasConflict: false, message: '', checking: false });
    const [suggestions, setSuggestions] = useState<string[]>([]);

    if (!show) return null;

    const set = (k: keyof AddEmployeeForm) => (e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement>) =>
        setForm(f => ({...f, [k]: e.target.value}));

    const handleSubmit = (e: React.FormEvent) => {
        if (emailConflict.hasConflict || personalEmailConflict.hasConflict) {
            setTab('personal');
            return;
        }
        setForm(f => ({...f,
            educationHistory: JSON.stringify(eduList) as any,
            experienceHistory: JSON.stringify(expList) as any,
        }));
        onSubmit(e);
    };

    const hasAnyConflict = Boolean(
        emailConflict.hasConflict || 
        personalEmailConflict.hasConflict || 
        emailConflict.checking || 
        personalEmailConflict.checking
    );

    const nextTab = () => {
        if (tab === 'personal') {
            if (hasAnyConflict || emailConflict.hasConflict || personalEmailConflict.hasConflict) return;
            if (!form.name || !form.name.trim()) return;
            if (!form.email || !form.email.trim()) return;
            setTab('work');
        }
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
                        <button key={t.id} onClick={() => {
                            if (tab === 'personal' && hasAnyConflict && t.id !== 'personal') return;
                            setTab(t.id);
                        }}
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
                                <AlertCircle size={14} className="flex-shrink-0"/> <span>{error}</span>
                            </div>
                        )}

                        {tab==='personal'   && (
                            <PersonalTab 
                                form={form} 
                                set={set} 
                                setForm={setForm}
                                emailConflict={emailConflict}
                                setEmailConflict={setEmailConflict}
                                personalEmailConflict={personalEmailConflict}
                                setPersonalEmailConflict={setPersonalEmailConflict}
                                suggestions={suggestions}
                                setSuggestions={setSuggestions}
                            />
                        )}
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
                                    disabled={tab === 'personal' && hasAnyConflict}
                                    className={`flex items-center gap-2 px-5 py-2 rounded-xl text-[12px] font-bold transition-all ${
                                        tab === 'personal' && hasAnyConflict
                                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                            : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-md shadow-indigo-600/20 active:scale-95'
                                    }`}>
                                    Next <ChevronRight size={13}/>
                                </button>
                            ) : (
                                <button type="submit" disabled={loading || hasAnyConflict}
                                    className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-xl text-[12px] font-bold shadow-md shadow-indigo-600/20 hover:bg-indigo-500 transition-all disabled:opacity-50 active:scale-95">
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

/* ── Tab sub-components ── */
interface PersonalTabProps {
    form: AddEmployeeForm;
    set: any;
    setForm: React.Dispatch<React.SetStateAction<AddEmployeeForm>>;
    emailConflict: { hasConflict: boolean; message: string; checking: boolean };
    setEmailConflict: React.Dispatch<React.SetStateAction<{ hasConflict: boolean; message: string; checking: boolean }>>;
    personalEmailConflict: { hasConflict: boolean; message: string; checking: boolean };
    setPersonalEmailConflict: React.Dispatch<React.SetStateAction<{ hasConflict: boolean; message: string; checking: boolean }>>;
    suggestions: string[];
    setSuggestions: React.Dispatch<React.SetStateAction<string[]>>;
}

const PersonalTab: React.FC<PersonalTabProps> = ({
    form,
    set,
    setForm,
    emailConflict,
    setEmailConflict,
    personalEmailConflict,
    setPersonalEmailConflict,
    suggestions,
    setSuggestions
}) => {
    const [useCustomDomain, setUseCustomDomain] = useState(false);
    const prevEmailRef = useRef<string>(form.email);
    const prevPersonalEmailRef = useRef<string>(form.personalEmail);

    // Fetch 3 unique suggestions when name changes
    useEffect(() => {
        if (!form.name || form.name.trim().length < 2) {
            setSuggestions([]);
            return;
        }

        const timer = setTimeout(() => {
            api.get('/employees/check-email', { params: { name: form.name.trim() } })
                .then(res => {
                    if (res.data?.suggestions && Array.isArray(res.data.suggestions)) {
                        setSuggestions(res.data.suggestions);
                        // If work email is currently blank, auto-populate with the first available suggestion
                        if (!form.email) {
                            setForm(f => ({ ...f, email: res.data.suggestions[0] }));
                        }
                    }
                })
                .catch(() => {});
        }, 350);

        return () => clearTimeout(timer);
    }, [form.name]);

    // Live conflict checking for Work Email — STRICTLY checks only Work Email
    useEffect(() => {
        const clean = (form.email || '').trim();
        if (clean === prevEmailRef.current.trim()) {
            return;
        }
        prevEmailRef.current = form.email;

        if (!clean) {
            setEmailConflict({ hasConflict: false, message: '', checking: false });
            return;
        }

        setEmailConflict(prev => ({ ...prev, checking: true }));

        const timer = setTimeout(() => {
            api.get('/employees/check-email', { params: { email: clean } })
                .then(res => {
                    if (res.data?.available === false) {
                        setEmailConflict({
                            hasConflict: true,
                            message: res.data.message || 'This work email is already in use.',
                            checking: false
                        });
                    } else {
                        setEmailConflict({
                            hasConflict: false,
                            message: '',
                            checking: false
                        });
                    }
                })
                .catch((err) => {
                    console.error('Work email check failed:', err);
                    setEmailConflict(prev => ({ ...prev, checking: false }));
                });
        }, 200);

        return () => clearTimeout(timer);
    }, [form.email]);

    const checkPersonalEmail = async (val: string) => {
        const trimmed = (val || '').trim();
        if (!trimmed) {
            setPersonalEmailConflict({ hasConflict: false, message: '', checking: false });
            return;
        }

        // Guard: check if personal email is identical to work email
        if (form.email && trimmed.toLowerCase() === form.email.trim().toLowerCase()) {
            setPersonalEmailConflict({
                hasConflict: true,
                message: 'Personal email cannot be identical to the corporate work email.',
                checking: false
            });
            return;
        }

        setPersonalEmailConflict(prev => ({ ...prev, checking: true }));

        try {
            const res = await api.get('/employees/check-email', { params: { email: trimmed } });
            if (res.data?.available === false) {
                setPersonalEmailConflict({
                    hasConflict: true,
                    message: res.data.message || 'This personal email is already registered in the system.',
                    checking: false
                });
            } else {
                setPersonalEmailConflict({
                    hasConflict: false,
                    message: '',
                    checking: false
                });
            }
        } catch (err) {
            console.error('Personal email check failed:', err);
            setPersonalEmailConflict(prev => ({ ...prev, checking: false }));
        }
    };

    // Live conflict checking for Personal Email — STRICTLY checks only Personal Email
    useEffect(() => {
        const clean = (form.personalEmail || '').trim();
        if (clean === prevPersonalEmailRef.current.trim()) {
            return;
        }
        prevPersonalEmailRef.current = form.personalEmail;

        if (!clean) {
            setPersonalEmailConflict({ hasConflict: false, message: '', checking: false });
            return;
        }

        const timer = setTimeout(() => {
            checkPersonalEmail(clean);
        }, 200);

        return () => clearTimeout(timer);
    }, [form.personalEmail]);

    // Handle work email input with @ozofi.com prefix logic
    const handleEmailChange = (val: string) => {
        if (useCustomDomain) {
            setForm(f => ({ ...f, email: val }));
        } else {
            // Strip any pasted @ozofi.com or existing @ to keep prefix clean
            if (val.includes('@')) {
                setForm(f => ({ ...f, email: val.trim() }));
            } else {
                setForm(f => ({ ...f, email: val.trim() ? `${val.trim()}@ozofi.com` : '' }));
            }
        }
    };

    // Calculate prefix for display in domain-pinned mode
    const emailPrefix = form.email.toLowerCase().endsWith('@ozofi.com')
        ? form.email.slice(0, -10)
        : form.email;

    return (
        <div className="space-y-4">
            <Field label="Full Name *">
                <input 
                    required 
                    type="text" 
                    placeholder="e.g. Sridhar S" 
                    value={form.name} 
                    onChange={set('name')} 
                    className={inputCls}
                />
            </Field>

            {/* ── 3 Unique Suggested Email IDs Pill Bar ── */}
            {suggestions.length > 0 && (
                <div className="p-3 bg-gradient-to-r from-indigo-50/80 to-purple-50/80 border border-indigo-100 rounded-xl space-y-2 animate-in fade-in duration-300">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black uppercase tracking-wider text-indigo-700 flex items-center gap-1.5">
                            <Sparkles size={13} className="text-indigo-600 animate-pulse" />
                            Suggested Work Emails (@ozofi.com)
                        </span>
                        <span className="text-[10px] text-indigo-500 font-semibold">Click to select</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {suggestions.map((sug) => {
                            const isSelected = form.email.toLowerCase() === sug.toLowerCase();
                            return (
                                <button
                                    key={sug}
                                    type="button"
                                    onClick={() => {
                                        setForm(f => ({ ...f, email: sug }));
                                        setUseCustomDomain(false);
                                    }}
                                    className={`px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all flex items-center gap-1.5 active:scale-95 shadow-sm ${
                                        isSelected
                                            ? 'bg-indigo-600 text-white shadow-indigo-600/25 ring-2 ring-indigo-400/40'
                                            : 'bg-white text-indigo-700 border border-indigo-200 hover:bg-indigo-100/70 hover:border-indigo-300'
                                    }`}
                                >
                                    {isSelected && <Check size={12} className="stroke-[3]" />}
                                    <span>{sug}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ── Work Email with @ozofi.com Allocation ── */}
            <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                        Work Email *
                    </label>
                    <button
                        type="button"
                        onClick={() => setUseCustomDomain(!useCustomDomain)}
                        className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold hover:underline"
                    >
                        {useCustomDomain ? 'Map to @ozofi.com' : 'Use other domain'}
                    </button>
                </div>

                {!useCustomDomain ? (
                    <div className={`flex rounded-xl overflow-hidden border transition-all ${
                        emailConflict.hasConflict 
                            ? 'border-rose-400 ring-2 ring-rose-100' 
                            : 'border-slate-200 focus-within:border-indigo-600 focus-within:ring-2 focus-within:ring-indigo-100'
                    }`}>
                        <div className="pl-3 py-2 flex items-center text-slate-400 bg-white">
                            <AtSign size={14} />
                        </div>
                        <input
                            required
                            type="text"
                            placeholder="username"
                            value={emailPrefix}
                            onChange={(e) => handleEmailChange(e.target.value)}
                            className="flex-1 px-2.5 py-2.5 text-[13px] bg-white outline-none border-none text-slate-800 font-semibold"
                        />
                        <div className="bg-indigo-50/80 border-l border-indigo-100 px-3 py-2.5 text-indigo-700 text-[12px] font-black flex items-center select-none tracking-tight">
                            @ozofi.com
                        </div>
                    </div>
                ) : (
                    <input
                        required
                        type="email"
                        placeholder="username@ozofi.com"
                        value={form.email}
                        onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                        className={`${inputCls} ${emailConflict.hasConflict ? 'border-rose-400 ring-2 ring-rose-100' : ''}`}
                    />
                )}

                {/* ── Instant Conflict or Availability Indicator ── */}
                {emailConflict.checking && (
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 pt-0.5">
                        <Loader2 size={12} className="animate-spin text-indigo-600" />
                        <span>Checking email availability...</span>
                    </div>
                )}

                {emailConflict.hasConflict && (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-[12px] font-semibold flex items-start gap-2 animate-in fade-in duration-200">
                        <AlertCircle size={15} className="text-rose-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="font-bold">{emailConflict.message}</p>
                            <p className="text-[11px] text-rose-500 font-normal mt-0.5">
                                Please select one of the suggested IDs above or enter a different prefix.
                            </p>
                        </div>
                    </div>
                )}

                {!emailConflict.hasConflict && form.email && !emailConflict.checking && (
                    <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-bold pt-0.5 animate-in fade-in">
                        <Check size={13} className="stroke-[3]" />
                        <span>Work email is available</span>
                    </div>
                )}
            </div>

            {/* ── Personal Email with Instant Conflict Check ── */}
            <div className="space-y-1.5">
                <Field label="Personal Email (Optional)">
                    <input 
                        type="email" 
                        placeholder="e.g. personal@gmail.com" 
                        value={form.personalEmail} 
                        onChange={set('personalEmail')} 
                        onBlur={() => checkPersonalEmail(form.personalEmail)}
                        className={`${inputCls} ${
                            personalEmailConflict.hasConflict 
                                ? 'border-rose-500 bg-rose-50/20 ring-2 ring-rose-200' 
                                : ''
                        }`}
                    />
                </Field>

                {personalEmailConflict.checking && (
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 pt-0.5 animate-in fade-in">
                        <Loader2 size={12} className="animate-spin text-indigo-600" />
                        <span>Verifying personal email uniqueness...</span>
                    </div>
                )}

                {personalEmailConflict.hasConflict && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-[12px] font-semibold flex items-start gap-2.5 animate-in fade-in duration-200 shadow-sm">
                        <AlertCircle size={16} className="text-rose-600 flex-shrink-0 mt-0.5" />
                        <div className="space-y-0.5">
                            <p className="font-bold text-rose-800">{personalEmailConflict.message}</p>
                            <p className="text-[11px] text-rose-600 font-medium">
                                This email already exists in the system. You cannot use it again. Please provide a different personal email address or clear this field.
                            </p>
                        </div>
                    </div>
                )}

                {!personalEmailConflict.hasConflict && form.personalEmail && !personalEmailConflict.checking && (
                    <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-bold pt-0.5 animate-in fade-in">
                        <Check size={13} className="stroke-[3]" />
                        <span>Personal email is available</span>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-2 gap-4">
                <Field label="Phone">
                    <input type="tel" placeholder="+91 98765 43210" value={form.phone} onChange={set('phone')} className={inputCls}/>
                </Field>
                <Field label="Date of Birth">
                    <input type="date" value={form.dateOfBirth} onChange={set('dateOfBirth')} className={inputCls}/>
                </Field>
            </div>
            <Field label="Gender">
                <select value={form.gender} onChange={set('gender')} className={`${inputCls} appearance-none cursor-pointer`}>
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="non_binary">Non-Binary</option>
                    <option value="prefer_not_to_say">Prefer not to say</option>
                </select>
            </Field>
            <div className="border-t border-slate-100 pt-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-3">Address</p>
                <Field label="Street Address">
                    <input type="text" placeholder="123 Main Street" value={form.addressLine1} onChange={set('addressLine1')} className={inputCls}/>
                </Field>
                <div className="grid grid-cols-3 gap-3 mt-3">
                    <Field label="City">
                        <input type="text" placeholder="Mumbai" value={form.city} onChange={set('city')} className={inputCls}/>
                    </Field>
                    <Field label="State">
                        <input type="text" placeholder="Maharashtra" value={form.state} onChange={set('state')} className={inputCls}/>
                    </Field>
                    <Field label="Pincode">
                        <input type="text" placeholder="400001" value={form.pincode} onChange={set('pincode')} className={inputCls}/>
                    </Field>
                </div>
            </div>
        </div>
    );
};


const WorkTab: React.FC<{form:AddEmployeeForm; set:any; setForm:any; isIntern:boolean}> = ({form,set,setForm,isIntern}) => {
    const [departments, setDepartments] = useState<any[]>([]);
    const [teams, setTeams] = useState<any[]>([]);
    const [roles, setRoles] = useState<any[]>([]);
    const [isCustomRole, setIsCustomRole] = useState(false);

    useEffect(() => {
        api.get('/organization/departments').then(res => setDepartments(res.data.data || []));
        api.get('/employees/roles').then(res => {
            const list = res.data.data || [];
            setRoles(list);
            // If current form has a custom role not in list, enable custom mode
            if (form.role && !list.some((r: any) => r.name.toLowerCase() === form.role?.toLowerCase())) {
                setIsCustomRole(true);
            }
        }).catch(() => {});
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
                <Field label="Position / Job Title *">
                    <input 
                        required 
                        type="text" 
                        placeholder="e.g. Senior Software Engineer" 
                        value={form.position} 
                        onChange={set('position')} 
                        className={inputCls}
                    />
                </Field>
                <Field label="System Role & Permissions *">
                    <div className="space-y-1.5">
                        {!isCustomRole ? (
                            <select 
                                value={form.role || 'employee'} 
                                onChange={(e) => {
                                    if (e.target.value === '__custom__') {
                                        setIsCustomRole(true);
                                        setForm((f: any) => ({ ...f, role: '' }));
                                    } else {
                                        setForm((f: any) => ({ ...f, role: e.target.value }));
                                    }
                                }} 
                                className={`${inputCls} appearance-none cursor-pointer font-medium`}
                            >
                                {roles.length === 0 && (
                                    <>
                                        <option value="employee">Employee (Default)</option>
                                        <option value="manager">Manager</option>
                                        <option value="hr">HR</option>
                                        <option value="admin">Admin</option>
                                    </>
                                )}
                                {roles.map((r: any) => (
                                    <option key={r.id} value={r.name}>
                                        {r.name.replace(/_/g, ' ')} {r.is_system ? '(System)' : ''}
                                    </option>
                                ))}
                                <option value="__custom__">+ Enter New / Custom Role...</option>
                            </select>
                        ) : (
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    placeholder="Enter new role name (e.g. Trainees)"
                                    value={form.role || ''}
                                    onChange={set('role')}
                                    className={inputCls}
                                    autoFocus
                                />
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsCustomRole(false);
                                        setForm((f: any) => ({ ...f, role: 'employee' }));
                                    }}
                                    className="px-2.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-colors whitespace-nowrap"
                                >
                                    Select Existing
                                </button>
                            </div>
                        )}
                        <p className="text-[10px] text-slate-400 font-medium">
                            Mapped to access control & permissions in <span className="text-indigo-600 font-bold">Roles & Perms</span>.
                        </p>
                    </div>
                </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <Field label="Join Date *"><input required type="date" value={form.joinDate} onChange={set('joinDate')} className={inputCls}/></Field>
                <Field label="Employment Type">
                    <select value={form.employmentType} onChange={set('employmentType')} className={`${inputCls} appearance-none cursor-pointer`}>
                        {EMP_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                </Field>
            </div>
            <Field label="Reporting Manager">
                <ManagerPicker value={form.reportingManagerId} displayName={form.reportingManagerName}
                    onChange={(id,name) => setForm((f:any) => ({...f, reportingManagerId:id, reportingManagerName:name}))}/>
            </Field>
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
