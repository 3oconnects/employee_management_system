import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    Users, ShieldCheck, ArrowLeft, 
    Database, TrendingUp, UserCheck,
    Zap, Mail, Loader2, Info, LayoutGrid, List,
    Network, BookOpen, Layers, ChevronRight,
    Building2, FileText, Download, Shield,
    BarChart3, History, Briefcase, Activity,
    Calendar, MoreVertical, Search, Filter,
    CheckCircle2
} from 'lucide-react';
import api from '../../../services/api';
import { toast } from '../../../components/ui';

// ─── SESSION CACHE ────────────────────────────────────────────────────────
// Prevents redundant "buffering" when switching tabs or re-visiting nodes.
const entityCache = new Map<string, { item: any; members: any[]; teams: any[]; policies: any[]; ts: number }>();
const CACHE_TTL = 60000; // 1 minute

const StructuralDeepDivePage: React.FC = () => {
    const { type, id } = useParams<{ type: string; id: string }>();
    const navigate = useNavigate();
    
    const cacheKey = `${type}-${id}`;
    const cached = entityCache.get(cacheKey);

    const [item, setItem] = useState<any>(cached?.item || null);
    const [members, setMembers] = useState<any[]>(cached?.members || []);
    const [childTeams, setChildTeams] = useState<any[]>(cached?.teams || []);
    const [policies, setPolicies] = useState<any[]>(cached?.policies || []);
    
    // Only show loader if we have NO cached data for this specific node
    const [loading, setLoading] = useState(!cached);
    
    const [activeTab, setActiveTab] = useState<'overview' | 'personnel' | 'structure' | 'analytics' | 'governance' | 'resources'>('overview');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    useEffect(() => {
        const loadData = async () => {
            const now = Date.now();
            if (cached && (now - cached.ts < CACHE_TTL)) {
                setLoading(false);
                return;
            }

            if (!cached) setLoading(true);
            try {
                let entityRes;
                let fetchedTeams: any[] = [];
                if (type === 'dept') {
                    const res = await api.get('/organization/departments');
                    entityRes = res.data.data.find((d: any) => d.id.toString() === id);
                    const tRes = await api.get('/organization/teams');
                    fetchedTeams = tRes.data.data.filter((t: any) => t.department_id?.toString() === id);
                    setChildTeams(fetchedTeams);
                } else {
                    const res = await api.get('/organization/teams');
                    entityRes = res.data.data.find((t: any) => t.id.toString() === id);
                    setChildTeams([]);
                }
                if (!entityRes) {
                    toast.error('Structural node not found');
                    navigate('/organization');
                    return;
                }
                setItem(entityRes);
                const memberRes = await api.get(`/employees?${type === 'dept' ? 'department_id' : 'team_id'}=${id}`);
                const fetchedMembers = memberRes.data.items || [];
                setMembers(fetchedMembers);
                const configRes = await api.get('/settings/config');
                const fetchedPolicies = configRes.data.data?.policies?.list ? JSON.parse(configRes.data.data.policies.list) : [];
                setPolicies(fetchedPolicies);

                // Update Session Cache
                entityCache.set(cacheKey, { 
                    item: entityRes, 
                    members: fetchedMembers, 
                    teams: fetchedTeams, 
                    policies: fetchedPolicies, 
                    ts: Date.now() 
                });
            } catch (err) {
                toast.error('Failed to load structural data');
                navigate('/organization');
            } finally {
                setLoading(false);
            }
        };
        if (type && id) loadData();
    }, [type, id, navigate]);

    if (loading) return (
        <div className="h-[60vh] flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
                <Loader2 className="animate-spin text-indigo-600" size={24} />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Resolving Blueprint...</p>
            </div>
        </div>
    );

    if (!item) return null;

    return (
        <div className="min-h-screen bg-[#F4F5F8] animate-in fade-in duration-300 pb-12 font-sans">
            
            {/* ── TOP UTILITY RAIL ──────────────────────── */}
            <div className="bg-white border-b border-slate-200 px-6 py-2.5 flex items-center justify-between sticky top-0 z-50">
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => navigate('/organization')}
                        className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-indigo-600 transition-all group"
                    >
                        <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
                    </button>
                    <div className="h-3 w-px bg-slate-200 mx-1" />
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Organization <ChevronRight size={8} /> {type === 'dept' ? 'Dept' : 'Team'} <ChevronRight size={8} /> <span className="text-slate-900 font-black">{item.name}</span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="px-2.5 py-1 bg-slate-900 text-white rounded-md text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5">
                        <ShieldCheck size={10} className="text-indigo-400" /> Protocol Active
                    </div>
                    <button className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400">
                        <MoreVertical size={16} />
                    </button>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
                
                {/* ── COMPACT HERO ───────────────────────── */}
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col md:flex-row items-stretch">
                    <div className="bg-slate-900 px-8 py-8 flex-1 relative overflow-hidden flex flex-col justify-center">
                        <div className="absolute top-0 right-0 w-64 h-full opacity-5 pointer-events-none transform translate-x-16 rotate-12">
                            <Network size={200} />
                        </div>
                        <div className="relative z-10 space-y-2">
                            <div className="flex items-center gap-1.5 text-[9px] font-black text-indigo-400 uppercase tracking-widest">
                                <Layers size={10} /> Structural Unit
                            </div>
                            <h1 className="text-[28px] font-black text-white tracking-tight leading-none">{item.name}</h1>
                            <p className="text-[12px] text-white/50 font-medium max-w-xl line-clamp-1">{item.description || 'Enterprise structural unit and operational node.'}</p>
                        </div>
                    </div>
                    <div className="bg-slate-50 border-l border-slate-200 p-6 flex items-center gap-8 px-10">
                        <div className="text-center">
                            <p className="text-[18px] font-black text-slate-900 leading-none">{members.length}</p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">Force Members</p>
                        </div>
                        <div className="w-px h-8 bg-slate-200" />
                        <div className="text-center">
                            <p className="text-[18px] font-black text-slate-900 leading-none">{item.owner_name?.split(' ')[0] || 'N/A'}</p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">Authority</p>
                        </div>
                        <div className="w-px h-8 bg-slate-200" />
                        <div className="text-center">
                            <p className="text-[18px] font-black text-indigo-600 leading-none">PEAK</p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">Status</p>
                        </div>
                    </div>
                </div>

                {/* ── NAVIGATION COCKPIT ────────────────────── */}
                <div className="flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-lg shadow-sm">
                    {[
                        { id: 'overview', label: 'Dashboard', icon: <LayoutGrid size={14} /> },
                        { id: 'personnel', label: 'Personnel', icon: <Users size={14} /> },
                        { id: 'structure', label: 'Hierarchy', icon: <Network size={14} /> },
                        { id: 'analytics', label: 'Analytics', icon: <BarChart3 size={14} /> },
                        { id: 'governance', label: 'Audit Log', icon: <History size={14} /> },
                        { id: 'resources', label: 'Resources', icon: <Briefcase size={14} /> },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-50'}`}
                        >
                            {tab.icon} {tab.label}
                        </button>
                    ))}
                </div>

                {/* ── VIEWPORT ─────────────────────────────── */}
                <div className="animate-in fade-in duration-300">
                    
                    {activeTab === 'overview' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="space-y-6">
                                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
                                    <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest px-1">Performance Rail</h3>
                                    <div className="space-y-2.5">
                                        {[
                                            { label: 'Personnel Force', value: members.length, icon: <Users size={14} />, color: 'indigo', trend: '+12%' },
                                            { label: 'Unit Efficiency', value: '94.2%', icon: <Activity size={14} />, color: 'emerald', trend: '+2%' },
                                            { label: 'Compliance Index', value: 'Level 4', icon: <Shield size={14} />, color: 'amber', trend: 'OK' }
                                        ].map((stat, i) => (
                                            <div key={i} className="p-4 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-between group hover:border-indigo-200 transition-all">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-9 h-9 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-${stat.color}-600`}>
                                                        {stat.icon}
                                                    </div>
                                                    <div>
                                                        <p className="text-[16px] font-black text-slate-900 leading-none">{stat.value}</p>
                                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">{stat.label}</p>
                                                    </div>
                                                </div>
                                                <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-white border border-slate-100 text-slate-400">{stat.trend}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="bg-slate-900 rounded-xl p-6 text-white space-y-3 relative overflow-hidden">
                                    <div className="absolute -bottom-5 -right-5 opacity-10"><Zap size={80} /></div>
                                    <h3 className="text-[9px] font-black text-white/30 uppercase tracking-widest">Strategic Mission</h3>
                                    <p className="text-[13px] font-bold leading-snug">Accelerating structural alignment and workforce synchronization.</p>
                                    <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[9px] font-black text-white/40 uppercase">
                                        <span>Status: Operational</span>
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                    </div>
                                </div>
                            </div>

                            <div className="lg:col-span-2 space-y-6">
                                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                                    <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-6 px-1">Structural Overview</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-3">
                                            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-lg bg-white border border-slate-100 text-slate-900 flex items-center justify-center font-black text-[14px]">
                                                    {item.owner_name?.substring(0, 2).toUpperCase() || 'NA'}
                                                </div>
                                                <div>
                                                    <h4 className="text-[14px] font-black text-slate-900 leading-none">{item.owner_name || 'Unassigned'}</h4>
                                                    <p className="text-[9px] font-bold text-indigo-600 uppercase tracking-widest mt-1.5">Authority Node</p>
                                                </div>
                                            </div>
                                            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-lg bg-white border border-slate-100 text-slate-400 flex items-center justify-center"><Calendar size={16} /></div>
                                                <div>
                                                    <h4 className="text-[14px] font-black text-slate-900 leading-none">{new Date(item.created_at).toLocaleDateString()}</h4>
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">Registry Entry</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-col items-center justify-center text-center space-y-3">
                                            <div className="w-20 h-20 relative flex items-center justify-center">
                                                <svg className="w-full h-full -rotate-90"><circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="5" fill="transparent" className="text-slate-200" /><circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="5" fill="transparent" strokeDasharray="226" strokeDashoffset="40" className="text-indigo-600" /></svg>
                                                <p className="absolute text-[14px] font-black text-slate-900">92%</p>
                                            </div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Capacity Used</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div onClick={() => setActiveTab('personnel')} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm cursor-pointer hover:border-indigo-400 transition-all group">
                                        <div className="flex items-center justify-between mb-3"><Users size={16} className="text-indigo-600" /><ChevronRight size={14} className="text-slate-300 group-hover:text-indigo-400" /></div>
                                        <p className="text-[13px] font-black text-slate-900 leading-none">Force Matrix</p>
                                        <p className="text-[10px] text-slate-400 mt-2">Manage {members.length} members.</p>
                                    </div>
                                    <div onClick={() => setActiveTab('structure')} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm cursor-pointer hover:border-emerald-400 transition-all group">
                                        <div className="flex items-center justify-between mb-3"><Network size={16} className="text-emerald-600" /><ChevronRight size={14} className="text-slate-300 group-hover:text-emerald-400" /></div>
                                        <p className="text-[13px] font-black text-slate-900 leading-none">Hierarchy Map</p>
                                        <p className="text-[10px] text-slate-400 mt-2">View structural tree.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'personnel' && (
                        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-5">
                                <div>
                                    <h3 className="text-[12px] font-black text-slate-900 uppercase tracking-widest">Force Matrix</h3>
                                    <p className="text-[11px] text-slate-400 mt-1">Assigned personnel for this unit.</p>
                                </div>
                                <div className="flex items-center gap-1.5 p-1 bg-slate-50 border border-slate-200 rounded-lg">
                                    <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}><LayoutGrid size={14} /></button>
                                    <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}><List size={14} /></button>
                                </div>
                            </div>
                            <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" : "space-y-2"}>
                                {members.map(member => (
                                    viewMode === 'grid' ? (
                                        <div key={member.id} className="p-5 bg-white border border-slate-200 rounded-xl hover:border-indigo-400 hover:shadow-md transition-all group">
                                            <div className="flex items-start gap-4 mb-4">
                                                <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 font-black text-[12px] group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                                    {member.name.substring(0, 2).toUpperCase()}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <h4 className="text-[13px] font-black text-slate-900 leading-tight truncate">{member.name}</h4>
                                                    <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest mt-1 truncate">{member.position}</p>
                                                </div>
                                            </div>
                                            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[9px] font-black uppercase text-slate-400">
                                                <div className="flex items-center gap-1.5"><div className="w-1 h-1 rounded-full bg-emerald-500" /> Active</div>
                                                <button className="text-indigo-600 hover:underline">Profile</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div key={member.id} className="flex items-center justify-between p-3.5 bg-white border border-slate-100 rounded-lg hover:bg-slate-50 transition-all group">
                                            <div className="flex items-center gap-4">
                                                <div className="w-9 h-9 rounded-md bg-slate-50 flex items-center justify-center text-slate-400 font-black text-[11px]">{member.name.substring(0, 2).toUpperCase()}</div>
                                                <div><h4 className="text-[14px] font-black text-slate-900 leading-none">{member.name}</h4><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">{member.position}</p></div>
                                            </div>
                                            <button className="px-4 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all">Details</button>
                                        </div>
                                    )
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'structure' && (
                        <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm space-y-10">
                            <h3 className="text-[12px] font-black text-slate-900 uppercase tracking-widest">Hierarchy Blueprint</h3>
                            <div className="relative pl-8 border-l-2 border-slate-100 space-y-10">
                                <div className="relative">
                                    <div className="absolute -left-[33px] top-6 w-8 h-[2px] bg-slate-100" />
                                    <div className="p-5 bg-slate-900 rounded-xl text-white flex items-center gap-4 w-full max-w-sm">
                                        <div className="w-9 h-9 bg-white/10 rounded-lg flex items-center justify-center">{type === 'dept' ? <Building2 size={18} /> : <Layers size={18} />}</div>
                                        <div><p className="text-[14px] font-black leading-none">{item.name}</p><p className="text-[9px] font-bold text-white/30 uppercase mt-1.5 tracking-widest">Root Unit</p></div>
                                    </div>
                                    <div className="mt-8 pl-10 space-y-5 relative border-l-2 border-slate-100">
                                        {type === 'dept' && childTeams.map(team => (
                                            <div key={team.id} className="relative">
                                                <div className="absolute -left-[42px] top-6 w-10 h-[2px] bg-slate-100" />
                                                <div className="p-4 bg-white border border-slate-200 rounded-lg flex items-center gap-4 w-full max-w-xs shadow-sm"><div className="w-9 h-9 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600"><Layers size={16} /></div><div><p className="text-[13px] font-black text-slate-900 leading-none">{team.name}</p><p className="text-[9px] font-bold text-slate-400 uppercase mt-1.5 tracking-widest">Squad Unit</p></div></div>
                                            </div>
                                        ))}
                                        {(type === 'team' || childTeams.length === 0) && members.map(member => (
                                            <div key={member.id} className="relative">
                                                <div className="absolute -left-[42px] top-5 w-10 h-[2px] bg-slate-100" />
                                                <div className="p-3 bg-white border border-slate-200 rounded-lg flex items-center gap-3 w-full max-w-xs shadow-sm"><div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 font-black text-[9px]">{member.name.substring(0, 2).toUpperCase()}</div><p className="text-[12px] font-bold text-slate-900 truncate">{member.name}</p></div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'analytics' && (
                        <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm space-y-8">
                            <h3 className="text-[12px] font-black text-slate-900 uppercase tracking-widest">Unit Productivity</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {[
                                    { label: 'Velocity', value: '86.4%', icon: <Zap size={16} />, color: 'indigo' },
                                    { label: 'Resource', value: '92.1%', icon: <BarChart3 size={16} />, color: 'emerald' },
                                    { label: 'Health', value: '100%', icon: <Activity size={16} />, color: 'amber' }
                                ].map((m, i) => (
                                    <div key={i} className="p-6 rounded-xl bg-slate-50 border border-slate-100">
                                        <div className={`w-9 h-9 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-${m.color}-600 mb-4`}>{m.icon}</div>
                                        <p className="text-[24px] font-black text-slate-900 leading-none">{m.value}</p>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2">{m.label}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'governance' && (
                        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
                            <h3 className="text-[12px] font-black text-slate-900 uppercase tracking-widest mb-2">Audit History</h3>
                            {[
                                { a: 'Member Assigned', t: 'Harsha Sharma', d: '2026-04-30', actor: 'Admin' },
                                { a: 'Protocol Updated', t: 'Security V2.1', d: '2026-04-29', actor: 'System' },
                            ].map((log, i) => (
                                <div key={i} className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-slate-400"><History size={16} /></div>
                                        <div><div className="flex items-center gap-2"><p className="text-[13px] font-black text-slate-900">{log.a}</p><span className="text-[9px] font-bold text-slate-400">→ {log.t}</span></div><p className="text-[10px] text-slate-400 mt-1 font-medium">{log.d} · Logged by {log.actor}</p></div>
                                    </div>
                                    <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Verified</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {activeTab === 'resources' && (
                        <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm space-y-6">
                            <h3 className="text-[12px] font-black text-slate-900 uppercase tracking-widest">Unit Assets</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {policies.map(p => (
                                    <div key={p.id} className="p-5 bg-white border border-slate-200 rounded-xl hover:border-indigo-400 transition-all flex flex-col gap-4">
                                        <div className="flex items-center justify-between"><div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600"><FileText size={18} /></div><Download size={14} className="text-slate-300" /></div>
                                        <div><h4 className="text-[14px] font-black text-slate-900 line-clamp-1">{p.title}</h4><div className="flex items-center gap-2 mt-2"><span className="px-2 py-0.5 bg-slate-100 text-slate-400 text-[8px] font-black uppercase rounded">{p.category}</span><span className="text-[9px] font-bold text-slate-300">{p.version}</span></div></div>
                                        <button className="w-full py-2 rounded-lg bg-slate-50 text-slate-400 text-[9px] font-black uppercase hover:bg-slate-900 hover:text-white transition-all">Preview</button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StructuralDeepDivePage;
