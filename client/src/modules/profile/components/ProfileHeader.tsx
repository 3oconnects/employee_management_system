import React from 'react';
import { Briefcase, Building2, Mail, Phone, Hash, Calendar, Shield } from 'lucide-react';

interface Props {
    emp: any;
    user: any;
}

const ProfileHeader: React.FC<Props> = ({ emp, user }) => {
    const ini = emp?.name?.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) || 'U';
    const joinDate = emp?.join_date ? new Date(emp.join_date) : null;
    const tenureY  = joinDate ? Math.floor((Date.now() - joinDate.getTime()) / (365.25 * 864e5)) : 0;
    const tenureM  = joinDate ? Math.floor(((Date.now() - joinDate.getTime()) / (30.44 * 864e5)) % 12) : 0;
    const stLabel  = emp?.status === 'active' ? 'Active' : emp?.status === 'onboarding' ? 'Onboarding' : emp?.status || 'Unknown';
    const stCls    = emp?.status === 'active'
        ? 'bg-emerald-500/20 text-emerald-100 border-emerald-400/30'
        : emp?.status === 'onboarding'
        ? 'bg-amber-500/20 text-amber-100 border-amber-400/30'
        : 'bg-rose-500/20 text-rose-100 border-rose-400/30';

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {/* Banner */}
            <div className="h-36 bg-gradient-to-br from-indigo-600 via-indigo-500 to-violet-600 relative overflow-hidden">
                <div className="absolute inset-0">
                    <div className="absolute -top-8 -right-8 w-48 h-48 bg-white/10 rounded-full"/>
                    <div className="absolute top-4 right-24 w-24 h-24 bg-violet-400/20 rounded-full"/>
                    <div className="absolute -bottom-6 left-1/4 w-32 h-32 bg-indigo-300/20 rounded-full"/>
                    <div className="absolute bottom-2 left-8 w-16 h-16 bg-white/5 rounded-2xl rotate-12"/>
                    <svg className="absolute inset-0 w-full h-full opacity-10" xmlns="http://www.w3.org/2000/svg">
                        <defs><pattern id="pgrid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M 24 0 L 0 0 0 24" fill="none" stroke="white" strokeWidth="0.5"/></pattern></defs>
                        <rect width="100%" height="100%" fill="url(#pgrid)"/>
                    </svg>
                </div>
                <div className="absolute top-4 right-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border backdrop-blur-sm ${stCls}`}>
                        ● {stLabel}
                    </span>
                </div>
            </div>

            {/* Content */}
            <div className="relative px-8 pb-6 -mt-12">
                <div className="flex flex-col md:flex-row items-start md:items-end gap-5">
                    {/* Avatar */}
                    <div className="w-24 h-24 bg-white rounded-2xl p-1 shadow-xl flex-shrink-0 ring-4 ring-white">
                        <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center text-2xl font-black text-white">
                            {ini}
                        </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 pb-1 pt-2">
                        <div className="flex items-center gap-3 flex-wrap">
                            <h1 className="text-[22px] font-black text-slate-900 tracking-tight">{emp?.name || user?.name}</h1>
                            {emp?.employment_type && (
                                <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-lg text-[10px] font-bold uppercase">
                                    {emp.employment_type.replace('_', ' ')}
                                </span>
                            )}
                        </div>
                        <p className="text-[13px] text-slate-500 font-medium mt-1 flex items-center gap-2 flex-wrap">
                            <Briefcase size={12} className="text-indigo-400"/> {emp?.position || 'Employee'}
                            <span className="text-slate-200">|</span>
                            <Building2 size={12} className="text-indigo-400"/> {emp?.department || '—'}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2.5 text-[11.5px] text-slate-500">
                            <span className="flex items-center gap-1.5"><Mail size={11} className="text-slate-300"/> {emp?.email || user?.email}</span>
                            {emp?.phone && <span className="flex items-center gap-1.5"><Phone size={11} className="text-slate-300"/> {emp.phone}</span>}
                            <span className="flex items-center gap-1.5"><Hash size={11} className="text-slate-300"/> {emp?.id}</span>
                            {joinDate && <span className="flex items-center gap-1.5"><Calendar size={11} className="text-slate-300"/> {tenureY}y {tenureM}m tenure</span>}
                        </div>
                    </div>

                    {/* Role badge */}
                    <div className="flex-shrink-0 pb-1">
                        <span className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-wide shadow-sm">
                            <Shield size={10}/> {user?.role?.replace('_', ' ')}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfileHeader;
