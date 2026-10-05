import React, { useState, useRef, useEffect } from 'react';
import {
    Briefcase, Mail, Phone, Calendar, Hash,
    Edit3, Users2, Sparkles, Camera, Trash2, UploadCloud, Loader2,
    MessageSquare, RefreshCw, Zap, X, BellRing, ExternalLink, Check
} from 'lucide-react';
import { toast } from '../../../components/ui';
import { availabilityOf } from '../../../utils/availability';

interface Props {
    emp: any;
    user: any;
    onEdit?: () => void;
    isOwn?: boolean;
    onAvatarUpload?: (file: File) => void;
    onAvatarRemove?: () => void;
    uploadingAvatar?: boolean;
}

interface ProductivityMantra {
    quote: string;
    tag: string;
    focus: string;
}

const PRODUCTIVITY_MANTRAS: ProductivityMantra[] = [
    {
        quote: "Excellence is not an accidental decision — it is the daily discipline of high-impact execution.",
        tag: "Daily Discipline",
        focus: "High-Impact Execution"
    },
    {
        quote: "Prioritize velocity and precision: eliminate friction, automate redundancy, and deliver real value.",
        tag: "Velocity & Focus",
        focus: "Frictionless Workflow"
    },
    {
        quote: "Small daily improvements compounded over time generate transformational organizational breakthroughs.",
        tag: "Compound Growth",
        focus: "Iterative Mastery"
    },
    {
        quote: "Clarity breeds momentum. Align on core priorities, eliminate distractions, and finish strong.",
        tag: "Peak Momentum",
        focus: "Strategic Alignment"
    },
    {
        quote: "True innovation begins where comfort ends — experiment boldly, learn rapidly, and scale what works.",
        tag: "Innovation Mindset",
        focus: "Bold Experimentation"
    },
    {
        quote: "Empowered collaboration turns individual expertise into unstoppable collective performance.",
        tag: "Synergy & Impact",
        focus: "Collective Excellence"
    },
    {
        quote: "Action cures hesitation. Make decisive strides forward and refine through data-driven iterations.",
        tag: "Decisive Action",
        focus: "Data-Driven Progress"
    }
];

const VerifiedBadge: React.FC = () => (
    <svg style={{ width: 18, height: 18, flexShrink: 0 }} viewBox="0 0 24 24">
        <path
            d="M12 1L14.9 3.8L18.9 3L20.5 6.8L24 8.4L23.1 12L24 15.6L20.5 17.2L18.9 21L14.9 20.2L12 23L9.1 20.2L5.1 21L3.5 17.2L0 15.6L0.9 12L0 8.4L3.5 6.8L5.1 3L9.1 3.8Z"
            fill="#2563eb"
        />
        <path
            d="M8 12l2.8 2.8 5.4-5.4"
            stroke="white"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
        />
    </svg>
);

