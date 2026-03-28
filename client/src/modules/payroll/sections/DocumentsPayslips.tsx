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
    ArrowDownToLine,
    ShieldCheck,
    Briefcase
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
            setError('Bulk export failed. Resource unavailable.');
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
            setError('PDF generation failed.');
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
            setError('Yearly archive generation failed.');
        } finally {
            setDownloading(null);
        }
    };

    return (
        <div className="p-6 space-y-8 page-enter">
            
            {/* ── Page Header ──────────────────────────────── */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100">
                        <FileSearch size={20} className="text-white" />
                    </div>
                    <div>
                        <h2 className="text-[17px] font-black text-gray-900 tracking-tight uppercase">Document Archive</h2>
                        <p className="text-[11.5px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
                            Bulk Export & Distribution Management
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100 flex items-center gap-1.5">
                        <ShieldCheck size={14} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Compliance Validated</span>
                    </div>
                </div>
            </div>

            {error && (
                <div className="bg-rose-50 border border-rose-100 text-rose-600 p-4 rounded-xl flex items-center gap-3 animate-in fade-in">
                    <AlertCircle size={18} />
                    <p className="text-[12px] font-bold">{error}</p>
                    <button onClick={() => setError(null)} className="ml-auto"><X size={16}/></button>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* ── Individual Downloads Card ────────────────── */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                    <div className="px-8 py-6 border-b border-gray-50 bg-gray-50/50">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-md"><User size={18}/></div>
                            <div>
                                <h3 className="text-[15px] font-black text-gray-900 uppercase tracking-tight">Individual Precision</h3>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Targeted Employee Export</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-8 space-y-8 flex-1">
                        <div className="relative">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1 mb-2 block">Select Employee</label>
                            <div 
                                onClick={() => setIsSelectorOpen(!isSelectorOpen)}
                                className={`w-full bg-gray-50 border-2 rounded-2xl p-4 flex items-center justify-between cursor-pointer transition-all ${isSelectorOpen ? 'border-indigo-400 bg-white ring-4 ring-indigo-50' : 'border-gray-50 hover:border-gray-100'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center text-[10px] font-black">
                                        {selectedEmployee ? employees.find(e => e.id === selectedEmployee)?.name.charAt(0) : <Search size={14}/>}
                                    </div>
                                    <span className={`text-[13px] font-bold ${selectedEmployee ? 'text-gray-900' : 'text-gray-400'}`}>
                                        {selectedEmployee ? `${employees.find(e => e.id === selectedEmployee)?.name} (${selectedEmployee})` : 'Search employee...'}
                                    </span>
                                </div>
                                <ChevronDown size={16} className={`text-gray-400 transition-transform ${isSelectorOpen ? 'rotate-180' : ''}`}/>
                            </div>

                            {isSelectorOpen && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-2xl shadow-2xl z-[50] p-4 space-y-4 animate-in zoom-in-95">
                                    <div className="relative">
                                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input 
                                            type="text" 
                                            className="w-full bg-gray-50 border border-gray-100 rounded-xl py-2.5 pl-9 pr-4 text-[12px] font-bold outline-none focus:bg-white"
                                            placeholder="Type name or code..."
                                            value={searchQuery}
                                            onChange={e => setSearchQuery(e.target.value)}
                                            autoFocus
                                        />
                                    </div>
                                    <div className="max-h-60 overflow-y-auto space-y-1 pr-2">
                                        {employees.filter(e => e.name.toLowerCase().includes(searchQuery.toLowerCase()) || e.id.toLowerCase().includes(searchQuery.toLowerCase())).map(e => (
                                            <div 
                                                key={e.id}
                                                onClick={() => { setSelectedEmployee(e.id); setIsSelectorOpen(false); }}
                                                className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${selectedEmployee === e.id ? 'bg-indigo-600 text-white' : 'hover:bg-gray-50'}`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black ${selectedEmployee === e.id ? 'bg-white/20' : 'bg-gray-100 text-gray-400'}`}>{e.name.charAt(0)}</div>
                                                    <div>
                                                        <p className="text-[12px] font-bold leading-none">{e.name}</p>
                                                        <p className={`text-[9px] font-medium mt-1 ${selectedEmployee === e.id ? 'text-indigo-100' : 'text-gray-400'}`}>{e.department}</p>
                                                    </div>
                                                </div>
                                                {selectedEmployee === e.id && <Check size={14}/>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 space-y-4">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><FileText size={14} className="text-blue-600"/> Monthly Document</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <select value={month} onChange={e => setMonth(e.target.value)} className="w-full bg-white border border-gray-100 rounded-xl p-2.5 text-[11px] font-bold text-gray-900 outline-none">
                                        {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                                    </select>
                                    <select value={year} onChange={e => setYear(e.target.value)} className="w-full bg-white border border-gray-100 rounded-xl p-2.5 text-[11px] font-bold text-gray-900 outline-none">
                                        {['2024', '2025', '2026'].map(y => <option key={y} value={y}>{y}</option>)}
                                    </select>
                                </div>
                                <button onClick={downloadMonthlyPDF} disabled={!selectedEmployee || !!downloading} className="w-full py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">
                                    {downloading === 'monthly' ? <Loader2 size={14} className="animate-spin"/> : <Download size={14}/>}
                                    Download PDF
                                </button>
                            </div>

                            <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 space-y-4">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><Archive size={14} className="text-emerald-600"/> Annual Archive</p>
                                <select value={yearlyYear} onChange={e => setYearlyYear(e.target.value)} className="w-full bg-white border border-gray-100 rounded-xl p-2.5 text-[11px] font-bold text-gray-900 outline-none">
                                    {['2024', '2025', '2026'].map(y => <option key={y} value={y}>FY {y}</option>)}
                                </select>
                                <button onClick={downloadYearlyZip} disabled={!selectedEmployee || !!downloading} className="w-full py-3 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">
                                    {downloading === 'yearly' ? <Loader2 size={14} className="animate-spin"/> : <Package size={14}/>}
                                    Download ZIP
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Bulk Downloads Card ──────────────────────── */}
                <div className="bg-gray-900 rounded-3xl p-10 text-white relative flex flex-col justify-between shadow-2xl">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-600/20 blur-3xl -mr-20 -mt-20"></div>
                    <div className="relative z-10 space-y-8">
                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full border border-white/10 mb-4">
                                <ArrowDownToLine size={14} className="text-indigo-400" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Global Export</span>
                            </div>
                            <h3 className="text-[24px] font-black tracking-tight leading-tight">Bulk Transmission Archive</h3>
                            <p className="text-gray-400 text-[13px] font-medium mt-3 max-w-sm">Generate and download a compressed ZIP bundle containing all verified employee payslips for the chosen fiscal cycle.</p>
                        </div>

                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Target Cycle</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <select value={month} onChange={e => setMonth(e.target.value)} className="bg-black/40 border border-white/10 rounded-xl p-3 text-[12px] font-bold text-white outline-none focus:border-indigo-500">
                                            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                                        </select>
                                        <select value={year} onChange={e => setYear(e.target.value)} className="bg-black/40 border border-white/10 rounded-xl p-3 text-[12px] font-bold text-white outline-none focus:border-indigo-500">
                                            {['2024', '2025', '2026'].map(y => <option key={y} value={y}>{y}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <button onClick={downloadBulkZip} disabled={!!downloading} className="w-full py-4 bg-indigo-600 text-white rounded-2xl text-[12px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-500/10 flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50">
                                {downloading === 'bulk' ? <Loader2 size={16} className="animate-spin"/> : <Download size={16}/>}
                                <span>Generate Collective ZIP</span>
                            </button>

                            <div className="flex items-center gap-3 px-4 py-3 bg-white/5 border border-white/5 rounded-2xl">
                                <AlertCircle size={16} className="text-gray-500 shrink-0" />
                                <p className="text-[10px] text-gray-400 font-medium">Export includes all employees with an active <span className="text-white">Payable</span> status for the selected period.</p>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default DocumentsPayslips;
