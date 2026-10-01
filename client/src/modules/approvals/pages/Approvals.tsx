import React, { useState, useEffect } from 'react';
import { 
    Loader2, AlertCircle, Inbox
} from 'lucide-react';
import api from '../../../services/api';
import { BaseApprovalRequest, ApprovalType, ApprovalStatus } from '../types';

// ── Components ──
import ApprovalStats from '../components/ApprovalStats';
import ApprovalNav from '../components/ApprovalNav';
import ApprovalSidebar from '../components/ApprovalSidebar';
import ApprovalCard from '../components/ApprovalCard';
import ApprovalTeamCard from '../components/ApprovalTeamCard';

// ── Utils ──
import { getTypeIcon, getTypeName } from '../utils/approvalUtils';

const Approvals: React.FC = () => {
    const [requests, setRequests] = useState<BaseApprovalRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [acting, setActing] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<ApprovalStatus | 'history'>('pending');
    const [filterType, setFilterType] = useState<ApprovalType | 'all'>('all');
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'list' | 'grid' | 'teams'>('teams');
    const [searchQuery, setSearchQuery] = useState('');

    const fetchRequests = async () => {
        setLoading(true);
        setError(null);
        try {
            const statusParam = activeTab === 'history' ? 'completed' : 'pending';
            const response = await api.get(`/approvals?status=${statusParam}`);
            console.log('📦 DATA RECEIVED:', response.data.data);
            setRequests(response.data.data || []);
        } catch (err: any) {
            console.error('❌ APPROVALS HUB ERROR:', err);
            setError(err.response?.data?.message || 'Failed to fetch approvals. Please check server connectivity.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, [activeTab]);

    const handleAction = async (id: string, action: 'approve' | 'reject', type: string) => {
        setActing(id);
        try {
            await api.post(`/approvals/${id}/action`, { action, type });
            setRequests(prev => prev.filter(r => r.id !== id));
            setExpandedId(null);
        } catch (err) {
            console.error(`❌ ${action.toUpperCase()} ERROR:`, err);
            alert(`Failed to ${action} request. Please try again.`);
        } finally {
            setActing(null);
        }
    };

    return (
        <div className="p-6 max-w-[1600px] mx-auto space-y-6">
            {/* ── Page Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Approvals</h1>
                    <p className="text-sm text-slate-500 mt-0.5">Review and action pending approval requests</p>
                </div>
                <div>
                    <button className="px-4 py-2 bg-white border border-slate-200 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all">
                        Export Logs
                    </button>
                </div>
            </div>

            {/* ── KPI Metrics Row ── */}
            <ApprovalStats 
                pendingCount={activeTab === 'pending' ? requests.length : 0}
                historyCount={activeTab === 'history' ? requests.length : 0}
                teamCount={new Set(requests.map(r => r.department)).size}
                activeTab={activeTab}
            />

            {/* ── Sub Navigation ── */}
            <ApprovalNav 
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                viewMode={viewMode}
                setViewMode={setViewMode}
                requestCount={requests.length}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
            />

            {/* ── Sidebar + Content Layout ── */}
            <div className="flex gap-6 relative">
                {(() => {
                    const categoryCounts = requests.reduce((acc, req) => {
                        acc[req.type] = (acc[req.type] || 0) + 1;
                        return acc;
                    }, {} as Record<string, number>);

                    return (
                        <ApprovalSidebar 
                            filterType={filterType}
                            setFilterType={setFilterType}
                            isCollapsed={isSidebarCollapsed}
                            setIsCollapsed={setIsSidebarCollapsed}
                            counts={categoryCounts}
                        />
                    );
                })()}

                {/* ── Main Content Area ── */}
                <div className="flex-1 min-w-0">
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                            <AlertCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                            <div>
                                <p className="text-sm font-semibold text-red-800">Failed to load approvals</p>
                                <p className="text-xs text-red-700 mt-0.5">{error}</p>
                            </div>
                        </div>
                    )}
                    
                    {loading ? (
                        <div className="bg-white border border-slate-200 rounded-lg p-16 flex flex-col items-center justify-center">
                            <Loader2 size={22} className="text-indigo-600 animate-spin mb-3" />
                            <p className="text-sm text-slate-500">Loading approvals...</p>
                        </div>
                    ) : requests.length === 0 ? (
                        <div className="bg-white border border-slate-200 rounded-lg p-16 flex flex-col items-center justify-center text-center">
                            <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                                <Inbox size={24} className="text-slate-400" />
                            </div>
                            <h3 className="text-base font-semibold text-slate-700">No approvals found</h3>
                            <p className="text-sm text-slate-400 mt-1.5 max-w-xs">There are no {activeTab === 'pending' ? 'pending' : 'completed'} approval requests at this time.</p>
                        </div>
                    ) : (
                        <div className={viewMode === 'teams' ? "grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6 pb-20" : "flex-1 space-y-6 pb-20"}>
                            {Object.entries(
                                requests
                                    .filter(r => filterType === 'all' || r.type === filterType)
                                    .filter(r => {
                                        const query = searchQuery.toLowerCase();
                                        return r.employee_name.toLowerCase().includes(query) || 
                                               r.id.toLowerCase().includes(query) || 
                                               r.type.toLowerCase().includes(query) ||
                                               (r.department && r.department.toLowerCase().includes(query));
                                    })
                                    .reduce((acc, req) => {
                                        const dept = req.department || 'Unassigned';
                                        if (!acc[dept]) acc[dept] = [];
                                        acc[dept].push(req);
                                        return acc;
                                    }, {} as Record<string, typeof requests>)
                            ).map(([dept, deptRequests]) => (
                                <ApprovalTeamCard 
                                    key={dept}
                                    dept={dept}
                                    requestCount={deptRequests.length}
                                    viewMode={viewMode}
                                    avatars={deptRequests.map(r => r.employee_name)}
                                >
                                    <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 gap-4" : "space-y-3"}>
                                        {deptRequests.map(req => (
                                            <ApprovalCard 
                                                key={req.id}
                                                req={req}
                                                isExpanded={expandedId === req.id}
                                                setExpandedId={setExpandedId}
                                                handleAction={handleAction}
                                                acting={acting}
                                                viewMode={viewMode}
                                                activeTab={activeTab}
                                                getTypeIcon={getTypeIcon}
                                                getTypeName={getTypeName}
                                            />
                                        ))}
                                    </div>
                                </ApprovalTeamCard>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Approvals;
