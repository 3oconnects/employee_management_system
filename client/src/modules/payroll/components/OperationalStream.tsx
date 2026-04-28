import React from 'react';
import { Terminal, CheckCircle2, ArrowUpRight } from 'lucide-react';

interface OperationalStreamProps {
    activity: any[];
}

const OperationalStream: React.FC<OperationalStreamProps> = ({ activity }) => {
    return (
        <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden flex flex-col min-h-[320px]">
            {/* Subtle terminal-like background pattern */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none select-none overflow-hidden font-mono text-[8px] leading-tight p-4 uppercase">
                {Array.from({ length: 20 }).map((_, i) => (
                    <div key={i} className="whitespace-nowrap">
                        0x{Math.random().toString(16).slice(2, 10)} protocol_sync_init ... OK
                        0x{Math.random().toString(16).slice(2, 10)} memory_allocation_verified ... SUCCESS
                    </div>
                ))}
            </div>

            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full -mr-16 -mt-16 blur-3xl pointer-events-none" />
            
            <div className="relative flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center border border-white/5">
                        <Terminal size={14} className="text-indigo-400" />
                    </div>
                    <h3 className="text-[11px] font-black uppercase tracking-widest text-indigo-100">Operational Stream</h3>
                </div>
                <span className="flex items-center gap-1.5 text-[8px] font-black text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-full uppercase tracking-widest border border-emerald-400/20">
                    <div className="w-1 h-1 bg-emerald-400 rounded-full animate-ping" />
                    Ready
                </span>
            </div>
            
            <div className="relative flex-1 space-y-3 overflow-y-auto no-scrollbar max-h-[400px]">
                {activity.length > 0 ? activity.slice(0, 10).map((run: any) => (
                    <div key={run.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer group">
                        <div className="w-6 h-6 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <CheckCircle2 size={10} />
                        </div>
                        <div className="flex-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-white/90">{run.payrollcycle}</p>
                            <p className="text-[8px] text-white/30 mt-0.5 font-bold uppercase">Finalized {new Date(run.processed_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</p>
                        </div>
                        <ArrowUpRight size={12} className="text-white/10 group-hover:text-indigo-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                    </div>
                )) : (
                    <div className="h-full flex flex-col items-center justify-center p-8 border border-dashed border-white/10 rounded-xl text-center">
                        <Terminal size={24} className="text-white/10 mb-3" />
                        <p className="text-[9px] font-black text-white/20 uppercase tracking-widest leading-relaxed">Awaiting Lifecycle Initialization</p>
                        <p className="text-[7px] font-black text-indigo-500/40 uppercase tracking-[0.2em] mt-2">Core System Standby</p>
                    </div>
                )}
            </div>

            <div className="relative mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
                <p className="text-[8px] font-black text-white/20 uppercase tracking-widest">Protocol V3.1 Finalized</p>
                <div className="flex gap-1">
                    <div className="w-1 h-1 bg-indigo-500/20 rounded-full" />
                    <div className="w-1 h-1 bg-indigo-500/40 rounded-full" />
                    <div className="w-1 h-1 bg-indigo-500/60 rounded-full" />
                </div>
            </div>
        </div>
    );
};

export default OperationalStream;
