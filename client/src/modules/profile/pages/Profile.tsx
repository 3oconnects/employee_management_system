import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
    User, Mail, Phone, MapPin, Calendar, Briefcase, Building2, Shield, CreditCard,
    FileText, Clock, Edit2, Save, Award, Heart, Globe, Users, Star, CheckCircle,
    Activity, Loader2, Hash, Target, Upload, Plus, AlertCircle, X, ShieldAlert
} from 'lucide-react';
import api from '../../../services/api';
import { useAuthStore } from '../../../store/authStore';
import { InfoRow, Section, StatBox, EmptyState } from '../components/ProfileWidgets';
import ProfileHeader  from '../components/ProfileHeader';
import ProfileTabs, { type TabKey } from '../components/ProfileTabs';
import OverviewTab   from '../components/OverviewTab';
import EducationTab  from '../components/EducationTab';
import ExperienceTab from '../components/ExperienceTab';
import AttendanceTab from '../components/AttendanceTab';
import SettingsTab   from '../components/SettingsTab';
import { fmtCurrency } from '../../../utils/formatters';
import type { EduEntry, ExpEntry } from '../../employees/components/modals/shared';
import { toast } from '../../../components/ui';

interface EmergencyContact {
    id?: number;
    name: string;
    relationship: string;
    phone: string;
    email?: string;
    address?: string;
    is_primary?: boolean;
}

