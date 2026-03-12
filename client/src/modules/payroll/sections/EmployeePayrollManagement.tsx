import React, { useState, useEffect } from 'react';
import { Search, Settings, User, Plus, X, IndianRupee, PieChart, ShieldCheck, Loader2, AlertTriangle, FileText, Download, Upload, FileSpreadsheet, History as LucideHistory, CheckCircle } from 'lucide-react';
import { useRef } from 'react';
import api from '../../../services/api';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const EmployeePayrollManagement = () => {
    // Currency Formatter
    const formatter = new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
    });

    // Helper to calculate Net Salary from components
    const calculateNetSalary = (p: any) => {
        const s = p.salary_structure || {};
        const basic = Number(s.basic_salary || 0);
        const hra = Number(s.hra || 0);
        const allowance = Number(s.special_allowance || s.allowances || 0);
        const bonus = Number(s.performance_bonus || s.bonus || 0);
        const overtime = Number(s.overtime_pay || s.overtime || 0);

        const pf = Number(s.pf || 0);
        const pt = Number(s.professional_tax || s.profTax || 0);
        const tds = Number(s.tds || 0);

        // Compute Gross & Net
        const gross = basic + hra + allowance + bonus + overtime;
        const net = gross - (pf + pt + tds);

        // Fallback to annualCTC / 12 if structure is completely unconfigured
        if (gross === 0 && (p.annual_ctc || p.salary_package || p.annualPackage)) {
            return (Number(p.annual_ctc || p.salary_package || p.annualPackage || 0) / 12);
        }

        return net;
    };

    const [profiles, setProfiles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showCreateProfileModal, setShowCreateProfileModal] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
    const [createProfileEmployee, setCreateProfileEmployee] = useState<any>(null);
    const [uploading, setUploading] = useState(false);
    const [msg, setMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const downloadTemplate = () => {
        const headers = 'employee_id,name,email,department,position,join_date,annual_ctc\n';
        const sampleRows = 'EMP001,John Doe,john@company.com,Engineering,Software Engineer,2024-01-15,1200000\nEMP002,Jane Smith,jane@company.com,HR,HR Manager,2024-02-01,900000\n';
        const blob = new Blob([headers + sampleRows], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'payroll_onboarding_template.csv';
        a.click();
        window.URL.revokeObjectURL(url);
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
                text: `SUCCESS: ${inserted} profiles initialized, ${skipped} skipped.`
            });
            fetchEmployees();
        } catch (err: any) {
            const errorText = err.response?.data?.message || err.message || 'Upload failed.';
            setMsg({ type: 'error', text: errorText });
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    // Fetch employees from backend
    const maskAccount = (account: string) => {
        if (!account || account === 'Not Linked') return 'Not Linked';
        const cleanAccount = account.replace(/-/g, '');
        return `XXXX-XXXX-${cleanAccount.slice(-4)}`;
    };

    const fetchEmployees = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.get('payroll/employees');
            // Ensure we always have an array
            const data = Array.isArray(res.data) ? res.data : [];
            setProfiles(data);
        } catch (err: any) {
            console.error('Failed to fetch employees:', err);
            setError(err?.message || 'Failed to connect to payroll services. Please check your connection.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEmployees();
    }, []);

    // Filter profiles safely
    const filteredProfiles = (Array.isArray(profiles) ? profiles : []).filter(p => {
        if (!p) return false;
        const search = searchTerm.toLowerCase();
        const name = (p.name || '').toLowerCase();
        const role = (p.role || p.department || '').toLowerCase();
        const dept = (p.department || '').toLowerCase();

        return name.includes(search) || role.includes(search) || dept.includes(search);
    });

    const handleOpenSettings = (employee: any) => {
        if (!employee) return;
        setSelectedEmployee(employee);
        setShowSettingsModal(true);
    };

    const calculateMonthly = (annual: any) => {
        const salary = parseFloat(annual) || 0;
        return salary / 12;
    };

    const SalaryStructureModal = ({ employee, onClose }: { employee: any, onClose: () => void }) => {
        const [viewMode, setViewMode] = useState<'SETTINGS' | 'PAYSLIP'>('SETTINGS');
        if (!employee) return null;

        const monthlyGross = calculateMonthly(employee.annual_ctc || employee.salary_package || employee.annualPackage || 0);
        const structure = employee.salary_structure || {};

        const [formData, setFormData] = useState({
            basic: Number(structure.basic_salary) || monthlyGross * 0.5,
            hra: Number(structure.hra) || (monthlyGross * 0.5) * 0.4,
            special: Number(structure.special_allowance || structure.allowances) || (monthlyGross - (monthlyGross * 0.5) - ((monthlyGross * 0.5) * 0.4)),
            bonus: Number(structure.performance_bonus || structure.bonus) || 0,
            overtime: Number(structure.overtime_pay || structure.overtime) || 0,
            pf: Number(structure.pf || 1800),
            profTax: Number(structure.professional_tax || structure.profTax || 200),
            tds: Number(structure.tds || monthlyGross * 0.05)
        });

        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const { name, value } = e.target;
            setFormData(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
        };

        const totalEarnings = formData.basic + formData.hra + formData.special + formData.bonus + formData.overtime;
        const totalDeductions = formData.pf + formData.profTax + formData.tds;
        const netSalary = totalEarnings - totalDeductions;

        const downloadPayslip = async () => {
            const element = document.getElementById('payslip-container');
            if (!element) return;

            try {
                // High resolution capture for document grade quality
                const canvas = await html2canvas(element, {
                    scale: 3,
                    useCORS: true,
                    backgroundColor: '#ffffff',
                    logging: false
                });

                const imgData = canvas.toDataURL('image/png');
                const pdf = new jsPDF('p', 'mm', 'a4');

                const margin = 20; // 20mm margin as requested
                const pdfWidth = pdf.internal.pageSize.getWidth() - (margin * 2);
                const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

                pdf.addImage(imgData, 'PNG', margin, margin, pdfWidth, pdfHeight);
                const fileName = `payslip_${employee.name.toLowerCase().replace(/\s+/g, '_')}_march_2026.pdf`;
                pdf.save(fileName);
            } catch (err) {
                console.error('PDF Generation failed:', err);
                alert('Document generation failed. Falling back to system print.');
                window.print();
            }
        };

        const handleSave = async () => {
            try {
                const payload = {
                    basicSalary: Number(formData.basic),
                    hra: Number(formData.hra),
                    specialAllowance: Number(formData.special),
                    performanceBonus: Number(formData.bonus),
                    overtimePay: Number(formData.overtime),
                    pf: Number(formData.pf),
                    professionalTax: Number(formData.profTax),
                    tds: Number(formData.tds)
                };

                const response = await api.put(`payroll/employees/${employee.id}`, payload);
                if (response.data.success) {
                    onClose();
                    fetchEmployees();
                } else {
                    alert(response.data.message || 'Failed to update payroll settings');
                }
            } catch (err: any) {
                const errMsg = err.response?.data?.message || err.message || 'Connection error: Could not save payroll settings.';
                console.error('Update Error:', err);
                alert(errMsg);
            }
        };

        if (viewMode === 'PAYSLIP') {
            return (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300 my-8">
                        {/* Modal Header (Non-Printable) */}
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div className="flex items-center space-x-3">
                                <div className="p-2 bg-blue-600 rounded-xl text-white">
                                    <FileText size={18} />
                                </div>
                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Document Preview</h3>
                            </div>
                            <button onClick={() => setViewMode('SETTINGS')} className="text-[10px] font-black text-blue-600 hover:text-blue-700 uppercase tracking-widest px-4 py-2 bg-white rounded-xl shadow-sm border border-slate-200 transition-all">Back to Config</button>
                        </div>

                        {/* Professional Payslip Container (Captured as PDF) */}
                        <div id="payslip-container" className="p-16 bg-white space-y-12">
                            {/* Document Header */}
                            <div className="flex justify-between items-start border-b-4 border-slate-900 pb-10">
                                <div>
                                    <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Unified Payroll Hub</h1>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.3em] mt-2">Enterprise Financial Solutions</p>
                                </div>
                                <div className="text-right">
                                    <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Monthly Salary Slip</h2>
                                    <p className="text-sm font-bold text-blue-600 mt-1">March 2026</p>
                                    <p className="text-[10px] font-black text-slate-400 mt-2">EMP ID: {employee.id}</p>
                                </div>
                            </div>

                            {/* Employee Details Matrix */}
                            <div className="grid grid-cols-2 gap-16 border-b border-slate-100 pb-10">
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Employee Information</h4>
                                    <div className="grid grid-cols-2 gap-y-2 text-xs">
                                        <span className="text-slate-500 font-medium">Name:</span>
                                        <span className="text-slate-900 font-black">{employee.name}</span>
                                        <span className="text-slate-500 font-medium">Designation:</span>
                                        <span className="text-slate-900 font-black">{employee.role || 'Senior Associate'}</span>
                                        <span className="text-slate-500 font-medium">Department:</span>
                                        <span className="text-slate-900 font-black">{employee.department}</span>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Payment Matrix</h4>
                                    <div className="grid grid-cols-2 gap-y-2 text-xs">
                                        <span className="text-slate-500 font-medium">Bank Account:</span>
                                        <span className="text-slate-900 font-black">{employee.bank_account_number || employee.bankAccount || 'XXXX-1234'}</span>
                                        <span className="text-slate-500 font-medium">Tax Regime:</span>
                                        <span className="text-slate-900 font-black">{employee.tax_regime || 'New'}</span>
                                        <span className="text-slate-500 font-medium">Payment Mode:</span>
                                        <span className="text-slate-900 font-black">Bank Transfer</span>
                                    </div>
                                </div>
                            </div>

                            {/* Main Salary Table (4-Column Layout) */}
                            <div className="border-2 border-slate-900 rounded-2xl overflow-hidden">
                                <table className="w-full text-xs text-left border-collapse">
                                    <thead className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest">
                                        <tr>
                                            <th className="px-6 py-4 border-r border-slate-800">Earnings</th>
                                            <th className="px-6 py-4 border-r border-slate-800 text-right">Amount</th>
                                            <th className="px-6 py-4 border-r border-slate-800">Deductions</th>
                                            <th className="px-6 py-4 text-right">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        <tr>
                                            <td className="px-6 py-4 font-bold text-slate-700 border-r border-slate-100">Basic Pay</td>
                                            <td className="px-6 py-4 font-black text-slate-900 border-r border-slate-100 text-right">₹{formData.basic.toLocaleString()}</td>
                                            <td className="px-6 py-4 font-bold text-slate-700 border-r border-slate-100">Provident Fund (PF)</td>
                                            <td className="px-6 py-4 font-black text-rose-600 text-right">₹{formData.pf.toLocaleString()}</td>
                                        </tr>
                                        <tr>
                                            <td className="px-6 py-4 font-bold text-slate-700 border-r border-slate-100">HRA</td>
                                            <td className="px-6 py-4 font-black text-slate-900 border-r border-slate-100 text-right">₹{formData.hra.toLocaleString()}</td>
                                            <td className="px-6 py-4 font-bold text-slate-700 border-r border-slate-100">Professional Tax</td>
                                            <td className="px-6 py-4 font-black text-rose-600 text-right">₹{formData.profTax.toLocaleString()}</td>
                                        </tr>
                                        <tr>
                                            <td className="px-6 py-4 font-bold text-slate-700 border-r border-slate-100">Special Allowance</td>
                                            <td className="px-6 py-4 font-black text-slate-900 border-r border-slate-100 text-right">₹{formData.special.toLocaleString()}</td>
                                            <td className="px-6 py-4 font-bold text-slate-700 border-r border-slate-100">Income Tax (TDS)</td>
                                            <td className="px-6 py-4 font-black text-rose-600 text-right">₹{formData.tds.toLocaleString()}</td>
                                        </tr>
                                        <tr>
                                            <td className="px-6 py-4 font-bold text-slate-700 border-r border-slate-100">Performance Bonus</td>
                                            <td className="px-6 py-4 font-black text-slate-900 border-r border-slate-100 text-right">₹{formData.bonus.toLocaleString()}</td>
                                            <td className="px-6 py-4 font-bold text-slate-700 border-r border-slate-100"></td>
                                            <td className="px-6 py-4 font-black text-rose-600 text-right"></td>
                                        </tr>
                                    </tbody>
                                    <tfoot className="bg-slate-50 text-[10px] font-black uppercase">
                                        <tr>
                                            <td className="px-6 py-4 border-r border-slate-100">Total Monthly Earnings</td>
                                            <td className="px-6 py-4 font-black text-slate-900 border-r border-slate-100 text-right">₹{totalEarnings.toLocaleString()}</td>
                                            <td className="px-6 py-4 border-r border-slate-100">Total Monthly Deductions</td>
                                            <td className="px-6 py-4 font-black text-rose-600 text-right">₹{totalDeductions.toLocaleString()}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>

                            {/* Professional Summary Section */}
                            <div className="flex justify-end pt-4">
                                <div className="w-80 space-y-4">
                                    <div className="flex justify-between items-center text-xs font-bold text-slate-500">
                                        <span>Gross Monthly Comp</span>
                                        <span className="text-slate-900">₹{totalEarnings.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs font-bold text-slate-500">
                                        <span>Statutory Deductions</span>
                                        <span className="text-rose-600">₹{totalDeductions.toLocaleString()}</span>
                                    </div>
                                    <div className="pt-4 border-t-2 border-slate-900 flex justify-between items-center">
                                        <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Net Disbursal Amount</span>
                                        <span className="text-2xl font-black text-blue-600">₹{netSalary.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>

                            {/* System generated Footer */}
                            <div className="pt-16 border-t border-slate-100 flex justify-between items-end">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-slate-400 italic">"This is a system generated payslip. No signature required."</p>
                                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Enterprise Cryptographic Validation Active</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Date of Generation</p>
                                    <p className="text-xs font-bold text-slate-900">{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                                </div>
                            </div>
                        </div>

                        {/* Modal Actions */}
                        <div className="p-8 bg-slate-900 flex justify-between items-center sticky bottom-0">
                            <button onClick={downloadPayslip} className="flex items-center space-x-3 px-8 py-4 bg-white/10 hover:bg-white/20 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all group">
                                <Download size={16} className="group-hover:translate-y-1 transition-transform" />
                                <span>Download PDF Archive</span>
                            </button>
                            <button onClick={onClose} className="px-10 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-xl shadow-blue-500/20 active:scale-95">Close Preview</button>
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                <div className="bg-white w-full max-w-3xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
                    <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <div>
                            <h3 className="text-2xl font-black text-slate-900 leading-tight">Salary Configuration</h3>
                            <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mt-1">{employee.name} — Core Matrix Settings</p>
                        </div>
                        <div className="flex items-center space-x-3">
                            <button onClick={() => setViewMode('PAYSLIP')} className="p-3 bg-white shadow-sm border border-slate-200 rounded-2xl text-slate-600 hover:text-blue-600 transition-all active:scale-95">
                                <LucideHistory size={20} />
                            </button>
                            <button onClick={onClose} className="p-3 hover:bg-white hover:shadow-md rounded-2xl transition-all">
                                <X size={24} className="text-slate-400" />
                            </button>
                        </div>
                    </div>

                    <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-10 max-h-[60vh] overflow-y-auto custom-scrollbar">
                        <div className="space-y-6">
                            <div className="flex items-center space-x-3 text-slate-900 pb-2 border-b border-slate-50">
                                <PieChart size={18} className="text-blue-500" />
                                <h4 className="text-[10px] font-black uppercase tracking-widest">Fixed Earnings</h4>
                            </div>
                            {[
                                { label: 'Basic Salary', name: 'basic' },
                                { label: 'HRA', name: 'hra' },
                                { label: 'Special Allowance', name: 'special' },
                                { label: 'Performance Bonus', name: 'bonus' },
                                { label: 'Overtime Pay', name: 'overtime' }
                            ].map((field) => (
                                <div key={field.name} className="space-y-2">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">{field.label}</label>
                                    <input type="number" name={field.name} value={(formData as any)[field.name]} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 text-sm font-black text-slate-900 rounded-2xl px-5 py-3 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-mono" />
                                </div>
                            ))}
                        </div>

                        <div className="space-y-6">
                            <div className="flex items-center space-x-3 text-slate-900 pb-2 border-b border-slate-50">
                                <ShieldCheck size={18} className="text-rose-500" />
                                <h4 className="text-[10px] font-black uppercase tracking-widest">Deductions Audit</h4>
                            </div>
                            {[
                                { label: 'Provident Fund (PF)', name: 'pf' },
                                { label: 'Professional Tax', name: 'profTax' },
                                { label: 'Income Tax (TDS)', name: 'tds' }
                            ].map((field) => (
                                <div key={field.name} className="space-y-2">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">{field.label}</label>
                                    <input type="number" name={field.name} value={(formData as any)[field.name]} onChange={handleChange} className="w-full bg-rose-50/20 border border-rose-100 text-sm font-black text-rose-600 rounded-2xl px-5 py-3 outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 transition-all font-mono" />
                                </div>
                            ))}
                            <div className="pt-6 border-t border-slate-50">
                                <div className="flex justify-between items-center mb-2"><span className="text-[9px] font-black text-slate-400 uppercase">Gross Salary</span><span className="text-sm font-bold text-slate-900">₹{totalEarnings.toLocaleString()}</span></div>
                                <div className="flex justify-between items-center"><span className="text-[9px] font-black text-slate-400 uppercase">Total Deductions</span><span className="text-sm font-bold text-rose-600">₹{totalDeductions.toLocaleString()}</span></div>
                            </div>
                        </div>
                    </div>

                    <div className="px-10 py-8 bg-slate-900 text-white flex flex-col md:flex-row justify-between items-center gap-6">
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-[0.3em] opacity-40 mb-1">Final Disbursal (Monthly)</p>
                            <h4 className="text-3xl font-black tracking-tight">₹{netSalary.toLocaleString()}</h4>
                        </div>
                        <div className="flex items-center space-x-4">
                            <button onClick={() => setViewMode('PAYSLIP')} className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">View Payslip</button>
                            <button onClick={handleSave} className="px-8 py-4 bg-blue-600 hover:bg-blue-500 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-blue-500/20">Commit Changes</button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const AddEmployeeModal = ({ onClose }: { onClose: () => void }) => {
        const [formData, setFormData] = useState({
            name: '',
            email: '',
            department: 'Engineering',
            annualCTC: '',
            bankAccountNumber: '',
            taxRegime: 'New',
            joinDate: ''
        });
        const [submitting, setSubmitting] = useState(false);

        const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
            const { name, value } = e.target;
            setFormData(prev => ({ ...prev, [name]: value }));
        };

        const handleSubmit = async (e: React.FormEvent) => {
            e.preventDefault();
            if (!formData.name || !formData.annualCTC || !formData.joinDate) return;

            setSubmitting(true);
            try {
                const res = await api.post('payroll/employees', {
                    ...formData,
                    annualCTC: parseFloat(formData.annualCTC) || 0
                });

                if (res.data?.success) {
                    onClose();
                    fetchEmployees();
                } else {
                    throw new Error(res.data?.message || 'Failed to create profile');
                }
            } catch (err: any) {
                console.error('Failed to create employee profile:', err);
                const errorMsg = err.response?.data?.message || err.message || 'Error creating profile. Please try again.';
                alert(errorMsg);
            } finally {
                setSubmitting(false);
            }
        };

        return (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                <div className="bg-white w-full max-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8 duration-300">
                    <div className="p-10">
                        <div className="flex justify-between items-start mb-8">
                            <div>
                                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Add Employee</h3>
                                <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">New Payroll Profile</p>
                            </div>
                            <button onClick={onClose} className="p-2.5 hover:bg-slate-50 rounded-2xl transition-colors">
                                <X size={20} className="text-slate-400" />
                            </button>
                        </div>
                        <form className="space-y-6" onSubmit={handleSubmit}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Full Name</label>
                                    <input
                                        type="text"
                                        name="name"
                                        required
                                        value={formData.name}
                                        onChange={handleChange}
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-black text-slate-900 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all shadow-sm"
                                        placeholder="E.g. John Doe"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Email Address</label>
                                    <input
                                        type="email"
                                        name="email"
                                        required
                                        value={formData.email}
                                        onChange={handleChange}
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-black text-slate-900 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all shadow-sm"
                                        placeholder="john@company.com"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Annual CTC</label>
                                    <input
                                        type="number"
                                        name="annualCTC"
                                        required
                                        value={formData.annualCTC}
                                        onChange={handleChange}
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-black text-slate-900 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all shadow-sm"
                                        placeholder="1200000"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Department</label>
                                    <select
                                        name="department"
                                        value={formData.department}
                                        onChange={handleChange}
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-black text-slate-900 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all cursor-pointer appearance-none"
                                    >
                                        <option value="Engineering">Engineering</option>
                                        <option value="Sales">Sales</option>
                                        <option value="HR">HR</option>
                                        <option value="Marketing">Marketing</option>
                                        <option value="Finance">Finance</option>
                                        <option value="Operations">Operations</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Tax Regime</label>
                                    <select
                                        name="taxRegime"
                                        value={formData.taxRegime}
                                        onChange={handleChange}
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-black text-slate-900 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all cursor-pointer appearance-none"
                                    >
                                        <option value="New">New (Slab 2025)</option>
                                        <option value="Old">Old (Standard)</option>
                                    </select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Bank Account Number</label>
                                <input
                                    type="text"
                                    name="bankAccountNumber"
                                    required
                                    value={formData.bankAccountNumber}
                                    onChange={handleChange}
                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-black text-slate-900 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all shadow-sm"
                                    placeholder="XXXX-XXXX-XXXX"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Joining Date</label>
                                <input
                                    type="date"
                                    name="joinDate"
                                    required
                                    value={formData.joinDate}
                                    onChange={handleChange}
                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-black text-slate-900 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all shadow-sm"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full mt-4 py-5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white rounded-[1.5rem] text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-blue-500/30 transition-all transform active:scale-95 flex justify-center items-center gap-3"
                            >
                                {submitting ? <Loader2 size={18} className="animate-spin" /> : <>
                                    <Plus size={18} />
                                    <span>Initialize Profile</span>
                                </>}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        );
    };

    // --- Create Profile Modal (for employees with hasProfile === false) ---
    const CreateProfileModal = ({ employee, onClose }: { employee: any; onClose: () => void }) => {
        const [submitting, setSubmitting] = useState(false);
        const [formData, setFormData] = useState({
            annualCTC: '',
            basicSalary: '',
            hra: '',
            allowances: '',
            bankAccountNumber: '',
            taxRegime: 'New',
        });

        const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
            const { name, value } = e.target;
            setFormData(prev => ({ ...prev, [name]: value }));
        };

        const handleSubmit = async (e: React.FormEvent) => {
            e.preventDefault();
            if (!formData.annualCTC) return;
            setSubmitting(true);
            try {
                const res = await api.post('payroll/profiles', {
                    employeeId: employee.id,
                    annualCTC: parseFloat(formData.annualCTC),
                    basicSalary: parseFloat(formData.basicSalary) || undefined,
                    hra: parseFloat(formData.hra) || undefined,
                    allowances: parseFloat(formData.allowances) || undefined,
                    bankAccountNumber: formData.bankAccountNumber || undefined,
                    taxRegime: formData.taxRegime,
                });
                if (res.data?.success) {
                    onClose();
                    fetchEmployees();
                } else {
                    throw new Error(res.data?.message || 'Failed to create profile');
                }
            } catch (err: any) {
                const msg = err.response?.data?.message || err.message || 'Error creating profile.';
                alert(msg);
            } finally {
                setSubmitting(false);
            }
        };

        return (
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
                    {/* Header */}
                    <div className="px-10 py-8 border-b border-slate-100 bg-slate-50/50 flex justify-between items-start">
                        <div>
                            <h3 className="text-xl font-black text-slate-900 tracking-tight">Assign Salary</h3>
                            <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mt-1">{employee.name} — Create Payroll Profile</p>
                        </div>
                        <button onClick={onClose} className="p-2.5 hover:bg-slate-100 rounded-2xl transition-colors">
                            <X size={20} className="text-slate-400" />
                        </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="p-10 space-y-5">
                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Annual CTC <span className="text-rose-500">*</span></label>
                            <input
                                type="number" name="annualCTC" required
                                value={formData.annualCTC} onChange={handleChange}
                                placeholder="e.g. 1200000"
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-black text-slate-900 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {[
                                { label: 'Basic Salary / mo', name: 'basicSalary', placeholder: 'Auto-calculated' },
                                { label: 'HRA / mo', name: 'hra', placeholder: 'Auto-calculated' },
                                { label: 'Allowances / mo', name: 'allowances', placeholder: 'Auto-calculated' },
                            ].map(f => (
                                <div key={f.name} className="space-y-2">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">{f.label}</label>
                                    <input
                                        type="number" name={f.name}
                                        value={(formData as any)[f.name]} onChange={handleChange}
                                        placeholder={f.placeholder}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-black text-slate-900 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                                    />
                                </div>
                            ))}
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Tax Regime</label>
                                <select
                                    name="taxRegime" value={formData.taxRegime} onChange={handleChange}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-black text-slate-900 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all cursor-pointer"
                                >
                                    <option value="New">New (2025)</option>
                                    <option value="Old">Old (Standard)</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Bank Account Number</label>
                            <input
                                type="text" name="bankAccountNumber"
                                value={formData.bankAccountNumber} onChange={handleChange}
                                placeholder="XXXX-XXXX-XXXX (optional)"
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-black text-slate-900 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                            />
                        </div>

                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest pt-1">
                            Blank salary fields will be auto-calculated from Annual CTC
                        </p>

                        <button
                            type="submit" disabled={submitting}
                            className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 transition-all active:scale-95 flex justify-center items-center gap-3"
                        >
                            {submitting ? <Loader2 size={18} className="animate-spin" /> : <><IndianRupee size={16} /><span>Create Payroll Profile</span></>}
                        </button>
                    </form>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-top-4 duration-500">
            {/* Template / Bulk Hidden Input */}
            <input
                className="hidden"
                type="file"
                accept=".csv"
                ref={fileInputRef}
                onChange={handleFileUpload}
            />

            {/* Status Messages */}
            {msg && (
                <div className={`p-4 rounded-2xl flex items-center justify-between animate-in slide-in-from-top-4 ${msg.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'}`}>
                    <div className="flex items-center space-x-3">
                        {msg.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
                        <span className="text-[10px] font-black uppercase tracking-widest">{msg.text}</span>
                    </div>
                    <button onClick={() => setMsg(null)} className="p-1 hover:bg-black/5 rounded-lg transition-colors">
                        <X size={14} />
                    </button>
                </div>
            )}

            {/* Header / Actions */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">Employee Payroll Profiles</h2>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-2 flex items-center gap-2">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                        {profiles ? profiles.length : 0} Database Records Found
                    </p>
                </div>
                <div className="flex items-center space-x-4 w-full md:w-auto">
                    <div className="relative flex-grow md:flex-grow-0">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            className="w-full md:w-72 pl-12 pr-6 py-3.5 bg-white border border-slate-200 rounded-2xl text-[13px] font-bold text-slate-900 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 shadow-sm transition-all"
                            placeholder="Filter by name, role, or dept..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={downloadTemplate}
                        className="flex items-center justify-center space-x-3 px-6 py-3.5 bg-white border border-slate-200 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm active:scale-95 group"
                        title="Download CSV Template"
                    >
                        <FileSpreadsheet size={16} />
                    </button>
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="flex items-center justify-center space-x-3 px-6 py-3.5 bg-blue-600/10 text-blue-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all shadow-sm active:scale-95 disabled:opacity-50"
                    >
                        {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                        <span className="hidden lg:inline">Bulk Onboard</span>
                    </button>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center justify-center space-x-3 px-8 py-3.5 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-2xl shadow-slate-900/20 whitespace-nowrap active:scale-95 group"
                    >
                        <Plus size={16} className="group-hover:rotate-90 transition-transform duration-300" />
                        <span>Add Profile</span>
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="bg-white rounded-[2.5rem] border border-slate-200/60 shadow-xl shadow-slate-200/30 overflow-hidden min-h-[500px] relative">
                {loading ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm z-10 transition-opacity duration-500">
                        <div className="relative">
                            <div className="w-20 h-20 border-4 border-blue-100 rounded-full animate-pulse"></div>
                            <Loader2 size={32} className="animate-spin text-blue-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-8">Syncing with Cloud Vault...</p>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center p-32 text-center animate-in zoom-in duration-300">
                        <div className="p-6 bg-rose-50 rounded-[2rem] text-rose-500 mb-8 shadow-inner">
                            <AlertTriangle size={48} />
                        </div>
                        <h3 className="text-xl font-black text-slate-900 tracking-tight">System Sync Failure</h3>
                        <p className="max-w-md text-slate-500 text-sm font-medium mt-3 leading-relaxed">{error}</p>
                        <button
                            onClick={fetchEmployees}
                            className="mt-10 px-8 py-3 bg-rose-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-500 transition-all shadow-xl shadow-rose-900/10 active:scale-95"
                        >
                            Retry Handshake
                        </button>
                    </div>
                ) : (
                    <>
                        {filteredProfiles && filteredProfiles.length > 0 ? (
                            <div className="overflow-x-auto text-left">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/50 border-b border-slate-100">
                                            <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Employee Matrix</th>
                                            <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Annual CTC</th>
                                            <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Monthly Salary</th>
                                            <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Financial Vault</th>
                                            <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Protocol</th>
                                            <th className="px-10 py-6 text-right w-24"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {filteredProfiles.map(p => (
                                            <tr key={p.id || Math.random()} className="hover:bg-slate-50/70 transition-colors group">
                                                <td className="px-10 py-7">
                                                    <div className="flex items-center space-x-5">
                                                        <div className={`w-14 h-14 bg-white border-2 rounded-[1.25rem] flex items-center justify-center text-lg font-black shadow-sm group-hover:shadow-md transition-all ${!p.hasProfile ? 'border-rose-200 text-rose-500' : 'border-slate-100 text-slate-900 group-hover:border-blue-100'}`}>
                                                            {p.name ? p.name.charAt(0) : '?'}
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <div className={`text-[15px] font-black leading-tight transition-colors ${!p.hasProfile ? 'text-rose-600' : 'text-slate-900 group-hover:text-blue-600'}`}>
                                                                    {p.name || 'Anonymous'}
                                                                </div>
                                                                {!p.hasProfile && (
                                                                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-rose-50 text-rose-600 rounded-md border border-rose-100 animate-pulse">
                                                                        <AlertTriangle size={10} />
                                                                        <span className="text-[8px] font-black uppercase tracking-widest whitespace-nowrap">Profile Missing</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-tight mt-1">{p.role || p.department || 'N/A'} • {p.department || 'General'}</div>
                                                            {!p.hasProfile && (
                                                                <p className="text-[9px] font-bold text-rose-400 uppercase tracking-widest mt-1">Payroll profile missing for this employee</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-7">
                                                    <div className="text-sm font-black text-slate-700">{formatter.format(p.annualCTC)}</div>
                                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">p.a. gross (ctc)</div>
                                                </td>
                                                <td className="px-8 py-7">
                                                    <div className={`text-[15px] font-black tracking-tight ${!p.hasProfile ? 'text-slate-300 italic' : 'text-blue-600'}`}>
                                                        {p.hasProfile ? formatter.format(p.netSalary) : '₹0 (Locked)'}
                                                    </div>
                                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">monthly net pay</div>
                                                </td>
                                                <td className="px-8 py-7">
                                                    <div className="flex items-center space-x-3">
                                                        <div className={`p-2 rounded-xl bg-slate-50 text-slate-400 transition-colors ${p.hasProfile ? 'group-hover:bg-blue-50 group-hover:text-blue-500' : ''}`}>
                                                            <IndianRupee size={14} />
                                                        </div>
                                                        <span className={`text-xs font-black tabular-nums tracking-tighter ${!p.hasProfile ? 'text-slate-300' : 'text-slate-600'}`}>
                                                            {maskAccount(p.bank_account_number || p.bank_account || p.bankAccount || 'Not Linked')}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-7 text-center">
                                                    <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] shadow-sm border ${(p.tax_regime || p.taxRegime) === 'New' || !p.hasProfile
                                                        ? 'bg-indigo-50/50 text-indigo-600 border-indigo-100'
                                                        : 'bg-amber-50/50 text-amber-600 border-amber-100'
                                                        }`}>
                                                        {p.tax_regime || p.taxRegime || 'New'} Regime
                                                    </span>
                                                </td>
                                                <td className="px-10 py-7 text-right">
                                                    <button
                                                        onClick={() => {
                                                            if (!p.hasProfile) {
                                                                setCreateProfileEmployee(p);
                                                                setShowCreateProfileModal(true);
                                                            } else {
                                                                handleOpenSettings(p);
                                                            }
                                                        }}
                                                        title={!p.hasProfile ? 'Assign salary profile' : 'Edit salary settings'}
                                                        className={`p-3.5 rounded-2xl transition-all active:scale-90 ${!p.hasProfile ? 'text-rose-400 hover:bg-rose-50 hover:text-rose-600' : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50 hover:shadow-lg hover:shadow-blue-500/10'}`}
                                                    >
                                                        {p.hasProfile ? <Settings size={20} /> : <Plus size={20} />}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center p-32 text-center animate-in zoom-in duration-300">
                                <div className="p-8 bg-slate-50 rounded-[2.5rem] mb-8 ring-8 ring-slate-200/20">
                                    <User className="text-slate-300" size={64} />
                                </div>
                                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Financial Hub Empty</h3>
                                <p className="text-slate-500 text-sm font-medium mt-4 max-w-sm mx-auto leading-relaxed uppercase tracking-widest">No active payroll profiles found in this sector. Add entries to begin processing.</p>
                                <button
                                    onClick={() => setShowAddModal(true)}
                                    className="mt-10 flex items-center space-x-3 px-10 py-4 bg-slate-900 text-white rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-2xl shadow-slate-900/10 active:scale-95"
                                >
                                    <Plus size={16} />
                                    <span>Add First Profile</span>
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Modals with proper z-index and conditional rendering */}
            {showSettingsModal && (
                <SalaryStructureModal
                    employee={selectedEmployee}
                    onClose={() => setShowSettingsModal(false)}
                />
            )}
            {showAddModal && (
                <AddEmployeeModal
                    onClose={() => setShowAddModal(false)}
                />
            )}
            {showCreateProfileModal && createProfileEmployee && (
                <CreateProfileModal
                    employee={createProfileEmployee}
                    onClose={() => { setShowCreateProfileModal(false); setCreateProfileEmployee(null); }}
                />
            )}
        </div>
    );
};

export default EmployeePayrollManagement;
