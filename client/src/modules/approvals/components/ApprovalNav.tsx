import React from 'react';
import { Clock, CheckCircle, LayoutGrid, List, Users, Search } from 'lucide-react';
import { ApprovalStatus } from '../types';

interface ApprovalNavProps {
    activeTab: ApprovalStatus | 'history';
    setActiveTab: (tab: any) => void;
    viewMode: 'list' | 'grid' | 'teams';
    setViewMode: (mode: 'list' | 'grid' | 'teams') => void;
    requestCount: number;
    searchQuery: string;
    setSearchQuery: (q: string) => void;
}

const ApprovalNav: React.FC<ApprovalNavProps> = ({ 
    activeTab, 
    setActiveTab, 
    viewMode, 
    setViewMode,
    requestCount,
    searchQuery,
    setSearchQuery
}) => {
    return (
        <div className="flex items-center justify-between border-b border-slate-100 pb-1">
            <div className="flex items-center gap-1">
                {[
                    { id: 'pending', label: 'Action Needed', icon: Clock },
                    { id: 'history', label: 'Completed', icon: CheckCircle },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-2 px-6 py-3 text-[13px] font-bold transition-all relative
                            ${activeTab === tab.id ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                        {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" />}
                    </button>
                ))}
            </div>

            <div className="flex-1 max-w-md mx-8">
                <div className="relative group">
                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
                    <input 
                        type="text"
                        placeholder="Search personnel, ID, or type..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-11 pr-4 py-2.5 bg-slate-50/50 border border-transparent rounded-2xl text-[13px] font-bold text-slate-700 placeholder:text-slate-300 focus:bg-white focus:border-indigo-100 focus:ring-4 focus:ring-indigo-500/5 transition-all outline-none"
                    />
                </div>
            </div>

            <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-100">
                <button 
                    onClick={() => setViewMode('teams')}
                    className={`p-2 rounded-lg transition-all ${viewMode === 'teams' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    title="Team View"
                >
                    <Users size={16} />
                </button>
                <button 
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    title="Grid View"
                >
                    <LayoutGrid size={16} />
                </button>
                <button 
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    title="List View"
                >
                    <List size={16} />
                </button>
            </div>
        </div>
    );
};

export default ApprovalNav;
