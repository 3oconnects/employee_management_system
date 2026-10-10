import React from 'react';
import { Layers, ChevronRight, LayoutGrid, ShieldCheck, Search, Plus, List as ListIcon } from 'lucide-react';

interface OrganizationHeaderProps {
    activeView: 'list' | 'grid' | 'graph';
    setActiveView: (view: 'list' | 'grid' | 'graph') => void;
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    onAddDivision: () => void;
}

const OrganizationHeader: React.FC<OrganizationHeaderProps> = ({
    activeView,
    setActiveView,
    searchTerm,
    setSearchTerm,
    onAddDivision
}) => {
    return (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 bg-blue-50 text-[#2563EB] border border-blue-100 rounded-xl flex items-center justify-center shadow-xs">
                    <Layers size={22} strokeWidth={2.2} />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-[#17213D] tracking-tight">Enterprise Hierarchy</h1>
                    <p className="text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-1.5">
                        Organizational Divisions & Squad Structure <ChevronRight size={12} className="text-slate-400" /> Real-time Delegation
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-3">
                <div className="flex p-1 bg-slate-100 rounded-xl mr-1 border border-slate-200/60">
                    <button 
                        onClick={() => setActiveView('grid')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeView === 'grid' ? 'bg-white text-[#2563EB] shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                        <LayoutGrid size={13} /> Grid
                    </button>
                    <button 
                        onClick={() => setActiveView('list')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeView === 'list' ? 'bg-white text-[#2563EB] shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                        <ListIcon size={13} /> List
                    </button>
                    <button 
                        onClick={() => setActiveView('graph')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeView === 'graph' ? 'bg-white text-[#2563EB] shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                        <ShieldCheck size={13} /> Graph
                    </button>
                </div>

                <div className="relative group">
                    <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#2563EB] transition-colors" />
                    <input 
                        type="text" 
                        placeholder="Search divisions or squads..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs w-64 focus:ring-2 focus:ring-blue-100 focus:border-[#2563EB] outline-none transition-all shadow-xs font-medium placeholder:text-slate-400"
                    />
                </div>
                <button 
                    onClick={onAddDivision}
                    className="flex items-center gap-2 px-4 py-2 bg-[#2563EB] hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-all shadow-xs active:scale-[0.98]"
                >
                    <Plus size={15} strokeWidth={2.5} /> Add Division
                </button>
            </div>
        </div>
    );
};

export default OrganizationHeader;
