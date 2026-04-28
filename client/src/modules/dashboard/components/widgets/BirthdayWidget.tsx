import React, { useState, useEffect } from 'react';
import { Cake, Loader2, Users, Gift } from 'lucide-react';
import api from '../../../../services/api';

const COLORS = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#ef4444','#14b8a6'];

const BirthdayWidget: React.FC = () => {
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const { data } = await api.get('/employees', { params: { limit: 500 } });
                const all: any[] = data.items || data || [];
                // Find birthdays this month
                const now = new Date();
                const thisMonth = now.getMonth();
                const birthdayPeople = all.filter(e => {
                    if (!e.date_of_birth) return false;
                    return new Date(e.date_of_birth).getMonth() === thisMonth;
                }).sort((a, b) => new Date(a.date_of_birth).getDate() - new Date(b.date_of_birth).getDate());
                setEmployees(birthdayPeople);
            } catch { setEmployees([]); }
            finally { setLoading(false); }
        })();
    }, []);

    const today = new Date().getDate();

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-orange-50 rounded-xl flex items-center justify-center">
                    <Cake size={16} className="text-orange-500"/>
                </div>
                <div>
                    <h3 className="text-[14px] font-black text-slate-800">Birthday Folks 🎂</h3>
                    <p className="text-[11px] text-slate-400">{employees.length} birthdays this month</p>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 size={18} className="animate-spin text-indigo-400 mr-2"/>
                    <p className="text-[12px] text-slate-400">Loading…</p>
                </div>
            ) : employees.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center">
                    <Gift size={32} className="mx-auto text-slate-200 mb-2"/>
                    <p className="text-[12px] text-slate-400">No birthdays this month</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {employees.map((e, i) => {
                        const bday = new Date(e.date_of_birth);
                        const dayOfMonth = bday.getDate();
                        const isToday = dayOfMonth === today;
                        const isPast = dayOfMonth < today;
                        const initials = e.name?.split(' ').map((w: string) => w[0]).join('').slice(0, 2) || '??';
                        const color = COLORS[i % COLORS.length];
                        return (
                            <div key={e.id}
                                className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all
                                    ${isToday ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200 shadow-sm' :
                                      isPast  ? 'bg-slate-50 border-slate-100 opacity-60' :
                                                'bg-white border-slate-100 hover:border-indigo-200'}`}>
                                {/* Date badge */}
                                <div className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center flex-shrink-0 border
                                    ${isToday ? 'bg-white border-amber-200' : 'bg-slate-50 border-slate-100'}`}>
                                    <span className="text-[9px] font-bold text-indigo-500 uppercase">
                                        {bday.toLocaleDateString('en-IN', { month: 'short' })}
                                    </span>
                                    <span className={`text-[15px] font-black leading-none ${isToday ? 'text-amber-600' : 'text-slate-700'}`}>
                                        {dayOfMonth}
                                    </span>
                                </div>
                                {/* Avatar */}
                                <div className="w-8 h-8 rounded-lg text-[10px] font-bold text-white flex items-center justify-center flex-shrink-0"
                                    style={{ background: `linear-gradient(135deg, ${color}, ${color}aa)` }}>
                                    {initials}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[12px] font-bold text-slate-800 truncate">
                                        {e.name} {isToday && '🎉'}
                                    </p>
                                    <p className="text-[10px] text-slate-400">{e.position || 'Employee'} · {e.department_name || '—'}</p>
                                </div>
                                {isToday && (
                                    <span className="text-[9px] font-black uppercase px-2 py-1 rounded-lg bg-amber-100 text-amber-700 flex-shrink-0 animate-pulse">
                                        Today!
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default BirthdayWidget;
