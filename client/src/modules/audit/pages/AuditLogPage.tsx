import React, { useState, useEffect } from 'react';
import { 
    History, User, Clock, Database, Activity, Search, Filter, 
    ChevronLeft, ChevronRight, Eye, X, ShieldCheck, Cpu 
} from 'lucide-react';
import { createPortal } from 'react-dom';
import api from '../../../services/api';
import { LoadingSpinner } from '../../../components/ui';

const AuditLogPage: React.FC = () => {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedLog, setSelectedLog] = useState<any | null>(null);
    
    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);

    // Filtering State
    const [entityFilter, setEntityFilter] = useState('all');
    const [actionFilter, setActionFilter] = useState('all');

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                const res = await api.get('/audit-logs?limit=500'); 
                setLogs(res.data.data || []);
            } catch (err) {
                console.error('Failed to fetch audit logs', err);
            } finally {
                setLoading(false);
            }
        };
        fetchLogs();
    }, []);

    const entities = ['all', ...new Set(logs.map(l => l.entity_type))];
    const actions = ['all', ...new Set(logs.map(l => l.action))];

    const filteredLogs = logs.filter(log => {
        const matchesSearch = 
            log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.entity_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.user_email?.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesEntity = entityFilter === 'all' || log.entity_type === entityFilter;
        const matchesAction = actionFilter === 'all' || log.action === actionFilter;

        return matchesSearch && matchesEntity && matchesAction;
    });

    const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredLogs.slice(indexOfFirstItem, indexOfLastItem);

    const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

    if (loading) return <LoadingSpinner text="Loading audit archive..." />;

    return (
        <div className="p-8 page-enter space-y-6 max-w-[1400px] mx-auto pb-20">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-lg">
                        <History size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Audit Logs</h1>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-0.5">System Traceability & Compliance Matrix</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Search actions, users..."
                            value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                            className="pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[12px] w-64 focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none shadow-sm"
                        />
                    </div>
                    <select value={entityFilter} onChange={(e) => { setEntityFilter(e.target.value); setCurrentPage(1); }} className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[12px] font-bold text-slate-600 outline-none focus:border-indigo-500 shadow-sm">
                        <option value="all">All Entities</option>
                        {entities.filter(e => e !== 'all').map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                    <select value={actionFilter} onChange={(e) => { setActionFilter(e.target.value); setCurrentPage(1); }} className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[12px] font-bold text-slate-600 outline-none focus:border-indigo-500 shadow-sm">
                        <option value="all">All Actions</option>
                        {actions.filter(a => a !== 'all').map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                </div>
            </div>

            {/* Table Container */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
                    <div className="flex items-center gap-2">
                        <Activity size={14} className="text-slate-400" />
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Activity Stream</span>
                    </div>
                    <div className="flex items-center gap-2 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg">
                        <Database size={10} className="text-slate-400" />
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{filteredLogs.length} Total Records</span>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 bg-slate-50/30">
                                <th className="px-6 py-4">Action</th>
                                <th className="px-6 py-4">Entity</th>
                                <th className="px-6 py-4">Performed By</th>
                                <th className="px-6 py-4">Timestamp</th>
                                <th className="px-6 py-4 text-right">Options</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {currentItems.map((log: any) => (
                                <tr key={log.id} className="hover:bg-slate-50/50 transition-all group">
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex px-2 py-1 rounded-lg font-black text-[9px] uppercase tracking-wider border
                                            ${log.action.includes('DELETE') ? 'bg-rose-50 text-rose-600 border-rose-100' : 
                                              log.action.includes('CREATE') ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                                              'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                            {log.action}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-[13px] font-bold text-slate-700">{log.entity_type}</p>
                                        <p className="text-[10px] text-slate-400 font-bold tracking-tighter">ID: {log.entity_id || 'N/A'}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400">
                                                <User size={14} />
                                            </div>
                                            <div>
                                                <p className="text-[13px] font-black text-slate-800">{log.user_name || 'System'}</p>
                                                <p className="text-[10px] text-slate-400 font-medium">{log.user_email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-1.5 text-slate-700 font-bold text-[12px]">
                                                <Clock size={12} className="text-slate-300" />
                                                {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                                                {new Date(log.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                            </p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button onClick={() => setSelectedLog(log)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all">
                                            <Eye size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/30 flex items-center justify-between">
                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                        Showing {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredLogs.length)} of {filteredLogs.length}
                    </p>
                    <div className="flex items-center gap-2">
                        <button disabled={currentPage === 1} onClick={() => paginate(currentPage - 1)} className="p-2 border border-slate-200 rounded-lg text-slate-400 hover:bg-white hover:text-slate-600 disabled:opacity-30 transition-all">
                            <ChevronLeft size={16} />
                        </button>
                        <button disabled={currentPage === totalPages} onClick={() => paginate(currentPage + 1)} className="p-2 border border-slate-200 rounded-lg text-slate-400 hover:bg-white hover:text-slate-600 disabled:opacity-30 transition-all">
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {selectedLog && createPortal(
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setSelectedLog(null)} />
                    <div className="relative bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
                        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-lg">
                                    <Cpu size={20} />
                                </div>
                                <div>
                                    <h3 className="text-[18px] font-black text-slate-900 tracking-tight">Log Entry Detail</h3>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-0.5">Reference ID: {selectedLog.id}</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedLog(null)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                            <div className="grid grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <section className="space-y-1.5">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Operational Action</p>
                                        <span className={`px-2 py-1 rounded-lg font-black text-[10px] uppercase tracking-wider border
                                            ${selectedLog.action.includes('DELETE') ? 'bg-rose-50 text-rose-600 border-rose-100' : 
                                              selectedLog.action.includes('CREATE') ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                                              'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                            {selectedLog.action}
                                        </span>
                                    </section>
                                    <section className="space-y-1.5">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Affected Entity</p>
                                        <p className="text-[15px] font-black text-slate-800">{selectedLog.entity_type}</p>
                                        <p className="text-[11px] text-slate-500 font-bold uppercase tracking-tight">Global Identifier: {selectedLog.entity_id}</p>
                                    </section>
                                </div>
                                <div className="space-y-6">
                                    <section className="space-y-1.5">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Performed By</p>
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 border border-slate-200">
                                                <User size={18} />
                                            </div>
                                            <div>
                                                <p className="text-[14px] font-black text-slate-800">{selectedLog.user_name || 'System'}</p>
                                                <p className="text-[11px] text-slate-400 font-medium">{selectedLog.user_email || 'automated@auracore.io'}</p>
                                            </div>
                                        </div>
                                    </section>
                                    <section className="space-y-1.5">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Temporal Signature</p>
                                        <p className="text-[14px] font-bold text-slate-700 flex items-center gap-2">
                                            <Clock size={14} className="text-slate-300" />
                                            {new Date(selectedLog.created_at).toLocaleString()}
                                        </p>
                                    </section>
                                </div>
                            </div>

                            {selectedLog.metadata && (
                                <section className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <Database size={14} className="text-indigo-600" />
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Metadata Payload</p>
                                    </div>
                                    <div className="bg-slate-900 rounded-xl p-6 font-mono text-[12px] text-emerald-400 shadow-inner overflow-x-auto">
                                        <pre>{JSON.stringify(selectedLog.metadata, null, 2)}</pre>
                                    </div>
                                </section>
                            )}
                        </div>

                        <div className="px-8 py-5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <ShieldCheck size={14} className="text-emerald-500" />
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Immutable Audit Record</span>
                            </div>
                            <button onClick={() => setSelectedLog(null)} className="px-5 py-2 bg-slate-900 text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-md active:scale-95">
                                Close Entry
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default AuditLogPage;
