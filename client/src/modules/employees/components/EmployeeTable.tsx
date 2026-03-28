import React, { useState, useEffect, useCallback } from 'react';
import { 
    Users, 
    Search, 
    UserPlus, 
    MoreVertical, 
    Mail, 
    Phone, 
    MapPin, 
    Filter,
    ChevronLeft,
    ChevronRight,
    Loader2,
    Shield,
    Briefcase,
    Building2,
    CheckCircle2
} from 'lucide-react';
import api from '../../../services/api';
import debounce from 'lodash/debounce';

interface Employee {
    id: string;
    name: string;
    email: string;
    position: string;
    department: string;
    status: 'active' | 'onboarding' | 'terminated';
    join_date: string;
}

const EmployeeTable: React.FC = () => {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);

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
            setEmployees(data.items || []);
            setTotalPages(data.totalPages || 1);
            setTotalItems(data.total || 0);
        } catch (error) {
            console.error('Failed to fetch employees', error);
        } finally {
            setLoading(false);
        }
    };

    const debouncedSearch = useCallback(
        debounce((value: string) => {
            setPage(1);
            fetchEmployees(value, 1);
        }, 400),
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
        <div className="p-6 space-y-6 page-enter">
            
            {/* ── Page Header ──────────────────────────────── */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100">
                        <Users size={20} className="text-white" />
                    </div>
                    <div>
                        <h2 className="text-[17px] font-black text-gray-900 tracking-tight uppercase">Employee Directory</h2>
                        <p className="text-[11.5px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
                            {totalItems} Team Members Enrolled
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                    <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-[12px] font-bold text-gray-600 hover:bg-gray-50 transition-all shadow-sm active:scale-95">
                        <Filter size={14} />
                        Filter
                    </button>
                    <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-[12px] font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-95">
                        <UserPlus size={14} />
                        Add Member
                    </button>
                </div>
            </div>

            {/* ── Search & Total Info ──────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                <div className="lg:col-span-3 relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors" size={16} />
                    <input
                        type="text"
                        placeholder="Search by name, email, department or position..."
                        className="w-full bg-white border border-gray-100 rounded-2xl pl-11 pr-5 py-3.5 text-[13px] font-semibold text-gray-900 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all shadow-sm"
                        value={searchTerm}
                        onChange={handleSearchChange}
                    />
                </div>
                <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl p-4 flex items-center justify-between text-white shadow-lg shadow-indigo-100">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Sync Status</p>
                        <p className="text-[14px] font-bold">Cloud Verified</p>
                    </div>
                    <CheckCircle2 size={24} className="opacity-40" />
                </div>
            </div>

            {/* ── Employee List ─────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="py-32 flex flex-col items-center justify-center gap-4">
                        <Loader2 size={32} className="text-indigo-600 animate-spin" />
                        <p className="text-[12px] font-bold text-gray-400 uppercase tracking-widest">Hydrating Directory...</p>
                    </div>
                ) : employees.length === 0 ? (
                    <div className="py-32 flex flex-col items-center justify-center gap-4 text-center">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-300">
                            <Users size={32} />
                        </div>
                        <div>
                            <p className="text-[14px] font-bold text-gray-800">No Members Found</p>
                            <p className="text-[12px] text-gray-400 mt-1 max-w-xs px-6">We couldn't find any employees matching your search criteria.</p>
                        </div>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-gray-50/50 text-[10.5px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                                    <th className="px-6 py-4">Employee Detail</th>
                                    <th className="px-6 py-4">Department & Role</th>
                                    <th className="px-6 py-4">Status & Join Date</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {employees.map((emp) => (
                                    <tr key={emp.id} className="hover:bg-indigo-50/30 transition-all group">
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-[13px] font-black text-gray-600 border border-gray-200 group-hover:bg-white group-hover:border-indigo-100 group-hover:text-indigo-600 transition-all">
                                                    {emp.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-[13.5px] font-bold text-gray-900 group-hover:text-indigo-700 transition-colors uppercase tracking-tight">{emp.name}</p>
                                                    <div className="flex items-center gap-1.5 text-[11.5px] text-gray-400 font-medium">
                                                        <Mail size={11} />
                                                        {emp.email || `${emp.id}@company.com`}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-1.5 text-[12.5px] font-bold text-gray-700">
                                                    <Building2 size={13} className="text-gray-300" />
                                                    {emp.department}
                                                </div>
                                                <div className="flex items-center gap-1.5 text-[11.5px] text-gray-400 font-medium italic">
                                                    <Briefcase size={12} className="text-gray-300" />
                                                    {emp.position}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="space-y-2">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                                    emp.status === 'active' || !emp.status ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-gray-50 text-gray-400 border border-gray-100'
                                                }`}>
                                                    <div className={`w-1 h-1 rounded-full ${emp.status === 'active' || !emp.status ? 'bg-emerald-500' : 'bg-gray-400'}`}></div>
                                                    {emp.status || 'Active'}
                                                </span>
                                                <div className="flex items-center gap-1.5 text-[10.5px] text-gray-400 font-medium">
                                                    Joined {emp.join_date ? new Date(emp.join_date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : 'Mar 2024'}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button className="p-2 text-gray-300 hover:text-indigo-600 hover:bg-white rounded-lg transition-all border border-transparent hover:border-indigo-100 shadow-sm shadow-transparent hover:shadow-indigo-100/20">
                                                    <Shield size={14} />
                                                </button>
                                                <button className="p-2 text-gray-300 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all">
                                                    <MoreVertical size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* ── Pagination ──────────────────────────────── */}
                <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-[12px] font-bold text-gray-400 uppercase tracking-widest">
                        Showing <span className="text-gray-900">{employees.length}</span> of <span className="text-gray-900">{totalItems}</span> Members
                    </p>
                    <div className="flex items-center gap-1.5">
                        <button
                            disabled={page === 1 || loading}
                            onClick={() => setPage(p => p - 1)}
                            className="p-2 rounded-xl border border-gray-200 bg-white text-gray-400 hover:text-indigo-600 hover:border-indigo-200 transition-all disabled:opacity-30 disabled:pointer-events-none active:scale-90"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <div className="px-4 py-1.5 bg-indigo-600 text-white rounded-xl text-[12px] font-black shadow-md shadow-indigo-200">
                            {page}
                        </div>
                        <button
                            disabled={page === totalPages || loading}
                            onClick={() => setPage(p => p + 1)}
                            className="p-2 rounded-xl border border-gray-200 bg-white text-gray-400 hover:text-indigo-600 hover:border-indigo-200 transition-all disabled:opacity-30 disabled:pointer-events-none active:scale-90"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EmployeeTable;
