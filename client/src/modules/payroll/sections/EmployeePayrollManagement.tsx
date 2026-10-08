import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus } from 'lucide-react';
import api from '../../../services/api';

// Components
import SalaryStructureModal from '../components/SalaryStructureModal';
import CreateProfileModal from '../components/CreateProfileModal';
import SyncProtocolModal from '../components/SyncProtocolModal';
import PayrollPersonnelStats from '../components/PayrollPersonnelStats';
import PayrollPersonnelTable from '../components/PayrollPersonnelTable';

// --- Types ---
export interface PayrollProfile {
    id: string;
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

const formatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
});

const maskAccount = (acc: string) => {
    if (!acc || acc === 'Not Linked') return 'Not Linked';
    return `•••• ${acc.slice(-4)}`;
};

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
            const employeeData = Array.isArray(data) ? data : (data.items || []);
            
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
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchEmployees(); }, []);

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

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <PayrollPersonnelStats stats={stats} formatter={formatter} />

            {/* ── Control Bar ─────────────────────────── */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-3 shadow-xs flex flex-col lg:flex-row items-center gap-3">
                <div className="relative flex-1 w-full lg:w-auto">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                    <input 
                        type="text" 
                        placeholder="Search by employee name or ID..."
                        className="w-full bg-slate-50 border border-slate-200/80 rounded-lg pl-10 pr-4 py-2 text-xs font-medium text-slate-900 focus:bg-white focus:border-blue-500 outline-none transition-all placeholder:text-slate-400"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                
                <div className="flex items-center gap-1 p-1 bg-slate-100/80 rounded-lg border border-slate-200/60 w-full lg:w-auto overflow-x-auto no-scrollbar">
                    {[
                        { id: 'all', label: 'All Employees' },
                        { id: 'active', label: 'Configured' },
                        { id: 'missing', label: 'Pending Setup' },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setFilterStatus(tab.id as any)}
                            className={`flex-1 lg:flex-none px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${
                                filterStatus === tab.id 
                                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80' 
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <button 
                    onClick={() => setShowAddModal(true)}
                    className="w-full lg:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-all flex items-center justify-center gap-1.5 shadow-xs"
                >
                    <Plus size={14} />
                    Add Salary Profile
                </button>
            </div>

            <PayrollPersonnelTable 
                loading={loading}
                error={error}
                profiles={filteredProfiles}
                formatter={formatter}
                maskAccount={maskAccount}
                onOpenSettings={(p) => { setSelectedEmployee(p); setShowSettingsModal(true); }}
                onCreateProfile={(p) => { setCreateProfileEmployee(p); setShowCreateProfileModal(true); }}
                onRetry={fetchEmployees}
            />

            {/* --- Modals --- */}
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
                <SyncProtocolModal 
                    onClose={() => setShowAddModal(false)}
                />
            )}
        </div>
    );
};

export default EmployeePayrollManagement;
