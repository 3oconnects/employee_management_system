import React, { useState, useEffect } from 'react';
import { Users, Loader2, CheckCircle2, Clock } from 'lucide-react';
import api from '../../../../services/api';

const STATUS_MAP: Record<string, { label: string, color: string, dot: string }> = {
    available: { label: 'Available', color: '#10b981', dot: 'bg-emerald-500' },
    busy:      { label: 'Busy',      color: '#ef4444', dot: 'bg-red-500' },
    lunch:     { label: 'At Lunch',  color: '#f59e0b', dot: 'bg-amber-400' },
    break:     { label: 'On Break',  color: '#f97316', dot: 'bg-orange-400' },
    dnd:       { label: 'DND',       color: '#8b5cf6', dot: 'bg-violet-500' },
    offline:   { label: 'Offline',   color: '#64748b', dot: 'bg-slate-400' },
};

const TeamStatusWidget: React.FC = () => {
    const [members, setMembers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTeam = async () => {
            try {
                const { data } = await api.get('/organization/team-status');
                setMembers(data.data || []);
            } catch (e) {
                console.error('Failed to fetch team status', e);
            } finally {
                setLoading(false);
            }
        };
        fetchTeam();
        const id = setInterval(fetchTeam, 30000); // refresh every 30s
        return () => clearInterval(id);
    }, []);

    if (loading) return (
        <div className="bg-white rounded-2xl border border-slate-100 p-8 flex items-center justify-center">
            <Loader2 size={20} className="animate-spin text-indigo-400"/>
        </div>
    );

    if (members.length === 0) return (
        <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center shadow-sm">
            <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Users size={24} className="text-slate-300"/>
            </div>
            <p className="text-[13px] font-bold text-slate-500">No team members found</p>
            <p className="text-[11px] text-slate-400 mt-1">Everyone else in your department will appear here.</p>
        </div>
    );

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col h-full">
            <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between bg-white sticky top-0 z-10">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 shadow-sm">
                        <Users size={16}/>
                    </div>
                    <div>
                        <h3 className="text-[14px] font-black text-slate-800 tracking-tight leading-none">Team Presence</h3>
                        <p className="text-[10px] text-slate-400 mt-1 font-bold uppercase tracking-wider">Your Department</p>
                    </div>
                </div>
                <span className="px-2.5 py-1 bg-slate-100 text-slate-500 text-[9px] font-black rounded-full uppercase tracking-widest shadow-sm border border-slate-200/50">
                    {members.length} Members
                </span>
            </div>

            <div className="divide-y divide-slate-50 overflow-y-auto max-h-[450px] custom-scrollbar">
                {members.map((m) => {
                    const isIn = !!m.clocked_in_at;
                    const s = isIn ? (STATUS_MAP[m.availability_status] || STATUS_MAP.available) : STATUS_MAP.offline;
                    const ini = m.name?.split(' ').map((p:any)=>p[0]).join('').toUpperCase().slice(0,2) || '??';

                    return (
                        <div key={m.id} className={`px-5 py-4 flex items-center gap-4 transition-colors group ${!isIn ? 'opacity-70' : 'hover:bg-slate-50/50'}`}>
                            {/* Avatar */}
                            <div className="relative flex-shrink-0">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-[12px] font-black border transition-all ${isIn ? 'bg-white text-slate-700 border-slate-200 group-hover:shadow-md group-hover:scale-105' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                                    {ini}
                                </div>
                                <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm ${s.dot}`}/>
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <p className={`text-[13px] font-bold truncate transition-colors ${isIn ? 'text-slate-800 group-hover:text-indigo-600' : 'text-slate-500'}`}>{m.name}</p>
                                <p className="text-[11px] text-slate-400 truncate tracking-tight font-medium">{m.position || 'Team Member'}</p>
                            </div>

                            {/* Status badges */}
                            <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                                {isIn ? (
                                    <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full shadow-sm border border-black/5`}
                                        style={{ color: s.color, backgroundColor: `${s.color}15`, borderColor: `${s.color}20` }}>
                                        {s.label}
                                    </span>
                                ) : (
                                    <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-slate-100 text-slate-400 border border-slate-200/50">
                                        Offline
                                    </span>
                                )}
                                
                                <div className={`flex items-center gap-1.5 text-[10px] font-bold tracking-tight ${isIn ? 'text-emerald-500' : 'text-slate-300'}`}>
                                    {isIn ? (
                                        <>
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"/>
                                            <span>Active Now</span>
                                        </>
                                    ) : (
                                        <>
                                            <div className="w-1.5 h-1.5 rounded-full bg-slate-300"/>
                                            <span>Away</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default TeamStatusWidget;
