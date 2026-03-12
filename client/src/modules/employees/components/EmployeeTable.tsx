import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '../../../services/api';
import debounce from 'lodash/debounce';
import { Upload, Loader2, CheckCircle, AlertCircle, Search, FileSpreadsheet } from 'lucide-react';

interface Employee {
    id: string;
    name: string;
    position: string;
    department: string;
    join_date?: string;
}

const EmployeeTable: React.FC = () => {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [uploading, setUploading] = useState(false);
    const [msg, setMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const downloadTemplate = () => {
        const headers = 'employee_id,name,department,position,join_date,annual_ctc\n';
        const sampleRows = 'EMP001,John Doe,Engineering,Software Engineer,2024-01-15,1200000\nEMP002,Jane Smith,HR,HR Manager,2024-02-01,900000\n';
        const blob = new Blob([headers + sampleRows], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'employee_import_template.csv';
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const fetchEmployees = async (search: string, currentPage: number) => {
        setLoading(true);
        try {
            const { data } = await api.get('/employees', {
                params: {
                    search,
                    page: currentPage,
                    limit: 10,
                },
            });
            setEmployees(data.items);
            setTotalPages(data.totalPages);
        } catch (error) {
            console.error('Failed to fetch employees', error);
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setUploading(true);
        setMsg(null);

        try {
            const formData = new FormData();
            formData.append('file', file);

            const res = await api.post('/employees/bulk-upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            const { inserted = 0, skipped = 0 } = res.data;
            setMsg({
                type: 'success',
                text: `✅ Upload complete — ${inserted} employee${inserted !== 1 ? 's' : ''} inserted, ${skipped} skipped (duplicates or invalid rows).`
            });
            fetchEmployees(searchTerm, page);
        } catch (err: any) {
            const errorText = err.response?.data?.message || err.message || 'Upload failed. Check CSV format.';
            setMsg({ type: 'error', text: errorText });
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    // Debounced search handler
    const debouncedSearch = useCallback(
        debounce((value: string) => {
            setPage(1);
            fetchEmployees(value, 1);
        }, 300),
        []
    );

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSearchTerm(value);
        debouncedSearch(value);
    };

    useEffect(() => {
        fetchEmployees(searchTerm, page);
    }, [page]);

    return (
        <div className="p-10 space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-center bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Employee Directory</h2>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Manage organizational workforce</p>
                </div>
                <div className="flex space-x-3">
                    <input
                        className="hidden"
                        type="file"
                        accept=".csv"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                    />
                    <button
                        onClick={downloadTemplate}
                        className="flex items-center space-x-3 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-slate-200 active:scale-95"
                    >
                        <FileSpreadsheet size={16} />
                        <span>Download Template</span>
                    </button>
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="flex items-center space-x-3 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-500/20 active:scale-95 disabled:bg-slate-300"
                    >
                        {uploading ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
                        <span>Upload Employees CSV</span>
                    </button>
                </div>
            </div>

            {msg && (
                <div className={`p-4 rounded-2xl flex items-center space-x-3 animate-in slide-in-from-top-4 ${msg.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'}`}>
                    {msg.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                    <span className="text-xs font-bold">{msg.text}</span>
                </div>
            )}

            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/20 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Filter employees..."
                            className="bg-white border border-slate-200 pl-12 pr-6 py-3 rounded-2xl w-80 text-xs font-bold text-slate-900 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all shadow-sm"
                            value={searchTerm}
                            onChange={handleSearchChange}
                        />
                    </div>
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Total Records Found: {totalPages * 10 > employees.length ? (page - 1) * 10 + employees.length : totalPages * 10}
                    </div>
                </div>

                <div className="overflow-x-auto min-h-[400px]">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center p-32 space-y-4">
                            <Loader2 className="animate-spin text-blue-500" size={40} />
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Refreshing Directory...</p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/80 border-b border-slate-100">
                                    <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Name & ID</th>
                                    <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Designation</th>
                                    <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Department</th>
                                    <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Join Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {employees.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="p-20 text-center">
                                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No matching records found</p>
                                        </td>
                                    </tr>
                                ) : (
                                    employees.map((emp) => (
                                        <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-10 py-6">
                                                <div className="flex items-center space-x-4">
                                                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 font-black text-sm border border-blue-100">
                                                        {emp.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-black text-slate-900 group-hover:text-blue-600 transition-colors">{emp.name}</div>
                                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">{emp.id}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-10 py-6">
                                                <span className="text-xs font-bold text-slate-600 px-3 py-1 bg-slate-100 rounded-lg">{emp.position}</span>
                                            </td>
                                            <td className="px-10 py-6">
                                                <span className="text-xs font-bold text-slate-600">{emp.department}</span>
                                            </td>
                                            <td className="px-10 py-6">
                                                <span className="text-xs font-bold text-slate-900 font-mono italic">{emp.join_date || 'Legacy Record'}</span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    )}
                </div>

                <div className="p-8 border-t border-slate-100 flex justify-between items-center bg-slate-50/30">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Page {page} of {totalPages}</span>
                    <div className="flex space-x-2">
                        <button
                            disabled={page === 1}
                            onClick={() => setPage((p) => p - 1)}
                            className="px-6 py-2 bg-white border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 rounded-xl hover:bg-slate-50 transition-all disabled:opacity-50"
                        >
                            Previous
                        </button>
                        <button
                            disabled={page === totalPages}
                            onClick={() => setPage((p) => p + 1)}
                            className="px-6 py-2 bg-white border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 rounded-xl hover:bg-slate-50 transition-all disabled:opacity-50"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EmployeeTable;
