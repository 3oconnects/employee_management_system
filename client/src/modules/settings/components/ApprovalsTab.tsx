import React, { useState, useEffect } from 'react';
import { 
    CheckCircle2, XCircle, Clock, User, Shield, 
    ArrowRight, Loader2, AlertCircle, Inbox,
    Filter, RefreshCw, MoreVertical
} from 'lucide-react';
import api from '../../../services/api';

interface ApprovalRequest {
    id: string;
    employee_id: string;
    employee_name: string;
    type: string;
    status: string;
    metadata: any;
    requested_by: string;
    created_at: string;
}

interface Props {
    onRefresh?: () => void;
    onNotify: (msg: string, ok?: boolean) => void;
}

const ApprovalsTab: React.FC<Props> = ({ onRefresh, onNotify }) => {
    const [requests, setRequests] = useState<ApprovalRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [acting, setActing] = useState<string | null>(null);

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const res = await api.get('/approvals/pending');
            setRequests(res.data);
        } catch {
            onNotify('Failed to fetch approval requests', false);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    const handleAction = async (id: string, action: 'approve' | 'reject') => {
        setActing(id);
        try {
            await api.put(`/approvals/${id}/${action}`);
            onNotify(`Request ${action}d successfully!`);
            setRequests(prev => prev.filter(r => r.id !== id));
        } catch {
            onNotify(`Failed to ${action} request`, false);
        } finally {
            setActing(null);
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'role_change': return <Shield size={16} className="text-indigo-500" />;
            case 'promotion': return <ArrowRight size={16} className="text-emerald-500" />;
            default: return <Clock size={16} className="text-slate-400" />;
        }
    };

    const getTypeName = (type: string) => {
        return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-64 gap-3 bg-white rounded-xl border border-slate-100 shadow-sm">
            <Loader2 size={24} className="text-indigo-600 animate-spin" />
            <p className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">Loading Requests...</p>
        </div>
    );

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
                <div>
                    <h3 className="text-[16px] font-black text-slate-800">Pending Approvals</h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">Manage administrative and role-based change requests</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={fetchRequests} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors">
                        <RefreshCw size={16} />
                    </button>
                    <button className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-500 hover:bg-slate-50">
                        <Filter size={14} /> Filter
                    </button>
                </div>
            </div>

            {requests.length === 0 ? (
                <div className="bg-white rounded-xl border-2 border-dashed border-slate-100 p-16 text-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Inbox size={28} className="text-slate-300" />
                    </div>
                    <p className="text-[14px] font-bold text-slate-700">No Pending Requests</p>
                    <p className="text-[11px] text-slate-400 mt-1 max-w-[200px] mx-auto">All administrative requests have been actioned.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-3">
                    {requests.map(req => (
                        <div key={req.id} className="group bg-white border border-slate-100 rounded-xl p-5 flex items-center justify-between hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-500/5 transition-all">
                            <div className="flex items-center gap-5">
                                <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-all">
                                    {getTypeIcon(req.type)}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="text-[13px] font-black text-slate-800">{req.employee_name}</p>
                                        <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 text-[9px] font-black uppercase rounded tracking-wider">
                                            {getTypeName(req.type)}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-400">
                                        <div className="flex items-center gap-1">
                                            <Clock size={10} />
                                            {new Date(req.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                        <span>•</span>
                                        <div className="flex items-center gap-1">
                                            <User size={10} />
                                            ID: {req.employee_id}
                                        </div>
                                    </div>
                                    {req.metadata?.requested_role && (
                                        <div className="mt-3 flex items-center gap-2 px-3 py-1.5 bg-indigo-50 rounded-lg border border-indigo-100">
                                            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Requested Role:</span>
                                            <span className="text-[11px] font-black text-indigo-700">{req.metadata.requested_role}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handleAction(req.id, 'reject')}
                                    disabled={!!acting}
                                    className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-[12px] font-bold text-slate-500 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-all disabled:opacity-50"
                                >
                                    <XCircle size={14} />
                                    Reject
                                </button>
                                <button
                                    onClick={() => handleAction(req.id, 'approve')}
                                    disabled={!!acting}
                                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-[12px] font-bold hover:bg-indigo-500 shadow-md shadow-indigo-500/20 transition-all disabled:opacity-50"
                                >
                                    {acting === req.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                                    Approve
                                </button>
                                <button className="p-2 text-slate-300 hover:text-slate-600 transition-colors">
                                    <MoreVertical size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                    <p className="text-[12px] font-bold text-amber-900">Security Note</p>
                    <p className="text-[11px] text-amber-800/70 leading-relaxed mt-0.5">
                        Approved role changes will take effect immediately. Ensure you have verified the identity of the requester before granting elevated permissions.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ApprovalsTab;
