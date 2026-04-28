import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Shield, ArrowRight, Zap, Users, CreditCard, 
    BarChart3, Globe, Lock, Cpu, Layers 
} from 'lucide-react';

const LandingPage: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-[#0A0828] text-white overflow-x-hidden selection:bg-indigo-500/30">
            {/* Header / Nav */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0A0828]/60 backdrop-blur-xl border-b border-white/5">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
                            <Layers size={22} className="text-white" />
                        </div>
                        <span className="text-[20px] font-black tracking-tighter uppercase italic">AURA CORE</span>
                    </div>
                    
                    <div className="hidden md:flex items-center gap-8">
                        <a href="#features" className="text-[13px] font-bold text-white/50 hover:text-white uppercase tracking-widest transition-colors">Capability</a>
                        <a href="#security" className="text-[13px] font-bold text-white/50 hover:text-white uppercase tracking-widest transition-colors">Security</a>
                        <a href="#enterprise" className="text-[13px] font-bold text-white/50 hover:text-white uppercase tracking-widest transition-colors">Enterprise</a>
                    </div>

                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => navigate('/login')}
                            className="px-6 py-2.5 rounded-xl text-[13px] font-black text-white/70 hover:text-white transition-all uppercase tracking-widest"
                        >
                            Log In
                        </button>
                        <button 
                            onClick={() => navigate('/login')}
                            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-[13px] font-black text-white shadow-lg shadow-indigo-600/20 transition-all uppercase tracking-widest"
                        >
                            Request Access
                        </button>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative pt-40 pb-20 px-6 overflow-hidden">
                {/* Background Blobs */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-indigo-600/20 blur-[160px] rounded-full -z-10" />
                <div className="absolute top-40 right-0 w-[400px] h-[400px] bg-purple-600/10 blur-[120px] rounded-full -z-10" />

                <div className="max-w-7xl mx-auto text-center relative">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/5 border border-white/10 rounded-full mb-8 animate-fade-up">
                        <Zap size={14} className="text-indigo-400 fill-indigo-400" />
                        <span className="text-[11px] font-black text-white/50 uppercase tracking-[0.2em]">Protocol V4.0 Active</span>
                    </div>

                    <h1 className="text-5xl md:text-8xl font-black tracking-tight leading-[0.95] mb-8 animate-fade-up">
                        COMMAND YOUR<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-indigo-500 to-purple-500">WORKFORCE.</span>
                    </h1>

                    <p className="max-w-2xl mx-auto text-white/40 text-lg md:text-xl font-medium leading-relaxed mb-12 animate-fade-up">
                        The ultimate high-fidelity operating system for modern enterprises. 
                        Payroll, attendance, and talent management unified under one neural interface.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-up">
                        <button 
                            onClick={() => navigate('/login')}
                            className="group flex items-center gap-3 px-8 py-4 bg-indigo-600 hover:bg-indigo-500 rounded-2xl text-[15px] font-black text-white shadow-2xl shadow-indigo-600/40 transition-all"
                        >
                            INITIALIZE SYSTEM <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                        <button className="px-8 py-4 bg-white/5 border border-white/10 hover:bg-white/10 rounded-2xl text-[15px] font-black text-white/70 hover:text-white transition-all">
                            TECHNICAL SPECIFICATIONS
                        </button>
                    </div>

                    {/* Dashboard Preview */}
                    <div className="mt-24 relative animate-fade-up">
                        <div className="absolute inset-0 bg-indigo-600/10 blur-[100px] -z-10" />
                        <div className="bg-[#100D35] border border-white/10 rounded-[32px] p-4 shadow-2xl overflow-hidden group">
                            <div className="flex items-center gap-2 mb-4 px-4">
                                <div className="w-3 h-3 rounded-full bg-rose-500/50" />
                                <div className="w-3 h-3 rounded-full bg-amber-500/50" />
                                <div className="w-3 h-3 rounded-full bg-emerald-500/50" />
                                <div className="ml-4 h-6 w-64 bg-white/5 rounded-lg" />
                            </div>
                            <div className="grid grid-cols-12 gap-4">
                                <div className="col-span-3 space-y-3">
                                    {[1,2,3,4,5].map(i => <div key={i} className="h-10 bg-white/5 rounded-xl mx-4" />)}
                                </div>
                                <div className="col-span-9 grid grid-cols-3 gap-4">
                                    {[1,2,3].map(i => <div key={i} className="h-32 bg-white/5 rounded-2xl" />)}
                                    <div className="col-span-3 h-64 bg-white/[0.03] rounded-3xl" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Core Capabilities */}
            <section id="features" className="py-32 px-6 relative border-t border-white/5">
                <div className="max-w-7xl mx-auto">
                    <div className="mb-20">
                        <h2 className="text-sm font-black text-indigo-500 uppercase tracking-[0.3em] mb-4">Core Matrix</h2>
                        <h3 className="text-4xl font-black tracking-tight">INTELLIGENT MODULES</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <FeatureCard 
                            icon={BarChart3} 
                            title="Neural Insights" 
                            desc="Real-time predictive analytics on workforce productivity and attrition rates."
                        />
                        <FeatureCard 
                            icon={CreditCard} 
                            title="Fiscal Protocol" 
                            desc="Automated multi-tenant payroll with regional compliance and direct clearance."
                        />
                        <FeatureCard 
                            icon={Lock} 
                            title="Zero-Trust Auth" 
                            desc="Hardened enterprise-grade security with multi-layer RBAC and audit traceability."
                        />
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-20 px-6 border-t border-white/5 bg-black/20">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-10">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                            <Layers size={18} className="text-white" />
                        </div>
                        <span className="text-[16px] font-black tracking-tighter uppercase italic">AURA CORE</span>
                    </div>
                    <p className="text-white/20 text-[12px] font-black uppercase tracking-widest">
                        © 2026 PRECISIONHUB INDUSTRIAL SYSTEMS · ALL PROTOCOLS RESERVED
                    </p>
                    <div className="flex items-center gap-6">
                        <Globe size={20} className="text-white/20 hover:text-white transition-colors cursor-pointer" />
                        <Cpu size={20} className="text-white/20 hover:text-white transition-colors cursor-pointer" />
                    </div>
                </div>
            </footer>
        </div>
    );
};

const FeatureCard = ({ icon: Icon, title, desc }: { icon: any, title: string, desc: string }) => (
    <div className="p-8 bg-white/5 border border-white/10 rounded-[32px] hover:bg-white/[0.08] transition-all group">
        <div className="w-12 h-12 bg-indigo-600/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <Icon size={24} className="text-indigo-400" />
        </div>
        <h4 className="text-[18px] font-black mb-3 tracking-tight">{title}</h4>
        <p className="text-white/40 text-[14px] font-medium leading-relaxed">{desc}</p>
    </div>
);

export default LandingPage;
