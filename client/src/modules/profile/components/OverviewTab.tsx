import React, { useState, useRef } from 'react';
import {
    User, Mail, Phone, MapPin, Calendar, Heart, Globe, Users,
    Edit3, Plus, Zap, Star, BookOpen, Code2, Brain, ChevronRight,
    ArrowRight, Rocket, CheckCircle2, BarChart3, FileText, Camera, Loader2
} from 'lucide-react';

/* ─── Tiny sub-components ─── */

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
        {children}
    </span>
);

const Value: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b' }}>
        {children || <span style={{ color: '#cbd5e1' }}>—</span>}
    </span>
);

const InfoLine: React.FC<{ icon: React.ReactNode; label: string; value?: string | null }> = ({ icon, label, value }) => (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {icon}
        </div>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', minWidth: 0 }}>
            <Label>{label}</Label>
            <Value>{value || null}</Value>
        </div>
    </div>
);

const Card: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
    <div style={{
        background: '#ffffff',
        borderRadius: 16,
        border: '1px solid #e8edf5',
        boxShadow: '0 1px 6px rgba(15,23,42,0.05)',
        overflow: 'hidden',
        ...style,
    }}>
        {children}
    </div>
);

const CardHeader: React.FC<{ icon: React.ReactNode; title: string; action?: React.ReactNode }> = ({ icon, title, action }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 20px 12px', borderBottom: '1px solid #f1f5f9' }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {icon}
        </div>
        <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a', flex: 1 }}>{title}</span>
        {action}
    </div>
);

const SkillChip: React.FC<{ label: string; icon?: React.ReactNode }> = ({ label, icon }) => (
    <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '4px 12px',
        background: '#eef2ff',
        color: '#4338ca',
        borderRadius: 999,
        fontSize: '0.72rem',
        fontWeight: 600,
        border: '1px solid #c7d2fe',
    }}>
        {icon}
        {label}
    </span>
);

const TagChip: React.FC<{ label: string }> = ({ label }) => (
    <span style={{
        display: 'inline-flex', alignItems: 'center',
        padding: '3px 12px',
        background: '#f8fafc',
        color: '#475569',
        borderRadius: 999,
        fontSize: '0.72rem',
        fontWeight: 600,
        border: '1px solid #e2e8f0',
    }}>
        {label}
    </span>
);

/* ─── Circular Progress SVG ─── */
const CircularProgress: React.FC<{ pct: number }> = ({ pct }) => {
    const r = 44;
    const c = 2 * Math.PI * r;
    const offset = c - (pct / 100) * c;
    return (
        <svg width="110" height="110" viewBox="0 0 110 110">
            <circle cx="55" cy="55" r={r} fill="none" stroke="#e8edf5" strokeWidth="9" />
            <circle
                cx="55" cy="55" r={r}
                fill="none"
                stroke="url(#pg)"
                strokeWidth="9"
                strokeLinecap="round"
                strokeDasharray={c}
                strokeDashoffset={offset}
                transform="rotate(-90 55 55)"
                style={{ transition: 'stroke-dashoffset 0.6s ease' }}
            />
            <defs>
                <linearGradient id="pg" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#4f46e5" />
                    <stop offset="100%" stopColor="#7c3aed" />
                </linearGradient>
            </defs>
            <text x="55" y="50" textAnchor="middle" fontSize="18" fontWeight="800" fill="#0f172a">{pct}%</text>
            <text x="55" y="66" textAnchor="middle" fontSize="9" fontWeight="600" fill="#94a3b8">Complete</text>
        </svg>
    );
};

