import React from 'react';
import { X, Briefcase } from 'lucide-react';
import { inputCls, ExpEntry, emptyExp } from './shared';
import Field from './Field';

interface Props {
    list: ExpEntry[];
    setList: React.Dispatch<React.SetStateAction<ExpEntry[]>>;
}

const ExperienceSection: React.FC<Props> = ({ list, setList }) => {
    const set = (i: number, k: keyof ExpEntry, v: string | boolean) =>
        setList(l => l.map((e, idx) => idx === i ? {...e, [k]: v} : e));

    return (
        <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                    <Briefcase size={11}/> Work Experience
                </p>
                <button type="button" onClick={() => setList(l => [...l, emptyExp()])}
                    className="flex items-center gap-1 px-2.5 py-1 bg-violet-50 hover:bg-violet-100 text-violet-700 rounded-lg text-[11px] font-bold transition-all">
                    + Add Experience
                </button>
            </div>

            {/* Empty state */}
            {list.length === 0 && (
                <div className="border-2 border-dashed border-slate-200 rounded-xl py-8 text-center text-[11px] text-slate-400">
                    No experience added yet — click <strong>+ Add Experience</strong>
                </div>
            )}

            {/* Entries */}
            <div className="space-y-3">
                {list.map((exp, i) => (
                    <div key={i} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 relative">
                        {/* Remove */}
                        <button type="button" onClick={() => setList(l => l.filter((_, idx) => idx !== i))}
                            className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-md transition-all">
                            <X size={12}/>
                        </button>

                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Job Title / Role">
                                <input type="text" placeholder="e.g. Software Engineer" value={exp.jobTitle}
                                    onChange={e => set(i,'jobTitle',e.target.value)} className={`${inputCls} text-[12px] py-2`}/>
                            </Field>
                            <Field label="Company / Organisation">
                                <input type="text" placeholder="e.g. TCS" value={exp.company}
                                    onChange={e => set(i,'company',e.target.value)} className={`${inputCls} text-[12px] py-2`}/>
                            </Field>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Start Date">
                                <input type="date" value={exp.startDate}
                                    onChange={e => set(i,'startDate',e.target.value)} className={`${inputCls} text-[12px] py-2`}/>
                            </Field>
                            <Field label="End Date">
                                <input type="date" disabled={exp.current} value={exp.endDate}
                                    onChange={e => set(i,'endDate',e.target.value)}
                                    className={`${inputCls} text-[12px] py-2 disabled:opacity-40 disabled:cursor-not-allowed`}/>
                            </Field>
                        </div>

                        <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input type="checkbox" checked={exp.current}
                                onChange={e => set(i,'current',e.target.checked)}
                                className="w-3.5 h-3.5 accent-indigo-600 cursor-pointer"/>
                            <span className="text-[11px] font-semibold text-slate-600">Currently working here</span>
                        </label>

                        {/* Duration badge */}
                        {exp.startDate && (exp.endDate || exp.current) && !exp.current && exp.endDate && (() => {
                            const days = Math.ceil((new Date(exp.endDate).getTime() - new Date(exp.startDate).getTime()) / 86400000);
                            const months = Math.round(days / 30);
                            return days > 0 ? (
                                <div className="inline-flex items-center gap-1.5 bg-violet-50 border border-violet-100 rounded-lg px-2.5 py-1">
                                    <span className="text-[10px] text-violet-500 font-semibold">{months} month{months!==1?'s':''}</span>
                                </div>
                            ) : null;
                        })()}

                        <Field label="Description / Responsibilities">
                            <textarea placeholder="Brief summary of your role…" value={exp.description}
                                onChange={e => setList(l => l.map((x, idx) => idx === i ? {...x, description: e.target.value} : x))}
                                rows={2} className={`${inputCls} text-[12px] py-2 resize-none`}/>
                        </Field>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ExperienceSection;
