import React from 'react';
import { FileText, Download } from 'lucide-react';

interface ReportItem {
    name: string;
    type: string;
    size: string;
    date: string;
}

export const RecentReportsList: React.FC<{ reports: ReportItem[] }> = ({ reports }) => (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
            <div>
                <h3 className="text-[15px] font-bold text-slate-800">Recent Reports</h3>
                <p className="text-[12px] text-slate-500 mt-0.5">Generated documents and exports</p>
            </div>
            <FileText size={18} className="text-slate-400" />
        </div>
        <div className="divide-y divide-slate-50">
            {reports.map((report, i) => (
                <div key={i} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors group">
                    <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 flex-shrink-0">
                        <FileText size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-bold text-slate-800 truncate">{report.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">{report.type}</span>
                            <span className="text-[11px] text-slate-500">{report.size}</span>
                        </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                        <p className="text-[11px] font-medium text-slate-500">{report.date}</p>
                        <button className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 mt-1.5 flex items-center gap-1 ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                            <Download size={12} /> Download
                        </button>
                    </div>
                </div>
            ))}
        </div>
    </div>
);
