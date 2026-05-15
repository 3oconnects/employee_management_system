import React from 'react';

export const InfoRow: React.FC<{label:string; value?:string|number|null; icon?:React.ElementType}> = ({label,value,icon:Icon}) => (
    <div className="flex items-center gap-3 py-3 border-b border-slate-100 last:border-0">
        {Icon && <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center flex-shrink-0"><Icon size={14} className="text-slate-400"/></div>}
        <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{label}</p>
            <p className="text-[13px] font-semibold text-slate-800 truncate">{value || '—'}</p>
        </div>
    </div>
);

export const Section: React.FC<{title:string; icon?:React.ElementType; action?:React.ReactNode; children:React.ReactNode}> = ({title,icon:Icon,action,children}) => (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2">
                {Icon && <Icon size={14} className="text-indigo-500"/>}
                <h3 className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">{title}</h3>
            </div>
            {action}
        </div>
        <div className="p-5">{children}</div>
    </div>
);

export const StatBox: React.FC<{label:string; value:string|number; color:string}> = ({label,value,color}) => (
    <div className={`text-center py-4 rounded-xl border border-slate-100 ${color.includes('bg-') ? color.split(' ').find(c=>c.startsWith('bg-')) : 'bg-slate-50'}`}>
        <p className={`text-xl font-black truncate px-2 ${color.split(' ').find(c=>c.startsWith('text-')) || 'text-slate-800'}`} title={String(value)}>{value}</p>
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mt-1">{label}</p>
    </div>
);

export const EmptyState: React.FC<{icon:React.ElementType; text:string}> = ({icon:Icon,text}) => (
    <div className="flex flex-col items-center justify-center py-16 text-slate-300">
        <Icon size={36} className="mb-3"/>
        <p className="text-[11px] font-semibold">{text}</p>
    </div>
);
