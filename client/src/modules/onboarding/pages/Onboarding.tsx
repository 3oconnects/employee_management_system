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
    Upload
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
    
    const emptyForm: AddEmployeeForm = {
        name: '', email: '', phone: '', dateOfBirth: '',
        gender: '', personalEmail: '',
        department: '', position: '', joinDate: new Date().toISOString().split('T')[0],
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
            setError(err.response?.data?.message || 'Transaction failed');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 space-y-8 page-enter max-w-[1600px] mx-auto">
            
            {/* ── Page Header ──────────────────────────────── */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
                        <Shield size={20} className="text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-[#0F172A] tracking-tight">Onboarding Terminal</h2>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-0.5">
                            Talent Pipeline & Verification
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
                        Ingest Candidate
                    </button>
                </div>
            </div>

            {/* ── Operational KPIs ────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                    { label: 'Active Funnel', val: candidates.length, icon: Activity, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                    { label: 'Pending Audit', val: candidates.filter(c => c.status === 'onboarding').length, icon: Shield, color: 'text-amber-600', bg: 'bg-amber-50' },
                    { label: 'Authorized', val: candidates.filter(c => c.status === 'active').length, icon: Zap, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { label: 'Temporal Inflow', val: '12%', icon: RefreshCw, color: 'text-slate-600', bg: 'bg-slate-50', isPrc: true }
                ].map((s, i) => (
                    <div key={i} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between group hover:border-indigo-200 transition-all">
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{s.label}</p>
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

            {/* ── Toolbar ─────────────────────────────────── */}
            <div className="flex items-center justify-between bg-slate-50/50 p-1.5 rounded-xl border border-slate-100">
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg cursor-pointer hover:border-indigo-600 transition-all shadow-sm group">
                        <span className="text-[11px] font-black text-slate-700 uppercase tracking-widest">Active Funnel</span>
                        <ChevronDown size={14} className="text-slate-400 group-hover:text-indigo-600 transition-transform group-hover:rotate-180" />
                    </div>
                </div>

                <div className="flex items-center gap-1.5 px-1">
                    <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-all"><Maximize2 size={16} /></button>
                    <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-all"><Filter size={16} /></button>
                </div>
            </div>

            {/* ── Candidate Matrix ────────────────────────── */}
            <CandidateTable candidates={candidates} loading={loadingData} onEdit={handleEdit} />

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

