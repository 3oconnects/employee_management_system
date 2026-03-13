import React, { useState, useEffect } from 'react';
import {
    History,
    FileText,
    Download,
    CheckCircle2,
    AlertCircle,
    Loader2,
    Plus,
    IndianRupee,
    Clock,
    XCircle,
    X,
    Send
} from 'lucide-react';
import api from '../../../services/api';
import { useAuthStore } from '../../../store/authStore';
import { useNavigate } from 'react-router-dom';

const EmployeePayroll = () => {
    const { user } = useAuthStore();
    const [payslips, setPayslips] = useState<any[]>([]);
    const [claims, setClaims] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showClaimModal, setShowClaimModal] = useState(false);
    const [submittingClaim, setSubmittingClaim] = useState(false);
    const navigate = useNavigate();

    const [claimData, setClaimData] = useState({
        type: 'Travel',
        amount: '',
        reason: ''
    });

    const fetchData = async () => {
        const storedUser = localStorage.getItem('user');
        const currentUser = storedUser ? JSON.parse(storedUser) : (user as any);
        const empId = currentUser?.employee_id;

        if (!empId) {
            console.error("Fetch data failed: Employee ID not found in session.");
            alert("Session expired or Employee ID not found. Redirecting to login...");
            setLoading(false);
            navigate('/login');
            return;
        }

        setLoading(true);
        try {
            const [payslipsRes, claimsRes] = await Promise.all([
                api.get(`payroll/history/${empId}`),
                api.get(`claims/employee/${empId}`)
            ]);
            setPayslips(payslipsRes.data.payroll_history || []);
            setClaims(claimsRes.data || []);
        } catch (err) {
            console.error('Failed to load employee claims/history:', err);
            setClaims([]);
            setPayslips([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [user?.id]);

    const downloadPayslip = async (payslipId: number | string, name: string, month: string, year: string, employeeId: string) => {
        const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const monthLabel = MONTHS[(parseInt(month) - 1)] || month;

        try {
            const res = await api.get(
                `/payroll/payslip/${encodeURIComponent(employeeId)}/monthly?month=${month}&year=${year}`,
                { responseType: 'blob' }
            );
            
            const blob = new Blob([res.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            
            const safeName = (name || employeeId).replace(/[^a-zA-Z0-9]/g, '_');
            a.download = `${safeName}_${monthLabel}_${year}_Payslip.pdf`;
            
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (err: any) {
            alert('Failed to download payslip: ' + (err.message || 'Unknown error'));
        }
    };

    const handleClaimSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const storedUser = localStorage.getItem('user');
        const currentUser = storedUser ? JSON.parse(storedUser) : (user as any);
        const empId = currentUser?.employee_id;
        
        if (!empId) {
            alert("Employee ID not found in session. Please re-login.");
            navigate('/login');
            return;
        }

        if (!claimData.amount || !claimData.reason) {
            alert("Please provide both amount and reason.");
            return;
        }

        setSubmittingClaim(true);
        try {
            const payload = {
                employee_id: empId,
                category: claimData.type,
                amount: Number(claimData.amount),
                description: claimData.reason
            };

            // Diagnostic logging as requested
            console.log("Submitting claim payload:", payload);

            await api.post('claims', payload);
            
            // Success feedback
            alert('✅ Claim submitted successfully for processing.');
            
            setShowClaimModal(false);
            setClaimData({ type: 'Travel', amount: '', reason: '' });
            
            // Refresh employee claims list
            fetchData();
        } catch (error: any) {
            // Improved error handling showing server response
            console.error("Claim submission error:", error.response?.data || error);
            alert("Failed to submit claim. Foreign key check failed or network error.");
        } finally {
            setSubmittingClaim(false);
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center p-32 space-y-4">
            <Loader2 size={40} className="animate-spin text-blue-600" />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Synchronizing Financial Ledger...</p>
        </div>
    );

    return (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* My Payslips Section */}
            <section className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">My Earnings Summary</h2>
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1 italic">Verified Salary Statements & Tax Forms</p>
                    </div>
                </div>

                {payslips.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {payslips.map(p => (
                            <div
                                key={p.id}
                                className="group relative bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-xl hover:shadow-blue-500/5 hover:-translate-y-1 transition-all duration-300 overflow-hidden cursor-pointer"
                                onClick={() => downloadPayslip(p.id, p.employee, p.month, p.year, p.employee_id)}
                            >
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <History size={64} className="text-slate-400" />
                                </div>
                                <div className="flex items-center space-x-4 mb-6">
                                    <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                                        <FileText size={20} />
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">
                                            {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][parseInt(p.month) - 1]} {p.year}
                                        </h4>
                                        <p className="text-lg font-black text-slate-900 tracking-tight">₹{p.net_salary.toLocaleString()}</p>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2 text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                                        <CheckCircle2 size={12} />
                                        <span className="text-[9px] font-black uppercase tracking-widest">Paid</span>
                                    </div>
                                    <button className="flex items-center space-x-2 text-blue-600 text-[10px] font-black uppercase tracking-widest hover:underline decoration-2">
                                        <Download size={14} />
                                        <span>Download PDF</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-slate-50 rounded-[2.5rem] p-20 flex flex-col items-center justify-center border-2 border-dashed border-slate-200">
                        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-slate-300 mb-6 shadow-sm"><FileText size={32} /></div>
                        <h3 className="text-lg font-black text-slate-900 tracking-tight">No Pay Statements Found</h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 italic">Your payroll history will appear here once processed.</p>
                    </div>
                )}
            </section>

            {/* My Claims Section */}
            <section className="space-y-6 pt-12 border-t border-slate-200">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Reimbursements & Claims</h2>
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1 italic">Submit your business expenses for approval</p>
                    </div>
                    <button
                        onClick={() => setShowClaimModal(true)}
                        className="flex items-center space-x-3 px-6 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-blue-600 hover:scale-105 active:scale-95 transition-all"
                    >
                        <Plus size={16} />
                        <span>Submit New Claim</span>
                    </button>
                </div>

                <div className="bg-white rounded-[2.5rem] border border-slate-200/60 shadow-xl shadow-slate-200/20 overflow-hidden">
                    {claims.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-100">
                                        <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</th>
                                        <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount</th>
                                        <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</th>
                                        <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                        <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {claims.map((c: any) => (
                                        <tr key={c.id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-8 py-6">
                                                <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-[9px] font-black uppercase tracking-widest border border-slate-200">
                                                    {c.category || c.type}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center space-x-2">
                                                    <IndianRupee size={12} className="text-slate-400" />
                                                    <span className="text-sm font-black text-slate-900">{Number(c.amount).toLocaleString()}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 max-w-xs">
                                                <p className="text-[11px] font-bold text-slate-500 italic line-clamp-1">{c.description || c.reason}</p>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className={`flex items-center space-x-2 px-3 py-1 rounded-full border w-fit ${c.status === 'approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                    c.status === 'rejected' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                                        'bg-amber-50 text-amber-600 border-amber-100 font-black'
                                                    }`}>
                                                    {c.status === 'approved' ? <CheckCircle2 size={12} /> :
                                                        c.status === 'rejected' ? <XCircle size={12} /> :
                                                            <Clock size={12} />}
                                                    <span className="text-[9px] font-black uppercase tracking-widest">{c.status || 'pending'}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-[11px] font-bold text-slate-400 italic">
                                                {c.created_at ? new Date(c.created_at).toLocaleDateString() : new Date().toLocaleDateString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center p-24 space-y-4">
                            <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-300 border border-slate-200">
                                <History size={20} />
                            </div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No reimbursement history available.</p>
                        </div>
                    )}
                </div>
            </section>

            {/* Claim Submission Modal */}
            {showClaimModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl animate-in slide-in-from-bottom-8 duration-500">
                        <div className="bg-slate-900 p-8 flex justify-between items-center text-white">
                            <div>
                                <h3 className="text-xl font-black tracking-tight">Submit Reimbursement</h3>
                                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">Financial Reconciliation Request</p>
                            </div>
                            <button onClick={() => setShowClaimModal(false)} className="p-2 hover:bg-white/10 rounded-2xl transition-colors">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleClaimSubmit} className="p-8 space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Claim Category</label>
                                    <select
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-black text-slate-900 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all cursor-pointer"
                                        value={claimData.type}
                                        onChange={e => setClaimData({ ...claimData, type: e.target.value })}
                                    >
                                        <option value="Travel">Travel Allowance</option>
                                        <option value="Medical">Medical Reimbursement</option>
                                        <option value="Food">Meals & Entertainment</option>
                                        <option value="Training">Personal Development</option>
                                        <option value="Other">General / Miscellaneous</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Amount (INR)</label>
                                    <div className="relative">
                                        <IndianRupee size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="number"
                                            required
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 pl-10 text-sm font-black text-slate-900 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                                            placeholder="0.00"
                                            value={claimData.amount}
                                            onChange={e => setClaimData({ ...claimData, amount: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Business Reason & Justification</label>
                                <textarea
                                    required
                                    rows={4}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-black text-slate-900 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all resize-none italic"
                                    placeholder="Provide a detailed description of the expense for audit purposes..."
                                    value={claimData.reason}
                                    onChange={e => setClaimData({ ...claimData, reason: e.target.value })}
                                />
                            </div>
                            <div className="flex space-x-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowClaimModal(false)}
                                    className="flex-1 px-8 py-4 border-2 border-slate-100 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all font-black"
                                >
                                    Abort
                                </button>
                                <button
                                    type="submit"
                                    disabled={submittingClaim}
                                    className="flex-1 px-8 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl shadow-slate-200 flex items-center justify-center space-x-3 disabled:opacity-50 active:scale-95"
                                >
                                    {submittingClaim ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                                    <span>Transmit Claim</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmployeePayroll;
