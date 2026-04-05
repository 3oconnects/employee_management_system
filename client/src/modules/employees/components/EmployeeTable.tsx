import React, { useState, useEffect, useCallback } from 'react';
import { 
    Users, 
    Search, 
    UserPlus, 
    MoreVertical, 
    Mail, 
    ChevronLeft,
    ChevronRight,
    Loader2,
    Briefcase,
    Building2,
    CheckCircle2,
    X,
    Pencil
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
            setTotalItems(data.totalItems || 0);
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

    // Modal States: Add
    const [showAddModal, setShowAddModal] = useState(false);
    const [addForm, setAddForm] = useState({ 
        name: '', email: '', department: '', joinDate: '', 
        annualCTC: '', bankAccountNumber: '', taxRegime: 'New' 
    });
    const [addLoading, setAddLoading] = useState(false);
    const [addError, setAddError] = useState('');

    // Modal States: Edit
    const [showEditModal, setShowEditModal] = useState(false);
    const [editEmployeeId, setEditEmployeeId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({ 
        name: '', email: '', department: '', position: '', 
        status: '', joinDate: '' 
    });
    const [editLoading, setEditLoading] = useState(false);
    const [editError, setEditError] = useState('');

    const handleAddEmployee = async (e: React.FormEvent) => {
        e.preventDefault();
        setAddLoading(true);
        setAddError('');
        try {
            await api.post('/employees', {
                name: addForm.name,
                email: addForm.email,
                department: addForm.department,
                joinDate: addForm.joinDate,
                annualCTC: Number(addForm.annualCTC),
                bankAccountNumber: addForm.bankAccountNumber,
                taxRegime: addForm.taxRegime,
            });
            setShowAddModal(false);
            setAddForm({ 
                name: '', email: '', department: '', joinDate: '', 
                annualCTC: '', bankAccountNumber: '', taxRegime: 'New' 
            });
            setPage(1);
            fetchEmployees(searchTerm, 1);
        } catch (err: any) {
            setAddError(err.response?.data?.message || err.message || 'Failed to add employee');
        } finally {
            setAddLoading(false);
        }
    };

    const openEditModal = (emp: Employee) => {
        setEditEmployeeId(emp.id);
        setEditForm({
            name: emp.name,
            email: emp.email,
            department: emp.department,
            position: emp.position,
            status: emp.status || 'active',
            joinDate: emp.join_date ? new Date(emp.join_date).toISOString().slice(0, 10) : ''
        });
        setShowEditModal(true);
    };

    const handleUpdateEmployee = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editEmployeeId) return;
        setEditLoading(true);
        setEditError('');
        try {
            await api.put(`/employees/${editEmployeeId}`, {
                name: editForm.name,
                email: editForm.email,
                department: editForm.department,
                position: editForm.position,
                status: editForm.status,
                join_date: editForm.joinDate
            });
            setShowEditModal(false);
            fetchEmployees(searchTerm, page);
        } catch (err: any) {
            setEditError(err.response?.data?.message || err.message || 'Update failed');
        } finally {
            setEditLoading(false);
        }
    };

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
                    <button 
                        onClick={() => setShowAddModal(true)}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-[12px] font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-95"
                    >
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
                                            <div className="flex items-center justify-end gap-2 text-gray-400">
                                                <button 
                                                    onClick={() => openEditModal(emp)}
                                                    className="p-2 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                                    title="Edit Member"
                                                >
                                                    <Pencil size={14} />
                                                </button>
                                                <button className="p-2 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all">
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

            {/* ── Add Employee Modal ──────────────────────── */}
            {showAddModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
                        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between">
                            <div>
                                <h3 className="text-[17px] font-black text-gray-900 uppercase tracking-tight">Add New Member</h3>
                                <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Onboard a new team member</p>
                            </div>
                            <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-all"><X size={20}/></button>
                        </div>
                        <form onSubmit={handleAddEmployee} className="p-8 space-y-5">
                            {addError && <div className="bg-rose-50 border border-rose-100 text-rose-600 rounded-xl px-4 py-3 text-[12px] font-semibold">{addError}</div>}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5 col-span-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Full Name</label>
                                    <input required type="text" value={addForm.name} onChange={e => setAddForm(f=>({...f, name: e.target.value}))} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-[13px] font-semibold outline-none focus:border-indigo-400 focus:bg-white transition-all" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Email Address</label>
                                    <input required type="email" value={addForm.email} onChange={e => setAddForm(f=>({...f, email: e.target.value}))} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-[13px] font-semibold outline-none focus:border-indigo-400 focus:bg-white transition-all" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Join Date</label>
                                    <input required type="date" value={addForm.joinDate} onChange={e => setAddForm(f=>({...f, joinDate: e.target.value}))} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-[13px] font-semibold outline-none focus:border-indigo-400 focus:bg-white transition-all" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Department</label>
                                    <select required value={addForm.department} onChange={e => setAddForm(f=>({...f, department: e.target.value}))} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-[13px] font-semibold outline-none focus:border-indigo-400 focus:bg-white transition-all">
                                        <option value="">Select Department</option>
                                        {['Engineering','Product','Sales','Marketing','HR','Finance','Operations','Design'].map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Annual CTC</label>
                                    <input required type="number" value={addForm.annualCTC} onChange={e => setAddForm(f=>({...f, annualCTC: e.target.value}))} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-[13px] font-semibold outline-none focus:border-indigo-400 focus:bg-white transition-all" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Bank Account</label>
                                    <input required type="text" value={addForm.bankAccountNumber} onChange={e => setAddForm(f=>({...f, bankAccountNumber: e.target.value}))} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-[13px] font-semibold outline-none focus:border-indigo-400 focus:bg-white transition-all" />
                                </div>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-3 bg-white border border-gray-200 text-gray-500 rounded-xl text-[12px] font-bold uppercase tracking-widest active:scale-95 transition-all">Cancel</button>
                                <button type="submit" disabled={addLoading} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-[12px] font-bold uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-60">
                                    {addLoading ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                                    {addLoading ? 'Creating...' : 'Create Member'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Edit Employee Modal ─────────────────────── */}
            {showEditModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
                        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between">
                            <div>
                                <h3 className="text-[17px] font-black text-gray-900 uppercase tracking-tight">Edit Member Profile</h3>
                                <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Modifying ID: {editEmployeeId}</p>
                            </div>
                            <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-all"><X size={20}/></button>
                        </div>
                        <form onSubmit={handleUpdateEmployee} className="p-8 space-y-5">
                            {editError && <div className="bg-rose-50 border border-rose-100 text-rose-600 rounded-xl px-4 py-3 text-[12px] font-semibold">{editError}</div>}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5 col-span-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Full Name</label>
                                    <input required type="text" value={editForm.name} onChange={e => setEditForm(f=>({...f, name: e.target.value}))} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-[13px] font-semibold outline-none focus:border-indigo-400 focus:bg-white transition-all" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Email Address</label>
                                    <input type="email" value={editForm.email} onChange={e => setEditForm(f=>({...f, email: e.target.value}))} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-[13px] font-semibold outline-none focus:border-indigo-400 focus:bg-white transition-all" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Join Date</label>
                                    <input type="date" value={editForm.joinDate} onChange={e => setEditForm(f=>({...f, joinDate: e.target.value}))} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-[13px] font-semibold outline-none focus:border-indigo-400 focus:bg-white transition-all" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Department</label>
                                    <select required value={editForm.department} onChange={e => setEditForm(f=>({...f, department: e.target.value}))} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-[13px] font-semibold outline-none focus:border-indigo-400 focus:bg-white transition-all">
                                        {['Engineering','Product','Sales','Marketing','HR','Finance','Operations','Design'].map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Position / Role</label>
                                    <input required type="text" value={editForm.position} onChange={e => setEditForm(f=>({...f, position: e.target.value}))} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-[13px] font-semibold outline-none focus:border-indigo-400 focus:bg-white transition-all" />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Employment Status</label>
                                <div className="flex gap-3">
                                    {['active', 'onboarding', 'terminated'].map(s => (
                                        <button key={s} type="button" onClick={() => setEditForm(f=>({...f, status: s}))} className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${editForm.status === s ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-gray-50 text-gray-400 border-gray-100 hover:bg-white'}`}>{s}</button>
                                    ))}
                                </div>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowEditModal(false)} className="flex-1 py-3 bg-white border border-gray-200 text-gray-500 rounded-xl text-[12px] font-bold uppercase tracking-widest active:scale-90 transition-all">Discard</button>
                                <button type="submit" disabled={editLoading} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-[12px] font-bold uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-60">
                                    {editLoading ? <Loader2 size={14} className="animate-spin" /> : <Users size={14} />}
                                    {editLoading ? 'Saving...' : 'Update Member'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmployeeTable;
