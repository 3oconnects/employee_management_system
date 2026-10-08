import React from 'react';
import { History, CheckCircle2, Calendar, ArrowRight, FileCheck } from 'lucide-react';

interface OperationalStreamProps {
    activity: any[];
}

const OperationalStream: React.FC<OperationalStreamProps> = ({ activity }) => {
    return (
        <div className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-xs flex flex-col">
            <div className="flex items-center justify-between mb-5">
                <div>
                    <h3 className="text-base font-semibold text-slate-900">Recent Pay Runs & Activity</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Audit log of executed payroll disbursements</p>
                </div>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <History size={16} />
                </div>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto max-h-[380px]">
                {activity && activity.length > 0 ? (
                    activity.slice(0, 8).map((run: any, idx: number) => {
                        const dateStr = run.processed_at || run.created_at;
                        const formattedDate = dateStr
                            ? new Date(dateStr).toLocaleDateString('en-IN', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                              })
                            : 'Recently';

                        return (
                            <div
                                key={run.id || idx}
                                className="flex items-center justify-between p-3.5 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-slate-200 hover:shadow-xs transition-all"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                                        <CheckCircle2 size={16} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-slate-800">
                                            {run.payrollcycle || run.cycle_name || `Pay Cycle #${run.id || idx + 1}`}
                                        </p>
                                        <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                                            <span className="flex items-center gap-1">
                                                <Calendar size={12} />
                                                {formattedDate}
                                            </span>
                                            {run.employee_count && (
                                                <span>• {run.employee_count} employees</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                                        Processed
                                    </span>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mb-2.5 text-slate-400">
                            <FileCheck size={18} />
                        </div>
                        <p className="text-xs font-medium text-slate-600">No Pay Runs Processed Yet</p>
                        <p className="text-[11px] text-slate-400 mt-0.5 max-w-[220px]">
                            Completed monthly payroll cycles will appear here.
                        </p>
                    </div>
                )}
            </div>

            <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Total Recorded Runs: <strong className="text-slate-800">{activity?.length || 0}</strong></span>
                <span className="text-slate-400">Status: Automated Tracking</span>
            </div>
        </div>
    );
};

export default OperationalStream;
