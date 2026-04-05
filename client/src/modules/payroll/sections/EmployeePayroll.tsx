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
    Send,
    Wallet,
    Calendar,
    ArrowUpRight,
    Search,
    ShieldCheck
} from 'lucide-react';
import api from '../../../services/api';
import { useAuthStore } from '../../../store/authStore';

const EmployeePayroll = () => {
    const { user } = useAuthStore();
    const [payslips, setPayslips] = useState<any[]>([]);
    const [claims, setClaims] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showClaimModal, setShowClaimModal] = useState(false);
    const [submittingClaim, setSubmittingClaim] = useState(false);

    const [claimData, setClaimData] = useState({
        type: 'Travel',
        amount: '',
        reason: ''
    });

    const fetchData = async () => {
        const empId = user?.employee_id;
        if (!empId) {
            setLoading(false);
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
            alert('Failed to download payslip.');
        }
    };

    const handleClaimSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const empId = user?.employee_id;
        if (!empId || !claimData.amount || !claimData.reason) return;

        setSubmittingClaim(true);
        try {
            await api.post('claims', {
                employee_id: empId,
                category: claimData.type,
                amount: Number(claimData.amount),
                description: claimData.reason
            });
            setShowClaimModal(false);
            setClaimData({ type: 'Travel', amount: '', reason: '' });
            fetchData();
        } catch (error: any) {
            alert("Failed to submit claim.");
        } finally {
            setSubmittingClaim(false);
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-32 gap-4">
            <Loader2 size={32} className="text-blue-600 animate-spin" />
            <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Hydrating Financial Record...</p>
        </div>
    );

    return (
        <div className="p-6 space-y-8 page-enter">
            
            {/* ── Page Header ──────────────────────────────── */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-100">
                        <Wallet size={20} className="text-white" />
                    </div>
                    <div>
                        <h2 className="text-[17px] font-black text-gray-900 tracking-tight uppercase">My Payroll Hub</h2>
                        <p className="text-[11.5px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
                            Personal Earnings & Expense Tracking
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100">
                        <ShieldCheck size={14} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Account Verified</span>
                    </div>
                    <button 
                        onClick={() => setShowClaimModal(true)}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl text-[12px] font-bold hover:bg-black transition-all shadow-lg shadow-gray-200 active:scale-95"
                    >
                        <Plus size={14} />
                        New Claim
                    </button>
                </div>
            </div>

            {/* ── Stats Strip ─────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex items-center gap-5">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center border border-blue-100"><FileText size={24}/></div>
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Available Payslips</p>
                        <p className="text-[22px] font-black text-gray-900 tracking-tight">{payslips.length}</p>
                    </div>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex items-center gap-5">
                    <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center border border-amber-100"><Clock size={24}/></div>
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pending Claims</p>
                        <p className="text-[22px] font-black text-gray-900 tracking-tight">{claims.filter(c => c.status === 'pending').length}</p>
                    </div>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex items-center gap-5">
                    <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center border border-emerald-100"><CheckCircle2 size={24}/></div>
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Claim Lifecycle</p>
                        <p className="text-[22px] font-black text-gray-900 tracking-tight">Active</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                
                {/* ── My Earnings List ────────────────────────── */}
                <div className="lg:col-span-3 space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="text-[13px] font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                           <Calendar size={14} className="text-blue-600"/> Salary Archive
                        </h3>
                    </div>

                    {payslips.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {payslips.map(p => (
                                <div 
                                    key={p.id} 
                                    onClick={() => downloadPayslip(p.id, p.employee, p.month, p.year, p.employee_id)}
                                    className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-blue-100 transition-all cursor-pointer group"
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-2 bg-gray-50 text-gray-400 rounded-xl group-hover:bg-blue-50 group-hover:text-blue-600 transition-all border border-gray-100">
                                            <FileText size={18} />
                                        </div>
                                        <div className="flex items-center gap-1 text-[10px] font-black text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 uppercase tracking-widest">
                                            <CheckCircle2 size={10} /> Paid
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">
                                            {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][parseInt(p.month) - 1]} {p.year}
                                        </p>
                                        <p className="text-[20px] font-black text-gray-900 tracking-tight mt-1">₹{(Number(p.net_salary) || 0).toLocaleString()}</p>

                                    </div>
                                    <div className="mt-4 pt-4 border-t border-gray-50 flex justify-between items-center">
                                        <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">ID: {p.id}</span>
                                        <button className="flex items-center gap-1 text-[10px] font-black text-blue-600 uppercase tracking-wider hover:translate-x-1 transition-transform">
                                            Download <Download size={12}/>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl border-2 border-dashed border-gray-100 py-20 flex flex-col items-center gap-4 text-center">
                            <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-200"><History size={28}/></div>
                            <div>
                                <p className="text-[14px] font-black text-gray-800 uppercase tracking-tight">No Pay History</p>
                                <p className="text-[11px] text-gray-400 px-10">Historical payslips will manifest here once the payroll engine processes your cycle.</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Recent Claims Area ──────────────────────── */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="text-[13px] font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                           <ArrowUpRight size={14} className="text-amber-600"/> Recent Claims
                        </h3>
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        {claims.length > 0 ? (
                            <div className="divide-y divide-gray-50">
                                {claims.map((c: any) => (
                                    <div key={c.id} className="p-4 hover:bg-gray-50 transition-colors flex justify-between items-center group">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-9 h-9 flex items-center justify-center rounded-xl border transition-all ${c.status === 'approved' ? 'bg-emerald-50 text-emerald-500 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                                                <IndianRupee size={14}/>
                                            </div>
                                            <div>
                                                <p className="text-[13px] font-black text-gray-800 uppercase tracking-tight">{c.category || 'General'}</p>
                                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">₹{Number(c.amount).toLocaleString()}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className={`inline-flex px-2 py-0.5 rounded-lg text-[8.5px] font-black uppercase tracking-widest border ${c.status === 'approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                                                {c.status || 'pending'}
                                            </span>
                                            <p className="text-[9.5px] text-gray-300 font-bold mt-1 italic">{new Date(c.created_at || Date.now()).toLocaleDateString('en-IN', {month: 'short', day: 'numeric'})}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-20 flex flex-col items-center gap-3 text-center">
                                <div className="p-3 bg-gray-50 text-gray-200 rounded-2xl"><Send size={24}/></div>
                                <p className="text-[10.5px] font-black text-gray-400 uppercase tracking-widest">No Transmitted Claims</p>
                            </div>
                        )}
                        <div className="bg-gray-50 p-3 text-center border-t border-gray-100">
                             <p className="text-[9.5px] text-gray-400 font-bold uppercase tracking-widest">Audited by Financial Compliance Team</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Claim Modal ─────────────────────────────── */}
            {showClaimModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8">
                        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gray-900 text-white">
                            <div>
                                <h3 className="text-[17px] font-black uppercase tracking-tight">Transmit Claim</h3>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Financial Reconciliation Request</p>
                            </div>
                            <button onClick={() => setShowClaimModal(false)} className="p-2 hover:bg-white/10 rounded-xl transition-all"><X size={20}/></button>
                        </div>
                        <form onSubmit={handleClaimSubmit} className="p-8 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Category</label>
                                    <select 
                                        className="w-full bg-gray-50 border border-gray-100 rounded-xl p-3 text-sm font-bold text-gray-900 outline-none focus:bg-white focus:border-blue-400 transition-all"
                                        value={claimData.type}
                                        onChange={e => setClaimData({...claimData, type: e.target.value})}
                                    >
                                        <option value="Travel">Travel</option>
                                        <option value="Medical">Medical</option>
                                        <option value="Food">Meals</option>
                                        <option value="Other">Miscellaneous</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Amount (INR)</label>
                                    <input 
                                        type="number" 
                                        required
                                        className="w-full bg-gray-50 border border-gray-100 rounded-xl p-3 text-sm font-black text-gray-900 outline-none focus:bg-white focus:border-blue-400 transition-all"
                                        placeholder="0.00"
                                        value={claimData.amount}
                                        onChange={e => setClaimData({...claimData, amount: e.target.value})}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Business Reason</label>
                                <textarea 
                                    className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 text-sm font-medium text-gray-700 outline-none focus:bg-white transition-all resize-none italic"
                                    rows={4}
                                    placeholder="Briefly explain the expense..."
                                    required
                                    value={claimData.reason}
                                    onChange={e => setClaimData({...claimData, reason: e.target.value})}
                                />
                            </div>
                            <div className="flex gap-3">
                                <button type="button" onClick={() => setShowClaimModal(false)} className="flex-1 py-3 bg-gray-100 text-gray-500 rounded-xl text-[11px] font-black uppercase tracking-widest active:scale-95 transition-all">Abort</button>
                                <button type="submit" disabled={submittingClaim} className="flex-1 py-3 bg-blue-600 text-white rounded-xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-blue-100 active:scale-95 transition-all flex items-center justify-center gap-2">
                                    {submittingClaim ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                                    Transmit
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
