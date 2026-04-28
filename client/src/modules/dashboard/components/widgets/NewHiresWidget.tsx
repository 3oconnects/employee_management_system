import React, { useState, useEffect } from 'react';
import { UserPlus, Loader2, Users, Sparkles } from 'lucide-react';
import api from '../../../../services/api';

const COLORS = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#ef4444','#14b8a6'];

const NewHiresWidget: React.FC = () => {
    const [hires, setHires] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const { data } = await api.get('/employees', { params: { limit: 500 } });
                const all: any[] = data.items || data || [];
                const now = new Date();
                const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
                const recent = all.filter(e => {
                    if (!e.join_date) return false;
                    return new Date(e.join_date) >= thirtyDaysAgo;
                }).sort((a, b) => new Date(b.join_date).getTime() - new Date(a.join_date).getTime());
                setHires(recent);
            } catch { setHires([]); }
            finally { setLoading(false); }
        })();
    }, []);

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-teal-50 rounded-xl flex items-center justify-center">
                    <UserPlus size={16} className="text-teal-600"/>
                </div>
                <div>
                    <h3 className="text-[14px] font-black text-slate-800">New Hires</h3>
                    <p className="text-[11px] text-slate-400">{hires.length} joined in the last 30 days</p>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 size={18} className="animate-spin text-indigo-400 mr-2"/>
                    <p className="text-[12px] text-slate-400">Loading…</p>
                </div>
            ) : hires.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center">
                    <Sparkles size={28} className="mx-auto text-slate-200 mb-2"/>
                    <p className="text-[12px] text-slate-400">No new hires in the last 30 days</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {hires.map((e, i) => {
                        const initials = e.name?.split(' ').map((w: string) => w[0]).join('').slice(0, 2) || '??';
                        const color = COLORS[i % COLORS.length];
                        const joinDate = new Date(e.join_date);
                        const daysAgo = Math.floor((Date.now() - joinDate.getTime()) / 86400000);
                        return (
                            <div key={e.id} className="flex items-center gap-3 p-3.5 bg-white rounded-xl border border-slate-100 hover:border-teal-200 hover:shadow-sm transition-all">
                                <div className="w-9 h-9 rounded-xl text-[11px] font-bold text-white flex items-center justify-center flex-shrink-0"
                                    style={{ background: `linear-gradient(135deg, ${color}, ${color}aa)` }}>
                                    {initials}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[12px] font-bold text-slate-800 truncate">{e.name} 🆕</p>
                                    <p className="text-[10px] text-slate-400">{e.position || 'Employee'} · {e.department_name || '—'}</p>
                                </div>
                                <div className="text-right flex-shrink-0">
                                    <p className="text-[10px] font-bold text-teal-600">
                                        {joinDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                    </p>
                                    <p className="text-[9px] text-slate-400">
                                        {daysAgo === 0 ? 'Today' : daysAgo === 1 ? 'Yesterday' : `${daysAgo}d ago`}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default NewHiresWidget;
