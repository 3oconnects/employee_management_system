import React, { useState, useEffect, useMemo } from 'react';
import { 
    Search, 
    Plus, 
    Settings, 
    User, 
    IndianRupee, 
    Briefcase, 
    Building2,
    CheckCircle2,
    AlertTriangle,
    Loader2,
    ChevronRight,
    Filter,
    ArrowUpRight,
    ArrowDownRight,
    Users,
    Mail,
    Phone,
    Download,
    X,
    FileText,
    PieChart,
    Wallet
} from 'lucide-react';
import api from '../../../services/api';

// --- Types & Interfaces ---
interface PayrollProfile {
    id: string; // The employee_id or DB PK
    name: string;
    email: string;
    department: string;
    role: string;
    status: 'active' | 'onboarding' | 'terminated';
    hasProfile: boolean;
    annualCTC: number;
    monthlyGross: number;
    netSalary: number;
    taxRegime: 'Old' | 'New';
    bankAccount: string;
    lastProcessed?: string;
    [key: string]: any;
}

// --- Status Config ---
const STATUS_META = {
    active:     { label: 'Active',      bg: 'bg-emerald-50',    text: 'text-emerald-600',   dot: 'bg-emerald-500' },
    onboarding: { label: 'Onboarding',  bg: 'bg-amber-50',      text: 'text-amber-600',     dot: 'bg-amber-500' },
    terminated: { label: 'Terminated',  bg: 'bg-rose-50',       text: 'text-rose-600',      dot: 'bg-rose-500' },
};

const formatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
});

const maskAccount = (acc: string) => {
    if (!acc || acc === 'Not Linked') return 'Not Linked';
    return `•••• ${acc.slice(-4)}`;
};

