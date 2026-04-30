import React from 'react';
import { createPortal } from 'react-dom';
import { 
    X, Users, Activity, ShieldCheck, ArrowLeft, 
    Layout, Database, TrendingUp, UserCheck,
    Briefcase, Award, Zap, Mail, Phone, MapPin
} from 'lucide-react';

interface StructuralDeepDiveProps {
    item: any;
    type: 'dept' | 'team' | 'node';
    members: any[];
    onClose: () => void;
}

const StructuralDeepDive: React.FC<StructuralDeepDiveProps> = ({
    item,
    type,
    members,
    onClose
}) => {
    return createPortal(
        <div className="fixed inset-0 z-[10002] flex flex-col bg-slate-950/20 backdrop-blur-xl animate-in fade-in duration-500 overflow-hidden">
            <div className="flex-1 flex flex-col m-6 bg-white rounded-[40px] shadow-2xl border border-white/20 overflow-hidden relative">
                
                {/* Administrative Header */}
                <header className="px-12 py-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                    <div className="flex items-center gap-6">
                        <button onClick={onClose} className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-900 hover:border-slate-400 transition-all group">
                            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                        </button>
                        <div>
                            <div className="flex items-center gap-2 text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-1">
                                <Database size={12} /> Structural Deep Dive
                            </div>
                            <h2 className="text-[32px] font-black text-slate-900 tracking-tight leading-none">{item.name}</h2>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="px-6 py-3 bg-slate-900 rounded-2xl flex items-center gap-3 shadow-xl shadow-slate-900/20">
                            <ShieldCheck size={18} className="text-indigo-400" />
                            <span className="text-[12px] font-bold text-white uppercase tracking-widest">Protocol Active</span>
                        </div>
                        <button onClick={onClose} className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all">
                            <X size={20} />
                        </button>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto custom-scrollbar flex">
                    {/* Left: Metadata & Analytics */}
                    <aside className="w-[400px] border-r border-slate-50 p-12 space-y-10 bg-slate-50/10">
                        <section className="space-y-6">
                            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Division Metrics</h3>
                            <div className="grid grid-cols-1 gap-4">
                                {[
                                    { label: 'Total Force', value: members.length, icon: <Users size={18} />, color: 'indigo' },
                                    { label: 'Operational Efficiency', value: '94.2%', icon: <TrendingUp size={18} />, color: 'emerald' },
                                    { label: 'Compliance Rating', value: 'Level 4', icon: <UserCheck size={18} />, color: 'amber' }
                                ].map((stat, i) => (
                                    <div key={i} className="p-6 bg-white border border-slate-100 rounded-3xl flex items-center gap-5 shadow-sm">
                                        <div className={`w-12 h-12 rounded-2xl bg-${stat.color}-50 text-${stat.color}-600 flex items-center justify-center`}>
                                            {stat.icon}
                                        </div>
                                        <div>
                                            <p className="text-[20px] font-black text-slate-900 leading-none">{stat.value}</p>
                                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">{stat.label}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>

                        <section className="space-y-6">
                            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Mission Context</h3>
                            <div className="p-8 bg-slate-900 rounded-[32px] text-white shadow-2xl shadow-slate-900/10 space-y-4">
                                <p className="text-[14px] font-medium leading-relaxed opacity-70">
                                    {item.description || 'This unit is dedicated to high-velocity structural alignment and strategic growth within the enterprise ecosystem.'}
                                </p>
                                <div className="pt-4 border-t border-white/10 flex items-center gap-3">
                                    <Zap size={16} className="text-amber-400" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-white/50">Urgency: High</span>
                                </div>
                            </div>
                        </section>
                    </aside>

                    {/* Right: Personnel Matrix (Profile Grid) */}
                    <section className="flex-1 p-12 space-y-10">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Personnel Matrix</h3>
                                <p className="text-[13px] text-slate-500 font-medium mt-1">Directly assigned members and leadership.</p>
                            </div>
                            <div className="flex items-center gap-2 p-1.5 bg-slate-50 rounded-xl border border-slate-100">
                                <button className="px-4 py-2 bg-white text-slate-900 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm">Grid View</button>
                                <button className="px-4 py-2 text-slate-400 rounded-lg text-[10px] font-black uppercase tracking-widest hover:text-slate-600 transition-colors">Compact List</button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            {members.map(member => (
                                <div key={member.id} className="p-8 bg-white border border-slate-100 rounded-[32px] hover:border-indigo-500 hover:shadow-2xl hover:shadow-indigo-500/5 transition-all group relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-8 opacity-0 group-hover:opacity-10 transition-opacity">
                                        <Users size={100} />
                                    </div>
                                    
                                    <div className="relative z-10 flex gap-6">
                                        <div className="w-20 h-20 rounded-3xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300 font-black text-[24px] group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 transition-all">
                                            {member.name.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div className="space-y-4">
                                            <div>
                                                <h4 className="text-[20px] font-black text-slate-900 tracking-tight leading-tight">{member.name}</h4>
                                                <p className="text-[11px] font-black text-indigo-600 uppercase tracking-widest mt-1">{member.position}</p>
                                            </div>
                                            <div className="flex items-center gap-4 text-[13px] text-slate-500 font-medium">
                                                <div className="flex items-center gap-1.5"><Mail size={14} className="text-slate-300" /> {member.email}</div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {['Architecture', 'V3 Systems', 'Governance'].map((tag, i) => (
                                                    <span key={i} className="px-2.5 py-1 bg-slate-50 text-slate-400 text-[9px] font-bold uppercase tracking-widest rounded-md border border-slate-100">
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                            <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Active Now</span>
                                        </div>
                                        <button className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline flex items-center gap-2">
                                            View Profile <ArrowLeft size={12} className="rotate-180" />
                                        </button>
                                    </div>
                                </div>
                            ))}

                            {members.length === 0 && (
                                <div className="col-span-full py-24 text-center bg-slate-50/50 rounded-[40px] border-2 border-dashed border-slate-100">
                                    <Users size={48} className="mx-auto text-slate-200 mb-6" />
                                    <h4 className="text-[18px] font-black text-slate-900">No Force Composition</h4>
                                    <p className="text-[14px] text-slate-400 font-medium mt-2">Initialize personnel assignment to populate matrix.</p>
                                    <button className="mt-8 px-8 py-3.5 bg-slate-900 text-white rounded-2xl text-[12px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-xl shadow-slate-900/10">
                                        Assign Personnel
                                    </button>
                                </div>
                            )}
                        </div>
                    </section>
                </main>

                {/* Footer Rail */}
                <footer className="px-12 py-6 border-t border-slate-50 bg-slate-50/30 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Layout size={16} className="text-slate-300" />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">System Architecture V3.1.2 — Live Structural Stream</span>
                    </div>
                    <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                        Confidential Administrative Blueprint
                    </div>
                </footer>
            </div>
        </div>,
        document.body
    );
};

export default StructuralDeepDive;
