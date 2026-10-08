import React, { useState, useEffect } from 'react';
import { 
    ChevronDown, 
    Plus, 
    RefreshCw, 
    Shield, 
    Users, 
    CheckCircle2, 
    Clock, 
    TrendingUp,
    Upload,
    Search,
    X,
    Filter
} from 'lucide-react';
import api from '../../../services/api';
import { CandidateTable } from '../components/CandidateTable';
import AddEmployeeModal from '../../employees/components/modals/AddEmployeeModal';
import BulkUploadModal from '../../employees/components/modals/BulkUploadModal';
import { useAuthStore } from '../../../store/authStore';
import { AddEmployeeForm } from '../../employees/components/modals/shared';

const Onboarding: React.FC = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [showBulk, setShowBulk] = useState(false);
    const [candidates, setCandidates] = useState<any[]>([]);
    const [managers, setManagers] = useState<any[]>([]);
    const [departments, setDepartments] = useState<any[]>([]);
    const [loadingData, setLoadingData] = useState(false);
    const [error, setError] = useState('');
    const [editId, setEditId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'onboarding' | 'active'>('all');
    const [showStatusDropdown, setShowStatusDropdown] = useState(false);
    
    const emptyForm: AddEmployeeForm = {
        name: '', email: '', phone: '', dateOfBirth: '',
        gender: '', personalEmail: '',
        department: '', position: '', role: 'employee', joinDate: new Date().toISOString().split('T')[0],
        employmentType: 'full_time', status: 'onboarding',
        addressLine1: '', city: '', state: '', pincode: '',
        reportingManagerId: '', reportingManagerName: '',
        annualCTC: '', bankAccountNumber: '', taxRegime: 'New',
        highestDegree: '', fieldOfStudy: '', institution: '', graduationYear: '',
        internshipStartDate: '', internshipEndDate: '',
        internshipStipend: '', internshipSupervisor: '', internshipCollege: ''
    };
    const [form, setForm] = useState<AddEmployeeForm>(emptyForm);
    const [loading, setLoading] = useState(false);

    const fetchData = async () => {
        setLoadingData(true);
        setError('');
        try {
            const [candRes, mgrRes, deptRes] = await Promise.allSettled([
                api.get('/employees', { params: { status: 'onboarding' } }),
                api.get('/users'),
                api.get('/reports/departments')
            ]);
            if (candRes.status === 'fulfilled') setCandidates(candRes.value.data.items || []);
            if (mgrRes.status === 'fulfilled')  setManagers(mgrRes.value.data.items || []);
            if (deptRes.status === 'fulfilled') setDepartments(deptRes.value.data.items || []);
        } catch (err) {
            console.error('Failed to fetch onboarding data', err);
            setError('Failed to load onboarding data');
        } finally {
            setLoadingData(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const handleEdit = (c: any) => {
        setEditId(c.id);
        setForm({
            ...emptyForm,
            name: c.name || '',
            email: c.email || '',
            phone: c.phone || '',
            department: c.department || c.department_name || '',
            position: c.position || '',
            joinDate: c.join_date ? new Date(c.join_date).toISOString().split('T')[0] : '',
            annualCTC: (c.annual_ctc || c.annualCTC || '').toString(),
            gender: c.gender || '',
            dateOfBirth: c.date_of_birth ? new Date(c.date_of_birth).toISOString().split('T')[0] : '',
            employmentType: c.employment_type || 'full_time',
            reportingManagerId: c.reporting_manager_id || '',
            reportingManagerName: c.manager_name || '',
            status: c.status || 'onboarding'
        });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const payload = {
                ...form,
                annualCTC: Number(form.annualCTC) || 0,
            };

            if (editId) {
                await api.put(`/employees/${editId}`, payload);
            } else {
                await api.post('/employees', payload);
            }

            setIsModalOpen(false);
            setForm(emptyForm);
            setEditId(null);
            fetchData();
        } catch (err: any) {
            const data = err.response?.data;
            if (data?.details && Array.isArray(data.details)) {
                const details = data.details.map((d: any) => `${d.path?.join('.')}: ${d.message}`).join(', ');
                setError(`${data.message || 'Validation failed'} (${details})`);
            } else {
                setError(data?.message || 'Failed to save employee profile');
            }
        } finally {
            setLoading(false);
        }
    };

    const filteredCandidates = candidates.filter(c => {
        const query = searchQuery.toLowerCase().trim();
        const matchesQuery = !query || 
            (c.name && c.name.toLowerCase().includes(query)) ||
            (c.id && c.id.toString().toLowerCase().includes(query)) ||
            (c.email && c.email.toLowerCase().includes(query)) ||
            (c.position && c.position.toLowerCase().includes(query)) ||
            (c.department && c.department.toLowerCase().includes(query)) ||
            (c.department_name && c.department_name.toLowerCase().includes(query));

        const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
        return matchesQuery && matchesStatus;
    });

    const { hasAnyRole, hasPermission } = useAuthStore();
    const isAuthorized = hasAnyRole('super_admin', 'admin', 'hr') || hasPermission('onboarding:manage');

    if (!isAuthorized) {
        return (
            <div className="h-[70vh] flex flex-col items-center justify-center px-4 text-center">
                <div className="w-14 h-14 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-center text-rose-600 mb-3.5 shadow-xs">
                    <Shield size={26} />
                </div>
                <h3 className="text-lg font-bold text-slate-900 tracking-tight">Access Restricted</h3>
                <p className="text-xs text-slate-500 max-w-sm mt-1.5 leading-relaxed">
                    You do not have authorization to access the Onboarding module. Candidate onboarding and employee creation are restricted to authorized HR and Administrators.
                </p>
            </div>
        );
    }

    const inProgressCount = candidates.filter(c => c.status === 'onboarding').length;
    const activeCount = candidates.filter(c => c.status === 'active').length;
    const totalCount = candidates.length;
    const completionRate = totalCount > 0 ? Math.round((activeCount / totalCount) * 100) : 0;

    return (
        <div className="w-full min-w-0 max-w-[1440px] mx-auto px-6 py-6 space-y-5 animate-in fade-in duration-200">
            {/* ── Page Header ──────────────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 tracking-tight">Employee Onboarding</h1>
                    <p className="text-xs text-slate-500 mt-0.5">
                        Manage new hire setup, orientation workflows, and roster activation
                    </p>
                </div>

                <div className="flex items-center gap-2.5">
                    <button 
                        onClick={fetchData} 
                        className={`p-2 bg-white border border-slate-200/90 rounded-lg text-slate-500 hover:text-slate-800 transition-all shadow-xs ${loadingData ? 'animate-spin text-blue-600' : ''}`}
                        title="Refresh"
                    >
                        <RefreshCw size={15}/>
                    </button>
                    <button 
                        onClick={() => setShowBulk(true)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200/90 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 hover:border-slate-300 transition-all shadow-xs"
                    >
                        <Upload size={14} className="text-slate-500" />
                        Bulk Upload
                    </button>
                    <button
                        onClick={() => { setEditId(null); setForm(emptyForm); setIsModalOpen(true); }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-all shadow-xs"
                    >
                        <Plus size={14} />
                        Add Candidate
                    </button>
                </div>
            </div>

            {/* ── Metric Cards ─────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-semibold text-slate-500">Total Candidates</span>
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                            <Users size={16} />
                        </div>
                    </div>
                    <div className="text-2xl font-bold text-slate-900 tracking-tight">{totalCount}</div>
                    <p className="text-xs text-slate-400 mt-1 font-medium">In onboarding system</p>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-semibold text-slate-500">In Progress</span>
                        <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                            <Clock size={16} />
                        </div>
                    </div>
                    <div className="text-2xl font-bold text-slate-900 tracking-tight">{inProgressCount}</div>
                    <p className="text-xs text-slate-400 mt-1 font-medium">Pending document completion</p>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-semibold text-slate-500">Ready to Activate</span>
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <CheckCircle2 size={16} />
                        </div>
                    </div>
                    <div className="text-2xl font-bold text-slate-900 tracking-tight">{activeCount}</div>
                    <p className="text-xs text-slate-400 mt-1 font-medium">Profile details verified</p>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-semibold text-slate-500">Completion Rate</span>
                        <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center">
                            <TrendingUp size={16} />
                        </div>
                    </div>
                    <div className="text-2xl font-bold text-slate-900 tracking-tight">{completionRate}%</div>
                    <p className="text-xs text-slate-400 mt-1 font-medium">Pipeline velocity</p>
                </div>
            </div>

            {/* ── Toolbar with Search Bar ───────────────────── */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs">
                <div className="flex items-center gap-3 flex-1">
                    {/* Status Filter Dropdown */}
                    <div className="relative">
                        <button
                            onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                            className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200/90 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-all whitespace-nowrap"
                        >
                            <span>
                                {statusFilter === 'all' ? 'All Candidates' : statusFilter === 'onboarding' ? 'In Progress' : 'Activated'}
                            </span>
                            <span className="px-1.5 py-0.5 bg-slate-200/80 rounded text-[10px] text-slate-700 font-bold">
                                {filteredCandidates.length}
                            </span>
                            <ChevronDown size={13} className={`text-slate-400 transition-transform ${showStatusDropdown ? 'rotate-180' : ''}`} />
                        </button>

                        {showStatusDropdown && (
                            <div className="absolute top-full left-0 mt-1.5 w-44 bg-white border border-slate-200 rounded-lg shadow-lg z-30 py-1 animate-in fade-in zoom-in-95 duration-100">
                                {[
                                    { id: 'all', label: 'All Candidates', count: candidates.length },
                                    { id: 'onboarding', label: 'In Progress', count: inProgressCount },
                                    { id: 'active', label: 'Activated', count: activeCount },
                                ].map(opt => (
                                    <button
                                        key={opt.id}
                                        onClick={() => { setStatusFilter(opt.id as any); setShowStatusDropdown(false); }}
                                        className={`w-full flex items-center justify-between px-3 py-1.5 text-xs font-medium text-left transition-colors
                                            ${statusFilter === opt.id ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-700 hover:bg-slate-50'}`}
                                    >
                                        <span>{opt.label}</span>
                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-bold">{opt.count}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Candidate Search Bar */}
                    <div className="relative flex-1 max-w-md">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Search candidates by name, ID, email, or role..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200/90 rounded-lg text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-blue-500 outline-none transition-all"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-200 transition-colors"
                            >
                                <X size={12} />
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                    {(searchQuery || statusFilter !== 'all') && (
                        <button 
                            onClick={() => { setSearchQuery(''); setStatusFilter('all'); }}
                            className="px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 rounded-lg transition-colors"
                        >
                            Reset filters
                        </button>
                    )}
                </div>
            </div>

            {/* ── Candidate Table ─────────────────────────── */}
            <CandidateTable 
                candidates={filteredCandidates} 
                loading={loadingData} 
                onEdit={handleEdit} 
                searchQuery={searchQuery}
                onClearSearch={() => { setSearchQuery(''); setStatusFilter('all'); }}
            />

            {/* ── Add Employee Modal ──────────────────────── */}
            <AddEmployeeModal 
                show={isModalOpen}
                onClose={() => { setIsModalOpen(false); setForm(emptyForm); setEditId(null); }}
                onSubmit={handleSubmit}
                form={form}
                setForm={setForm as any}
                loading={loading}
                error={error}
            />

            {/* ── Bulk Upload Modal ───────────────────────── */}
            <BulkUploadModal 
                show={showBulk} 
                onClose={() => setShowBulk(false)} 
                onSuccess={() => { setShowBulk(false); fetchData(); }} 
            />
        </div>
    );
};

export default Onboarding;
