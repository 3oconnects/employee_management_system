import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
    CheckCircle2, 
    Clock, 
    Calendar, 
    Building2, 
    Briefcase, 
    Mail, 
    ShieldCheck, 
    Sparkles, 
    AlertCircle, 
    ArrowRight,
    Loader2,
    FileCheck2
} from 'lucide-react';
import api from '../../../services/api';

export const CandidateOfferAcceptance: React.FC = () => {
    const { token } = useParams<{ token: string }>();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [offer, setOffer] = useState<any | null>(null);

    const [agreed, setAgreed] = useState(false);
    const [remarks, setRemarks] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [acceptedResult, setAcceptedResult] = useState<any | null>(null);

    useEffect(() => {
        if (!token) {
            setError('Missing offer token.');
            setLoading(false);
            return;
        }

        api.get(`/offer/details/${token}`)
            .then(res => {
                setOffer(res.data.data);
                if (res.data.data?.isAccepted) {
                    setAcceptedResult({
                        acceptedDate: res.data.data.acceptedDate,
                        acceptedAt: res.data.data.acceptedAt,
                    });
                }
            })
            .catch(err => {
                setError(err.response?.data?.message || 'Invalid or expired offer letter link. Please contact People Operations.');
            })
            .finally(() => {
                setLoading(false);
            });
    }, [token]);

    const handleAccept = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!agreed || !token) return;

        setSubmitting(true);
        setError('');
        try {
            const todayStr = new Date().toISOString().split('T')[0];
            const res = await api.post(`/offer/accept/${token}`, {
                remarks: remarks.trim() || undefined,
                acceptedDate: todayStr,
            });

            setAcceptedResult({
                acceptedDate: res.data.acceptedDate || todayStr,
                acceptedAt: res.data.acceptedAt || new Date().toISOString(),
            });
            if (offer) {
                setOffer({ ...offer, isAccepted: true });
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to submit offer acceptance. Please try again or contact HR.');
        } finally {
            setSubmitting(false);
        }
    };

    const todayDisplay = new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    });

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="flex flex-col items-center gap-3 text-slate-500">
                    <Loader2 size={32} className="animate-spin text-indigo-600" />
                    <p className="text-sm font-semibold">Verifying offer appointment details…</p>
                </div>
            </div>
        );
    }

    if (error && !offer) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-xl p-8 text-center space-y-4">
                    <div className="w-14 h-14 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-center text-rose-600 mx-auto">
                        <AlertCircle size={28} />
                    </div>
                    <h2 className="text-lg font-bold text-slate-900">Offer Verification Notice</h2>
                    <p className="text-xs text-slate-600 leading-relaxed">{error}</p>
                    <div className="pt-2">
                        <Link 
                            to="/login"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
                        >
                            Return to Portal Login
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/20 to-slate-100 py-12 px-4 sm:px-6 flex flex-col justify-center items-center">
            <div className="w-full max-w-2xl bg-white rounded-3xl border border-slate-200/90 shadow-xl overflow-hidden animate-in fade-in duration-300">
                
                {/* ── Brand Letterhead Banner ──────────────────── */}
                <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-indigo-900 text-white p-6 sm:p-8 relative overflow-hidden">
                    <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                            {offer?.logoUrl && (
                                <div className="bg-white rounded-xl p-2 px-3 shadow-md shrink-0 self-start sm:self-auto">
                                    <img src={offer.logoUrl} alt={offer.companyName || 'Company'} className="h-8 w-auto max-w-[130px] object-contain" />
                                </div>
                            )}
                            <div>
                                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-[11px] font-bold text-indigo-200 uppercase tracking-wider mb-2">
                                    <Sparkles size={12} />
                                    {offer?.companyName || 'Ozofi'} &bull; Talent Acquisition
                                </div>
                                <h1 className="text-2xl font-black tracking-tight text-white">
                                    Appointment Offer Acceptance
                                </h1>
                                <p className="text-xs text-indigo-200/80 mt-1">
                                    Formal acknowledgment and acceptance of employment terms
                                </p>
                            </div>
                        </div>
                        <div className="text-left sm:text-right shrink-0">
                            <span className="text-[10px] uppercase font-bold text-indigo-300 block">Offer Issue Date</span>
                            <span className="text-xs font-mono font-bold text-white bg-white/10 px-2.5 py-1 rounded-md inline-block mt-0.5">
                                {todayDisplay}
                            </span>
                        </div>
                    </div>
                    <div className="absolute right-0 bottom-0 translate-x-10 translate-y-10 opacity-10 pointer-events-none">
                        <FileCheck2 size={160} />
                    </div>
                </div>

                {/* ── Body Content ────────────────────────────── */}
                <div className="p-6 sm:p-8 space-y-6">

                    {/* Acceptance Result / Already Accepted View */}
                    {acceptedResult ? (
                        <div className="space-y-6 text-center py-4">
                            <div className="w-16 h-16 bg-emerald-50 border border-emerald-200 rounded-full flex items-center justify-center text-emerald-600 mx-auto shadow-sm">
                                <CheckCircle2 size={36} />
                            </div>

                            <div>
                                <span className="inline-block px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full border border-emerald-200 mb-2">
                                    Offer Formally Accepted
                                </span>
                                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                                    Congratulations, {offer?.name}! 🎉
                                </h2>
                                <p className="text-xs text-slate-600 max-w-md mx-auto mt-1 leading-relaxed">
                                    Your acceptance has been securely registered on <strong>{acceptedResult.acceptedDate ? new Date(acceptedResult.acceptedDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : todayDisplay}</strong>.
                                </p>
                            </div>

                            {/* Appointment Info Confirmation Card */}
                            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200/80 text-left space-y-2.5 text-xs max-w-lg mx-auto">
                                <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                                    <span className="text-slate-500 font-medium">Designation:</span>
                                    <span className="font-bold text-slate-900">{offer?.position}</span>
                                </div>
                                <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                                    <span className="text-slate-500 font-medium">Department:</span>
                                    <span className="font-bold text-slate-800">{offer?.department}</span>
                                </div>
                                <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                                    <span className="text-slate-500 font-medium">Expected Joining Date:</span>
                                    <span className="font-semibold text-slate-800">
                                        {offer?.joinDate ? new Date(offer.joinDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'As agreed'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center py-1">
                                    <span className="text-slate-500 font-medium">Acceptance Recorded On:</span>
                                    <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                                        {todayDisplay}
                                    </span>
                                </div>
                            </div>

                            {/* What happens next banner */}
                            <div className="p-4 bg-gradient-to-r from-emerald-50/90 to-teal-50/90 border border-emerald-200/80 rounded-2xl text-left text-xs space-y-1.5 max-w-lg mx-auto">
                                <div className="flex items-center gap-2 font-bold text-emerald-900">
                                    <ShieldCheck size={16} className="text-emerald-600" />
                                    Next Stage: Final Company Confirmation
                                </div>
                                <p className="text-[11.5px] text-emerald-800 leading-relaxed">
                                    People Operations is finalizing your orientation schedule and IT workspace allocation. Once final confirmation is complete, your <strong>Employee Portal username and temporary login credentials</strong> will be sent to your email.
                                </p>
                            </div>
                        </div>
                    ) : (
                        /* Pending Acceptance View */
                        <form onSubmit={handleAccept} className="space-y-6">
                            
                            {/* Greeting & Summary */}
                            <div>
                                <p className="text-xs text-slate-500">Dear <strong className="text-slate-800">{offer?.name}</strong>,</p>
                                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                                    We are delighted to confirm your appointment for the position of <strong className="text-indigo-600 font-bold">{offer?.position}</strong>. Please review your appointment summary below and confirm your acceptance.
                                </p>
                            </div>

                            {/* Appointment Details Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                                <div className="flex items-start gap-3 p-2.5 bg-white rounded-xl border border-slate-200/70 shadow-2xs">
                                    <Briefcase size={16} className="text-indigo-600 mt-0.5 shrink-0" />
                                    <div>
                                        <span className="text-[10px] font-bold uppercase text-slate-400">Position</span>
                                        <p className="text-xs font-bold text-slate-900">{offer?.position}</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3 p-2.5 bg-white rounded-xl border border-slate-200/70 shadow-2xs">
                                    <Building2 size={16} className="text-indigo-600 mt-0.5 shrink-0" />
                                    <div>
                                        <span className="text-[10px] font-bold uppercase text-slate-400">Department</span>
                                        <p className="text-xs font-bold text-slate-900">{offer?.department}</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3 p-2.5 bg-white rounded-xl border border-slate-200/70 shadow-2xs">
                                    <Calendar size={16} className="text-indigo-600 mt-0.5 shrink-0" />
                                    <div>
                                        <span className="text-[10px] font-bold uppercase text-slate-400">Joining Date</span>
                                        <p className="text-xs font-bold text-slate-900">
                                            {offer?.joinDate ? new Date(offer.joinDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'As mutually agreed'}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3 p-2.5 bg-white rounded-xl border border-slate-200/70 shadow-2xs">
                                    <Clock size={16} className="text-indigo-600 mt-0.5 shrink-0" />
                                    <div>
                                        <span className="text-[10px] font-bold uppercase text-slate-400">Engagement</span>
                                        <p className="text-xs font-bold text-slate-900 capitalize">{offer?.employmentType}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Acceptance Confirmation Checkbox */}
                            <div className="p-4 bg-indigo-50/70 border border-indigo-200/80 rounded-2xl space-y-3">
                                <label className="flex items-start gap-3 cursor-pointer select-none">
                                    <input 
                                        type="checkbox"
                                        checked={agreed}
                                        onChange={(e) => setAgreed(e.target.checked)}
                                        className="mt-0.5 w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                                    />
                                    <div className="text-xs leading-relaxed text-slate-800">
                                        <span className="font-bold text-slate-900 block">
                                            I formally accept this employment offer.
                                        </span>
                                        I confirm that I have reviewed the appointment details and attached letter of appointment, and accept the terms of employment with {offer?.companyName || 'Ozofi'}.
                                    </div>
                                </label>
                            </div>

                            {/* Optional Remarks input */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                    Message / Notes for People Operations (Optional)
                                </label>
                                <textarea 
                                    rows={2}
                                    placeholder="e.g. Excited to join the team! Looking forward to starting on my joining date."
                                    value={remarks}
                                    onChange={(e) => setRemarks(e.target.value)}
                                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-indigo-500 transition-all placeholder:text-slate-400 resize-none"
                                />
                            </div>

                            {error && (
                                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl flex items-center gap-2">
                                    <AlertCircle size={14} className="shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={!agreed || submitting}
                                className={`w-full py-3.5 px-6 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md ${
                                    agreed && !submitting
                                        ? 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 active:scale-[0.99] text-white shadow-indigo-600/25'
                                        : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                                }`}
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" />
                                        Submitting Acceptance…
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 size={16} />
                                        Confirm &amp; Accept Offer Online
                                    </>
                                )}
                            </button>

                            <p className="text-[11px] text-center text-slate-400">
                                Today&rsquo;s Acceptance Date: <strong className="text-slate-600">{todayDisplay}</strong>
                            </p>
                        </form>
                    )}
                </div>

                {/* ── Footer ─────────────────────────────────── */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <span>&copy; {new Date().getFullYear()} {offer?.companyLegalName || 'Ozofi Technologies Private Limited'}</span>
                    <span className="font-semibold text-slate-600">People &amp; Culture Operations</span>
                </div>
            </div>
        </div>
    );
};

export default CandidateOfferAcceptance;
