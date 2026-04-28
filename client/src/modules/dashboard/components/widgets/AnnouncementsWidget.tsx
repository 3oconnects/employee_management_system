import React, { useState, useEffect } from 'react';
import { Megaphone, Pin, Clock, ChevronRight } from 'lucide-react';
import api from '../../../../services/api';

/* Mock announcements (will be replaced with API when endpoint exists) */
const MOCK_ANNOUNCEMENTS = [
    { id: 1, title: 'Q2 Performance Review Cycle Opens', priority: 'high', date: new Date().toISOString(), author: 'HR Team', body: 'All managers are requested to submit performance reviews by end of month.' },
    { id: 2, title: 'Office Renovation — Floor 3', priority: 'medium', date: new Date(Date.now() - 86400000).toISOString(), author: 'Admin', body: 'Floor 3 will be under renovation from next week. Please use Floor 2 meeting rooms.' },
    { id: 3, title: 'Updated Leave Policy 2026', priority: 'low', date: new Date(Date.now() - 172800000).toISOString(), author: 'HR Team', body: 'Please review the updated leave policy document in the Policies section.' },
];

const PRIORITY_STYLES: Record<string, { dot: string; bg: string; text: string }> = {
    high:   { dot: 'bg-rose-500',   bg: 'bg-rose-50 border-rose-100',   text: 'text-rose-600' },
    medium: { dot: 'bg-amber-500',  bg: 'bg-amber-50 border-amber-100', text: 'text-amber-600' },
    low:    { dot: 'bg-slate-400',  bg: 'bg-slate-50 border-slate-100', text: 'text-slate-500' },
};

const AnnouncementsWidget: React.FC = () => {
    const [items] = useState(MOCK_ANNOUNCEMENTS);
    const [expanded, setExpanded] = useState<number | null>(null);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-9 h-9 bg-violet-50 rounded-xl flex items-center justify-center">
                        <Megaphone size={16} className="text-violet-600"/>
                    </div>
                    <div>
                        <h3 className="text-[14px] font-black text-slate-800">Announcements</h3>
                        <p className="text-[11px] text-slate-400">{items.length} active announcements</p>
                    </div>
                </div>
            </div>

            <div className="space-y-3">
                {items.map(a => {
                    const p = PRIORITY_STYLES[a.priority] || PRIORITY_STYLES.low;
                    const isOpen = expanded === a.id;
                    return (
                        <button key={a.id} onClick={() => setExpanded(isOpen ? null : a.id)}
                            className={`w-full text-left rounded-xl border p-4 transition-all ${isOpen ? 'bg-white border-indigo-200 shadow-md shadow-indigo-50' : 'bg-white border-slate-100 hover:border-slate-200 hover:shadow-sm'}`}>
                            <div className="flex items-start gap-3">
                                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${p.dot}`}/>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <p className="text-[13px] font-bold text-slate-800 truncate">{a.title}</p>
                                        {a.priority === 'high' && (
                                            <Pin size={11} className="text-rose-500 flex-shrink-0"/>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                            <Clock size={9}/> {new Date(a.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                        </span>
                                        <span className="text-[10px] text-slate-400">by {a.author}</span>
                                        <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${p.bg} ${p.text}`}>
                                            {a.priority}
                                        </span>
                                    </div>
                                    {isOpen && (
                                        <p className="text-[12px] text-slate-600 mt-3 leading-relaxed border-t border-slate-100 pt-3">{a.body}</p>
                                    )}
                                </div>
                                <ChevronRight size={14} className={`text-slate-300 flex-shrink-0 mt-1 transition-transform ${isOpen ? 'rotate-90' : ''}`}/>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default AnnouncementsWidget;
