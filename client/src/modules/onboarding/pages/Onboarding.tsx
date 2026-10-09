import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
    Filter,
    Sparkles,
    Mail,
    Send,
    Loader2,
    Building2,
    Check
} from 'lucide-react';
import api from '../../../services/api';
import { CandidateTable } from '../components/CandidateTable';
import AddEmployeeModal from '../../employees/components/modals/AddEmployeeModal';
import BulkUploadModal from '../../employees/components/modals/BulkUploadModal';
import { useAuthStore } from '../../../store/authStore';
import { AddEmployeeForm } from '../../employees/components/modals/shared';
import { toast } from '../../../components/ui';

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
    const [statusFilter, setStatusFilter] = useState<'all' | 'offer_sent' | 'offer_accepted' | 'active'>('all');
    const [showStatusDropdown, setShowStatusDropdown] = useState(false);

    // Modal state for multi-stage hiring actions
    const [confirmCandidate, setConfirmCandidate] = useState<any | null>(null);
    const [acceptCandidate, setAcceptCandidate] = useState<any | null>(null);
    const [resendCandidate, setResendCandidate] = useState<any | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [actionRemarks, setActionRemarks] = useState('');
    
    const emptyForm: AddEmployeeForm = {
        name: '', email: '', phone: '', dateOfBirth: '',
        gender: '', personalEmail: '',
        department: '', position: '', role: 'employee', joinDate: new Date().toISOString().split('T')[0],
        employmentType: 'full_time', status: 'offer_sent',
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
                api.get('/employees', { params: { scope: 'onboarding' } }),
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
            personalEmail: c.personal_email || c.personalEmail || '',
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
            status: c.status || 'offer_sent'
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
                toast.success('Candidate profile updated');
            } else {
                await api.post('/employees', payload);
                toast.success('Candidate profile created. Offer letter dispatched to candidate.');
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

    // Stage 1 -> Stage 2: Candidate accepts offer
    const handleAcceptOfferSubmit = async () => {
        if (!acceptCandidate) return;
        setActionLoading(true);
        try {
            await api.post(`/employees/${acceptCandidate.id}/offer-accept`, {
                remarks: actionRemarks.trim() || undefined,
                acceptedDate: new Date().toISOString().split('T')[0],
            });
            toast.success(`Offer acceptance recorded for ${acceptCandidate.name}. Candidate is awaiting HR confirmation.`);
            setAcceptCandidate(null);
            setActionRemarks('');
            fetchData();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to record offer acceptance');
        } finally {
            setActionLoading(false);
        }
    };

    // Stage 2 -> Stage 3: HR confirms hire, activates account & dispatches welcome credentials
    const handleConfirmHireSubmit = async () => {
        if (!confirmCandidate) return;
        setActionLoading(true);
        try {
            const res = await api.post(`/employees/${confirmCandidate.id}/confirm-hire`, {
                remarks: actionRemarks.trim() || undefined
            });
            toast.success(`Hired & Activated! Credentials sent to ${confirmCandidate.personal_email || confirmCandidate.email}.`);
            setConfirmCandidate(null);
            setActionRemarks('');
            fetchData();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to confirm employee hire');
        } finally {
            setActionLoading(false);
        }
    };

    // Resend Offer Letter PDF
    const handleResendOfferSubmit = async () => {
        if (!resendCandidate) return;
        setActionLoading(true);
        try {
            await api.post(`/employees/${resendCandidate.id}/resend-offer`);
            toast.success(`Offer letter resent to ${resendCandidate.personal_email || resendCandidate.email}`);
            setResendCandidate(null);
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to resend offer letter');
        } finally {
            setActionLoading(false);
        }
    };

    const filteredCandidates = candidates.filter(c => {
        const query = searchQuery.toLowerCase().trim();
        const matchesQuery = !query || 
            (c.name && c.name.toLowerCase().includes(query)) ||
            (c.id && c.id.toString().toLowerCase().includes(query)) ||
            (c.email && c.email.toLowerCase().includes(query)) ||
            (c.personal_email && c.personal_email.toLowerCase().includes(query)) ||
            (c.position && c.position.toLowerCase().includes(query)) ||
            (c.department && c.department.toLowerCase().includes(query)) ||
            (c.department_name && c.department_name.toLowerCase().includes(query));

        let matchesStatus = true;
        if (statusFilter === 'offer_sent') {
            matchesStatus = c.status === 'offer_sent' || c.status === 'onboarding';
        } else if (statusFilter === 'offer_accepted') {
            matchesStatus = c.status === 'offer_accepted';
        } else if (statusFilter === 'active') {
            matchesStatus = c.status === 'active';
        }

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

    const offerSentCount = candidates.filter(c => c.status === 'offer_sent' || c.status === 'onboarding').length;
    const offerAcceptedCount = candidates.filter(c => c.status === 'offer_accepted').length;
    const confirmedCount = candidates.filter(c => c.status === 'active').length;
    const totalCount = candidates.length;

    return (
        <div className="w-full min-w-0 max-w-[1440px] mx-auto px-6 py-6 space-y-5 animate-in fade-in duration-200">
            {/* ── Page Header ──────────────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 tracking-tight">Employee Onboarding Pipeline</h1>
                    <p className="text-xs text-slate-500 mt-0.5">
                        Manage offer dispatches, candidate acceptances, and final HR activation with credential release
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
                {/* Total Pipeline */}
                <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-semibold text-slate-500">Total in Pipeline</span>
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                            <Users size={16} />
                        </div>
                    </div>
                    <div className="text-2xl font-bold text-slate-900 tracking-tight">{totalCount}</div>
                    <p className="text-xs text-slate-400 mt-1 font-medium">All candidates & new hires</p>
                </div>

                {/* Offer Sent / Pending */}
                <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-semibold text-slate-500">Offer Sent (Pending)</span>
                        <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                            <Clock size={16} />
                        </div>
                    </div>
                    <div className="text-2xl font-bold text-amber-700 tracking-tight">{offerSentCount}</div>
                    <p className="text-xs text-slate-400 mt-1 font-medium">Awaiting candidate acceptance</p>
                </div>

                {/* Offer Accepted / Awaiting HR */}
                <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-semibold text-slate-500">Offer Accepted</span>
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                            <Sparkles size={16} />
                        </div>
                    </div>
                    <div className="text-2xl font-bold text-indigo-700 tracking-tight">{offerAcceptedCount}</div>
                    <p className="text-xs text-slate-400 mt-1 font-medium">Ready for HR confirmation</p>
                </div>

                {/* Confirmed & Hired */}
                <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-semibold text-slate-500">Confirmed & Hired</span>
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <CheckCircle2 size={16} />
                        </div>
                    </div>
                    <div className="text-2xl font-bold text-emerald-700 tracking-tight">{confirmedCount}</div>
                    <p className="text-xs text-slate-400 mt-1 font-medium">Activated with credentials sent</p>
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
                                {statusFilter === 'all' 
                                    ? 'All Pipeline' 
                                    : statusFilter === 'offer_sent' 
                                    ? 'Offer Sent' 
                                    : statusFilter === 'offer_accepted'
                                    ? 'Offer Accepted'
                                    : 'Confirmed & Hired'}
                            </span>
                            <span className="px-1.5 py-0.5 bg-slate-200/80 rounded text-[10px] text-slate-700 font-bold">
                                {filteredCandidates.length}
                            </span>
                            <ChevronDown size={13} className={`text-slate-400 transition-transform ${showStatusDropdown ? 'rotate-180' : ''}`} />
                        </button>

                        {showStatusDropdown && (
                            <div className="absolute top-full left-0 mt-1.5 w-52 bg-white border border-slate-200 rounded-lg shadow-lg z-30 py-1 animate-in fade-in zoom-in-95 duration-100">
                                {[
                                    { id: 'all', label: 'All Pipeline', count: candidates.length },
                                    { id: 'offer_sent', label: 'Offer Sent (Pending)', count: offerSentCount },
                                    { id: 'offer_accepted', label: 'Offer Accepted (Awaiting HR)', count: offerAcceptedCount },
                                    { id: 'active', label: 'Confirmed & Hired', count: confirmedCount },
                                ].map(opt => (
                                    <button
                                        key={opt.id}
                                        onClick={() => { setStatusFilter(opt.id as any); setShowStatusDropdown(false); }}
                                        className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-left transition-colors
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
                            placeholder="Search by candidate name, email, position, ID..."
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
                onAcceptOffer={(c) => { setAcceptCandidate(c); setActionRemarks(''); }}
                onConfirmHire={(c) => { setConfirmCandidate(c); setActionRemarks(''); }}
                onResendOffer={(c) => { setResendCandidate(c); }}
                searchQuery={searchQuery}
                onClearSearch={() => { setSearchQuery(''); setStatusFilter('all'); }}
            />

            {/* ── Modal: Record Offer Acceptance ──────────── */}
            {acceptCandidate && createPortal(
                <div 
                    className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
                    onClick={() => setAcceptCandidate(null)}
                >
                    <div 
                        className="bg-white rounded-2xl max-w-md w-full border border-slate-200/90 shadow-2xl overflow-hidden p-6 space-y-4 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                                    <CheckCircle2 size={20} />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-slate-900">Record Offer Acceptance</h3>
                                    <p className="text-xs text-slate-500 mt-0.5">Candidate agreed to offer terms</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setAcceptCandidate(null)} 
                                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80 space-y-1.5">
                            <div className="flex justify-between text-xs">
                                <span className="text-slate-500">Candidate:</span>
                                <span className="font-bold text-slate-800">{acceptCandidate.name}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-slate-500">Role:</span>
                                <span className="font-medium text-slate-700">{acceptCandidate.position}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-slate-500">Department:</span>
                                <span className="font-medium text-slate-700">{acceptCandidate.department_name || acceptCandidate.department}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-slate-500">Recorded Date:</span>
                                <span className="font-semibold text-indigo-700">{new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                            </div>
                        </div>

                        <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-amber-800 text-xs space-y-1">
                            <p className="font-bold">Next Stage: Awaiting HR Confirmation</p>
                            <p className="text-[11px] text-amber-700 leading-relaxed">
                                The candidate will transition to <strong>Offer Accepted</strong>. Login credentials and account access will <strong>NOT</strong> be generated or dispatched until final HR confirmation.
                            </p>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Acceptance Notes / Remarks (Optional)
                            </label>
                            <input 
                                type="text"
                                placeholder="e.g. Signed offer letter received via email"
                                value={actionRemarks}
                                onChange={(e) => setActionRemarks(e.target.value)}
                                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-blue-500"
                            />
                        </div>

                        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                            <button
                                onClick={() => setAcceptCandidate(null)}
                                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAcceptOfferSubmit}
                                disabled={actionLoading}
                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-all shadow-xs disabled:opacity-50"
                            >
                                {actionLoading ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                                Record Acceptance
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* ── Modal: Confirm Hire & Send Credentials ────── */}
            {confirmCandidate && createPortal(
                <div 
                    className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
                    onClick={() => setConfirmCandidate(null)}
                >
                    <div 
                        className="bg-white rounded-2xl max-w-lg w-full border border-slate-200/90 shadow-2xl overflow-hidden p-6 space-y-4 animate-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                                    <Sparkles size={20} />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-slate-900">Confirm Hire & Send Credentials</h3>
                                    <p className="text-xs text-slate-500 mt-0.5">Activate employee and send welcome credentials email</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setConfirmCandidate(null)} 
                                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Candidate Summary Card */}
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 space-y-2 text-xs">
                            <div className="flex justify-between items-center">
                                <span className="text-slate-500">Employee Name:</span>
                                <span className="font-bold text-slate-900 text-sm">{confirmCandidate.name}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-500">Designation & Dept:</span>
                                <span className="font-semibold text-slate-800">
                                    {confirmCandidate.position} &bull; {confirmCandidate.department_name || confirmCandidate.department}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-500">Work Email (Login ID):</span>
                                <span className="font-mono text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                                    {confirmCandidate.email}
                                </span>
                            </div>
                            {(confirmCandidate.personal_email || confirmCandidate.personalEmail) && (
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-500">Personal Email (Recipient):</span>
                                    <span className="font-medium text-slate-800">
                                        {confirmCandidate.personal_email || confirmCandidate.personalEmail}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* What happens next box */}
                        <div className="p-3.5 bg-gradient-to-r from-emerald-50/80 to-teal-50/80 border border-emerald-200 rounded-xl text-emerald-900 text-xs space-y-2">
                            <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                                <CheckCircle2 size={14} className="text-emerald-600" />
                                What happens upon confirmation:
                            </div>
                            <ul className="list-disc list-inside space-y-1 text-[11px] text-emerald-700 leading-relaxed">
                                <li><strong>User Account Activation:</strong> Account is set to active and granted portal login rights.</li>
                                <li><strong>Welcome Email with Credentials:</strong> A secure temporary password is created and sent to the candidate along with their username and portal login link.</li>
                                <li><strong>Workforce Roster:</strong> Candidate officially transitions to <strong>Active</strong> status and counts in company headcount.</li>
                            </ul>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Onboarding Notes / HR Remarks (Optional)
                            </label>
                            <input 
                                type="text"
                                placeholder="e.g. Orientation set for Monday 10:00 AM IST"
                                value={actionRemarks}
                                onChange={(e) => setActionRemarks(e.target.value)}
                                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-emerald-500"
                            />
                        </div>

                        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                            <button
                                onClick={() => setConfirmCandidate(null)}
                                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmHireSubmit}
                                disabled={actionLoading}
                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-all shadow-sm shadow-emerald-600/20 active:scale-95 disabled:opacity-50"
                            >
                                {actionLoading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                                Confirm Hire & Dispatch Credentials
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* ── Modal: Resend Offer Letter ────────────────── */}
            {resendCandidate && createPortal(
                <div 
                    className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
                    onClick={() => setResendCandidate(null)}
                >
                    <div 
                        className="bg-white rounded-2xl max-w-sm w-full border border-slate-200/90 shadow-2xl overflow-hidden p-6 space-y-4 animate-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                                <Send size={18} />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-slate-900">Resend Offer Letter</h3>
                                <p className="text-xs text-slate-500">Email official offer letter PDF</p>
                            </div>
                        </div>

                        <p className="text-xs text-slate-600 leading-relaxed">
                            Resend the formal offer letter package to <strong>{resendCandidate.name}</strong> at:
                            <span className="block font-semibold text-slate-800 mt-1">
                                {resendCandidate.personal_email || resendCandidate.email}
                            </span>
                        </p>

                        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                            <button
                                onClick={() => setResendCandidate(null)}
                                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleResendOfferSubmit}
                                disabled={actionLoading}
                                className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-all shadow-xs disabled:opacity-50"
                            >
                                {actionLoading ? <Loader2 size={13} className="animate-spin" /> : <Send size={12} />}
                                Send Offer Letter
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

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