const ProfileHeader: React.FC<Props> = ({
    emp,
    user,
    onEdit,
    isOwn,
    onAvatarUpload,
    onAvatarRemove,
    uploadingAvatar
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const [hoveringAvatar, setHoveringAvatar] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Reachout and Dynamic Mantra States
    const [reachoutModal, setReachoutModal] = useState<'call' | 'text' | 'mail' | null>(null);
    const [notifiedChannels, setNotifiedChannels] = useState<Record<string, boolean>>({});
    const [isRotatingMantra, setIsRotatingMantra] = useState(false);

    const avatarUrl = emp?.avatar_url || user?.avatar_url;

    useEffect(() => {
        const handleOutsideClick = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuOpen(false);
            }
        };
        if (menuOpen) {
            document.addEventListener('mousedown', handleOutsideClick);
        }
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, [menuOpen]);

    const displayName = emp?.name || user?.name || 'Employee';
    const initials    = displayName
        .split(' ')
        .map((w: string) => w[0])
        .filter(Boolean)
        .join('')
        .toUpperCase()
        .slice(0, 2) || 'EM';

    const [mantraIndex, setMantraIndex] = useState(() => {
        const seed = displayName.charCodeAt(0) || 0;
        return seed % PRODUCTIVITY_MANTRAS.length;
    });

    const currentMantra = PRODUCTIVITY_MANTRAS[mantraIndex];

    const handleNextMantra = () => {
        setIsRotatingMantra(true);
        setTimeout(() => {
            setMantraIndex((prev) => (prev + 1) % PRODUCTIVITY_MANTRAS.length);
            setIsRotatingMantra(false);
        }, 160);
    };

    const handleReachout = (channel: 'call' | 'text' | 'mail') => {
        setReachoutModal(channel);
        const channelLabel = channel === 'call' ? 'Direct Call' : channel === 'text' ? 'Instant Messaging' : 'In-App Mail';
        toast.info(`${channelLabel} is coming soon!`);
    };

    const joinDate = emp?.join_date ? new Date(emp.join_date) : null;
    const now      = new Date();

    let tenureDisplay = '';
    if (joinDate) {
        if (joinDate.getTime() > now.getTime()) {
            tenureDisplay = `Joining ${joinDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
        } else {
            const diffMonths =
                (now.getFullYear() - joinDate.getFullYear()) * 12 +
                (now.getMonth() - joinDate.getMonth());
            if (diffMonths <= 0) {
                tenureDisplay = '< 1 month';
            } else {
                const y = Math.floor(diffMonths / 12);
                const m = diffMonths % 12;
                tenureDisplay = y > 0 ? `${y}y ${m}m` : `${m} month${m !== 1 ? 's' : ''}`;
            }
        }
    }

    const email      = emp?.email      || user?.email || '';
    const phone      = emp?.phone      || '';
    const position   = emp?.position   || '';
    const department = emp?.department_name || emp?.department || '';
    const joinStr    = joinDate
        ? joinDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
        : '';

    return (
        <div
            className="w-full relative overflow-hidden select-none"
            style={{
                borderRadius: 22,
                background: 'linear-gradient(130deg, #1d4ed8 0%, #2563eb 20%, #4f46e5 45%, #7c3aed 70%, #9333ea 88%, #6d28d9 100%)',
                backgroundSize: '220% 220%',
                animation: 'emsGradientShift 14s ease infinite',
                boxShadow: '0 10px 32px rgba(79,70,229,0.22)',
                minHeight: 168,
            }}
        >
            {/* Scoped CSS animations */}
            <style>{`
                @keyframes emsGradientShift {
                    0% { background-position: 0% 40%; }
                    50% { background-position: 100% 60%; }
                    100% { background-position: 0% 40%; }
                }
                @keyframes emsFloatOrb1 {
                    0% { transform: translate(0px, 0px) scale(1); }
                    50% { transform: translate(-25px, 16px) scale(1.18); }
                    100% { transform: translate(15px, -12px) scale(0.92); }
                }
                @keyframes emsFloatOrb2 {
                    0% { transform: translate(0px, 0px) scale(1); }
                    50% { transform: translate(30px, -20px) scale(1.22); }
                    100% { transform: translate(-20px, 14px) scale(0.9); }
                }
                @keyframes emsPulseBadge {
                    0%, 100% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.12); opacity: 0.8; }
                }
                @keyframes emsSparkleSpin {
                    0%, 100% { transform: scale(1) rotate(0deg); opacity: 0.85; }
                    50% { transform: scale(1.18) rotate(18deg); opacity: 1; }
                }
            `}</style>

            {/* ── Dynamic Ambient Glow Orbs (NO harsh stroke lines) ── */}
            <div
                style={{
                    position: 'absolute',
                    top: -40,
                    right: '25%',
                    width: 240,
                    height: 240,
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(96,165,250,0.35) 0%, rgba(96,165,250,0) 70%)',
                    filter: 'blur(35px)',
                    animation: 'emsFloatOrb1 9s ease-in-out infinite alternate',
                    pointerEvents: 'none',
                }}
            />
            <div
                style={{
                    position: 'absolute',
                    bottom: -50,
                    right: '4%',
                    width: 280,
                    height: 280,
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(236,72,153,0.3) 0%, rgba(168,85,247,0.15) 50%, rgba(124,58,237,0) 70%)',
                    filter: 'blur(40px)',
                    animation: 'emsFloatOrb2 11s ease-in-out infinite alternate',
                    pointerEvents: 'none',
                }}
            />

            {/* ── Main Layout (Left White Card + Center Scoop + Right Actions/Quote) ── */}
            <div
                style={{
                    position: 'relative',
                    zIndex: 2,
                    display: 'flex',
                    alignItems: 'flex-end',
                    minHeight: 168,
                    width: '100%',
                }}
            >
                {/* ── 1. WHITE INFO CARD (Single seamless surface with smooth curved dome) ── */}
                <div
                    style={{
                        background: '#ffffff',
                        height: 132,
                        borderRadius: '42px 0 0 22px',
                        display: 'flex',
                        alignItems: 'center',
                        paddingLeft: 22,
                        paddingRight: 16,
                        position: 'relative',
                        flex: '0 1 auto',
                        boxShadow: '4px 0 20px rgba(15,23,42,0.05)',
                    }}
                >
                    {/* Avatar circle with soft glow & interactive photo change */}
                    <div style={{ position: 'relative', top: -12, zIndex: 3, flexShrink: 0 }}>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/png,image/jpeg,image/webp,image/jpg"
                            style={{ display: 'none' }}
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file && onAvatarUpload) {
                                    onAvatarUpload(file);
                                }
                                if (e.target) e.target.value = '';
                                setMenuOpen(false);
                            }}
                        />

                        <div
                            onMouseEnter={() => setHoveringAvatar(true)}
                            onMouseLeave={() => setHoveringAvatar(false)}
                            onClick={() => {
                                if (!isOwn) return;
                                if (avatarUrl) {
                                    setMenuOpen(prev => !prev);
                                } else {
                                    fileInputRef.current?.click();
                                }
                            }}
                            style={{
                                width: 86,
                                height: 86,
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)',
                                border: '4px solid #ffffff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1.68rem',
                                fontWeight: 800,
                                color: '#ffffff',
                                letterSpacing: '-0.02em',
                                position: 'relative',
                                boxShadow: '0 8px 24px rgba(37,99,235,0.32)',
                                userSelect: 'none',
                                overflow: 'hidden',
                                cursor: isOwn ? 'pointer' : 'default',
                            }}
                        >
                            {avatarUrl ? (
                                <img
                                    src={avatarUrl}
                                    alt={displayName}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                            ) : (
                                initials
                            )}

                            {/* Hover / Loading Overlay for Owner */}
                            {isOwn && (
                                <div
                                    style={{
                                        position: 'absolute',
                                        inset: 0,
                                        borderRadius: '50%',
                                        background: 'rgba(15, 23, 42, 0.55)',
                                        backdropFilter: 'blur(2px)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        opacity: uploadingAvatar || hoveringAvatar ? 1 : 0,
                                        transition: 'opacity 0.2s ease',
                                        color: '#ffffff',
                                        gap: 2,
                                    }}
                                >
                                    {uploadingAvatar ? (
                                        <Loader2 size={24} className="animate-spin text-white" />
                                    ) : (
                                        <>
                                            <Camera size={20} strokeWidth={2.4} />
                                            <span style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.02em' }}>Update</span>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Availability badge: this person's own stored status (was a fixed green "Online" for everyone) */}
                        <div
                            style={{
                                position: 'absolute',
                                bottom: 4,
                                left: 2,
                                width: 20,
                                height: 20,
                                borderRadius: '50%',
                                background: availabilityOf(emp?.availability_status).color,
                                border: '2.5px solid #ffffff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: `0 2px 8px ${availabilityOf(emp?.availability_status).color}80`,
                                animation: availabilityOf(emp?.availability_status).pulse ? 'emsPulseBadge 3s ease-in-out infinite' : undefined,
                                zIndex: 4,
                            }}
                            title={availabilityOf(emp?.availability_status).label}
                        >
                            <div
                                style={{
                                    width: 6,
                                    height: 6,
                                    borderRadius: '50%',
                                    background: '#ffffff',
                                }}
                            />
                        </div>

                        {/* Camera Badge Trigger on Bottom-Right */}
                        {isOwn && (
                            <div ref={menuRef} style={{ position: 'absolute', bottom: -2, right: -2, zIndex: 10 }}>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (avatarUrl) {
                                            setMenuOpen(prev => !prev);
                                        } else {
                                            fileInputRef.current?.click();
                                        }
                                    }}
                                    title={avatarUrl ? "Update profile photo" : "Upload profile photo"}
                                    style={{
                                        width: 28,
                                        height: 28,
                                        borderRadius: '50%',
                                        background: '#ffffff',
                                        border: '2px solid #2563eb',
                                        color: '#2563eb',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        boxShadow: '0 2px 8px rgba(37,99,235,0.35)',
                                        transition: 'all 0.15s ease',
                                    }}
                                    className="hover:scale-110 active:scale-95 hover:bg-blue-50"
                                >
                                    <Camera size={14} strokeWidth={2.4} />
                                </button>

                                {/* Dropdown menu if photo exists */}
                                {menuOpen && (
                                    <div
                                        style={{
                                            position: 'absolute',
                                            top: 'calc(100% + 6px)',
                                            left: -40,
                                            background: '#ffffff',
                                            borderRadius: 12,
                                            boxShadow: '0 12px 32px rgba(15,23,42,0.18)',
                                            border: '1px solid #e2e8f0',
                                            padding: '6px',
                                            minWidth: 165,
                                            zIndex: 50,
                                        }}
                                    >
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                fileInputRef.current?.click();
                                                setMenuOpen(false);
                                            }}
                                            style={{
                                                width: '100%',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 8,
                                                padding: '8px 10px',
                                                background: 'transparent',
                                                border: 'none',
                                                borderRadius: 8,
                                                fontSize: '0.78rem',
                                                fontWeight: 600,
                                                color: '#1e293b',
                                                cursor: 'pointer',
                                                textAlign: 'left',
                                            }}
                                            className="hover:bg-slate-100"
                                        >
                                            <UploadCloud size={14} className="text-blue-600" />
                                            <span>Upload New Photo</span>
                                        </button>
                                        {onAvatarRemove && (
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onAvatarRemove();
                                                    setMenuOpen(false);
                                                }}
                                                style={{
                                                    width: '100%',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 8,
                                                    padding: '8px 10px',
                                                    background: 'transparent',
                                                    border: 'none',
                                                    borderRadius: 8,
                                                    fontSize: '0.78rem',
                                                    fontWeight: 600,
                                                    color: '#ef4444',
                                                    cursor: 'pointer',
                                                    textAlign: 'left',
                                                }}
                                                className="hover:bg-red-50"
                                            >
                                                <Trash2 size={14} />
                                                <span>Remove Photo</span>
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Employee Text Details */}
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 5,
                            paddingLeft: 16,
                            zIndex: 3,
                            minWidth: 0,
                        }}
                    >
                        {/* Name + Verified */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <h1 style={{ margin: 0, fontSize: '1.38rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', lineHeight: 1.1, whiteSpace: 'nowrap' }}>
                                {displayName}
                            </h1>
                            <VerifiedBadge />
                            {/* Availability: this person's own stored status, spelled out (the avatar dot alone was easy to miss) */}
                            {(() => {
                                const st = availabilityOf(emp?.availability_status);
                                return (
                                    <span
                                        data-testid="profile-availability"
                                        title={`Availability: ${st.label}`}
                                        style={{
                                            display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0,
                                            padding: '3px 10px', borderRadius: 999, whiteSpace: 'nowrap',
                                            fontSize: '0.72rem', fontWeight: 700, color: st.color,
                                            background: `${st.color}1A`, border: `1px solid ${st.color}40`,
                                        }}
                                    >
                                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: st.color, flexShrink: 0 }} />
                                        {st.label}
                                    </span>
                                );
                            })()}
                        </div>

                        {/* Role | Dept */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'nowrap' }}>
                            {position && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.83rem', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>
                                    <Briefcase size={13} color="#64748b" />
                                    {position}
                                </span>
                            )}
                            {position && department && (
                                <span style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>|</span>
                            )}
                            {department && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.83rem', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>
                                    <Users2 size={13} color="#64748b" />
                                    {department}
                                </span>
                            )}
                        </div>

                        {/* Details row: Email, Phone, Joined, Tenure */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'nowrap', marginTop: 2 }}>
                            {email && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.78rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                                    <Mail size={12} color="#64748b" />
                                    {email}
                                </span>
                            )}
                            {phone && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.78rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                                    <Phone size={12} color="#64748b" />
                                    {phone}
                                </span>
                            )}
                            {joinStr && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.78rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                                    <Calendar size={12} color="#64748b" />
                                    Joined:&nbsp;<strong style={{ color: '#1e293b', fontWeight: 600 }}>{joinStr}</strong>
                                </span>
                            )}
                            {tenureDisplay && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.78rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                                    <Hash size={12} color="#64748b" />
                                    Tenure:&nbsp;<strong style={{ color: '#1e293b', fontWeight: 600 }}>{tenureDisplay}</strong>
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── 2. SEAMLESS SCOOP TRANSITION (Overlaps by 1px to prevent hairline seams) ── */}
                <div style={{ display: 'flex', alignItems: 'flex-end', height: 132, flexShrink: 0, marginLeft: -1, zIndex: 2 }}>
                    <svg
                        width="58"
                        height="132"
                        viewBox="0 0 58 132"
                        preserveAspectRatio="none"
                        style={{ display: 'block', pointerEvents: 'none' }}
                    >
                        <path
                            d="M 0,0 C 28,0 40,36 46,74 C 50,105 54,132 58,132 L 0,132 Z"
                            fill="#ffffff"
                        />
                    </svg>
                </div>

                {/* ── 3. RIGHT SECTION (100% on the animated gradient with zero text cut-off) ── */}
                <div
                    style={{
                        flex: '1',
                        minWidth: 260,
                        height: 168,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        padding: '16px 28px 20px 22px',
                        boxSizing: 'border-box',
                        zIndex: 3,
                    }}
                >
                    {/* Top right action bar: Reachout options (Call, Text, Mail) + Edit button */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 7, flexWrap: 'wrap' }}>
                        {/* Call button */}
                        <button
                            type="button"
                            onClick={() => handleReachout('call')}
                            title={`Call ${displayName}`}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5,
                                padding: '6px 13px',
                                background: 'rgba(255, 255, 255, 0.18)',
                                backdropFilter: 'blur(8px)',
                                color: '#ffffff',
                                border: '1px solid rgba(255, 255, 255, 0.35)',
                                borderRadius: 999,
                                fontSize: '0.73rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                whiteSpace: 'nowrap',
                                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                            }}
                            className="hover:scale-105 active:scale-95 hover:bg-white hover:!text-blue-600 hover:shadow-lg"
                        >
                            <Phone size={12} strokeWidth={2.4} />
                            <span>Call</span>
                        </button>

                        {/* Text / Message button */}
                        <button
                            type="button"
                            onClick={() => handleReachout('text')}
                            title={`Message ${displayName}`}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5,
                                padding: '6px 13px',
                                background: 'rgba(255, 255, 255, 0.18)',
                                backdropFilter: 'blur(8px)',
                                color: '#ffffff',
                                border: '1px solid rgba(255, 255, 255, 0.35)',
                                borderRadius: 999,
                                fontSize: '0.73rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                whiteSpace: 'nowrap',
                                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                            }}
                            className="hover:scale-105 active:scale-95 hover:bg-white hover:!text-indigo-600 hover:shadow-lg"
                        >
                            <MessageSquare size={12} strokeWidth={2.4} />
                            <span>Text</span>
                        </button>

                        {/* Mail button */}
                        <button
                            type="button"
                            onClick={() => handleReachout('mail')}
                            title={`Send email to ${displayName}`}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5,
                                padding: '6px 13px',
                                background: 'rgba(255, 255, 255, 0.18)',
                                backdropFilter: 'blur(8px)',
                                color: '#ffffff',
                                border: '1px solid rgba(255, 255, 255, 0.35)',
                                borderRadius: 999,
                                fontSize: '0.73rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                whiteSpace: 'nowrap',
                                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                            }}
                            className="hover:scale-105 active:scale-95 hover:bg-white hover:!text-violet-600 hover:shadow-lg"
                        >
                            <Mail size={12} strokeWidth={2.4} />
                            <span>Mail</span>
                        </button>

                        {/* Edit Profile button */}
                        {onEdit && (
                            <button
                                onClick={onEdit}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    padding: '6px 16px',
                                    background: '#ffffff',
                                    color: '#4f46e5',
                                    border: 'none',
                                    borderRadius: 999,
                                    fontSize: '0.74rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
                                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                    whiteSpace: 'nowrap',
                                }}
                                className="hover:scale-105 active:scale-95 hover:shadow-xl"
                            >
                                <Edit3 size={12} strokeWidth={2.4} color="#4f46e5" />
                                <span>{isOwn ? 'Edit Profile' : 'Edit Employee'}</span>
                            </button>
                        )}
                    </div>

                    {/* Bottom dynamic productivity mantra */}
                    <div style={{ paddingLeft: 6, paddingBottom: 2 }}>
                        {/* Micro header with tag and shuffle button */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                            <div style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '2px 8px',
                                background: 'rgba(255, 255, 255, 0.2)',
                                backdropFilter: 'blur(6px)',
                                borderRadius: 6,
                                fontSize: '0.62rem',
                                fontWeight: 800,
                                textTransform: 'uppercase',
                                letterSpacing: '0.08em',
                                color: '#ffffff',
                            }}>
                                <Zap size={10} className="text-amber-300" />
                                <span>{currentMantra.tag}</span>
                            </div>

                            <button
                                type="button"
                                onClick={handleNextMantra}
                                title="Click to shuffle dynamic productivity mantra"
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 3,
                                    padding: '2px 7px',
                                    background: 'rgba(255, 255, 255, 0.12)',
                                    border: '1px solid rgba(255, 255, 255, 0.2)',
                                    borderRadius: 6,
                                    fontSize: '0.62rem',
                                    fontWeight: 600,
                                    color: '#e0e7ff',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                }}
                                className="hover:bg-white/20 hover:text-white active:scale-95"
                            >
                                <RefreshCw size={10} className={isRotatingMantra ? 'animate-spin' : ''} />
                                <span>Shuffle</span>
                            </button>
                        </div>

                        {/* Interactive dynamic quote */}
                        <div 
                            onClick={handleNextMantra}
                            title="Click to cycle productivity mantra"
                            style={{ 
                                display: 'flex', 
                                alignItems: 'flex-start', 
                                gap: 8,
                                cursor: 'pointer',
                                opacity: isRotatingMantra ? 0.3 : 1,
                                transform: isRotatingMantra ? 'translateY(2px)' : 'translateY(0)',
                                transition: 'all 0.18s ease',
                            }}
                            className="group"
                        >
                            <Sparkles
                                size={15}
                                style={{
                                    color: '#c4b5fd',
                                    flexShrink: 0,
                                    marginTop: 2,
                                    animation: 'emsSparkleSpin 4s ease-in-out infinite',
                                }}
                            />
                            <p
                                style={{
                                    margin: 0,
                                    color: '#ffffff',
                                    fontSize: '0.82rem',
                                    fontStyle: 'italic',
                                    lineHeight: 1.45,
                                    fontWeight: 500,
                                    textShadow: '0 1px 4px rgba(0,0,0,0.18)',
                                }}
                            >
                                "{currentMantra.quote}"
                            </p>
                        </div>

                        <div
                            style={{
                                marginLeft: 23,
                                marginTop: 7,
                                width: 36,
                                height: 2.5,
                                background: 'rgba(255, 255, 255, 0.65)',
                                borderRadius: 999,
                                boxShadow: '0 0 8px rgba(255,255,255,0.4)',
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* ── Coming Soon Reachout Modal ── */}
            {reachoutModal && (
                <div 
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-200"
                    onClick={() => setReachoutModal(null)}
                >
                    <div 
                        className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-slate-100 relative animate-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Close button */}
                        <button
                            onClick={() => setReachoutModal(null)}
                            className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors"
                        >
                            <X size={16} />
                        </button>

                        {/* Header Badges */}
                        <div className="flex items-center gap-2 mb-4">
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center gap-1.5">
                                <Sparkles size={11} /> Enterprise Reachout
                            </span>
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-600 border border-amber-100">
                                Coming Soon
                            </span>
                        </div>

                        {/* Channel Icon with Glow */}
                        <div className="flex items-center gap-4 mb-4">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg shrink-0 ${
                                reachoutModal === 'call' 
                                    ? 'bg-blue-600 text-white shadow-blue-500/30'
                                    : reachoutModal === 'text'
                                        ? 'bg-indigo-600 text-white shadow-indigo-500/30'
                                        : 'bg-violet-600 text-white shadow-violet-500/30'
                            }`}>
                                {reachoutModal === 'call' && <Phone size={26} strokeWidth={2.2} />}
                                {reachoutModal === 'text' && <MessageSquare size={26} strokeWidth={2.2} />}
                                {reachoutModal === 'mail' && <Mail size={26} strokeWidth={2.2} />}
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-slate-900 tracking-tight leading-snug">
                                    {reachoutModal === 'call' && 'Direct Voice Call'}
                                    {reachoutModal === 'text' && 'Instant Messaging'}
                                    {reachoutModal === 'mail' && 'Integrated Enterprise Mail'}
                                </h3>
                                <p className="text-xs font-semibold text-slate-500">
                                    Reaching out to <span className="text-slate-800 font-bold">{displayName}</span>
                                </p>
                            </div>
                        </div>

                        {/* Description */}
                        <p className="text-xs text-slate-600 leading-relaxed mb-4">
                            {reachoutModal === 'call' && (
                                <>In-app encrypted VoIP calling directly to <strong>{displayName}</strong> is in final testing. Enjoy instant one-click voice calls with squad members directly from your workspace.</>
                            )}
                            {reachoutModal === 'text' && (
                                <>Real-time squad chat and direct messaging with <strong>{displayName}</strong> will launch in our next release, integrated with desktop alerts, file sharing, and active presence tracking.</>
                            )}
                            {reachoutModal === 'mail' && (
                                <>An integrated in-app mailbox with thread histories, attachments, and automated smart replies for <strong>{displayName}</strong> is currently in active development.</>
                            )}
                        </p>

                        {/* Upcoming Highlights */}
                        <div className="bg-slate-50 rounded-2xl p-3.5 mb-5 border border-slate-100 space-y-2">
                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Included in Sprint Release v2.4</p>
                            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                                <Check size={14} className="text-emerald-500 shrink-0" />
                                <span>End-to-End Enterprise Encryption</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                                <Check size={14} className="text-emerald-500 shrink-0" />
                                <span>Synchronized with Squad Presence & Notifications</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                                <Check size={14} className="text-emerald-500 shrink-0" />
                                <span>Zero-latency desktop & mobile push alerts</span>
                            </div>
                        </div>

                        {/* Buttons */}
                        <div className="flex flex-col gap-2">
                            {/* Fallbacks if available */}
                            {reachoutModal === 'mail' && email && (
                                <a
                                    href={`mailto:${email}`}
                                    className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                                >
                                    <ExternalLink size={13} /> Open in Email Client ({email})
                                </a>
                            )}
                            {reachoutModal === 'call' && phone && (
                                <a
                                    href={`tel:${phone}`}
                                    className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                                >
                                    <ExternalLink size={13} /> Dial Work Phone ({phone})
                                </a>
                            )}

                            <button
                                type="button"
                                onClick={() => {
                                    setNotifiedChannels(prev => ({ ...prev, [reachoutModal]: true }));
                                    toast.success(`You're on the early access notification list for ${reachoutModal.toUpperCase()}!`);
                                }}
                                disabled={notifiedChannels[reachoutModal]}
                                className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                                    notifiedChannels[reachoutModal]
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                        : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/25'
                                }`}
                            >
                                {notifiedChannels[reachoutModal] ? (
                                    <>
                                        <Check size={14} /> You're on the early access list!
                                    </>
                                ) : (
                                    <>
                                        <BellRing size={14} /> Notify Me on Launch
                                    </>
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={() => setReachoutModal(null)}
                                className="w-full py-1.5 text-slate-400 hover:text-slate-600 text-xs font-semibold text-center transition-colors"
                            >
                                Dismiss
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProfileHeader;
