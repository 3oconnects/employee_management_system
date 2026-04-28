import React from 'react';
import { FileText } from 'lucide-react';
import { fmtDate } from './ProfileShared';

interface DocumentsTabProps {
    documents: any[];
}

const DocumentsTab: React.FC<DocumentsTabProps> = ({ documents }) => {
    if (!documents || documents.length === 0) {
        return (
            <div className="text-center py-10 text-slate-400">
                <FileText size={28} className="mx-auto mb-2 opacity-30"/>
                <p className="text-[12px] font-bold">No documents uploaded</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {documents.map((doc: any) => (
                <div key={doc.id} className="flex items-center gap-3 p-4 rounded-xl border border-slate-100 bg-slate-50 group hover:border-indigo-200 transition-colors cursor-pointer">
                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-50 transition-colors">
                        <FileText size={16} className="text-slate-400 group-hover:text-indigo-500"/>
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-bold text-slate-700 truncate">{doc.document_name}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{doc.document_type} · {fmtDate(doc.created_at)}</p>
                    </div>
                    <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-lg flex-shrink-0 ${doc.verified ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                        {doc.verified ? 'Verified' : 'Pending'}
                    </span>
                </div>
            ))}
        </div>
    );
};

export default DocumentsTab;