const Profile: React.FC = () => {
    const { user, updateUser } = useAuthStore();
    const { id }   = useParams<{ id: string }>();

    const [tab,             setTab]             = useState<TabKey>('overview');
    const [profile,         setProfile]         = useState<any>(null);
    const [loading,         setLoading]         = useState(true);
    const [editing,         setEditing]         = useState(false);
    const [saveLoading,     setSaveLoading]     = useState(false);
    const [editForm,        setEditForm]        = useState<any>({});
    const [empId,           setEmpId]           = useState<string | null>(null);
    const [isOwnProfile,    setIsOwnProfile]    = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [eduList,         setEduList]         = useState<EduEntry[]>([]);
    const [expList,         setExpList]         = useState<ExpEntry[]>([]);

    // Emergency Contact Modal State
    const [contactModal,  setContactModal]  = useState(false);
    const [contactForm,   setContactForm]   = useState<EmergencyContact>({ name: '', relationship: 'Spouse', phone: '', is_primary: true });
    const [contactSaving, setContactSaving] = useState(false);

    // Document Upload & Preview State
    const [uploading,     setUploading]     = useState(false);
    const [showUpModal,   setShowUpModal]   = useState(false);
    const [upFile,        setUpFile]        = useState<File | null>(null);
    const [upType,        setUpType]        = useState('ID Proof');
    const [previewDoc,    setPreviewDoc]    = useState<any>(null);
    const [localPreviews, setLocalPreviews] = useState<Record<string, string>>({});

    const loadProfileData = async () => {
        setLoading(true);
        try {
            let tid = id;
            let own = false;
            let fullData: any = null;

            // 1. Direct fetch: if no route ID, use the dedicated /employees/me endpoint
            if (!tid) {
                try {
                    const meRes = await api.get('/employees/me');
                    if (meRes.data?.employee) {
                        fullData = meRes.data;
                        tid = fullData.employee.id;
                        own = true;
                    }
                } catch (e) {
                    console.warn('Could not load via /employees/me, falling back:', e);
                }
            }

            // 2. Fallback search by email if tid not found
            if (!tid && user?.email) {
                try {
                    const r = await api.get('/employees', { params: { search: user.email, limit: 1 } });
                    tid = r.data?.items?.[0]?.id;
                    own = true;
                } catch (e) {
                    console.warn('Search fallback failed:', e);
                }
            } else if (tid && user) {
                own = (user.employee_id === tid) || user.role === 'admin' || user.role === 'hr';
            }

            setIsOwnProfile(own || !id);

            if (tid) {
                setEmpId(tid);
                const [profRes, eduRes, expRes, contactRes] = await Promise.all([
                    fullData ? Promise.resolve({ data: fullData }) : api.get(`/reports/profile/${tid}`),
                    api.get(`/employees/${tid}/education`).catch(() => ({ data: [] })),
                    api.get(`/employees/${tid}/experience`).catch(() => ({ data: [] })),
                    api.get(`/employees/${tid}/emergency-contacts`).catch(() => ({ data: [] })),
                ]);

                const loaded = profRes.data || {};
                if (contactRes.data && Array.isArray(contactRes.data) && contactRes.data.length > 0) {
                    loaded.emergencyContacts = contactRes.data;
                }
                setProfile(loaded);

                const e = loaded.employee || {};
                setEditForm({
                    name: e.name || '',
                    phone: e.phone || '',
                    personal_email: e.personal_email || '',
                    date_of_birth: e.date_of_birth ? e.date_of_birth.slice(0, 10) : '',
                    gender: e.gender || '',
                    blood_group: e.blood_group || '',
                    marital_status: e.marital_status || '',
                    nationality: e.nationality || 'Indian',
                    address_line1: e.address_line1 || '',
                    city: e.city || '',
                    state: e.state || '',
                    pincode: e.pincode || '',
                });

                setEduList((eduRes.data || []).map((r: any) => ({
                    degree: r.degree || '',
                    field: r.field || '',
                    institution: r.institution || '',
                    year: r.year || '',
                    grade: r.grade || '',
                })));

                setExpList((expRes.data || []).map((r: any) => ({
                    jobTitle: r.job_title || r.jobTitle || '',
                    company: r.company || '',
                    startDate: r.start_date ? r.start_date.slice(0, 10) : (r.startDate || ''),
                    endDate: r.end_date ? r.end_date.slice(0, 10) : (r.endDate || ''),
                    current: r.is_current !== undefined ? r.is_current : (r.current || false),
                    description: r.description || '',
                })));
            }
        } catch (err) {
            console.error('Failed to load profile details:', err);
            toast.error('Failed to load employee profile');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadProfileData();
    }, [id, user]);

    const handleSave = async () => {
        if (!empId) return;
        setSaveLoading(true);
        try {
            await api.put(`/employees/${empId}`, editForm);
            toast.success('Profile details saved successfully');
            setEditing(false);
            // Refresh
            const { data } = await api.get(`/reports/profile/${empId}`);
            setProfile(data);
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Update failed');
        } finally {
            setSaveLoading(false);
        }
    };

    const handleSaveContact = async () => {
        if (!empId) return;
        if (!contactForm.name.trim() || !contactForm.phone.trim()) {
            toast.error('Please enter contact name and phone number');
            return;
        }
        setContactSaving(true);
        try {
            const currentContacts = profile?.emergencyContacts || [];
            const next = [...currentContacts, contactForm];
            await api.post(`/employees/${empId}/emergency-contacts`, { contacts: next });
            toast.success('Emergency contact added');
            setProfile((prev: any) => ({ ...prev, emergencyContacts: next }));
            setContactModal(false);
            setContactForm({ name: '', relationship: 'Spouse', phone: '', is_primary: true });
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to save contact');
        } finally {
            setContactSaving(false);
        }
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
                fileSize: upFile.size,
            });
            const { data } = await api.get(`/reports/profile/${empId}`);
            const localUrl = URL.createObjectURL(upFile);
            setLocalPreviews(prev => ({ ...prev, [upFile.name]: localUrl }));
            setProfile(data);
            setShowUpModal(false);
            setUpFile(null);
            toast.success('Document uploaded successfully');
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Upload failed');
        } finally {
            setUploading(false);
        }
    };

    const compressAndResizeImage = (file: File, maxDim = 400, quality = 0.85): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    if (width > height) {
                        if (width > maxDim) {
                            height = Math.round((height * maxDim) / width);
                            width = maxDim;
                        }
                    } else {
                        if (height > maxDim) {
                            width = Math.round((width * maxDim) / height);
                            height = maxDim;
                        }
                    }
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) {
                        resolve(e.target?.result as string);
                        return;
                    }
                    ctx.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', quality));
                };
                img.onerror = () => reject(new Error('Failed to load image'));
                img.src = e.target?.result as string;
            };
            reader.onerror = () => reject(new Error('Failed to read image file'));
            reader.readAsDataURL(file);
        });
    };

    const handleAvatarUpload = async (file: File) => {
        if (!empId) {
            toast.error('Employee profile ID not available');
            return;
        }
        if (!file.type.startsWith('image/')) {
            toast.error('Please select an image file (PNG, JPG, WebP)');
            return;
        }
        if (file.size > 12 * 1024 * 1024) {
            toast.error('Image must be under 12MB');
            return;
        }

        setUploadingAvatar(true);
        try {
            const compressedBase64 = await compressAndResizeImage(file, 400, 0.85);

            // Update employee profile
            await api.put(`/employees/${empId}`, { avatar_url: compressedBase64 });

            // Update profile state
            setProfile((prev: any) => ({
                ...prev,
                employee: {
                    ...(prev?.employee || {}),
                    avatar_url: compressedBase64,
                },
            }));

            // Sync auth user store if this is current logged in user
            if (isOwnProfile || (user?.email && user.email.toLowerCase() === profile?.employee?.email?.toLowerCase())) {
                updateUser({ avatar_url: compressedBase64 });
            }

            toast.success('Profile photo updated successfully!');
        } catch (err: any) {
            console.error('Failed to upload avatar:', err);
            toast.error(err.response?.data?.message || 'Failed to update profile photo');
        } finally {
            setUploadingAvatar(false);
        }
    };

    const handleAvatarRemove = async () => {
        if (!empId) return;
        setUploadingAvatar(true);
        try {
            await api.put(`/employees/${empId}`, { avatar_url: null });

            setProfile((prev: any) => ({
                ...prev,
                employee: {
                    ...(prev?.employee || {}),
                    avatar_url: null,
                },
            }));

            if (isOwnProfile || (user?.email && user.email.toLowerCase() === profile?.employee?.email?.toLowerCase())) {
                updateUser({ avatar_url: undefined });
            }

            toast.success('Profile photo removed');
        } catch (err: any) {
            console.error('Failed to remove avatar:', err);
            toast.error(err.response?.data?.message || 'Failed to remove profile photo');
        } finally {
            setUploadingAvatar(false);
        }
    };

    if (loading) {
        return (
            <div className="h-[75vh] flex flex-col items-center justify-center gap-3">
                <Loader2 className="animate-spin text-slate-700" size={32} />
                <p className="text-xs font-semibold text-slate-500">Loading employee profile...</p>
            </div>
        );
    }

    const emp      = profile?.employee;
    const comp     = profile?.compensation;
    const joinDate = emp?.join_date ? new Date(emp.join_date) : null;
    const tenureY  = joinDate ? Math.floor((Date.now() - joinDate.getTime()) / (365.25 * 864e5)) : 0;
    const tenureM  = joinDate ? Math.floor(((Date.now() - joinDate.getTime()) / (30.44 * 864e5)) % 12) : 0;

    return (
        <div className="w-full px-8 py-6 space-y-6">
            {/* ── Executive Header ── */}
            <ProfileHeader 
                emp={emp} 
                user={user} 
                onEdit={() => setEditing(true)} 
                isOwn={isOwnProfile} 
                onAvatarUpload={handleAvatarUpload}
                onAvatarRemove={handleAvatarRemove}
                uploadingAvatar={uploadingAvatar}
            />

            {/* ── Tabs Navigation ── */}
            <ProfileTabs active={tab} onChange={setTab} />

            {/* ── OVERVIEW TAB ── */}
            {tab === 'overview' && (
                <OverviewTab
                    emp={emp}
                    user={user}
                    profile={profile}
                    isOwnProfile={isOwnProfile}
                    editing={editing}
                    saveLoading={saveLoading}
                    editForm={editForm}
                    setEditForm={setEditForm}
                    onEdit={() => setEditing(true)}
                    onSave={handleSave}
                    onCancelEdit={() => setEditing(false)}
                    onAddContact={() => setContactModal(true)}
                    joinDate={joinDate}
                    onAvatarUpload={handleAvatarUpload}
                    uploadingAvatar={uploadingAvatar}
                />
            )}

            {/* ── EDUCATION TAB ── */}
            {tab === 'education' && (
                <EducationTab empId={empId} isOwn={isOwnProfile} list={eduList} setList={setEduList} />
            )}

            {/* ── EXPERIENCE TAB ── */}
            {tab === 'experience' && (
                <ExperienceTab empId={empId} isOwn={isOwnProfile} list={expList} setList={setExpList} />
            )}

            {/* ── JOB DETAILS TAB ── */}
            {tab === 'job' && (
                <Section title="Employment Contract & Lifecycle" icon={Briefcase}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">
                        <InfoRow icon={Hash}        label="Employee ID"       value={emp?.id} />
                        <InfoRow icon={Briefcase}   label="Designation"       value={emp?.position || 'Team Member'} />
                        <InfoRow icon={Building2}   label="Department"        value={emp?.department_name || emp?.department} />
                        <InfoRow icon={Users}       label="Reporting Manager" value={emp?.manager_name || 'Direct to Leadership'} />
                        <InfoRow icon={Calendar}    label="Official Join Date" value={joinDate?.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} />
                        <InfoRow icon={Clock}       label="Tenure with Company" value={joinDate ? `${tenureY} years, ${tenureM} months` : null} />
                        <InfoRow icon={Shield}      label="Employment Type"   value={emp?.employment_type?.replace('_', ' ')} />
                        <InfoRow icon={CheckCircle} label="Account Status"    value={emp?.status} />
                        <InfoRow icon={Calendar}    label="Probation End"     value={emp?.probation_end_date ? new Date(emp.probation_end_date).toLocaleDateString('en-IN') : 'Confirmed'} />
                        <InfoRow icon={Calendar}    label="Notice Period"     value={emp?.notice_period_days ? `${emp.notice_period_days} Days` : '30 Days'} />
                    </div>
                </Section>
            )}

            {/* ── COMPENSATION TAB ── */}
            {tab === 'compensation' && (
                <Section title="Compensation & Payroll Structure" icon={CreditCard}>
                    {comp ? (
                        <>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                                {[
                                    { l: 'Annual CTC',   v: fmtCurrency(comp.annual_ctc),              c: 'text-slate-900 bg-slate-50' },
                                    { l: 'Monthly Gross', v: fmtCurrency((comp.annual_ctc || 0) / 12), c: 'text-slate-900 bg-slate-50' },
                                    { l: 'Basic Salary',  v: fmtCurrency(comp.basic_salary),           c: 'text-slate-900 bg-slate-50' },
                                    { l: 'HRA Allowance', v: fmtCurrency(comp.hra),                    c: 'text-slate-900 bg-slate-50' },
                                ].map(s => (
                                    <div key={s.l} className="rounded-xl p-4 bg-slate-50 border border-slate-200">
                                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide truncate">{s.l}</p>
                                        <p className="text-xl font-bold mt-1 text-slate-900 truncate" title={s.v}>{s.v}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 border-t border-slate-100 pt-4">
                                <InfoRow icon={CreditCard} label="Bank Account" value={comp.bank_account ? `●●●●${comp.bank_account.slice(-4)}` : 'Verified on File'} />
                                <InfoRow icon={Shield}     label="Tax Regime"   value={comp.tax_regime || 'New Regime (Default)'} />
                                <InfoRow icon={Target}     label="Special Allowances" value={fmtCurrency(comp.allowances || 0)} />
                                <InfoRow icon={Award}      label="Performance Bonus" value={fmtCurrency(comp.bonus || 0)} />
                            </div>
                        </>
                    ) : (
                        <div className="py-8 text-center text-slate-400">
                            <CreditCard size={32} className="mx-auto mb-2 text-slate-300" />
                            <p className="text-xs font-semibold">Compensation Profile</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">Annual CTC: {fmtCurrency(emp?.annual_ctc || 0)}</p>
                        </div>
                    )}
                </Section>
            )}

            {/* ── ATTENDANCE TAB ── */}
            {tab === 'attendance' && <AttendanceTab profileUserId={user?.id} />}

            {/* ── LEAVE TAB ── */}
            {tab === 'leave' && (
                <Section title="Leave Balances & History" icon={Calendar}>
                    {profile?.leaveBalances?.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {profile.leaveBalances.map((lb: any) => (
                                <div key={lb.name} className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-bold text-slate-800">{lb.name}</span>
                                        <span className="px-2 py-0.5 bg-white border border-slate-200 rounded text-xs font-bold text-slate-700">
                                            {lb.available} Available
                                        </span>
                                    </div>
                                    <div className="mt-3 flex justify-between text-xs text-slate-500">
                                        <span>Total: {lb.annual_quota} days</span>
                                        <span>Used: {lb.used || 0} days</span>
                                    </div>
                                    <div className="mt-2 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                        <div className="h-full bg-slate-900 rounded-full" style={{ width: `${(lb.available / Math.max(lb.annual_quota, 1)) * 100}%` }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-xs text-slate-400 text-center py-8">No leave balance records available.</p>
                    )}
                </Section>
            )}

            {/* ── DOCUMENTS TAB ── */}
            {tab === 'documents' && (
                <Section
                    title="Employee Documents"
                    icon={FileText}
                    action={
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
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-all cursor-pointer shadow-xs"
                            >
                                <Upload size={13} /> Upload Document
                            </label>
                        </div>
                    }
                >
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
                                        className="flex items-center gap-3 p-3.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-all cursor-pointer group"
                                    >
                                        <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center border border-slate-200 group-hover:border-slate-300 transition-all overflow-hidden flex-shrink-0">
                                            {isImg ? (
                                                <img src={src} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <FileText size={18} className="text-slate-500" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-semibold text-slate-800 truncate">{doc.document_name}</p>
                                            <p className="text-[11px] text-slate-400">{doc.document_type} · {new Date(doc.created_at).toLocaleDateString('en-IN')}</p>
                                        </div>
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${doc.verified ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-amber-50 text-amber-700 border border-amber-100'}`}>
                                            {doc.verified ? 'Verified' : 'Pending'}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <EmptyState icon={FileText} text="No verification documents uploaded yet" />
                    )}
                </Section>
            )}

            {/* ── Emergency Contact Modal ── */}
            {contactModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 animate-in fade-in duration-150">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-slate-200 overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
                            <h3 className="text-sm font-bold text-slate-900">Add Emergency Contact</h3>
                            <button onClick={() => setContactModal(false)} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Contact Name *</label>
                                <input
                                    value={contactForm.name}
                                    onChange={e => setContactForm({ ...contactForm, name: e.target.value })}
                                    placeholder="e.g. Ramesh S"
                                    className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:border-indigo-500 outline-none"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Relationship *</label>
                                    <select
                                        value={contactForm.relationship}
                                        onChange={e => setContactForm({ ...contactForm, relationship: e.target.value })}
                                        className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:border-indigo-500 outline-none"
                                    >
                                        {['Spouse', 'Father', 'Mother', 'Sibling', 'Child', 'Guardian', 'Friend'].map(r => (
                                            <option key={r} value={r}>{r}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Phone Number *</label>
                                    <input
                                        value={contactForm.phone}
                                        onChange={e => setContactForm({ ...contactForm, phone: e.target.value })}
                                        placeholder="+91 9876543210"
                                        className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:border-indigo-500 outline-none"
                                    />
                                </div>
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={contactForm.is_primary}
                                    onChange={e => setContactForm({ ...contactForm, is_primary: e.target.checked })}
                                    className="w-4 h-4 text-indigo-600 rounded"
                                />
                                <span className="text-xs text-slate-700">Set as primary emergency contact</span>
                            </label>
                        </div>
                        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/70">
                            <button onClick={() => setContactModal(false)} className="px-4 py-2 text-xs font-semibold text-slate-600">Cancel</button>
                            <button
                                disabled={contactSaving}
                                onClick={handleSaveContact}
                                className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 disabled:opacity-50"
                            >
                                {contactSaving ? 'Saving...' : 'Save Contact'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Document Upload Modal ── */}
            {showUpModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 animate-in fade-in duration-150">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-slate-200 overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
                            <h3 className="text-sm font-bold text-slate-900">Upload Verification Document</h3>
                            <button onClick={() => setShowUpModal(false)} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3">
                                <FileText size={18} className="text-slate-500" />
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs font-bold text-slate-800 truncate">{upFile?.name}</p>
                                    <p className="text-[10px] text-slate-400">{((upFile?.size || 0) / 1024).toFixed(1)} KB</p>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Document Type</label>
                                <select
                                    value={upType}
                                    onChange={e => setUpType(e.target.value)}
                                    className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:border-indigo-500 outline-none"
                                >
                                    {['ID Proof', 'Academic Degree', 'Experience Certificate', 'Offer Letter', 'Other'].map(t => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/70">
                            <button onClick={() => setShowUpModal(false)} className="px-4 py-2 text-xs font-semibold text-slate-600">Cancel</button>
                            <button
                                disabled={uploading}
                                onClick={handleUpload}
                                className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 disabled:opacity-50"
                            >
                                {uploading ? 'Uploading...' : 'Confirm Upload'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Profile;
