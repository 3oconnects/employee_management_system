import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
    User, Mail, Phone, MapPin, Calendar, Briefcase, Building2, Shield, CreditCard,
    FileText, Clock, Edit2, Save, Award, Heart, Globe, Users, Star, CheckCircle,
    Activity, Loader2, Hash, Target, Upload, Plus
} from 'lucide-react';
import api from '../../../services/api';
import { useAuthStore } from '../../../store/authStore';
import { InfoRow, Section, StatBox, EmptyState } from '../components/ProfileWidgets';
import ProfileHeader from '../components/ProfileHeader';
import ProfileTabs, { type TabKey } from '../components/ProfileTabs';
import EducationTab  from '../components/EducationTab';
import ExperienceTab from '../components/ExperienceTab';
import AttendanceTab from '../components/AttendanceTab';
import SettingsTab   from '../components/SettingsTab';
import { Check, AlertCircle } from 'lucide-react';
import { fmtCurrency } from '../../../utils/formatters';
import type { EduEntry, ExpEntry } from '../../employees/components/modals/shared';

const Profile: React.FC = () => {
    const { user } = useAuthStore();
    const { id }   = useParams<{ id: string }>();

    const [tab,         setTab]         = useState<TabKey>('overview');
    const [profile,     setProfile]     = useState<any>(null);
    const [loading,     setLoading]     = useState(true);
    const [editing,     setEditing]     = useState(false);
    const [saveLoading, setSaveLoading] = useState(false);
    const [editForm,    setEditForm]    = useState<any>({});
    const [empId,       setEmpId]       = useState<string | null>(null);
    const [isOwnProfile,setIsOwnProfile]= useState(false);
    const [eduList,     setEduList]     = useState<EduEntry[]>([]);
    const [expList,     setExpList]     = useState<ExpEntry[]>([]);
    const [toast,       setToast]       = useState<{ msg: string; ok: boolean } | null>(null);
    const [uploading,   setUploading]   = useState(false);
    const [showUpModal, setShowUpModal] = useState(false);
    const [upFile,      setUpFile]      = useState<File | null>(null);
    const [upType,      setUpType]      = useState('ID Proof');
    const [previewDoc,  setPreviewDoc]  = useState<any>(null);
    const [localPreviews, setLocalPreviews] = useState<Record<string, string>>({});

    const notify = (msg: string, ok = true) => {
        setToast({ msg, ok });
        setTimeout(() => setToast(null), 3200);
    };

    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                let tid = id;
                let own = false;
                if (!tid && user) {
                    const r = await api.get('/employees', { params: { search: user.email, limit: 1 } });
                    tid = r.data?.items?.[0]?.id;
                    own = true;
                } else if (tid && user) {
                    const r = await api.get('/employees', { params: { search: user.email, limit: 1 } });
                    const myId = r.data?.items?.[0]?.id;
                    own = myId === tid || user.role === 'admin' || user.role === 'hr';
                }
                setIsOwnProfile(own || !id);
                if (tid) {
                    setEmpId(tid);
                    const [profRes, eduRes, expRes] = await Promise.all([
                        api.get(`/reports/profile/${tid}`),
                        api.get(`/employees/${tid}/education`).catch(() => ({ data: [] })),
                        api.get(`/employees/${tid}/experience`).catch(() => ({ data: [] })),
                    ]);
                    setProfile(profRes.data);
                    const e = profRes.data.employee || {};
                    setEditForm({ phone: e.phone||'', personal_email: e.personal_email||'', blood_group: e.blood_group||'', marital_status: e.marital_status||'', address_line1: e.address_line1||'', city: e.city||'', state: e.state||'', pincode: e.pincode||'' });
                    setEduList((eduRes.data || []).map((r: any) => ({ degree: r.degree||'', field: r.field||'', institution: r.institution||'', year: r.year||'', grade: r.grade||'' })));
                    setExpList((expRes.data || []).map((r: any) => ({ jobTitle: r.job_title||'', company: r.company||'', startDate: r.start_date ? r.start_date.slice(0,10) : '', endDate: r.end_date ? r.end_date.slice(0,10) : '', current: r.is_current||false, description: r.description||'' })));
                }
            } catch (err) { console.error(err); }
            finally { setLoading(false); }
        })();
    }, [id, user]);

    const handleSave = async () => {
        if (!empId) return;
        setSaveLoading(true);
        try {
            await api.put(`/employees/${empId}`, editForm);
            const { data } = await api.get(`/reports/profile/${empId}`);
            setProfile(data); setEditing(false);
            notify('Profile updated successfully');
        } catch (err: any) { 
            notify(err.response?.data?.message || 'Update failed', false);
        }
        finally { setSaveLoading(false); }
    };

    const handleUpload = async () => {
        if (!empId || !upFile) return;
        setUploading(true);
        try {
            await api.post('/documents', {
                employeeId: empId,
                documentType: upType,
                documentName: upFile.name,
                filePath: `uploads/${upFile.name}`,
                fileSize: upFile.size
            });
            const { data } = await api.get(`/reports/profile/${empId}`);
            
            // Link the actual file to its name for a guaranteed session preview
            const localUrl = URL.createObjectURL(upFile);
            setLocalPreviews(prev => ({ ...prev, [upFile.name]: localUrl }));

            setProfile(data);
            setShowUpModal(false);
            setUpFile(null);
            notify('Document uploaded successfully');
        } catch (err: any) {
            notify(err.response?.data?.message || 'Upload failed', false);
        } finally {
            setUploading(false);
        }
    };

    if (loading) return (
        <div className="h-[80vh] flex flex-col items-center justify-center gap-4">
            <Loader2 className="animate-spin text-indigo-500" size={32}/>
            <p className="text-[12px] font-semibold text-slate-400">Loading profile...</p>
        </div>
    );

    const emp      = profile?.employee;
    const comp     = profile?.compensation;
    const joinDate = emp?.join_date ? new Date(emp.join_date) : null;
    const tenureY  = joinDate ? Math.floor((Date.now() - joinDate.getTime()) / (365.25 * 864e5)) : 0;
    const tenureM  = joinDate ? Math.floor(((Date.now() - joinDate.getTime()) / (30.44 * 864e5)) % 12) : 0;

    return (
        <div className="max-w-[1200px] mx-auto p-6 space-y-6">
            {/* ── Toast ─────────────────────────────────────────────── */}
            {toast && (
                <div className={`fixed top-5 right-5 z-[999] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-[13px] font-bold animate-in slide-in-from-top-2 duration-200
                    ${toast.ok ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}`}>
                    {toast.ok ? <Check size={15} /> : <AlertCircle size={15} />}
                    {toast.msg}
                </div>
            )}

            <ProfileHeader emp={emp} user={user}/>
            <ProfileTabs active={tab} onChange={setTab}/>

            {/* ── OVERVIEW ── */}
            {tab === 'overview' && (
                <div className="grid grid-cols-12 gap-6">
                    <div className="col-span-12 lg:col-span-7">
                        <Section title="Personal Information" icon={User} action={
                            <button onClick={() => editing ? handleSave() : setEditing(true)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${editing ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-500 hover:text-indigo-600'}`}>
                                {saveLoading ? <Loader2 size={12} className="animate-spin"/> : editing ? <><Save size={12}/> Save</> : <><Edit2 size={12}/> Edit</>}
                            </button>
                        }>
                            {editing ? (
                                <div className="grid grid-cols-2 gap-4">
                                    {[{k:'phone',l:'Phone'},{k:'personal_email',l:'Personal Email'},{k:'blood_group',l:'Blood Group'},{k:'marital_status',l:'Marital Status'},{k:'address_line1',l:'Address'},{k:'city',l:'City'},{k:'state',l:'State'},{k:'pincode',l:'Pincode'}].map(f => (
                                        <div key={f.k}>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">{f.l}</label>
                                            <input value={editForm[f.k]||''} onChange={e => setEditForm({...editForm,[f.k]:e.target.value})}
                                                className="w-full px-3 py-2 text-[13px] font-medium text-slate-800 bg-white border border-slate-200 rounded-xl focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 outline-none"/>
                                        </div>
                                    ))}
                                    <div className="col-span-2 flex justify-end"><button onClick={() => setEditing(false)} className="text-[11px] font-semibold text-slate-400 hover:text-slate-600">Cancel</button></div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-x-8">
                                    <InfoRow icon={User} label="Full Name" value={emp?.name}/>
                                    <InfoRow icon={Mail} label="Work Email" value={emp?.email}/>
                                    <InfoRow icon={Mail} label="Personal Email" value={emp?.personal_email}/>
                                    <InfoRow icon={Phone} label="Phone" value={emp?.phone}/>
                                    <InfoRow icon={Calendar} label="Date of Birth" value={emp?.date_of_birth ? new Date(emp.date_of_birth).toLocaleDateString('en-IN') : null}/>
                                    <InfoRow icon={User} label="Gender" value={emp?.gender}/>
                                    <InfoRow icon={Heart} label="Blood Group" value={emp?.blood_group}/>
                                    <InfoRow icon={Users} label="Marital Status" value={emp?.marital_status}/>
                                    <InfoRow icon={Globe} label="Nationality" value={emp?.nationality}/>
                                    <InfoRow icon={MapPin} label="Address" value={[emp?.address_line1, emp?.city, emp?.state, emp?.pincode].filter(Boolean).join(', ') || null}/>
                                </div>
                            )}
                        </Section>
                    </div>
                    <div className="col-span-12 lg:col-span-5 space-y-6">
                        <Section title="This Month" icon={Activity}>
                            <div className="grid grid-cols-3 gap-3">
                                <StatBox label="Present"  value={profile?.attendanceSummary?.present_days||'0'}                                        color="text-emerald-600 bg-emerald-50"/>
                                <StatBox label="Avg Hours" value={`${parseFloat(profile?.attendanceSummary?.avg_hours||'0').toFixed(1)}h`}             color="text-indigo-600 bg-indigo-50"/>
                                <StatBox label="Late"     value={profile?.attendanceSummary?.late_arrivals||'0'}                                       color="text-rose-600 bg-rose-50"/>
                            </div>
                        </Section>
                        <Section title="Leave Balance" icon={Calendar}>
                            {profile?.leaveBalances?.length > 0 ? profile.leaveBalances.map((lb: any) => (
                                <div key={lb.name} className="flex items-center gap-3 py-3 border-b border-slate-100 last:border-0">
                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-[11px] font-black ${lb.available>0?'bg-emerald-50 text-emerald-600':'bg-rose-50 text-rose-500'}`}>{lb.available}</div>
                                    <div className="flex-1">
                                        <div className="flex justify-between mb-1.5"><span className="text-[12px] font-semibold text-slate-700">{lb.name}</span><span className="text-[10px] font-bold text-slate-400">{lb.used||0} / {lb.annual_quota}</span></div>
                                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-indigo-500 rounded-full transition-all" style={{width:`${(lb.available/Math.max(lb.annual_quota,1))*100}%`}}/></div>
                                    </div>
                                </div>
                            )) : <p className="text-[12px] text-slate-400 text-center py-6">No leave data</p>}
                        </Section>
                        <Section title="Emergency Contacts" icon={Heart}>
                            {profile?.emergencyContacts?.length > 0 ? profile.emergencyContacts.map((c: any) => (
                                <div key={c.id} className="flex items-center gap-3 py-3 border-b border-slate-100 last:border-0">
                                    <div className="w-9 h-9 bg-rose-50 rounded-xl flex items-center justify-center"><Heart size={14} className="text-rose-400"/></div>
                                    <div><p className="text-[12px] font-semibold text-slate-700">{c.name} <span className="text-slate-400 text-[10px] ml-1">({c.relationship})</span></p><p className="text-[11px] text-slate-400">{c.phone}</p></div>
                                </div>
                            )) : <p className="text-[12px] text-slate-400 text-center py-6">No emergency contacts</p>}
                        </Section>
                    </div>
                </div>
            )}

            {/* ── JOB ── */}
            {tab === 'job' && (
                <Section title="Job Details & Lifecycle" icon={Briefcase}>
                    <div className="grid grid-cols-2 gap-x-8">
                        <InfoRow icon={Hash}      label="Employee ID"       value={emp?.id}/>
                        <InfoRow icon={Briefcase} label="Position"          value={emp?.position}/>
                        <InfoRow icon={Building2} label="Department"        value={emp?.department_name||emp?.department}/>
                        <InfoRow icon={Users}     label="Reporting Manager" value={emp?.manager_name}/>
                        <InfoRow icon={Calendar}  label="Join Date"         value={joinDate?.toLocaleDateString('en-IN')}/>
                        <InfoRow icon={Clock}     label="Tenure"            value={joinDate?`${tenureY} years, ${tenureM} months`:null}/>
                        <InfoRow icon={Shield}    label="Employment Type"   value={emp?.employment_type?.replace('_',' ')}/>
                        <InfoRow icon={CheckCircle} label="Status"          value={emp?.status}/>
                        <InfoRow icon={Calendar}  label="Probation End"     value={emp?.probation_end_date?new Date(emp.probation_end_date).toLocaleDateString('en-IN'):null}/>
                        <InfoRow icon={Calendar}  label="Notice Period"     value={emp?.notice_period_days?`${emp.notice_period_days} days`:null}/>
                    </div>
                    <div className="mt-8 pt-6 border-t border-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-6 text-center">Employee Lifecycle</p>
                        <div className="flex items-center gap-2 max-w-3xl mx-auto">
                            {[{l:'Hired',done:true,c:'bg-indigo-500'},{l:'Joined',done:!!emp?.join_date,c:'bg-indigo-400'},{l:'Probation',done:!!emp?.probation_end_date,c:'bg-amber-500'},{l:'Confirmed',done:!!emp?.confirmation_date,c:'bg-emerald-500'},{l:'Active',done:emp?.status==='active',c:'bg-emerald-600'},{l:'Exit',done:!!emp?.exit_date,c:'bg-rose-500'}].map((s,i,a) => (
                                <React.Fragment key={s.l}>
                                    <div className="flex flex-col items-center gap-2">
                                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white text-[10px] font-bold ${s.done?s.c:'bg-slate-200 text-slate-400'}`}>{s.done?'✓':i+1}</div>
                                        <span className={`text-[9px] font-bold w-16 text-center ${s.done?'text-slate-700':'text-slate-300'}`}>{s.l}</span>
                                    </div>
                                    {i<a.length-1 && <div className={`h-1 flex-1 -mt-6 rounded-full ${s.done?s.c:'bg-slate-100'}`}/>}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>
                </Section>
            )}

            {/* ── COMPENSATION ── */}
            {tab === 'compensation' && (
                <Section title="Compensation Details" icon={CreditCard}>
                    {comp ? (<>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                            {[
                                { l: 'Annual CTC',   v: fmtCurrency(comp.annual_ctc),               c: 'text-indigo-700 bg-indigo-50' },
                                { l: 'Monthly Gross', v: fmtCurrency((comp.annual_ctc || 0) / 12),  c: 'text-violet-700 bg-violet-50' },
                                { l: 'Basic Salary',  v: fmtCurrency(comp.basic_salary),            c: 'text-emerald-700 bg-emerald-50' },
                                { l: 'HRA',           v: fmtCurrency(comp.hra),                    c: 'text-amber-700 bg-amber-50' }
                            ].map(s => (
                                <div key={s.l} className={`${s.c.split(' ')[1]} rounded-xl p-4 border border-slate-100 min-w-0 overflow-hidden`}>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide truncate">{s.l}</p>
                                    <p className={`text-xl font-black mt-1 truncate ${s.c.split(' ')[0]}`} title={s.v}>{s.v}</p>
                                </div>
                            ))}
                        </div>
                        <div className="grid grid-cols-2 gap-x-8 border-t border-slate-100 pt-4">
                            <InfoRow icon={CreditCard} label="Bank Account" value={comp.bank_account ? `●●●●${comp.bank_account.slice(-4)}` : 'Not set'}/>
                            <InfoRow icon={Shield}     label="Tax Regime"   value={comp.tax_regime}/>
                            <InfoRow icon={Target}     label="Allowances"   value={fmtCurrency(comp.allowances)}/>
                            <InfoRow icon={Award}      label="Bonus"        value={fmtCurrency(comp.bonus)}/>
                        </div>
                    </>) : <EmptyState icon={CreditCard} text="No compensation data found"/>}
                </Section>
            )}

            {/* ── EDUCATION ── */}
            {tab === 'education' && <EducationTab empId={empId} isOwn={isOwnProfile} list={eduList} setList={setEduList}/>}

            {/* ── EXPERIENCE ── */}
            {tab === 'experience' && <ExperienceTab empId={empId} isOwn={isOwnProfile} list={expList} setList={setExpList}/>}

            {/* ── PERFORMANCE ── */}
            {tab === 'performance' && (
                <Section title="Performance Reviews" icon={Award}>
                    {profile?.performanceReviews?.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {profile.performanceReviews.map((rev: any) => (
                                <div key={rev.id} className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                                    <div className="flex items-center justify-between mb-4">
                                        <div><h4 className="text-[13px] font-bold text-slate-800">{rev.review_period}</h4><p className="text-[10px] text-slate-400">#{rev.id.slice(-6)}</p></div>
                                        <div className="flex items-center gap-1 px-2.5 py-1 bg-white rounded-lg border border-slate-200">
                                            {[1,2,3,4,5].map(s => <Star key={s} size={12} className={s<=(rev.rating||0)?'text-amber-500 fill-amber-500':'text-slate-200'}/>)}
                                            <span className="text-[12px] font-bold text-slate-700 ml-1">{rev.rating}</span>
                                        </div>
                                    </div>
                                    {rev.strengths   && <div className="p-2.5 bg-emerald-50 rounded-lg mb-2 text-[11px] text-emerald-700"><span className="font-bold">Strengths:</span> {rev.strengths}</div>}
                                    {rev.improvements && <div className="p-2.5 bg-amber-50 rounded-lg mb-2 text-[11px] text-amber-700"><span className="font-bold">Areas to improve:</span> {rev.improvements}</div>}
                                    {rev.goals        && <div className="p-2.5 bg-indigo-50 rounded-lg text-[11px] text-indigo-700"><span className="font-bold">Goals:</span> {rev.goals}</div>}
                                </div>
                            ))}
                        </div>
                    ) : <EmptyState icon={Award} text="No performance reviews yet"/>}
                </Section>
            )}

            {/* ── DOCUMENTS ── */}
            {tab === 'documents' && (
                <Section title="Documents" icon={FileText} action={
                    <div className="flex gap-2">
                        <input 
                            type="file" 
                            id="doc-upload" 
                            className="hidden" 
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) { setUpFile(file); setShowUpModal(true); }
                            }}
                        />
                        <label 
                            htmlFor="doc-upload"
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-all cursor-pointer"
                        >
                            <Upload size={12}/> Upload
                        </label>
                    </div>
                }>
                    {profile?.documents?.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {profile.documents.map((doc: any) => {
                                const isImg = doc.document_name?.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                                const backend = api.defaults.baseURL?.replace('/api/v1', '') || 'http://localhost:4000';
                                const src = localPreviews[doc.document_name] || `${backend}/public/${doc.file_path}`;
                                
                                return (
                                    <div 
                                        key={doc.id} 
                                        onClick={() => setPreviewDoc(doc)}
                                        className="flex items-center gap-3 p-3.5 bg-slate-50 hover:bg-indigo-50 border border-slate-100 rounded-xl transition-all cursor-pointer group"
                                    >
                                        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-slate-200 group-hover:bg-indigo-600 group-hover:border-indigo-600 transition-all overflow-hidden relative">
                                            {isImg ? (
                                                <>
                                                    <img src={src} alt="" className="w-full h-full object-cover group-hover:opacity-50 transition-opacity" onError={(e) => {
                                                        (e.target as any).style.opacity = '0';
                                                    }}/>
                                                    <div className="absolute inset-0 flex items-center justify-center -z-10 bg-slate-50">
                                                        <Upload size={14} className="text-slate-300"/>
                                                    </div>
                                                </>
                                            ) : (
                                                <FileText size={16} className="text-slate-400 group-hover:text-white"/>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[12px] font-semibold text-slate-700 truncate">{doc.document_name}</p>
                                            <p className="text-[10px] text-slate-400">{doc.document_type} · {new Date(doc.created_at).toLocaleDateString('en-IN')}</p>
                                        </div>
                                        <span className={`px-2 py-1 rounded text-[9px] font-bold uppercase ${doc.verified ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>{doc.verified ? 'Verified' : 'Pending'}</span>
                                    </div>
                                );
                            })}
                        </div>
                    ) : <EmptyState icon={FileText} text="No documents uploaded"/>}
                </Section>
            )}

            {/* ── ATTENDANCE ── */}
            {tab === 'attendance' && <AttendanceTab profileUserId={user?.id}/>}

            {/* ── LEAVE ── */}
            {tab === 'leave' && (
                <Section title="Leave Details" icon={Calendar}>
                    <div className="flex flex-col items-center py-12 text-slate-300">
                        <Activity size={36} className="mb-3 animate-pulse"/>
                        <p className="text-[13px] font-semibold text-slate-500">Detailed leave analytics coming soon</p>
                        <p className="text-[11px] text-slate-400 mt-1">Summary data is available in the Overview tab</p>
                        <button onClick={() => setTab('overview')} className="mt-4 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[11px] font-bold hover:bg-indigo-100 transition-all">Go to Overview</button>
                    </div>
                </Section>
            )}

            {/* ── SETTINGS ── */}
            {tab === 'settings' && (
                <SettingsTab 
                    initialPreferences={profile?.user?.preferences || user?.preferences} 
                    onNotify={notify} 
                />
            )}
            {/* ── Upload Modal ── */}
            {showUpModal && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600"><Upload size={18}/></div>
                                <div><h3 className="text-[16px] font-black text-slate-800">Finalize Upload</h3><p className="text-[11px] text-slate-400 font-medium">Adding to employee records</p></div>
                            </div>
                            <button onClick={() => setShowUpModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-400 transition-colors">✕</button>
                        </div>
                        <div className="p-6 space-y-5">
                            <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl flex items-center gap-3">
                                <FileText size={20} className="text-indigo-400"/>
                                <div className="min-w-0 flex-1">
                                    <p className="text-[12px] font-bold text-slate-700 truncate">{upFile?.name}</p>
                                    <p className="text-[10px] text-slate-500">{(upFile?.size || 0) / 1024 > 1024 ? `${((upFile?.size || 0) / (1024 * 1024)).toFixed(1)} MB` : `${((upFile?.size || 0) / 1024).toFixed(1)} KB`}</p>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Document Category</label>
                                <select 
                                    value={upType} 
                                    onChange={(e) => setUpType(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[13px] font-bold text-slate-700 focus:border-indigo-500 outline-none"
                                >
                                    {['ID Proof', 'Educational Certificate', 'Experience Letter', 'Payslip', 'Tax Document', 'Medical Report', 'Other'].map(t => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex gap-3">
                            <button onClick={() => setShowUpModal(false)} className="flex-1 py-3 text-[13px] font-bold text-slate-500 hover:text-slate-700 transition-colors">Cancel</button>
                            <button 
                                onClick={handleUpload}
                                disabled={uploading}
                                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-[13px] font-black rounded-xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2"
                            >
                                {uploading ? <Loader2 size={16} className="animate-spin"/> : <Check size={16}/>}
                                {uploading ? 'Uploading...' : 'Confirm Upload'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* ── Document Preview Modal ── */}
            {previewDoc && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 lg:p-12 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-5xl h-full max-h-[90vh] flex flex-col overflow-hidden relative">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white/80 backdrop-blur-sm sticky top-0 z-10">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                                    {previewDoc.document_name?.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? <Upload size={20}/> : <FileText size={20}/>}
                                </div>
                                <div>
                                    <h3 className="text-[18px] font-black text-slate-800">{previewDoc.document_name}</h3>
                                    <p className="text-[12px] text-slate-400 font-bold uppercase tracking-widest">{previewDoc.document_type} · {previewDoc.file_size}</p>
                                </div>
                            </div>
                            <button onClick={() => setPreviewDoc(null)} className="w-10 h-10 flex items-center justify-center rounded-2xl bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-all">✕</button>
                        </div>
                        
                        <div className="flex-1 bg-slate-100 overflow-auto p-4 flex items-center justify-center">
                            {previewDoc.document_name?.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                <img 
                                    src={localPreviews[previewDoc.document_name] || `${api.defaults.baseURL?.replace('/api/v1', '')}/public/${previewDoc.file_path}`} 
                                    className="max-w-full max-h-full rounded-xl shadow-lg border border-white" 
                                    alt="Preview"
                                    onError={(e) => {
                                        (e.target as any).parentElement.innerHTML = `
                                            <div class="bg-white rounded-2xl shadow-xl w-full max-w-lg p-12 flex flex-col items-center text-center gap-6">
                                                <div class="w-20 h-20 bg-indigo-50 rounded-[1.5rem] flex items-center justify-center text-indigo-400">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                                                </div>
                                                <div>
                                                    <h4 class="text-[18px] font-black text-slate-800">Preview Protected</h4>
                                                    <p class="text-[12px] text-slate-400 mt-2">The file metadata is secured, but the direct preview is currently unavailable in this view.</p>
                                                </div>
                                            </div>
                                        `;
                                    }}
                                />
                            ) : (
                                <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-12 flex flex-col items-center text-center gap-6">
                                    <div className="w-24 h-24 bg-slate-50 rounded-[2rem] flex items-center justify-center text-slate-200">
                                        <FileText size={48}/>
                                    </div>
                                    <div>
                                        <h4 className="text-[20px] font-black text-slate-800">Preview not available for this format</h4>
                                        <p className="text-[14px] text-slate-400 max-w-md mx-auto mt-2">Currently, we only support live previews for images. For other formats, please download the file to view its content.</p>
                                    </div>
                                    <a 
                                        href={`/api/v1/public/${previewDoc.file_path}`} 
                                        target="_blank" 
                                        rel="noreferrer"
                                        className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-xl shadow-indigo-100 hover:scale-105 transition-all"
                                    >
                                        Download to View
                                    </a>
                                </div>
                            )}
                        </div>
                        
                        <div className="p-6 bg-white border-t border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className={`w-3 h-3 rounded-full ${previewDoc.verified ? 'bg-emerald-500' : 'bg-amber-500'} animate-pulse`}/>
                                <p className="text-[12px] font-bold text-slate-500">{previewDoc.verified ? 'Verified Document' : 'Pending Verification'}</p>
                            </div>
                            <button onClick={() => setPreviewDoc(null)} className="px-6 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-[13px] font-black hover:bg-slate-200 transition-all">Close Viewer</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Profile;
