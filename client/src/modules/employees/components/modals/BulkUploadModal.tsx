import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
    X, Upload, Download, FileText, CheckCircle2,
    AlertCircle, Loader2, ChevronRight, RotateCcw
} from 'lucide-react';
import api from '../../../../services/api';

/* ── CSV template columns (must match backend) ── */
const TEMPLATE_HEADERS = [
    'name', 'email', 'phone', 'dateOfBirth', 'gender', 'personalEmail',
    'department', 'position', 'joinDate', 'employmentType', 'status',
    'addressLine1', 'city', 'state', 'pincode',
    'annualCTC', 'bankAccountNumber', 'taxRegime',
];

const SAMPLE_ROW = [
    'Priya Sharma', 'priya@company.com', '+91 9876543210', '1995-06-15', 'female', 'priya@gmail.com',
    'Engineering', 'Software Engineer', '2024-01-15', 'full_time', 'onboarding',
    '12 MG Road', 'Bengaluru', 'Karnataka', '560001',
    '900000', '1234567890123', 'New',
];

const REQUIRED_COLS = ['name', 'department', 'joinDate'];

/** Parse CSV text → array of objects using headers row */
function parseCSV(text: string): Record<string, string>[] {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    return lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        const obj: Record<string, string> = {};
        headers.forEach((h, i) => { obj[h] = values[i] ?? ''; });
        return obj;
    });
}

/** Validate a parsed row — returns error string or null */
function validateRow(row: Record<string, string>): string | null {
    for (const col of REQUIRED_COLS) {
        if (!row[col]?.trim()) return `${col} is required`;
    }
    return null;
}

type Step = 'upload' | 'preview' | 'result';

interface UploadResult {
    inserted: number; skipped: number; total: number;
    results: { row: number; name: string; status: 'inserted'|'skipped'; reason?: string }[];
}

interface Props { show: boolean; onClose: () => void; onSuccess: () => void; }

