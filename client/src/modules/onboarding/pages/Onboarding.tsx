import React, { useState, useEffect } from 'react';
import { 
    ChevronDown, 
    Plus, 
    Maximize2, 
    Filter, 
    RefreshCw, 
    Shield, 
    Activity, 
    Zap,
    Upload,
    Search,
    X
} from 'lucide-react';
import api from '../../../services/api';
import { CandidateTable } from '../components/CandidateTable';
import AddEmployeeModal from '../../employees/components/modals/AddEmployeeModal';
import BulkUploadModal from '../../employees/components/modals/BulkUploadModal';
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
                internshipStipend: form.internshipStipend ? Number(form.internshipStipend) : undefined
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
            if (data?.errors && typeof data.errors === 'object') {
                const details = Object.entries(data.errors)
                    .map(([field, msgs]: any) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
                    .join(' | ');
                setError(`${data.message || 'Validation failed'} (${details})`);
            } else {
                setError(data?.message || 'Transaction failed');
            }
            console.error('[Onboarding Error]:', err);
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

    return (
        <div className="p-6 space-y-8 page-enter max-w-[1600px] mx-auto">
            
            {/* ── Page Header ──────────────────────────────── */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
                        <Shield size={20} className="text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-[#0F172A] tracking-tight">Onboarding</h2>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-0.5">
                            Manage new employee onboarding
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button 
                        onClick={fetchData} 
                        className={`p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-400 hover:text-indigo-600 transition-all shadow-sm ${loadingData ? 'animate-spin text-indigo-600' : ''}`}
                    >
                        <RefreshCw size={18}/>
                    </button>
                    <button onClick={()=>setShowBulk(true)}
                        className="flex items-center gap-2 px-5 py-3 bg-white border border-violet-200 text-violet-700 rounded-xl text-[12px] font-black uppercase tracking-widest hover:bg-violet-50 transition-all shadow-sm">
                        <Upload size={16}/> Bulk Upload
                    </button>
                    <button
                        onClick={() => { setEditId(null); setForm(emptyForm); setIsModalOpen(true); }}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl text-[12px] font-black tracking-widest uppercase transition-all shadow-lg shadow-indigo-600/20 active:scale-95 flex items-center gap-2.5"
                    >
                        <Plus size={16} />
                        Add Employee
                    </button>
                </div>
            </div>

            {/* ── Operational KPIs ────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total Candidates', val: candidates.length, icon: Activity, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                    { label: 'In Progress', val: candidates.filter(c => c.status === 'onboarding').length, icon: Shield, color: 'text-amber-600', bg: 'bg-amber-50' },
                    { label: 'Activated',   val: candidates.filter(c => c.status === 'active').length, icon: Zap, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { label: 'Growth Rate', val: '12%', icon: RefreshCw, color: 'text-slate-600', bg: 'bg-slate-50', isPrc: true }
                ].map((s, i) => (
                    <div key={i} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between group hover:border-indigo-200 transition-all">
                        <div>
                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{s.label}</p>
                            <p className="text-xl font-black text-slate-900 mt-0.5 tracking-tight">
                                {s.val}{s.isPrc && <span className="text-[10px] text-emerald-500 ml-1">↑</span>}
                            </p>
                        </div>
                        <div className={`w-10 h-10 ${s.bg} ${s.color} rounded-lg flex items-center justify-center`}>
                            <s.icon size={18} />
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Toolbar with Search Bar ───────────────────── */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-2 rounded-2xl border border-slate-200/90 shadow-xs">
                <div className="flex items-center gap-3 flex-1">
                    {/* Status Filter Dropdown */}
                    <div className="relative">
                        <button
                            onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                            className="flex items-center gap-2 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:border-indigo-500 hover:bg-white transition-all shadow-2xs group whitespace-nowrap"
                        >
                            <span>
                                {statusFilter === 'all' ? 'All Candidates' : statusFilter === 'onboarding' ? 'In Progress' : 'Activated'}
                            </span>
                            <span className="px-1.5 py-0.2 bg-slate-200/70 rounded text-[10px] text-slate-600 font-extrabold">
                                {filteredCandidates.length}
                            </span>
                            <ChevronDown size={14} className={`text-slate-400 group-hover:text-indigo-600 transition-transform ${showStatusDropdown ? 'rotate-180' : ''}`} />
                        </button>

                        {showStatusDropdown && (
                            <div className="absolute top-full left-0 mt-1.5 w-48 bg-white border border-slate-200 rounded-xl shadow-lg z-30 py-1.5 animate-in fade-in zoom-in-95 duration-100">
                                {[
                                    { id: 'all', label: 'All Candidates', count: candidates.length },
                                    { id: 'onboarding', label: 'In Progress', count: candidates.filter(c => c.status === 'onboarding').length },
                                    { id: 'active', label: 'Activated', count: candidates.filter(c => c.status === 'active').length },
                                ].map(opt => (
                                    <button
                                        key={opt.id}
                                        onClick={() => { setStatusFilter(opt.id as any); setShowStatusDropdown(false); }}
                                        className={`w-full flex items-center justify-between px-3.5 py-2 text-xs font-semibold text-left transition-colors
                                            ${statusFilter === opt.id ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
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
                        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Search candidates by name, ID, email, or role..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-8 py-2 bg-slate-50/80 border border-slate-200/90 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/10 outline-none transition-all"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-200/60 transition-colors"
                            >
                                <X size={13} />
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-1.5 px-1 self-end sm:self-auto">
                    {(searchQuery || statusFilter !== 'all') && (
                        <button 
                            onClick={() => { setSearchQuery(''); setStatusFilter('all'); }}
                            className="px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 rounded-lg transition-colors"
                        >
                            Reset
                        </button>
                    )}
                    <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-all" title="Toggle Fullscreen">
                        <Maximize2 size={16} />
                    </button>
                    <button 
                        onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                        className={`p-2 rounded-lg transition-all ${statusFilter !== 'all' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-100'}`} 
                        title="Filter Candidates"
                    >
                        <Filter size={16} />
                    </button>
                </div>
            </div>

            {/* ── Candidate Matrix ────────────────────────── */}
            <CandidateTable 
                candidates={filteredCandidates} 
                loading={loadingData} 
                onEdit={handleEdit} 
                searchQuery={searchQuery}
                onClearSearch={() => { setSearchQuery(''); setStatusFilter('all'); }}
            />

            {/* ── Add Employee Modal (Reused) ───────────── */}
            <AddEmployeeModal 
                show={isModalOpen}
                onClose={() => { setIsModalOpen(false); setForm(emptyForm); setEditId(null); }}
                onSubmit={handleSubmit}
                form={form}
                setForm={setForm as any}
                loading={loading}
                error={error}
            />

            {/* ── Bulk Upload Modal ──────────────────────── */}
            <BulkUploadModal 
                show={showBulk} 
                onClose={() => setShowBulk(false)} 
                onSuccess={() => { setShowBulk(false); fetchData(); }} 
            />
        </div>
    );
};

export default Onboarding;