/* ─── Stat row for Quick Stats ─── */
const QuickStatRow: React.FC<{ icon: React.ReactNode; label: string; value: number; color: string }> = ({ icon, label, value, color }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
         onMouseEnter={e => (e.currentTarget.style.background = '#fafafa')}
         onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
        <div style={{ width: 36, height: 36, borderRadius: 10, background: color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {icon}
        </div>
        <span style={{ flex: 1, fontSize: '0.82rem', fontWeight: 600, color: '#374151' }}>{label}</span>
        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' }}>{value}</span>
        <ChevronRight size={14} color="#cbd5e1" />
    </div>
);

/* ─── Main OverviewTab component ─── */
interface OverviewTabProps {
    emp: any;
    user: any;
    profile: any;
    /** may change this profile */
    isOwnProfile: boolean;
    /** this is the viewer's own page (completion meter, stats and prompts are theirs alone) */
    isSelf?: boolean;
    /** may read birth date, gender, address and the like */
    canSeePersonal?: boolean;
    editing: boolean;
    saveLoading: boolean;
    editForm: any;
    setEditForm: (f: any) => void;
    onEdit: () => void;
    onSave: () => void;
    onCancelEdit: () => void;
    onAddContact: () => void;
    joinDate: Date | null;
    onAvatarUpload?: (file: File) => void;
    uploadingAvatar?: boolean;
}

const DEFAULT_SKILLS = ['AI/ML', 'Generative AI', 'Python', 'Deep Learning', 'LLM', 'System Design', 'Problem Solving', 'Leadership'];
const DEFAULT_TAGS   = ['AI Architect', 'Machine Learning', 'LLM', 'Python', 'System Design'];

const OverviewTab: React.FC<OverviewTabProps> = ({
    emp, user, profile, isOwnProfile, isSelf = true, canSeePersonal = true,
    editing, saveLoading, editForm, setEditForm,
    onEdit, onSave, onCancelEdit, onAddContact, joinDate,
    onAvatarUpload, uploadingAvatar,
}) => {
    const overviewFileInputRef = useRef<HTMLInputElement>(null);
    const [editBio, setEditBio] = useState(false);
    const [bioText, setBioText] = useState(
        emp?.bio ||
        `I am a ${emp?.position || 'professional'} with a passion for building intelligent solutions that solve real-world problems. I specialize in large language models, generative AI, and scalable AI systems. I love working on innovative projects, mentoring teams, and continuously learning new technologies.`
    );

    const displayName = emp?.name || user?.name || 'Employee';
    const firstName   = displayName.split(' ')[0];
    const position    = emp?.position || '';
    const department  = emp?.department_name || emp?.department || '';
    const email       = emp?.email || user?.email || '';
    const phone       = emp?.phone || '';
    const gender      = emp?.gender || '';
    const dob         = emp?.date_of_birth ? new Date(emp.date_of_birth).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
    const marital     = emp?.marital_status || '';
    const blood       = emp?.blood_group || '';
    const nationality = emp?.nationality || '';
    const address     = [emp?.address_line1, emp?.city, emp?.state, emp?.pincode].filter(Boolean).join(', ');
    const docs        = profile?.documents?.length || 2;

    // Profile completion calc
    const fields = [email, phone, gender, dob, marital, blood, nationality, address, position, department];
    const filled  = fields.filter(Boolean).length;
    const pct     = Math.min(100, Math.round((filled / fields.length) * 100));

    const skills = (emp?.skills as string[] | undefined) || DEFAULT_SKILLS;
    const tags   = (emp?.tags   as string[] | undefined) || DEFAULT_TAGS;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* ── ROW 1: About + Personal Info + Right sidebar ── */}
            <div style={{ display: 'grid', gridTemplateColumns: isSelf ? '1fr 1fr 260px' : '1fr 1fr', gap: 20, alignItems: 'start' }}>

                {/* ── ABOUT ME ── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <Card>
                        <CardHeader
                            icon={<User size={15} color="white" />}
                            title="About Me"
                            action={isOwnProfile && (
                                <button
                                    onClick={() => setEditBio(!editBio)}
                                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 12px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '0.72rem', fontWeight: 700, color: '#475569', cursor: 'pointer' }}
                                >
                                    <Edit3 size={11} /> Edit
                                </button>
                            )}
                        />
                        <div style={{ padding: '16px 20px', display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                            {/* Avatar column */}
                            <div style={{ flexShrink: 0, position: 'relative' }}>
                                <input
                                    ref={overviewFileInputRef}
                                    type="file"
                                    accept="image/png,image/jpeg,image/webp,image/jpg"
                                    style={{ display: 'none' }}
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file && onAvatarUpload) {
                                            onAvatarUpload(file);
                                        }
                                        if (e.target) e.target.value = '';
                                    }}
                                />
                                <div
                                    onClick={() => {
                                        if (isOwnProfile && onAvatarUpload) {
                                            overviewFileInputRef.current?.click();
                                        }
                                    }}
                                    title={isOwnProfile && onAvatarUpload ? "Change profile photo" : undefined}
                                    style={{
                                        width: 72,
                                        height: 72,
                                        borderRadius: '50%',
                                        background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '1.3rem',
                                        fontWeight: 800,
                                        color: '#fff',
                                        boxShadow: '0 4px 16px rgba(79,70,229,0.25)',
                                        overflow: 'hidden',
                                        position: 'relative',
                                        cursor: isOwnProfile && onAvatarUpload ? 'pointer' : 'default',
                                    }}
                                    className="group"
                                >
                                    {emp?.avatar_url || user?.avatar_url ? (
                                        <img
                                            src={emp?.avatar_url || user?.avatar_url}
                                            alt={displayName}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        />
                                    ) : (
                                        displayName.split(' ').map((w: string) => w[0]).filter(Boolean).join('').toUpperCase().slice(0, 2) || 'EM'
                                    )}

                                    {isOwnProfile && onAvatarUpload && (
                                        <div
                                            style={{
                                                position: 'absolute',
                                                inset: 0,
                                                borderRadius: '50%',
                                                background: 'rgba(15, 23, 42, 0.55)',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: '#ffffff',
                                                transition: 'opacity 0.2s ease',
                                            }}
                                            className={uploadingAvatar ? "opacity-100" : "opacity-0 group-hover:opacity-100"}
                                        >
                                            {uploadingAvatar ? (
                                                <Loader2 size={18} className="animate-spin text-white" />
                                            ) : (
                                                <Camera size={18} strokeWidth={2.4} />
                                            )}
                                        </div>
                                    )}
                                </div>

                                {isOwnProfile && onAvatarUpload && (
                                    <button
                                        type="button"
                                        onClick={() => overviewFileInputRef.current?.click()}
                                        title="Change photo"
                                        style={{
                                            position: 'absolute',
                                            bottom: -2,
                                            right: -2,
                                            width: 24,
                                            height: 24,
                                            borderRadius: '50%',
                                            background: '#ffffff',
                                            border: '1.5px solid #4f46e5',
                                            color: '#4f46e5',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: 'pointer',
                                            boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                                        }}
                                        className="hover:scale-110 active:scale-95 hover:bg-indigo-50"
                                    >
                                        <Camera size={12} strokeWidth={2.4} />
                                    </button>
                                )}
                            </div>
                            {/* Bio */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ margin: '0 0 6px', fontSize: '0.97rem', fontWeight: 700, color: '#1e293b' }}>
                                    Hi, I'm {firstName} 👋
                                </p>
                                {editBio ? (
                                    <div>
                                        <textarea
                                            rows={5}
                                            value={bioText}
                                            onChange={e => setBioText(e.target.value)}
                                            style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #c7d2fe', fontSize: '0.8rem', color: '#334155', resize: 'vertical', outline: 'none', fontFamily: 'inherit' }}
                                        />
                                        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                                            <button onClick={() => setEditBio(false)} style={{ padding: '4px 12px', borderRadius: 8, background: '#4f46e5', color: '#fff', border: 'none', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}>Save</button>
                                            <button onClick={() => setEditBio(false)} style={{ padding: '4px 12px', borderRadius: 8, background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
                                        </div>
                                    </div>
                                ) : (
                                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#475569', lineHeight: 1.7 }}>{bioText}</p>
                                )}
                            </div>
                        </div>
                        {/* Tags row */}
                        <div style={{ padding: '0 20px 16px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {tags.map(t => <TagChip key={t} label={t} />)}
                        </div>
                        {/* Quote block */}
                        <div style={{
                            margin: '0 20px 20px',
                            padding: '12px 16px',
                            background: 'linear-gradient(135deg, #eef2ff 0%, #f5f3ff 100%)',
                            borderRadius: 12,
                            borderLeft: '3.5px solid #4f46e5',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                        }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="#4f46e5" opacity="0.5">
                                <path d="M4.583 17.321C3.553 16.227 3 15 3 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5zm10 0C13.553 16.227 13 15 13 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5z" />
                            </svg>
                            <p style={{ margin: 0, fontSize: '0.8rem', color: '#4338ca', fontStyle: 'italic', fontWeight: 500 }}>
                                "Building intelligent solutions today for a smarter tomorrow."
                            </p>
                        </div>
                    </Card>

                    {/* Skills & Expertise */}
                    <Card>
                        <CardHeader
                            icon={<Zap size={15} color="white" />}
                            title="Skills & Expertise"
                            action={isOwnProfile && (
                                <button style={{ padding: '4px 12px', borderRadius: 8, background: '#f8fafc', border: '1px solid #e2e8f0', fontSize: '0.72rem', fontWeight: 700, color: '#475569', cursor: 'pointer' }}>
                                    Manage Skills
                                </button>
                            )}
                        />
                        <div style={{ padding: '14px 20px 18px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {skills.map((s, i) => {
                                const icons = [<Brain size={10} />, <Code2 size={10} />, <BookOpen size={10} />, <Star size={10} />, <Zap size={10} />];
                                return <SkillChip key={s} label={s} icon={icons[i % icons.length]} />;
                            })}
                        </div>
                    </Card>
                </div>

                {/* ── PERSONAL INFORMATION ── */}
                <Card>
                    <CardHeader
                        icon={<User size={15} color="white" />}
                        title="Personal Information"
                        action={isOwnProfile && (
                            <button
                                onClick={() => editing ? onSave() : onEdit()}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 5,
                                    padding: '4px 12px',
                                    background: editing ? '#4f46e5' : '#f1f5f9',
                                    color: editing ? '#fff' : '#475569',
                                    border: `1px solid ${editing ? '#4f46e5' : '#e2e8f0'}`,
                                    borderRadius: 8, fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer'
                                }}
                            >
                                {saveLoading ? 'Saving…' : editing ? <><CheckCircle2 size={11} /> Save</> : <><Edit3 size={11} /> Edit</>}
                            </button>
                        )}
                    />
                    <div style={{ padding: '8px 20px 16px' }}>
                        {editing ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 8 }}>
                                {[
                                    { label: 'Phone', key: 'phone', type: 'text', placeholder: '+91 9876543210' },
                                    { label: 'Personal Email', key: 'personal_email', type: 'email', placeholder: 'personal@gmail.com' },
                                    { label: 'Date of Birth', key: 'date_of_birth', type: 'date', placeholder: '' },
                                ].map(f => (
                                    <div key={f.key}>
                                        <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>{f.label}</label>
                                        <input
                                            type={f.type}
                                            placeholder={f.placeholder}
                                            value={editForm[f.key] || ''}
                                            onChange={e => setEditForm({ ...editForm, [f.key]: e.target.value })}
                                            style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '0.82rem', color: '#1e293b', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                                        />
                                    </div>
                                ))}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                    {[
                                        { label: 'Gender', key: 'gender', opts: ['Male', 'Female', 'Non-Binary', 'Other'] },
                                        { label: 'Marital Status', key: 'marital_status', opts: ['Single', 'Married', 'Divorced', 'Widowed'] },
                                        { label: 'Blood Group', key: 'blood_group', opts: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] },
                                    ].map(f => (
                                        <div key={f.key}>
                                            <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>{f.label}</label>
                                            <select
                                                value={editForm[f.key] || ''}
                                                onChange={e => setEditForm({ ...editForm, [f.key]: e.target.value })}
                                                style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '0.82rem', color: '#1e293b', outline: 'none', fontFamily: 'inherit' }}
                                            >
                                                <option value="">Select</option>
                                                {f.opts.map(o => <option key={o} value={o}>{o}</option>)}
                                            </select>
                                        </div>
                                    ))}
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>Nationality</label>
                                        <input value={editForm.nationality || ''} onChange={e => setEditForm({ ...editForm, nationality: e.target.value })} placeholder="e.g. Indian" style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '0.82rem', color: '#1e293b', outline: 'none', fontFamily: 'inherit' }} />
                                    </div>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>Address</label>
                                    <input value={editForm.address_line1 || ''} onChange={e => setEditForm({ ...editForm, address_line1: e.target.value })} placeholder="Street / Building Address" style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '0.82rem', color: '#1e293b', outline: 'none', fontFamily: 'inherit' }} />
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4, borderTop: '1px solid #f1f5f9' }}>
                                    <button onClick={onCancelEdit} style={{ padding: '6px 14px', borderRadius: 8, background: '#f1f5f9', border: '1px solid #e2e8f0', fontSize: '0.75rem', fontWeight: 700, color: '#475569', cursor: 'pointer' }}>Cancel</button>
                                    <button onClick={onSave} style={{ padding: '6px 18px', borderRadius: 8, background: '#4f46e5', border: 'none', fontSize: '0.75rem', fontWeight: 700, color: '#fff', cursor: 'pointer' }}>
                                        {saveLoading ? 'Saving...' : 'Save Profile'}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div>
                                <InfoLine icon={<User size={13} color="#4f46e5" />} label="Full Name" value={emp?.name || user?.name} />
                                <InfoLine icon={<Mail size={13} color="#4f46e5" />} label="Email" value={email} />
                                <InfoLine icon={<Phone size={13} color="#4f46e5" />} label="Phone" value={phone} />
                                {canSeePersonal && (
                                    <>
                                        <InfoLine icon={<Calendar size={13} color="#4f46e5" />} label="Date of Birth" value={dob} />
                                        <InfoLine icon={<User size={13} color="#4f46e5" />} label="Gender" value={gender} />
                                        <InfoLine icon={<Users size={13} color="#4f46e5" />} label="Marital Status" value={marital} />
                                        <InfoLine icon={<Heart size={13} color="#4f46e5" />} label="Blood Group" value={blood} />
                                        <InfoLine icon={<Globe size={13} color="#4f46e5" />} label="Nationality" value={nationality} />
                                        <InfoLine icon={<MapPin size={13} color="#4f46e5" />} label="Address" value={address} />
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </Card>

                {/* ── RIGHT SIDEBAR: Profile Completion + Quick Stats (the person's own) ── */}
                {isSelf && <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* Profile Completion */}
                    <Card>
                        <CardHeader icon={<BarChart3 size={15} color="white" />} title="Profile Completion" />
                        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                            <CircularProgress pct={pct} />
                            <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b', textAlign: 'center', lineHeight: 1.5 }}>
                                {pct >= 90
                                    ? 'Great! Your profile is almost complete.'
                                    : pct >= 60
                                    ? 'Looking good! A few more details to go.'
                                    : 'Add missing details to get the best experience.'}
                            </p>
                            {pct < 100 && (
                                <button
                                    onClick={onEdit}
                                    style={{
                                        width: '100%', padding: '9px 0',
                                        background: 'linear-gradient(135deg,#4f46e5,#7c3aed)',
                                        color: '#fff', border: 'none', borderRadius: 10,
                                        fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                    }}
                                >
                                    Complete Profile <ArrowRight size={13} />
                                </button>
                            )}
                        </div>
                    </Card>

                    {/* Quick Stats */}
                    <Card>
                        <CardHeader icon={<Star size={15} color="white" />} title="Quick Stats" />
                        <div style={{ padding: '4px 16px 12px' }}>
                            <QuickStatRow icon={<BarChart3 size={15} color="#4f46e5" />} label="Projects" value={5} color="#4f46e5" />
                            <QuickStatRow icon={<Star size={15} color="#f59e0b" />} label="Reviews" value={3} color="#f59e0b" />
                            <QuickStatRow icon={<FileText size={15} color="#10b981" />} label="Documents" value={docs} color="#10b981" />
                        </div>
                    </Card>
                </div>}
            </div>

            {/* ── ROW 2: CTA Banner ── */}
            {isSelf && <div style={{
                borderRadius: 16,
                background: 'linear-gradient(135deg, #eef2ff 0%, #f5f3ff 60%, #ede9fe 100%)',
                border: '1px solid #c7d2fe',
                padding: '20px 28px',
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                position: 'relative',
                overflow: 'hidden',
            }}>
                {/* Decorative circles */}
                <div style={{ position: 'absolute', right: 200, top: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(99,102,241,0.08)' }} />
                <div style={{ position: 'absolute', right: 250, bottom: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(139,92,246,0.06)' }} />

                <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Rocket size={22} color="white" />
                </div>
                <div style={{ flex: 1 }}>
                    <p style={{ margin: '0 0 2px', fontSize: '0.97rem', fontWeight: 800, color: '#1e1b4b' }}>Let's Build Something Amazing!</p>
                    <p style={{ margin: 0, fontSize: '0.78rem', color: '#6366f1' }}>Innovate • Create • Make an Impact</p>
                </div>
                <button
                    style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '10px 22px',
                        background: 'linear-gradient(135deg,#4f46e5,#7c3aed)',
                        color: '#fff', border: 'none', borderRadius: 10,
                        fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
                        flexShrink: 0,
                        boxShadow: '0 4px 16px rgba(79,70,229,0.28)',
                    }}
                >
                    View My Projects <ArrowRight size={14} />
                </button>
            </div>}
        </div>
    );
};

export default OverviewTab;
