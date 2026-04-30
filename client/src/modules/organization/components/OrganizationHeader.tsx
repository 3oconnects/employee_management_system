import React from 'react';
import { Layers, ChevronRight, LayoutGrid, ShieldCheck, Search, Plus } from 'lucide-react';

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
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-slate-900/10">
                    <Layers size={24} strokeWidth={2.5} />
                </div>
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">Enterprise Hierarchy</h1>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1 flex items-center gap-2">
                        Structural Command <ChevronRight size={10} /> Organizational Units
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-3">
                <div className="flex p-1 bg-slate-100 rounded-xl mr-2">
                    <button 
                        onClick={() => setActiveView('list')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeView === 'list' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                        <LayoutGrid size={12} className="rotate-90" /> List
                    </button>
                    <button 
                        onClick={() => setActiveView('grid')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeView === 'grid' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                        <LayoutGrid size={12} /> Grid
                    </button>
                    <button 
                        onClick={() => setActiveView('graph')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeView === 'graph' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                        <ShieldCheck size={12} /> Graph
                    </button>
                </div>

                <div className="relative group">
                    <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                    <input 
                        type="text" 
                        placeholder="Search divisions or squads..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[12px] w-72 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-sm font-medium"
                    />
                </div>
                <button 
                    onClick={onAddDivision}
                    className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
                >
                    <Plus size={16} strokeWidth={3} /> Add Division
                </button>
            </div>
        </div>
    );
};

export default OrganizationHeader;
