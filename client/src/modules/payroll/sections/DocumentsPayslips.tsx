import React, { useState, useEffect } from 'react';
import { Download, FileText, Archive, User, Loader2, AlertCircle, Search, ChevronDown, Check } from 'lucide-react';
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

    const getBaseUrl = () => {
        const raw = (import.meta as any).env.VITE_API_URL as string | undefined;
        return raw ? raw.replace(/\/+$/, '') : '/api';
    };

    // --- Bulk ZIP download (all employees for a month) ---
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
            setError(err.message || 'Bulk download failed.');
        } finally {
            setDownloading(null);
        }
    };

    // --- Individual monthly PDF ---
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
            
            // For monthly, we can derive a nice filename
            const empName = employees.find(e => e.id === selectedEmployee)?.name || selectedEmployee;
            const safeName = empName.replace(/[^a-zA-Z0-9]/g, '_');
            a.download = `${safeName}_${MONTHS[parseInt(month) - 1]}_${year}_Payslip.pdf`;
            
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (err: any) {
            setError(err.message || 'Monthly PDF download failed.');
        } finally {
            setDownloading(null);
        }
    };

    // --- Individual yearly ZIP ---
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
            setError(err.message || 'Yearly ZIP download failed.');
        } finally {
            setDownloading(null);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">

            {/* Page Header */}
            <div className="flex justify-between items-center mb-2">
                <div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight">Payslip Downloads</h2>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Export salary statements — monthly PDF or full-year ZIP</p>
                </div>
            </div>

            {/* Error Banner */}
            {error && (
                <div className="flex items-center gap-3 p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 animate-in slide-in-from-top-4">
                    <AlertCircle size={16} className="shrink-0" />
                    <p className="text-xs font-bold">{error}</p>
                </div>
            )}

            {/* ─── Card 1: Individual Employee Downloads ─────────────────────── */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="bg-[#0F172A] p-6 flex items-center space-x-3">
                    <div className="p-2 bg-blue-600/20 rounded-xl text-blue-400">
                        <User size={20} />
                    </div>
                    <div>
                        <h3 className="text-white text-sm font-black uppercase tracking-widest">Individual Employee Payslip</h3>
                        <p className="text-slate-500 text-[10px] font-bold tracking-widest mt-0.5">Download monthly PDF or full-year ZIP per employee</p>
                    </div>
                </div>

                <div className="p-8 space-y-6">
                    {/* Employee Selector */}
                    {/* Searchable Employee Selector */}
                    <div className="space-y-2 relative">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Target Employee</label>
                        
                        <div 
                            className="relative cursor-pointer group"
                            onClick={() => setIsSelectorOpen(!isSelectorOpen)}
                        >
                            <div className={`w-full bg-slate-50 border ${isSelectorOpen ? 'border-blue-500 ring-4 ring-blue-500/10' : 'border-slate-200'} rounded-2xl p-4 flex items-center justify-between transition-all hover:bg-slate-100/50`}>
                                <div className="flex items-center space-x-3">
                                    <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white text-[10px] font-black">
                                        {selectedEmployee ? (employees.find(e => e.id === selectedEmployee)?.name.charAt(0) || '?') : <Search size={14} />}
                                    </div>
                                    <span className={`text-sm font-bold ${selectedEmployee ? 'text-slate-900' : 'text-slate-400'}`}>
                                        {selectedEmployee 
                                            ? `${employees.find(e => e.id === selectedEmployee)?.name} (${selectedEmployee})`
                                            : "Search and select employee..."
                                        }
                                    </span>
                                </div>
                                <ChevronDown size={18} className={`text-slate-400 transition-transform duration-300 ${isSelectorOpen ? 'rotate-180' : ''}`} />
                            </div>
                        </div>

                        {isSelectorOpen && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-3xl shadow-2xl z-[100] p-4 space-y-4 animate-in fade-in zoom-in-95 duration-200">
                                <div className="relative">
                                    <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input 
                                        type="text"
                                        placeholder="Search by name or ID..."
                                        className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 pl-10 pr-4 text-xs font-bold text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition-all"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        onClick={(e) => e.stopPropagation()}
                                        autoFocus
                                    />
                                </div>
                                
                                <div className="max-h-[240px] overflow-y-auto space-y-1 pr-2 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                                    {employees
                                        .filter(e => 
                                            e.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                            e.id.toLowerCase().includes(searchQuery.toLowerCase())
                                        )
                                        .slice(0, 20)
                                        .map(e => (
                                            <div 
                                                key={e.id}
                                                onClick={() => {
                                                    setSelectedEmployee(e.id);
                                                    setIsSelectorOpen(false);
                                                    setSearchQuery('');
                                                }}
                                                className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${
                                                    selectedEmployee === e.id 
                                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                                                        : 'hover:bg-slate-50 text-slate-600 hover:text-slate-900'
                                                }`}
                                            >
                                                <div className="flex items-center space-x-3">
                                                    <div className={`w-6 h-6 rounded-md flex items-center justify-center text-[8px] font-black ${selectedEmployee === e.id ? 'bg-white/20' : 'bg-slate-100 text-slate-500'}`}>
                                                        {e.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="text-[11px] font-black leading-none">{e.name}</p>
                                                        <p className={`text-[8px] mt-1 font-bold ${selectedEmployee === e.id ? 'text-blue-100' : 'text-slate-400'}`}>{e.id} • {e.department}</p>
                                                    </div>
                                                </div>
                                                {selectedEmployee === e.id && <Check size={14} />}
                                            </div>
                                        ))
                                    }
                                    {employees.filter(e => 
                                        e.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                        e.id.toLowerCase().includes(searchQuery.toLowerCase())
                                    ).length === 0 && (
                                        <div className="p-8 text-center space-y-2">
                                            <p className="text-xs font-bold text-slate-400">No matches found</p>
                                            <p className="text-[10px] text-slate-300">Try a different search term</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                        {/* Overlay to close on outside click */}
                        {isSelectorOpen && (
                            <div 
                                className="fixed inset-0 z-10" 
                                onClick={() => setIsSelectorOpen(false)}
                            />
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Monthly PDF */}
                        <div className="bg-slate-50 rounded-2xl p-6 space-y-4 border border-slate-100">
                            <div className="flex items-center space-x-2">
                                <FileText size={16} className="text-blue-600" />
                                <span className="text-xs font-black text-slate-700 uppercase tracking-widest">Monthly PDF</span>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Month</label>
                                    <select
                                        value={month}
                                        onChange={e => setMonth(e.target.value)}
                                        className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-black text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        {MONTHS.map((m, i) => (
                                            <option key={m} value={i + 1}>{m}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Year</label>
                                    <select
                                        value={year}
                                        onChange={e => setYear(e.target.value)}
                                        className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-black text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="2024">2024</option>
                                        <option value="2025">2025</option>
                                        <option value="2026">2026</option>
                                    </select>
                                </div>
                            </div>
                            <button
                                onClick={downloadMonthlyPDF}
                                disabled={!selectedEmployee || downloading === 'monthly'}
                                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center space-x-2"
                            >
                                {downloading === 'monthly' ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                                <span>Download PDF</span>
                            </button>
                        </div>

                        {/* Yearly ZIP */}
                        <div className="bg-slate-50 rounded-2xl p-6 space-y-4 border border-slate-100">
                            <div className="flex items-center space-x-2">
                                <Archive size={16} className="text-emerald-600" />
                                <span className="text-xs font-black text-slate-700 uppercase tracking-widest">Full Year ZIP</span>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Financial Year</label>
                                <select
                                    value={yearlyYear}
                                    onChange={e => setYearlyYear(e.target.value)}
                                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-black text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                                >
                                    <option value="2024">FY 2024</option>
                                    <option value="2025">FY 2025</option>
                                    <option value="2026">FY 2026</option>
                                </select>
                            </div>
                            <p className="text-[10px] text-slate-400 font-bold">Downloads all processed monthly payslips for the selected year as a single ZIP archive.</p>
                            <button
                                onClick={downloadYearlyZip}
                                disabled={!selectedEmployee || downloading === 'yearly'}
                                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center space-x-2"
                            >
                                {downloading === 'yearly' ? <Loader2 size={14} className="animate-spin" /> : <Archive size={14} />}
                                <span>Download ZIP</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ─── Card 2: Bulk All-Employees ZIP ─────────────────────── */}
            <div className="bg-[#0F172A] p-10 rounded-3xl text-white relative overflow-hidden shadow-2xl shadow-slate-200">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/20 rounded-full blur-3xl -mr-32 -mt-32" />
                <div className="relative z-10 grid grid-cols-12 gap-8 items-center">
                    <div className="col-span-12 lg:col-span-7 space-y-4">
                        <div className="inline-flex items-center space-x-2 px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full border border-blue-500/20">
                            <Archive size={14} />
                            <span className="text-[10px] font-black uppercase tracking-widest">Bulk Export Engine</span>
                        </div>
                        <h3 className="text-2xl font-black tracking-tight">Bulk Export — All Employees</h3>
                        <p className="text-slate-400 text-xs font-bold max-w-lg">Select a payroll cycle to download a ZIP archive containing payslips for every employee processed in that month.</p>
                    </div>
                    <div className="col-span-12 lg:col-span-5">
                        <div className="bg-white/5 p-6 rounded-2xl border border-white/10 backdrop-blur-sm space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Month</label>
                                    <select
                                        value={month}
                                        onChange={e => setMonth(e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs font-black text-white outline-none focus:ring-1 focus:ring-blue-500 transition-all uppercase"
                                    >
                                        {MONTHS.map((m, i) => (
                                            <option key={m} value={i + 1}>{m}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Year</label>
                                    <select
                                        value={year}
                                        onChange={e => setYear(e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs font-black text-white outline-none focus:ring-1 focus:ring-blue-500 transition-all uppercase"
                                    >
                                        <option value="2024">2024</option>
                                        <option value="2025">2025</option>
                                        <option value="2026">2026</option>
                                    </select>
                                </div>
                            </div>
                            <button
                                onClick={downloadBulkZip}
                                disabled={downloading === 'bulk'}
                                className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 flex items-center justify-center space-x-2"
                            >
                                {downloading === 'bulk' ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                                <span>Download ZIP Archive</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DocumentsPayslips;
