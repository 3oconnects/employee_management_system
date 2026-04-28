import React from 'react';
import { Users, X } from 'lucide-react';

interface SyncProtocolModalProps {
    onClose: () => void;
}

const SyncProtocolModal: React.FC<SyncProtocolModalProps> = ({ onClose }) => {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-10 text-center animate-in zoom-in-95 duration-300 border border-slate-200 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-indigo-600" />
                <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner"><Users size={32}/></div>
                <h3 className="text-[18px] font-black text-slate-900 uppercase tracking-tight">Sync Protocol</h3>
                <p className="text-[12px] text-slate-500 mt-3 leading-relaxed font-bold">
                    To integrate personnel, enroll them in the <span className="text-indigo-600 font-black">CORE DIRECTORY</span> first. 
                </p>
                <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Protocol</p>
                    <p className="text-[10px] text-slate-600 mt-1.5 font-bold uppercase tracking-tight">Navigate to "Personnel" → "Onboard" to initialize.</p>
                </div>
                <button onClick={onClose} className="mt-8 px-10 py-3 bg-slate-900 text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-black transition-all">Acknowledge</button>
            </div>
        </div>
    );
};

export default SyncProtocolModal;