// --- Main Component ---
const EmployeePayrollManagement = () => {
    const [profiles, setProfiles] = useState<PayrollProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'missing'>('all');
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showCreateProfileModal, setShowCreateProfileModal] = useState(false);
    const [createProfileEmployee, setCreateProfileEmployee] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    const fetchEmployees = async () => {
        setLoading(true);
        setError(null);
        try {
            const { data } = await api.get('/payroll/employees');
            // Ensure data is an array
            const employeeData = Array.isArray(data) ? data : (data.items || []);
            
            // Map raw data to our clean interface
            const mappedProfiles: PayrollProfile[] = employeeData.map((emp: any) => ({
                id: emp.id || emp.employee_id,
                name: emp.name || 'Anonymous',
                email: emp.email || '',
                department: emp.department || 'General',
                role: emp.role || 'Member',
                status: emp.status || 'active',
                hasProfile: emp.hasProfile || false,
                annualCTC: isNaN(Number(emp.annual_ctc || emp.annualCTC)) ? 0 : Number(emp.annual_ctc || emp.annualCTC || 0),
                monthlyGross: (Number(emp.annual_ctc || emp.annualCTC || 0) / 12) || 0,
                netSalary: Number(emp.net_salary || 0) || 0,
                taxRegime: emp.tax_regime || emp.taxRegime || 'New',
                bankAccount: emp.bank_account_number || emp.bank_account || '',
                lastProcessed: emp.last_processed || ''

            }));

            
            setProfiles(mappedProfiles);
        } catch (err: any) {
            setError('Failed to fetch payroll data. Authentication error or service downtime.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEmployees();
    }, []);

    const filteredProfiles = useMemo(() => {
        return profiles.filter(p => {
            const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                p.id.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = filterStatus === 'all' || 
                                 (filterStatus === 'active' && p.hasProfile) || 
                                 (filterStatus === 'missing' && !p.hasProfile);
            return matchesSearch && matchesStatus;
        });
    }, [profiles, searchTerm, filterStatus]);

    const stats = useMemo(() => ({
        total: profiles.length,
        active: profiles.filter(p => p.hasProfile).length,
        missing: profiles.filter(p => !p.hasProfile).length,
        totalCTC: profiles.reduce((sum, p) => sum + (Number(p.annualCTC) || 0), 0)

    }), [profiles]);

    const handleOpenSettings = (employee: any) => {
        setSelectedEmployee(employee);
        setShowSettingsModal(true);
    };

    return (
        <div className="p-6 space-y-6 page-enter">
            
            {/* ── Page Header ──────────────────────────────── */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100">
                        <Wallet size={20} className="text-white" />
                    </div>
                    <div>
                        <h2 className="text-[17px] font-black text-gray-900 tracking-tight uppercase">Salary Matrix</h2>
                        <p className="text-[11.5px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
                            Unified Employee Compensation Management
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                    <button 
                        onClick={() => setShowAddModal(true)}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-[12px] font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-95"
                    >
                        <Plus size={14} />
                        Add Profile
                    </button>
                </div>
            </div>

            {/* ── Stats Strip ─────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total Enrolled', val: stats.total, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { label: 'Configured Profiles', val: stats.active, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { label: 'Pending Setup', val: stats.missing, icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50' },
                    { label: 'Annual Liability', val: formatter.format(stats.totalCTC), icon: PieChart, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                ].map(s => (
                    <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{s.label}</p>
                            <div className={`w-8 h-8 ${s.bg} rounded-lg flex items-center justify-center`}>
                                <s.icon size={15} className={s.color} />
                            </div>
                        </div>
                        <p className={`text-[20px] font-black ${s.color} tracking-tight leading-none`}>{s.val}</p>
                    </div>
                ))}
            </div>

            {/* ── Filters & Search ────────────────────────── */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex flex-col md:flex-row items-center gap-4">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input 
                        type="text" 
                        placeholder="Search by name or employee ID..."
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-10 pr-4 py-2.5 text-[13px] font-semibold text-gray-900 focus:bg-white focus:border-indigo-400 outline-none transition-all"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2 p-1 bg-gray-50 rounded-xl border border-gray-100">
                    {[
                        { id: 'all', label: 'All' },
                        { id: 'active', label: 'Active' },
                        { id: 'missing', label: 'Missing Profile' },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setFilterStatus(tab.id as any)}
                            className={`px-4 py-2 text-[11px] font-black uppercase tracking-wider rounded-lg transition-all ${filterStatus === tab.id ? 'bg-white text-indigo-600 shadow-sm border border-gray-100' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Table Area ─────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden min-h-[400px]">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-32 gap-4">
                        <Loader2 size={32} className="text-indigo-600 animate-spin" />
                        <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Decrypting Financial Data...</p>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center py-32 text-center gap-4">
                        <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center shadow-inner"><AlertTriangle size={32} /></div>
                        <div>
                            <p className="text-[14px] font-bold text-gray-900 uppercase">System Error</p>
                            <p className="text-[12px] text-gray-400 mt-1 max-w-xs px-10">{error}</p>
                        </div>
                        <button onClick={fetchEmployees} className="px-6 py-2 bg-rose-600 text-white rounded-xl text-[11px] font-bold uppercase transition-all active:scale-95">Retry Sync</button>
                    </div>
                ) : filteredProfiles.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-32 text-center gap-4">
                        <div className="w-16 h-16 bg-gray-50 text-gray-300 rounded-full flex items-center justify-center border border-gray-100"><Users size={32} /></div>
                        <div>
                            <p className="text-[14px] font-bold text-gray-800 uppercase tracking-tight">Vault Empty</p>
                            <p className="text-[12px] text-gray-400 mt-1">No employees matching your filters were found.</p>
                        </div>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-gray-50/50 text-[10.5px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                                    <th className="px-6 py-4">Employee Identity</th>
                                    <th className="px-6 py-4">Compensation Structure</th>
                                    <th className="px-6 py-4">Financial Metadata</th>
                                    <th className="px-6 py-4">Regime</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredProfiles.map(p => (
                                    <tr key={p.id} className="hover:bg-indigo-50/20 transition-all group">
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-11 h-11 bg-white border-2 rounded-xl flex items-center justify-center text-[15px] font-black transition-all ${!p.hasProfile ? 'border-amber-100 text-amber-500' : 'border-gray-100 text-gray-800 group-hover:border-indigo-200'}`}>
                                                    {p.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-[13.5px] font-black text-gray-900 uppercase tracking-tight">{p.name}</p>
                                                        {!p.hasProfile && (
                                                            <span className="px-2 py-0.5 bg-amber-50 text-amber-600 border border-amber-100 rounded text-[8px] font-black uppercase tracking-widest">Setup Needed</span>
                                                        )}
                                                    </div>
                                                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{p.id} • {p.department}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-1.5">
                                                    <p className="text-[14px] font-black text-gray-900">{formatter.format(p.annualCTC)}</p>
                                                    <span className="text-[10px] text-gray-400 font-bold uppercase">p.a.</span>
                                                </div>
                                                <p className="text-[11.5px] font-black text-indigo-600 tracking-tight">
                                                    {p.hasProfile ? `${formatter.format(p.netSalary)} Monthly Net` : '₹0.00 (Locked)'}
                                                </p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-2 text-gray-500">
                                                <div className="p-1.5 bg-gray-50 rounded-lg group-hover:bg-white group-hover:shadow-sm transition-all border border-gray-100">
                                                    <IndianRupee size={12} />
                                                </div>
                                                <span className="text-[12px] font-bold tracking-tight">{maskAccount(p.bankAccount)}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className={`px-3 py-1 rounded-lg text-[9.5px] font-black uppercase tracking-wider border ${p.taxRegime === 'New' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                                                {p.taxRegime} Regime
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            <button 
                                                onClick={() => p.hasProfile ? handleOpenSettings(p) : (setCreateProfileEmployee(p), setShowCreateProfileModal(true))}
                                                className={`p-2.5 rounded-xl transition-all shadow-sm ${p.hasProfile ? 'bg-white border border-gray-100 text-gray-400 hover:text-indigo-600 hover:border-indigo-100' : 'bg-amber-50 border border-amber-100 text-amber-600 hover:bg-amber-100'} active:scale-90`}
                                            >
                                                <Settings size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* --- Modals Handlers --- */}
            {/* Logic for SalaryStructureModal (Internal component from previous file) */}
            {showSettingsModal && (
                <SalaryStructureModal 
                    employee={selectedEmployee} 
                    onClose={() => setShowSettingsModal(false)} 
                    onSuccess={fetchEmployees}
                />
            )}
            
            {showCreateProfileModal && createProfileEmployee && (
                <CreateProfileModal 
                    employee={createProfileEmployee} 
                    onClose={() => { setShowCreateProfileModal(false); setCreateProfileEmployee(null); }}
                    onSuccess={fetchEmployees}
                />
            )}
            
            {showAddModal && (
                <AddEmployeeModal 
                    onClose={() => setShowAddModal(false)}
                    onSuccess={fetchEmployees}
                />
            )}
        </div>
    );
};

// --- Sub-Components (Extracted for better structure) ---

const SalaryStructureModal = ({ employee, onClose, onSuccess }: any) => {
    // We'll reimplement the core logic but with better UI
    // I specify the fields we need based on the original file
    const [ctc, setCtc] = useState(employee.annualCTC);
    const [regime, setRegime] = useState(employee.taxRegime);
    const [saving, setSaving] = useState(false);

    const handleUpdate = async () => {
        setSaving(true);
        try {
            await api.put(`/payroll/employees/${employee.id}`, {
                annualCTC: ctc,
                taxRegime: regime
            });
            onSuccess();
            onClose();
        } catch (err) {
            alert('Update failed');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8">
                <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between">
                    <div>
                        <h3 className="text-[17px] font-black text-gray-900 uppercase tracking-tight">Modify Compensaton</h3>
                        <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">{employee.name} — {employee.id}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-all"><X size={20}/></button>
                </div>
                
                <div className="p-8 space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Annual CTC (INR)</label>
                        <div className="relative">
                            <IndianRupee size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input 
                                type="number" 
                                className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 pl-12 text-sm font-black text-gray-900 focus:bg-white focus:border-indigo-400 outline-none transition-all"
                                value={ctc}
                                onChange={e => setCtc(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Tax Regime Selection</label>
                        <div className="grid grid-cols-2 gap-3">
                            {['Old', 'New'].map(r => (
                                <button
                                    key={r}
                                    onClick={() => setRegime(r)}
                                    className={`px-6 py-4 rounded-2xl text-[12px] font-black uppercase tracking-widest border transition-all ${regime === r ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100' : 'bg-gray-50 text-gray-400 border-gray-100 hover:bg-white hover:border-gray-200'}`}
                                >
                                    {r} Regime
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex gap-3">
                        <AlertTriangle size={20} className="text-amber-500 shrink-0" />
                        <p className="text-[11.5px] text-amber-700 font-medium leading-relaxed">Adjusting CTC will recalibrate all earning and deduction components automatically for the next payrun.</p>
                    </div>
                </div>

                <div className="px-8 py-6 bg-gray-50 border-t border-gray-100 flex gap-3">
                    <button onClick={onClose} className="flex-1 px-6 py-3 bg-white border border-gray-200 text-gray-500 rounded-xl text-[12px] font-bold uppercase tracking-widest active:scale-95 transition-all">Cancel</button>
                    <button onClick={handleUpdate} disabled={saving} className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-xl text-[12px] font-bold uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-2">
                        {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                        Update Profile
                    </button>
                </div>
            </div>
        </div>
    );
};

// Simplified placeholders for other modals to keep the code manageable but functional
const CreateProfileModal = ({ employee, onClose, onSuccess }: any) => {
    const [ctc, setCtc] = useState('');
    const [saving, setSaving] = useState(false);

    const handleCreate = async () => {
        if(!ctc) return;
        setSaving(true);
        try {
            await api.post('/payroll/profiles', {
                employee_id: employee.id,
                annualCTC: Number(ctc),
                taxRegime: 'New'
            });
            onSuccess();
            onClose();
        } catch (err) {
            alert('Creation failed');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8">
                <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between">
                    <div>
                        <h3 className="text-[17px] font-black text-gray-900 uppercase tracking-tight">Setup Payroll Profile</h3>
                        <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">{employee.name}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-all"><X size={20}/></button>
                </div>
                <div className="p-8 space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Initial Annual CTC</label>
                        <input 
                            type="number" 
                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 text-sm font-black text-gray-900 outline-none focus:bg-white transition-all"
                            placeholder="e.g. 600000"
                            value={ctc}
                            onChange={e => setCtc(e.target.value)}
                        />
                    </div>
                    <button onClick={handleCreate} disabled={saving} className="w-full px-6 py-4 bg-indigo-600 text-white rounded-2xl text-[12px] font-black uppercase tracking-widest flex items-center justify-center gap-2">
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                        Initialize Profile
                    </button>
                </div>
            </div>
        </div>
    );
};

const AddEmployeeModal = ({ onClose, onSuccess }: any) => {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl p-20 text-center animate-in slide-in-from-bottom-8">
                <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6"><Users size={40}/></div>
                <h3 className="text-[18px] font-black text-gray-900 uppercase tracking-tight">Bulk Synchronization</h3>
                <p className="text-[13px] text-gray-400 mt-2">To add new payroll profiles, please first ensure the employee is enrolled in the core <span className="text-gray-900 font-bold">Employee Directory</span>. All enrolled members will automatically appear in this matrix for financial setup.</p>
                <button onClick={onClose} className="mt-8 px-10 py-3 bg-gray-900 text-white rounded-xl text-[11px] font-black uppercase tracking-widest active:scale-95 transition-all">Understood</button>
            </div>
        </div>
    );
};

export default EmployeePayrollManagement;