const BulkUploadModal: React.FC<Props> = ({ show, onClose, onSuccess }) => {
    const [step, setStep]           = useState<Step>('upload');
    const [rows, setRows]           = useState<Record<string,string>[]>([]);
    const [errors, setErrors]       = useState<Record<number,string>>({});
    const [fileName, setFileName]   = useState('');
    const [loading, setLoading]     = useState(false);
    const [result, setResult]       = useState<UploadResult|null>(null);
    const [apiError, setApiError]   = useState('');
    const fileRef = useRef<HTMLInputElement>(null);

    if (!show) return null;

    /* ── Download template ── */
    const downloadTemplate = () => {
        const csv = [TEMPLATE_HEADERS.join(','), SAMPLE_ROW.join(',')].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
        a.download = 'employee_bulk_template.csv'; a.click();
    };

    /* ── Handle file pick / drop ── */
    const handleFile = (file: File) => {
        if (!file.name.endsWith('.csv')) { setApiError('Please upload a .csv file'); return; }
        setFileName(file.name); setApiError('');
        const reader = new FileReader();
        reader.onload = e => {
            const parsed = parseCSV(e.target?.result as string);
            const errs: Record<number,string> = {};
            parsed.forEach((row, i) => { const err = validateRow(row); if (err) errs[i] = err; });
            setRows(parsed); setErrors(errs); setStep('preview');
        };
        reader.readAsText(file);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    };

    /* ── Submit ── */
    const handleSubmit = async () => {
        const validRows = rows.filter((_, i) => !errors[i]);
        if (validRows.length === 0) { setApiError('No valid rows to upload'); return; }
        setLoading(true); setApiError('');
        try {
            const { data } = await api.post('/employees/bulk-upload', { employees: validRows });
            setResult(data); setStep('result'); onSuccess();
        } catch (err: any) {
            setApiError(err.response?.data?.message || 'Upload failed. Please try again.');
        } finally { setLoading(false); }
    };

    /* ── Reset ── */
    const reset = () => {
        setStep('upload'); setRows([]); setErrors({}); setFileName('');
        setResult(null); setApiError(''); setLoading(false);
        if (fileRef.current) fileRef.current.value = '';
    };

    const validCount   = rows.filter((_, i) => !errors[i]).length;
    const invalidCount = rows.length - validCount;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={onClose}>
            <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300"
                onClick={e => e.stopPropagation()}>

                {/* ── Header ── */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-violet-600 rounded-xl flex items-center justify-center shadow-sm">
                            <Upload size={15} className="text-white"/>
                        </div>
                        <div>
                            <h3 className="text-[15px] font-black text-slate-800">Bulk Upload Employees</h3>
                            <p className="text-[11px] text-slate-400">Upload a CSV file to add multiple employees at once</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {step !== 'upload' && (
                            <button onClick={reset} className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all">
                                <RotateCcw size={11}/> Start Over
                            </button>
                        )}
                        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 rounded-lg transition-all text-slate-400">
                            <X size={16}/>
                        </button>
                    </div>
                </div>

                {/* ── Step indicator ── */}
                <div className="flex border-b border-slate-100 bg-white flex-shrink-0">
                    {(['upload','preview','result'] as Step[]).map((s, idx) => (
                        <div key={s} className={`flex-1 flex items-center justify-center gap-2 py-3 text-[12px] font-bold border-b-2 transition-all
                            ${step===s ? 'border-violet-600 text-violet-600 bg-violet-50/40' : 'border-transparent text-slate-300'}`}>
                            <span className={`w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center
                                ${step===s ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-400'}`}>{idx+1}</span>
                            <span className="capitalize">{s === 'upload' ? 'Upload File' : s === 'preview' ? 'Preview & Validate' : 'Results'}</span>
                        </div>
                    ))}
                </div>

                {/* ── Body ── */}
                <div className="flex-1 overflow-y-auto p-6">
                    {apiError && (
                        <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-4 py-3 text-[12px] font-semibold flex items-center gap-2">
                            <AlertCircle size={14}/> {apiError}
                        </div>
                    )}

                    {/* STEP 1 — Upload */}
                    {step === 'upload' && (
                        <div className="space-y-5">
                            {/* Download template */}
                            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex items-center justify-between">
                                <div>
                                    <p className="text-[13px] font-bold text-indigo-800">📥 Download the CSV Template</p>
                                    <p className="text-[11px] text-indigo-600 mt-0.5">Fill in the template and upload it back. Required fields are marked with *.</p>
                                </div>
                                <button onClick={downloadTemplate}
                                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-[12px] font-bold hover:bg-indigo-500 transition-all shadow-sm shadow-indigo-600/20">
                                    <Download size={13}/> Template CSV
                                </button>
                            </div>

                            {/* Schema reference */}
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-3">📋 CSV Column Reference</p>
                                <div className="grid grid-cols-3 gap-1.5">
                                    {TEMPLATE_HEADERS.map(col => (
                                        <div key={col} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold
                                            ${REQUIRED_COLS.includes(col)
                                                ? 'bg-rose-50 border border-rose-200 text-rose-700'
                                                : 'bg-white border border-slate-200 text-slate-600'}`}>
                                            <FileText size={9} className="flex-shrink-0"/>
                                            <span className="truncate">{col}</span>
                                            {REQUIRED_COLS.includes(col) && <span className="text-rose-500 font-black ml-auto">*</span>}
                                        </div>
                                    ))}
                                </div>
                                <p className="text-[10px] text-slate-400 mt-2">Fields marked <span className="text-rose-500 font-bold">*</span> are required.</p>
                            </div>

                            {/* Drop zone */}
                            <div
                                onDrop={handleDrop} onDragOver={e => e.preventDefault()}
                                onClick={() => fileRef.current?.click()}
                                className="border-2 border-dashed border-slate-300 hover:border-violet-400 rounded-2xl py-12 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all hover:bg-violet-50/30 group">
                                <div className="w-12 h-12 bg-slate-100 group-hover:bg-violet-100 rounded-2xl flex items-center justify-center transition-all">
                                    <Upload size={20} className="text-slate-400 group-hover:text-violet-500 transition-all"/>
                                </div>
                                <div className="text-center">
                                    <p className="text-[13px] font-bold text-slate-700">Drop your CSV file here</p>
                                    <p className="text-[11px] text-slate-400 mt-0.5">or click to browse · Max 500 rows</p>
                                </div>
                                <input ref={fileRef} type="file" accept=".csv" className="hidden"
                                    onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}/>
                            </div>
                        </div>
                    )}

                    {/* STEP 2 — Preview */}
                    {step === 'preview' && (
                        <div className="space-y-4">
                            {/* Summary bar */}
                            <div className="flex items-center gap-3">
                                <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-3">
                                    <FileText size={14} className="text-slate-400"/>
                                    <span className="text-[12px] font-semibold text-slate-700 truncate">{fileName}</span>
                                </div>
                                <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-3 text-center min-w-[70px]">
                                    <p className="text-[18px] font-black text-emerald-700">{validCount}</p>
                                    <p className="text-[9px] text-emerald-600 font-bold uppercase">Valid</p>
                                </div>
                                {invalidCount > 0 && (
                                    <div className="bg-rose-50 border border-rose-200 rounded-xl px-3 py-3 text-center min-w-[70px]">
                                        <p className="text-[18px] font-black text-rose-700">{invalidCount}</p>
                                        <p className="text-[9px] text-rose-600 font-bold uppercase">Errors</p>
                                    </div>
                                )}
                            </div>

                            {/* Preview table */}
                            <div className="rounded-xl border border-slate-200 overflow-hidden">
                                <div className="overflow-x-auto max-h-[320px]">
                                    <table className="w-full text-[11px]">
                                        <thead className="bg-slate-50 sticky top-0 z-10">
                                            <tr>
                                                <th className="px-3 py-2 text-left font-bold text-slate-500 w-10">#</th>
                                                <th className="px-3 py-2 text-left font-bold text-slate-500">Name</th>
                                                <th className="px-3 py-2 text-left font-bold text-slate-500">Email</th>
                                                <th className="px-3 py-2 text-left font-bold text-slate-500">Department</th>
                                                <th className="px-3 py-2 text-left font-bold text-slate-500">Position</th>
                                                <th className="px-3 py-2 text-left font-bold text-slate-500">Join Date</th>
                                                <th className="px-3 py-2 text-left font-bold text-slate-500">Type</th>
                                                <th className="px-3 py-2 text-left font-bold text-slate-500">CTC</th>
                                                <th className="px-3 py-2 text-left font-bold text-slate-500 w-8">✓</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {rows.map((row, i) => {
                                                const hasErr = !!errors[i];
                                                return (
                                                    <tr key={i} className={`border-t border-slate-100 ${hasErr ? 'bg-rose-50' : 'hover:bg-slate-50'}`}>
                                                        <td className="px-3 py-2 text-slate-400 font-mono">{i+2}</td>
                                                        <td className="px-3 py-2 font-semibold text-slate-800 whitespace-nowrap">{row.name || <span className="text-rose-400 italic">missing</span>}</td>
                                                        <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{row.email || '—'}</td>
                                                        <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{row.department || <span className="text-rose-400 italic">missing</span>}</td>
                                                        <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{row.position || '—'}</td>
                                                        <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{row.joinDate || <span className="text-rose-400 italic">missing</span>}</td>
                                                        <td className="px-3 py-2 whitespace-nowrap">
                                                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">{row.employmentType || 'full_time'}</span>
                                                        </td>
                                                        <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{row.annualCTC ? `₹${Number(row.annualCTC).toLocaleString('en-IN')}` : '—'}</td>
                                                        <td className="px-3 py-2">
                                                            {hasErr
                                                                ? <span title={errors[i]}><AlertCircle size={13} className="text-rose-500"/></span>
                                                                : <CheckCircle2 size={13} className="text-emerald-500"/>}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Error list */}
                            {invalidCount > 0 && (
                                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 space-y-1">
                                    <p className="text-[10px] font-bold text-rose-600 uppercase tracking-wide mb-2">⚠️ Rows with errors (will be skipped)</p>
                                    {Object.entries(errors).map(([idx, msg]) => (
                                        <div key={idx} className="flex items-center gap-2 text-[11px] text-rose-700">
                                            <span className="font-mono font-bold">Row {Number(idx)+2}:</span>
                                            <span>{msg}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* STEP 3 — Result */}
                    {step === 'result' && result && (
                        <div className="space-y-4">
                            {/* Success summary */}
                            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-center">
                                <CheckCircle2 size={36} className="text-emerald-500 mx-auto mb-2"/>
                                <p className="text-[16px] font-black text-emerald-800">Upload Complete!</p>
                                <p className="text-[12px] text-emerald-600 mt-1">{result.inserted} employees added · {result.skipped} skipped</p>
                            </div>

                            {/* Breakdown */}
                            <div className="grid grid-cols-3 gap-3">
                                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                                    <p className="text-[22px] font-black text-slate-800">{result.total}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Total Rows</p>
                                </div>
                                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
                                    <p className="text-[22px] font-black text-emerald-700">{result.inserted}</p>
                                    <p className="text-[10px] font-bold text-emerald-500 uppercase">Inserted</p>
                                </div>
                                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
                                    <p className="text-[22px] font-black text-amber-700">{result.skipped}</p>
                                    <p className="text-[10px] font-bold text-amber-500 uppercase">Skipped</p>
                                </div>
                            </div>

                            {/* Per-row detail */}
                            {result.results.some(r => r.status === 'skipped') && (
                                <div className="rounded-xl border border-slate-200 overflow-hidden">
                                    <div className="bg-slate-50 px-4 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wide">Skipped Rows</div>
                                    <div className="divide-y divide-slate-100 max-h-[200px] overflow-y-auto">
                                        {result.results.filter(r => r.status === 'skipped').map((r, i) => (
                                            <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                                                <AlertCircle size={13} className="text-rose-400 flex-shrink-0"/>
                                                <div className="flex-1 min-w-0">
                                                    <span className="text-[12px] font-semibold text-slate-700">{r.name}</span>
                                                    <span className="text-[10px] text-slate-400 ml-2">Row {r.row}</span>
                                                </div>
                                                <span className="text-[11px] text-rose-600 font-medium">{r.reason}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* ── Footer ── */}
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between flex-shrink-0">
                    <div className="text-[11px] text-slate-400">
                        {step === 'preview' && rows.length > 0 && `${rows.length} rows parsed · ${validCount} ready to import`}
                        {step === 'upload' && 'Supports .csv files up to 500 rows'}
                        {step === 'result' && 'Employee directory has been updated'}
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={onClose}
                            className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-[12px] font-bold hover:bg-slate-50 transition-all">
                            {step === 'result' ? 'Close' : 'Cancel'}
                        </button>
                        {step === 'preview' && (
                            <button onClick={handleSubmit} disabled={loading || validCount === 0}
                                className="flex items-center gap-2 px-5 py-2 bg-violet-600 text-white rounded-xl text-[12px] font-bold shadow-md shadow-violet-600/20 hover:bg-violet-500 transition-all disabled:opacity-50">
                                {loading ? <Loader2 size={13} className="animate-spin"/> : <Upload size={13}/>}
                                {loading ? 'Uploading…' : `Import ${validCount} Employee${validCount !== 1 ? 's' : ''}`}
                            </button>
                        )}
                        {step === 'result' && (
                            <button onClick={reset}
                                className="flex items-center gap-2 px-5 py-2 bg-violet-600 text-white rounded-xl text-[12px] font-bold hover:bg-violet-500 transition-all">
                                <Upload size={13}/> Upload Another
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default BulkUploadModal;
