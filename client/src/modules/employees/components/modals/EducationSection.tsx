import React from 'react';
import { X, GraduationCap } from 'lucide-react';
import { inputCls, DEGREES, EduEntry, emptyEdu } from './shared';
import Field from './Field';

interface Props {
    list: EduEntry[];
    setList: React.Dispatch<React.SetStateAction<EduEntry[]>>;
}

const EducationSection: React.FC<Props> = ({ list, setList }) => {
    const set = (i: number, k: keyof EduEntry, v: string) =>
        setList(l => l.map((e, idx) => idx === i ? {...e, [k]: v} : e));

    return (
        <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                    <GraduationCap size={11}/> Education
                </p>
                <button type="button" onClick={() => setList(l => [...l, emptyEdu()])}
                    className="flex items-center gap-1 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[11px] font-bold transition-all">
                    + Add Degree
                </button>
            </div>

            {/* Empty state */}
            {list.length === 0 && (
                <div className="border-2 border-dashed border-slate-200 rounded-xl py-8 text-center text-[11px] text-slate-400">
                    No education added yet — click <strong>+ Add Degree</strong>
                </div>
            )}

            {/* Entries */}
            <div className="space-y-3">
                {list.map((edu, i) => (
                    <div key={i} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 relative">
                        {/* Remove */}
                        <button type="button" onClick={() => setList(l => l.filter((_, idx) => idx !== i))}
                            className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-md transition-all">
                            <X size={12}/>
                        </button>

                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Degree / Qualification">
                                <select value={edu.degree} onChange={e => set(i,'degree',e.target.value)}
                                    className={`${inputCls} appearance-none cursor-pointer text-[12px] py-2`}>
                                    <option value="">Select degree</option>
                                    {DEGREES.map(d => <option key={d}>{d}</option>)}
                                </select>
                            </Field>
                            <Field label="Field of Study">
                                <input type="text" placeholder="e.g. Computer Science" value={edu.field}
                                    onChange={e => set(i,'field',e.target.value)} className={`${inputCls} text-[12px] py-2`}/>
                            </Field>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            <Field label="Institution / University" col="col-span-2">
                                <input type="text" placeholder="e.g. IIT Bombay" value={edu.institution}
                                    onChange={e => set(i,'institution',e.target.value)} className={`${inputCls} text-[12px] py-2`}/>
                            </Field>
                            <Field label="Graduation Year">
                                <input type="number" placeholder="2022" min="1980" max="2035" value={edu.year}
                                    onChange={e => set(i,'year',e.target.value)} className={`${inputCls} text-[12px] py-2`}/>
                            </Field>
                        </div>

                        <Field label="Grade / Percentage / CGPA">
                            <input type="text" placeholder="e.g. 8.5 CGPA or 85%" value={edu.grade}
                                onChange={e => set(i,'grade',e.target.value)} className={`${inputCls} text-[12px] py-2`}/>
                        </Field>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default EducationSection;
