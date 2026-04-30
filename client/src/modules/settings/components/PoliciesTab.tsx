import React, { useState, useEffect } from 'react';
import { 
    Plus, FileText, Trash2, Shield, 
    Calendar, Tag, Download, Eye, 
    Loader2, AlertCircle, Check,
    UploadCloud, Globe, X
} from 'lucide-react';
import api from '../../../services/api';

interface Policy {
    id: string;
    title: string;
    category: string;
    version: string;
    updated: string;
    mandatory: boolean;
    url?: string;
}

interface Props {
    onRefresh: () => void;
    onNotify: (msg: string, ok?: boolean) => void;
}

const CATEGORIES = ['HR', 'Compliance', 'Operations', 'Security', 'Finance', 'General'];

const PoliciesTab: React.FC<Props> = ({ onRefresh, onNotify }) => {
    const [policies, setPolicies] = useState<Policy[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [newPolicy, setNewPolicy] = useState<Partial<Policy>>({
        title: '',
        category: 'General',
        version: 'v1.0',
        mandatory: false
    });

    const loadPolicies = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/settings/config');
            if (data.data?.policies?.list) {
                setPolicies(JSON.parse(data.data.policies.list));
            } else {
                setPolicies([]);
            }
        } catch (err) {
            console.error('Failed to load policies:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadPolicies();
    }, []);

    const handleSave = async (updatedList: Policy[]) => {
        setSaving(true);
        try {
            await api.put('/settings/config', {
                category: 'policies',
                settings: { list: JSON.stringify(updatedList) }
            });
            setPolicies(updatedList);
            onNotify('Policies updated successfully');
            setShowModal(false);
            onRefresh();
        } catch (err) {
            onNotify('Failed to save policies', false);
        } finally {
            setSaving(false);
        }
    };

    const addPolicy = () => {
        if (!newPolicy.title) return onNotify('Policy title is required', false);
        const policy: Policy = {
            id: Math.random().toString(36).slice(2, 11),
            title: newPolicy.title!,
            category: newPolicy.category || 'General',
            version: newPolicy.version || 'v1.0',
            updated: new Date().toISOString(),
            mandatory: !!newPolicy.mandatory,
            url: newPolicy.url
        };
        handleSave([...policies, policy]);
    };

    const removePolicy = (id: string) => {
        if (window.confirm('Are you sure you want to remove this policy?')) {
            handleSave(policies.filter(p => p.id !== id));
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-64 gap-3 bg-white rounded-xl border border-slate-100 shadow-sm">
            <Loader2 size={24} className="text-indigo-600 animate-spin" />
            <p className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">Loading Policies...</p>
        </div>
    );

    return (
        <div className="space-y-6">
            {/* ── Actions ── */}
            <div className="flex items-center justify-end">
                <button 
                    onClick={() => {
                        setNewPolicy({ title: '', category: 'General', version: 'v1.0', mandatory: false });
                        setShowModal(true);
                    }}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-2xl text-[12px] font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20"
                >
                    <Plus size={16} />
                    Add New Policy
                </button>
            </div>

            {/* ── List ── */}
            <div className="grid grid-cols-1 gap-3">
                {policies.length === 0 ? (
                    <div className="bg-white rounded-xl border-2 border-dashed border-slate-200 p-12 text-center">
                        <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-4">
                            <FileText size={28} className="text-slate-300" />
                        </div>
                        <h3 className="text-[14px] font-bold text-slate-600">No policies published yet</h3>
                        <p className="text-[12px] text-slate-400 mt-1 mb-6">Add company handbooks or compliance documents here</p>
                        <button 
                            onClick={() => setShowModal(true)}
                            className="text-indigo-600 text-[12px] font-black uppercase tracking-widest hover:underline"
                        >
                            Upload your first policy
                        </button>
                    </div>
                ) : (
                    policies.map(p => (
                        <div key={p.id} className="group bg-white rounded-xl border border-slate-100 p-5 flex items-center justify-between hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-500/5 transition-all">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-cyan-50 rounded-2xl flex items-center justify-center text-cyan-600 group-hover:scale-110 transition-transform">
                                    <FileText size={20} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h4 className="text-[14px] font-black text-slate-800">{p.title}</h4>
                                        {p.mandatory && (
                                            <span className="flex items-center gap-1 px-2 py-0.5 bg-rose-50 text-rose-600 text-[9px] font-black uppercase rounded-full border border-rose-100">
                                                <Shield size={8} /> Mandatory
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3 mt-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                        <span className="flex items-center gap-1"><Tag size={10} /> {p.category}</span>
                                        <span className="flex items-center gap-1"><Globe size={10} /> {p.version}</span>
                                        <span className="flex items-center gap-1"><Calendar size={10} /> {new Date(p.updated).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all" title="View">
                                    <Eye size={18} />
                                </button>
                                <button 
                                    onClick={() => removePolicy(p.id)}
                                    className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all" title="Delete"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* ── Add Modal ── */}
            {showModal && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div>
                                <h3 className="text-[18px] font-black text-slate-800">Add Company Policy</h3>
                                <p className="text-[12px] text-slate-400 mt-0.5">Upload and configure a new document</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="w-10 h-10 flex items-center justify-center rounded-2xl text-slate-400 hover:bg-white hover:text-slate-600 transition-all border border-transparent hover:border-slate-200">
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="p-8 space-y-5">
                            <div>
                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Policy Title</label>
                                <input 
                                    type="text" 
                                    placeholder="e.g. Employee Handbook 2026"
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-[14px] focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                    value={newPolicy.title}
                                    onChange={e => setNewPolicy({...newPolicy, title: e.target.value})}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Category</label>
                                    <select 
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-[14px] focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                        value={newPolicy.category}
                                        onChange={e => setNewPolicy({...newPolicy, category: e.target.value})}
                                    >
                                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Version</label>
                                    <input 
                                        type="text" 
                                        placeholder="v1.0"
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-[14px] focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                        value={newPolicy.version}
                                        onChange={e => setNewPolicy({...newPolicy, version: e.target.value})}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Document URL / File</label>
                                <div className="relative group">
                                    <input 
                                        type="text" 
                                        placeholder="https://docs.google.com/..."
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-[14px] focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                        value={newPolicy.url}
                                        onChange={e => setNewPolicy({...newPolicy, url: e.target.value})}
                                    />
                                    <button className="absolute right-2 top-2 w-9 h-9 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm">
                                        <UploadCloud size={16} />
                                    </button>
                                </div>
                                <p className="text-[10px] text-slate-400 mt-2 px-1">Upload a PDF or provide a direct link to the document</p>
                            </div>

                            <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl cursor-pointer border border-slate-200 hover:border-indigo-300 transition-all group">
                                <input 
                                    type="checkbox" 
                                    className="w-5 h-5 rounded-lg border-slate-300 text-indigo-600 focus:ring-indigo-500 transition-all"
                                    checked={newPolicy.mandatory}
                                    onChange={e => setNewPolicy({...newPolicy, mandatory: e.target.checked})}
                                />
                                <div>
                                    <p className="text-[13px] font-black text-slate-700 group-hover:text-indigo-600 transition-colors">Mark as Mandatory</p>
                                    <p className="text-[11px] text-slate-400">Employees will see this as a required document to read</p>
                                </div>
                            </label>
                        </div>

                        <div className="px-8 py-6 bg-slate-50/50 border-t border-slate-100 flex items-center justify-end gap-3">
                            <button 
                                onClick={() => setShowModal(false)}
                                className="px-6 py-2.5 text-[12px] font-bold text-slate-500 hover:text-slate-800 transition-all"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={addPolicy}
                                disabled={saving}
                                className="flex items-center gap-2 bg-indigo-600 text-white px-8 py-2.5 rounded-2xl text-[12px] font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50"
                            >
                                {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                                {saving ? 'Publishing...' : 'Publish Policy'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PoliciesTab;
