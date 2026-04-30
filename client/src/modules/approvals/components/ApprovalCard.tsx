import React from 'react';
import { 
    Clock, User, XCircle, CheckCircle2, Loader2, Activity, ShieldCheck, ChevronRight, X 
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { BaseApprovalRequest, ApprovalStatus } from '../types';

interface ApprovalCardProps {
    req: BaseApprovalRequest;
    isExpanded: boolean;
    setExpandedId: (id: string | null) => void;
    handleAction: (id: string, action: 'approve' | 'reject', type: string) => void;
    acting: string | null;
    viewMode: 'list' | 'grid' | 'teams';
    activeTab: ApprovalStatus | 'history';
    getTypeIcon: (type: string) => React.ReactNode;
    getTypeName: (type: string) => string;
}

const ApprovalCard: React.FC<ApprovalCardProps> = ({ 
    req, 
    isExpanded, 
    setExpandedId, 
    handleAction, 
    acting, 
    viewMode,
    activeTab,
    getTypeIcon,
    getTypeName
}) => {
    // ── Grid Mode Rendering ──
    if (viewMode === 'grid') {
        return (
            <div className="group bg-white border border-slate-100 rounded-2xl p-6 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-300 flex flex-col relative overflow-hidden">
                <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full opacity-5 transition-transform group-hover:scale-110 ${isExpanded ? 'bg-indigo-600 opacity-20' : 'bg-slate-400'}`} />
                
                <div className="flex items-start justify-between mb-6">
                    <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-all">
                        {getTypeIcon(req.type)}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[9px] font-black uppercase rounded tracking-wider">
                            {getTypeName(req.type)}
                        </span>
                        {activeTab === 'history' && (
                            <span className={`px-2 py-0.5 text-[8px] font-black uppercase rounded tracking-wider border
                                ${req.status === 'approved' || req.status === 'active' ? 'text-emerald-600 bg-emerald-50 border-emerald-100' : 'text-rose-600 bg-rose-50 border-rose-100'}`}>
                                {req.status}
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex-1">
                    <p className="text-[18px] font-black text-slate-800 tracking-tight leading-tight">{req.employee_name}</p>
                    <p className="text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-widest">ID: {req.employee_id}</p>
                    
                    <div className="mt-6 pt-6 border-t border-slate-50 space-y-3">
                        {req.metadata && Object.entries(req.metadata).slice(0, 2).map(([k, v]: [string, any]) => (
                            <div key={k} className="flex items-center justify-between">
                                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{k.replace(/_/g, ' ')}</span>
                                <span className="text-[12px] font-bold text-slate-600">{String(v)}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="mt-8 flex items-center gap-2">
                    {activeTab === 'pending' ? (
                        <>
                            <button
                                onClick={() => handleAction(req.id, 'reject', req.type)}
                                className="flex-1 py-3 border border-slate-100 rounded-xl text-[12px] font-bold text-slate-400 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100 transition-all"
                            >
                                Reject
                            </button>
                            <button
                                onClick={() => handleAction(req.id, 'approve', req.type)}
                                className="flex-[2] py-3 bg-indigo-600 text-white rounded-xl text-[12px] font-black hover:bg-indigo-700 shadow-xl shadow-indigo-500/20 transition-all"
                            >
                                Approve
                            </button>
                        </>
                    ) : (
                        <button 
                            onClick={() => setExpandedId(isExpanded ? null : req.id)}
                            className="w-full py-3 bg-slate-50 text-slate-500 rounded-xl text-[12px] font-black hover:bg-indigo-50 hover:text-indigo-600 transition-all"
                        >
                            View Details
                        </button>
                    )}
                </div>
                
                {isExpanded && createPortal(
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 animate-in fade-in duration-300">
                        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-3xl" onClick={() => setExpandedId(null)} />
                        <div className="relative bg-white border border-slate-200 w-full max-w-md rounded-3xl shadow-2xl animate-in zoom-in-95 duration-500 overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                            <button 
                                onClick={() => setExpandedId(null)}
                                className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all z-10"
                            >
                                <X size={16} />
                            </button>
                            <div className="p-8 pb-4 flex items-start justify-between">
                                <div className="flex items-center gap-6">
                                    <div className="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-xl">
                                        {getTypeIcon(req.type)}
                                    </div>
                                    <div>
                                        <p className="text-[22px] font-black text-slate-900 leading-tight tracking-tight">{req.employee_name}</p>
                                        <p className="text-[12px] font-bold text-slate-400 uppercase tracking-widest mt-1">{getTypeName(req.type)} • ID: {req.id}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto px-8 py-4 custom-scrollbar">
                                <div className="grid grid-cols-2 gap-4">
                                    {Object.entries(req.metadata || {}).map(([k, v]: [string, any]) => (
                                        <div key={k} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:bg-white hover:border-indigo-100 transition-all hover:shadow-lg hover:shadow-indigo-500/5">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 group-hover:text-indigo-400 transition-colors">{k.replace(/_/g, ' ')}</p>
                                            <p className="text-[15px] font-black text-slate-800 tracking-tight">{v === null || v === 'null' ? '—' : String(v)}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="p-8 pt-4 border-t border-slate-50 bg-slate-50/30">
                                <div className="flex items-center gap-3">
                                    <ShieldCheck size={16} className="text-emerald-500" />
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Verified Policy Architecture</span>
                                </div>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}
            </div>
        );
    }

    return (
        <div 
            className={`group bg-white border border-slate-100 rounded-xl transition-all duration-300 
                ${isExpanded ? 'ring-4 ring-indigo-500/10 border-indigo-200 shadow-2xl z-10 -mx-1' : 'hover:border-slate-300 shadow-sm'}`}
        >
            <div className="flex items-center justify-between p-2.5 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : req.id)}>
                <div className="flex items-center gap-3.5 flex-1 min-w-0">
                    <div className={`w-8 h-8 ${isExpanded ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-slate-50 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-500'} rounded-lg flex items-center justify-center transition-all flex-shrink-0`}>
                        {React.cloneElement(getTypeIcon(req.type) as React.ReactElement, { size: 14 })}
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                            <p className={`font-black tracking-tight transition-all ${isExpanded ? 'text-[15px] text-indigo-900' : 'text-[12.5px] text-slate-800'}`}>
                                {req.employee_name}
                            </p>
                            <span className="px-1.5 py-0.5 bg-slate-50 text-slate-400 text-[8.5px] font-black uppercase rounded tracking-wider border border-slate-100">
                                {getTypeName(req.type)}
                            </span>
                            {activeTab === 'history' && (
                                <span className={`px-1.5 py-0.5 text-[8.5px] font-black uppercase rounded tracking-wider 
                                    ${req.status === 'approved' || req.status === 'active' ? 'text-emerald-600 bg-emerald-50 border border-emerald-100' : 'text-rose-600 bg-rose-50 border border-rose-100'}`}>
                                    {req.status}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 text-[10px] text-slate-400 font-bold uppercase tracking-wider opacity-70">
                            <span className="flex items-center gap-1"><Clock size={10} className="text-slate-300" /> {new Date(req.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</span>
                            <span className="text-slate-200">/</span>
                            <span className="flex items-center gap-1"><User size={10} className="text-slate-300" /> {req.employee_id}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 ml-2" onClick={e => e.stopPropagation()}>
                    {activeTab === 'pending' ? (
                        <>
                            <button
                                onClick={() => handleAction(req.id, 'reject', req.type)}
                                disabled={!!acting}
                                className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all border border-transparent hover:border-rose-100"
                                title="Reject"
                            >
                                <XCircle size={16} />
                            </button>
                            <button
                                onClick={() => handleAction(req.id, 'approve', req.type)}
                                disabled={!!acting}
                                className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-[11px] font-black hover:bg-indigo-700 transition-all shadow-md shadow-indigo-500/20"
                            >
                                {acting === req.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                                Approve
                            </button>
                        </>
                    ) : (
                        <div className="w-8 h-8 flex items-center justify-center bg-slate-50 text-slate-300 rounded-lg">
                            <Activity size={14} />
                        </div>
                    )}
                </div>
            </div>

            {/* ── High-Fidelity Professional Modal (Using Portals) ── */}
            {isExpanded && createPortal(
                <div 
                    className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-500"
                >
                    {/* Deep Cinematic Backdrop Overlay */}
                    <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-3xl" onClick={() => setExpandedId(null)} />

                    <div 
                        className="relative bg-white border border-slate-200 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-500 flex flex-col max-h-[90vh]"
                        onClick={e => e.stopPropagation()}
                    >
                        <button 
                            onClick={() => setExpandedId(null)}
                            className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all z-10"
                        >
                            <X size={16} />
                        </button>
                        {/* Compact Identity Header */}
                        <div className="p-8 pb-4 flex flex-col items-center text-center">
                            <div className="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-xl mb-4">
                                {React.cloneElement(getTypeIcon(req.type) as React.ReactElement, { size: 24 })}
                            </div>
                            <h3 className="text-[22px] font-black text-slate-900 tracking-tighter leading-tight">{req.employee_name}</h3>
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.1em] mt-1">{getTypeName(req.type)} • ID: {req.employee_id}</p>
                        </div>

                        {/* Scrollable Metadata Area — Solves the "Overlap" overflow issues */}
                        <div className="flex-1 overflow-y-auto px-8 py-3 space-y-3 custom-scrollbar">
                            <div className="grid grid-cols-1 gap-3">
                                {Object.entries(req.metadata || {}).map(([k, v]: [string, any]) => (
                                    <div key={k} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col gap-1">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{k.replace(/_/g, ' ')}</span>
                                        <span className="text-[14px] font-black text-slate-800 tracking-tight">
                                            {v === null || v === 'null' ? '—' : String(v)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                            
                            {/* Integrated Policy Badge */}
                            <div className="mt-2 flex items-center gap-3 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/50">
                                <div className="w-8 h-8 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
                                    <ShieldCheck size={16} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-indigo-900 uppercase tracking-widest">Policy Verified</p>
                                    <p className="text-[8px] font-bold text-indigo-600/70 uppercase tracking-wider mt-0.5">Automated Compliance Check Passed</p>
                                </div>
                            </div>
                        </div>

                        {/* Proper Decision Footer */}
                        <div className="p-8 flex gap-4">
                            {activeTab === 'pending' ? (
                                <>
                                    <button 
                                        onClick={() => handleAction(req.id, 'reject', req.type)}
                                        className="flex-1 py-4 bg-slate-50 text-slate-500 rounded-2xl text-[12px] font-black hover:bg-rose-50 hover:text-rose-600 transition-all border border-slate-100 active:scale-95"
                                    >
                                        Reject
                                    </button>
                                    <button 
                                        onClick={() => handleAction(req.id, 'approve', req.type)}
                                        className="flex-[1.5] py-4 bg-slate-900 text-white rounded-2xl text-[12px] font-black hover:bg-indigo-600 shadow-xl shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 active:scale-95"
                                    >
                                        Approve <ChevronRight size={16} />
                                    </button>
                                </>
                            ) : (
                                <div className={`w-full py-4 rounded-2xl text-[12px] font-black uppercase tracking-[0.1em] border flex items-center justify-center gap-3
                                    ${req.status === 'approved' || req.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                                    <div className={`w-2 h-2 rounded-full ${req.status === 'approved' || req.status === 'active' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]'}`} />
                                    Decision: {req.status}
                                </div>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default ApprovalCard;
