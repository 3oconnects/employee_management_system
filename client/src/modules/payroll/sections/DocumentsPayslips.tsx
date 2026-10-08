import React, { useState, useEffect } from 'react';
import { 
    Download, 
    FileText, 
    Archive, 
    User, 
    Loader2, 
    AlertCircle, 
    Search, 
    ChevronDown, 
    Check, 
    X,
    FileSearch,
    Package,
    ShieldCheck,
    Users,
} from 'lucide-react';
import api from '../../../services/api';

interface Employee {
    id: string;
    name: string;
    department: string;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const DocumentsPayslips = () => {
    const [month, setMonth] = useState('3');
    const [year, setYear] = useState('2026');
    const [yearlyYear, setYearlyYear] = useState('2026');
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [selectedEmployee, setSelectedEmployee] = useState('');
    const [downloading, setDownloading] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSelectorOpen, setIsSelectorOpen] = useState(false);

    useEffect(() => {
        api.get('/payroll/employees')
            .then(res => {
                const emps = Array.isArray(res.data) ? res.data : [];
                setEmployees(emps.filter((e: any) => e.hasProfile));
            })
            .catch(() => setEmployees([]));
    }, []);

    const downloadBulkZip = async () => {
        setError(null);
        setDownloading('bulk');
        try {
            const res = await api.get(`/payroll/documents/bulk-payslips?month=${month}&year=${year}`, {
                responseType: 'blob'
            });
            const blob = new Blob([res.data], { type: 'application/zip' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Payslips_${MONTHS[parseInt(month) - 1]}_${year}.zip`;
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (err: any) {
            setError('Failed to generate bulk payslips archive. Please verify payroll is processed for this period.');
        } finally {
            setDownloading(null);
        }
    };

    const downloadMonthlyPDF = async () => {
        if (!selectedEmployee) return;
        setError(null);
        setDownloading('monthly');
        try {
            const res = await api.get(
                `/payroll/payslip/${encodeURIComponent(selectedEmployee)}/monthly?month=${month}&year=${year}`,
                { responseType: 'blob' }
            );
            const blob = new Blob([res.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const empName = employees.find(e => e.id === selectedEmployee)?.name || selectedEmployee;
            const safeName = empName.replace(/[^a-zA-Z0-9]/g, '_');
            a.download = `${safeName}_${MONTHS[parseInt(month) - 1]}_${year}_Payslip.pdf`;
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (err: any) {
            setError('Failed to generate individual payslip PDF.');
        } finally {
            setDownloading(null);
        }
    };

    const downloadYearlyZip = async () => {
        if (!selectedEmployee) return;
        setError(null);
        setDownloading('yearly');
        try {
            const res = await api.get(
                `/payroll/payslip/${encodeURIComponent(selectedEmployee)}/yearly?year=${yearlyYear}`,
                { responseType: 'blob' }
            );
            const blob = new Blob([res.data], { type: 'application/zip' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const empName = employees.find(e => e.id === selectedEmployee)?.name || selectedEmployee;
            const safeName = empName.replace(/[^a-zA-Z0-9]/g, '_');
            a.download = `${safeName}_FY${yearlyYear}_Payslips.zip`;
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (err: any) {
            setError('Failed to generate annual payslip archive.');
        } finally {
            setDownloading(null);
        }
    };

    const selectedEmpObj = employees.find(e => e.id === selectedEmployee);

    return (
        <div className="space-y-5 animate-in fade-in duration-200">
            {/* ── Page Header ──────────────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h3 className="text-base font-semibold text-slate-900">Payslips & Document Export</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Generate official salary slips for individual staff or export bulk archives</p>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200 text-xs font-semibold">
                    <ShieldCheck size={14} />
                    <span>Compliance Verified</span>
                </div>
            </div>

            {error && (
                <div className="bg-rose-50 border border-rose-200/80 text-rose-700 p-3.5 rounded-xl flex items-center justify-between gap-3 text-xs font-medium">
                    <div className="flex items-center gap-2">
                        <AlertCircle size={16} className="text-rose-500 shrink-0" />
                        <p>{error}</p>
                    </div>
                    <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700">
                        <X size={15}/>
                    </button>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* ── Individual Employee Card ─────────────────── */}
                <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-6 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-100">
                            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                                <User size={18} />
                            </div>
                            <div>
                                <h4 className="text-sm font-semibold text-slate-900">Individual Employee Payslips</h4>
                                <p className="text-xs text-slate-500 mt-0.5">Generate salary slips for specific personnel</p>
                            </div>
                        </div>

                        {/* Searchable selector */}
                        <div className="relative mb-5">
                            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Select Employee</label>
                            <div 
                                onClick={() => setIsSelectorOpen(!isSelectorOpen)}
                                className={`w-full bg-slate-50 border rounded-lg p-2.5 flex items-center justify-between cursor-pointer transition-all ${
                                    isSelectorOpen ? 'border-blue-500 bg-white ring-2 ring-blue-50' : 'border-slate-200 hover:border-slate-300'
                                }`}
                            >
                                <div className="flex items-center gap-2.5">
                                    <div className="w-7 h-7 rounded-md bg-blue-50 text-blue-700 flex items-center justify-center text-xs font-bold">
                                        {selectedEmpObj ? selectedEmpObj.name.charAt(0) : <Search size={13} className="text-slate-400" />}
                                    </div>
                                    <span className={`text-xs font-medium ${selectedEmpObj ? 'text-slate-900' : 'text-slate-400'}`}>
                                        {selectedEmpObj ? `${selectedEmpObj.name} (${selectedEmpObj.id})` : 'Search employee by name or ID…'}
                                    </span>
                                </div>
                                <ChevronDown size={15} className={`text-slate-400 transition-transform ${isSelectorOpen ? 'rotate-180' : ''}`} />
                            </div>

                            {isSelectorOpen && (
                                <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg z-50 p-2.5 space-y-2 animate-in zoom-in-95">
                                    <div className="relative">
                                        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input 
                                            type="text" 
                                            className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 pl-8 pr-3 text-xs outline-none focus:bg-white focus:border-blue-500"
                                            placeholder="Filter employees..."
                                            value={searchQuery}
                                            onChange={e => setSearchQuery(e.target.value)}
                                            autoFocus
                                        />
                                    </div>
                                    <div className="max-h-52 overflow-y-auto space-y-1">
                                        {employees.filter(e => e.name.toLowerCase().includes(searchQuery.toLowerCase()) || e.id.toLowerCase().includes(searchQuery.toLowerCase())).map(e => (
                                            <div 
                                                key={e.id}
                                                onClick={() => { setSelectedEmployee(e.id); setIsSelectorOpen(false); }}
                                                className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all ${
                                                    selectedEmployee === e.id ? 'bg-blue-50 text-blue-900 font-semibold' : 'hover:bg-slate-50 text-slate-700'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-6 h-6 rounded bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-semibold">
                                                        {e.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="text-xs leading-none">{e.name}</p>
                                                        <p className="text-[10px] text-slate-400 mt-0.5">{e.department} • {e.id}</p>
                                                    </div>
                                                </div>
                                                {selectedEmployee === e.id && <Check size={14} className="text-blue-600" />}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Export actions */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                            {/* Monthly Document */}
                            <div className="p-3.5 bg-slate-50/70 rounded-lg border border-slate-200/80 space-y-3">
                                <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                                    <FileText size={14} className="text-blue-600" />
                                    <span>Monthly Payslip</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <select
                                        value={month}
                                        onChange={e => setMonth(e.target.value)}
                                        className="w-full bg-white border border-slate-200 rounded-md p-1.5 text-xs font-medium text-slate-900 outline-none"
                                    >
                                        {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                                    </select>
                                    <select
                                        value={year}
                                        onChange={e => setYear(e.target.value)}
                                        className="w-full bg-white border border-slate-200 rounded-md p-1.5 text-xs font-medium text-slate-900 outline-none"
                                    >
                                        {['2024', '2025', '2026', '2027'].map(y => <option key={y} value={y}>{y}</option>)}
                                    </select>
                                </div>
                                <button
                                    onClick={downloadMonthlyPDF}
                                    disabled={!selectedEmployee || !!downloading}
                                    className="w-full py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-xs"
                                >
                                    {downloading === 'monthly' ? <Loader2 size={13} className="animate-spin"/> : <Download size={13}/>}
                                    Download PDF
                                </button>
                            </div>

                            {/* Annual Archive */}
                            <div className="p-3.5 bg-slate-50/70 rounded-lg border border-slate-200/80 space-y-3">
                                <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                                    <Archive size={14} className="text-emerald-600" />
                                    <span>Annual Statement</span>
                                </div>
                                <select
                                    value={yearlyYear}
                                    onChange={e => setYearlyYear(e.target.value)}
                                    className="w-full bg-white border border-slate-200 rounded-md p-1.5 text-xs font-medium text-slate-900 outline-none"
                                >
                                    {['2024', '2025', '2026', '2027'].map(y => <option key={y} value={y}>FY {y}</option>)}
                                </select>
                                <button
                                    onClick={downloadYearlyZip}
                                    disabled={!selectedEmployee || !!downloading}
                                    className="w-full py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-xs"
                                >
                                    {downloading === 'yearly' ? <Loader2 size={13} className="animate-spin"/> : <Package size={13}/>}
                                    Download ZIP
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Bulk Downloads Card ──────────────────────── */}
                <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-6 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                    <Users size={18} />
                                </div>
                                <div>
                                    <h4 className="text-sm font-semibold text-slate-900">Bulk Pay Run Export</h4>
                                    <p className="text-xs text-slate-500 mt-0.5">Export all employee payslips for a cycle</p>
                                </div>
                            </div>
                            <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md text-[11px] font-semibold">
                                All Staff
                            </span>
                        </div>

                        <p className="text-xs text-slate-600 leading-relaxed mb-6">
                            Generates a compressed ZIP bundle containing official PDF payslips for all eligible employees with processed payroll entries in the selected period.
                        </p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Payroll Cycle</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <select
                                        value={month}
                                        onChange={e => setMonth(e.target.value)}
                                        className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold text-slate-900 outline-none focus:border-blue-500"
                                    >
                                        {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                                    </select>
                                    <select
                                        value={year}
                                        onChange={e => setYear(e.target.value)}
                                        className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold text-slate-900 outline-none focus:border-blue-500"
                                    >
                                        {['2024', '2025', '2026', '2027'].map(y => <option key={y} value={y}>{y}</option>)}
                                    </select>
                                </div>
                            </div>

                            <button
                                onClick={downloadBulkZip}
                                disabled={!!downloading}
                                className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-xs"
                            >
                                {downloading === 'bulk' ? <Loader2 size={15} className="animate-spin"/> : <Download size={15}/>}
                                <span>Export Full Pay Run ZIP ({MONTHS[parseInt(month)-1]} {year})</span>
                            </button>
                        </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-400">
                        <Archive size={13} className="shrink-0" />
                        <span>Formatted for digital distribution, audit records, and offline archiving.</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DocumentsPayslips;
