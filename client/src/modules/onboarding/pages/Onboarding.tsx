import React, { useState, useEffect } from 'react';
import {
    ChevronDown,
    Plus,
    Search,
    Maximize2,
    SlidersHorizontal,
    MoreHorizontal,
    X,
    User,
    Upload,
    Eye,
    ArrowUpDown,
    Filter,
    Loader2
} from 'lucide-react';
import api from '../../../services/api';

const Onboarding: React.FC = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [candidates, setCandidates] = useState<any[]>([]);
    
    // Form State
    const [form, setForm] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        department: 'Engineering'
    });
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);

    const fetchCandidates = async () => {
        try {
            const { data } = await api.get('/employees', { params: { status: 'onboarding' } });
            setCandidates(data.items || []);
        } catch { /* ignore */ }
    };

    useEffect(() => {
        fetchCandidates();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post('/employees', {
                name: `${form.firstName} ${form.lastName}`.trim(),
                email: form.email,
                department: form.department,
                joinDate: new Date().toISOString().split('T')[0],
                annualCTC: 0,
                bankAccountNumber: 'PENDING',
                taxRegime: 'New',
                status: 'onboarding'
            });
            setIsModalOpen(false);
            setForm({ firstName: '', lastName: '', email: '', phone: '', department: 'Engineering' });
            setPhotoFile(null);
            setPhotoPreview(null);
            fetchCandidates();
        } catch (err: any) {
            const serverMsg = err.response?.data?.message || err.response?.data?.error;
            const debugObj = err.response?.data?.missing ? JSON.stringify(err.response.data.missing) : '';
            alert(`${serverMsg || err.message || 'Failed to add candidate'} ${debugObj}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#f4f7f9] font-sans">
            {/* Tab Header */}
            <div className="bg-[#1d2b4d] text-white px-6 h-[40px] flex items-center shadow-sm">
                <div className="h-full flex items-center border-b-2 border-blue-500 px-1 font-bold text-[13px] tracking-tight">
                    Candidate
                </div>
            </div>

            {/* Toolbar */}
            <div className="bg-white border-b border-slate-200 px-6 py-2 flex items-center justify-between shadow-sm">
                <div className="flex items-center space-x-6">
                    <div className="flex items-center space-x-2 bg-white border border-slate-200 rounded px-3 py-1.5 cursor-pointer hover:bg-slate-50 transition-colors shadow-sm group">
                        <span className="text-[13px] font-medium text-slate-700 group-hover:text-slate-900">Candidate View</span>
                        <ChevronDown size={14} className="text-slate-400" />
                    </div>
                    <button className="text-[12px] font-bold text-blue-600 hover:text-blue-700 transition-colors uppercase tracking-wider">Edit</button>
                </div>

                <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-4 pr-4 border-r border-slate-100">
                        <span className="text-[12px] text-blue-600 hover:underline cursor-pointer font-medium">View All Data</span>
                        <div className="flex items-center space-x-2 bg-white border border-slate-200 rounded px-3 py-1.5 cursor-pointer hover:bg-slate-50 transition-colors shadow-sm">
                            <span className="text-[12px] font-medium text-slate-700">Reportees + My Data</span>
                            <ChevronDown size={14} className="text-slate-400 transition-transform group-hover:rotate-180" />
                        </div>
                    </div>
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded text-[12px] font-bold transition-all shadow-md shadow-blue-500/20 active:scale-95"
                        >
                            Add Candidate
                        </button>
                        <div className="flex items-center space-x-1 p-1">
                            <button className="p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600 rounded border border-slate-200 transition-all"><Maximize2 size={14} /></button>
                            <button className="p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600 rounded border border-slate-200 transition-all"><Filter size={14} /></button>
                            <button className="p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600 rounded border border-slate-200 transition-all"><MoreHorizontal size={14} /></button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 p-6 flex flex-col overflow-hidden">
                {/* Table Placeholder */}
                <div className="bg-white rounded-lg border border-slate-200 shadow-sm flex-1 flex flex-col overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[1200px]">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="p-3 w-10 border-r border-slate-100"><SlidersHorizontal size={14} className="text-slate-400" /></th>
                                    <th className="p-3 w-10 border-r border-slate-100">
                                        <input type="checkbox" className="rounded border-slate-300 pointer-events-none opacity-50" disabled />
                                    </th>
                                    {[
                                        'First name', 'Last name', 'Email ID', 'Official Email',
                                        'Onboarding Status', 'Department', 'Source of Hire',
                                        'PAN card number', 'Aadhaar card number'
                                    ].map((header, i) => (
                                        <th key={i} className="px-4 py-3 text-[12px] font-bold text-slate-500 border-r border-slate-100 whitespace-nowrap group cursor-pointer hover:bg-slate-100 transition-colors">
                                            <div className="flex items-center justify-between">
                                                <span>{header}</span>
                                                <ArrowUpDown size={12} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                        </table>
                    </div>

                    {/* Empty State or Table Rows */}
                    {candidates.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-20 bg-white">
                            <div className="w-64 h-48 bg-[url('https://img.freepik.com/premium-vector/vector-illustration-empty-state-search-no-records-found-isolated-white-background_675567-4225.jpg?w=826')] bg-contain bg-no-repeat bg-center opacity-70 mb-6"></div>
                            <p className="text-[15px] font-bold text-slate-800 tracking-tight">No records found</p>
                        </div>
                    ) : (
                        <div className="flex-1 overflow-auto bg-white">
                            <table className="w-full text-left border-collapse min-w-[1200px]">
                                <tbody className="divide-y divide-slate-100">
                                    {candidates.map((c: any) => (
                                        <tr key={c.id} className="hover:bg-slate-50 transition-colors group">
                                            <td className="p-3 w-10 border-r border-slate-100 text-center"><MoreHorizontal size={14} className="text-slate-300 group-hover:text-slate-500 cursor-pointer" /></td>
                                            <td className="p-3 w-10 border-r border-slate-100 text-center">
                                                <input type="checkbox" className="rounded border-slate-300 cursor-pointer" />
                                            </td>
                                            <td className="px-4 py-3 text-[13px] font-semibold text-slate-800 border-r border-slate-100">{c.name.split(' ')[0]}</td>
                                            <td className="px-4 py-3 text-[13px] font-medium text-slate-600 border-r border-slate-100">{c.name.split(' ').slice(1).join(' ')}</td>
                                            <td className="px-4 py-3 text-[13px] font-medium text-slate-600 border-r border-slate-100">{c.email}</td>
                                            <td className="px-4 py-3 text-[13px] font-medium text-slate-600 border-r border-slate-100">—</td>
                                            <td className="px-4 py-3 border-r border-slate-100">
                                                <span className="px-2 py-1 text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-600 rounded">Pending</span>
                                            </td>
                                            <td className="px-4 py-3 text-[13px] font-medium text-slate-600 border-r border-slate-100">{c.department}</td>
                                            <td className="px-4 py-3 text-[13px] font-medium text-slate-600 border-r border-slate-100">Direct</td>
                                            <td className="px-4 py-3 text-[13px] font-medium text-slate-600 border-r border-slate-100">—</td>
                                            <td className="px-4 py-3 text-[13px] font-medium text-slate-600 border-r border-slate-100">—</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Floating Action Menu (Zoho People style) */}
            <div className="fixed right-6 top-1/2 -translate-y-1/2 flex flex-col space-y-3 pointer-events-none">
                <div className="w-10 h-10 bg-white rounded-full border border-slate-200 shadow-xl flex items-center justify-center text-slate-500 cursor-pointer hover:bg-slate-50 hover:text-blue-500 transition-all pointer-events-auto group relative">
                    <User size={18} />
                    <span className="absolute right-full mr-2 px-2 py-1 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Help Desk</span>
                </div>
            </div>

            {/* Add Candidate Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-[1100px] max-h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden border border-slate-100 animate-in slide-in-from-bottom-4 duration-300">
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
                            <h2 className="text-[15px] font-black text-slate-800 tracking-tight">Add Candidate</h2>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-all"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
                            <div className="flex-1 overflow-y-auto p-8 bg-[#F4F7F9]">
                                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 space-y-10">
                                    <div className="space-y-6">
                                        <h3 className="text-[13px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-3">Candidate Details</h3>

                                    <div className="grid grid-cols-2 gap-x-12 gap-y-6">
                                        {/* Left Side */}
                                        <div className="space-y-6">
                                            <div className="flex items-center space-x-4">
                                                <label className="w-32 text-[12px] font-bold text-slate-600 flex items-center">
                                                    Email ID <span className="text-rose-500 ml-1 font-black">*</span>
                                                </label>
                                                <input 
                                                    type="email" 
                                                    required 
                                                    value={form.email}
                                                    onChange={e => setForm({...form, email: e.target.value})}
                                                    className="flex-1 bg-white border border-slate-200 rounded-md px-3 py-2 text-[13px] focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none" 
                                                />
                                            </div>

                                            <div className="flex items-start space-x-4">
                                                <label className="w-32 text-[12px] font-bold text-slate-600 pt-2 flex items-center">
                                                    Phone <span className="text-rose-500 ml-1 font-black">*</span>
                                                </label>
                                                <div className="flex-1 flex space-x-2">
                                                    <div className="w-24 flex items-center justify-between border border-slate-200 rounded-md px-3 py-2 bg-slate-50 cursor-pointer">
                                                        <img src="https://flagcdn.com/w20/in.png" className="w-4 h-3 rounded-sm" alt="IN" />
                                                        <span className="text-[12px] font-medium text-slate-600">+91</span>
                                                        <ChevronDown size={12} className="text-slate-400" />
                                                    </div>
                                                    <input 
                                                        type="text" 
                                                        value={form.phone}
                                                        onChange={e => setForm({...form, phone: e.target.value})}
                                                        className="flex-1 border border-slate-200 rounded-md px-3 py-2 text-[13px] focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none" 
                                                    />
                                                </div>
                                            </div>

                                            <div className="flex items-center space-x-4">
                                                <label className="w-32 text-[12px] font-bold text-slate-600">UAN number</label>
                                                <input type="text" className="flex-1 border border-slate-200 rounded-md px-3 py-2 text-[13px] focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" />
                                            </div>

                                            <div className="flex items-center space-x-4">
                                                <label className="w-32 text-[12px] font-bold text-slate-600">Aadhaar card number</label>
                                                <input type="text" className="flex-1 border border-slate-200 rounded-md px-3 py-2 text-[13px] focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" />
                                            </div>

                                            <div className="flex items-center space-x-4">
                                                <label className="w-32 text-[12px] font-bold text-slate-600">PAN card number</label>
                                                <input type="text" className="flex-1 border border-slate-200 rounded-md px-3 py-2 text-[13px] focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" />
                                            </div>

                                            <div className="flex items-start space-x-4">
                                                <label className="w-32 text-[12px] font-bold text-slate-600 pt-2">Photo</label>
                                                <div 
                                                    className="flex-1 border-2 border-dashed border-slate-200 rounded-xl p-6 bg-slate-50/50 hover:bg-slate-50 hover:border-blue-300 transition-all flex flex-col items-center cursor-pointer group relative overflow-hidden"
                                                    onClick={() => document.getElementById('candidate-photo')?.click()}
                                                >
                                                    <input 
                                                        type="file" 
                                                        id="candidate-photo" 
                                                        className="hidden" 
                                                        accept="image/jpeg, image/png, image/gif"
                                                        onChange={(e) => {
                                                            const file = e.target.files?.[0];
                                                            if (file) {
                                                                setPhotoFile(file);
                                                                setPhotoPreview(URL.createObjectURL(file));
                                                            }
                                                        }}
                                                    />
                                                    {photoPreview ? (
                                                        <div className="absolute inset-0 w-full h-full bg-slate-100 flex items-center justify-center">
                                                            <img src={photoPreview} alt="Preview" className="w-full h-full object-contain" />
                                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center">
                                                                <Upload size={24} className="text-white mb-2" />
                                                                <span className="text-white text-[11px] font-bold uppercase tracking-wider">Change Photo</span>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <div className="w-10 h-10 bg-white rounded-full shadow-sm flex items-center justify-center text-slate-400 group-hover:text-blue-500 mb-3 border border-slate-100 transition-all group-hover:scale-110">
                                                                <Upload size={18} />
                                                            </div>
                                                            <p className="text-[11px] text-slate-500 font-medium">
                                                                Upload from <span className="text-blue-600 hover:underline">Desktop</span> / <span className="text-blue-600 hover:underline">Zoho WorkDrive</span>
                                                            </p>
                                                            <p className="text-[10px] text-sky-600 mt-2 font-black tracking-widest uppercase active:scale-95 transition-all">Others</p>
                                                            <p className="text-[10px] text-slate-400 mt-4 uppercase font-bold tracking-wider">Files supported: JPG, PNG, GIF, JPEG  •  Max. size is 5 MB</p>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right Side */}
                                        <div className="space-y-6">
                                            <div className="flex items-center space-x-4">
                                                <label className="w-32 text-[12px] font-bold text-slate-600 flex items-center">
                                                    First name <span className="text-rose-500 ml-1 font-black">*</span>
                                                </label>
                                                <input 
                                                    type="text" 
                                                    required 
                                                    value={form.firstName}
                                                    onChange={e => setForm({...form, firstName: e.target.value})}
                                                    className="flex-1 border border-slate-200 rounded-md px-3 py-2 text-[13px] focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" 
                                                />
                                            </div>

                                            <div className="flex items-center space-x-4">
                                                <label className="w-32 text-[12px] font-bold text-slate-600 flex items-center">
                                                    Last name <span className="text-rose-500 ml-1 font-black">*</span>
                                                </label>
                                                <input 
                                                    type="text" 
                                                    required 
                                                    value={form.lastName}
                                                    onChange={e => setForm({...form, lastName: e.target.value})}
                                                    className="flex-1 border border-slate-200 rounded-md px-3 py-2 text-[13px] focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" 
                                                />
                                            </div>

                                            <div className="flex items-center space-x-4 pt-12">
                                                <label className="w-32 text-[12px] font-bold text-slate-600 pt-8">Official Email</label>
                                                <input type="text" className="flex-1 border border-slate-200 rounded-md px-3 py-2 text-[13px] mt-8 bg-slate-50/30 outline-none" />
                                            </div>
                                        </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Modal Footer */}
                            <div className="px-8 py-4 bg-white border-t border-slate-100 flex items-center space-x-3 shadow-[0_-4px_20px_rgba(0,0,0,0.03)] shrink-0">
                                <button 
                                    type="submit"
                                    disabled={loading}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded text-[12px] font-bold transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2 disabled:opacity-50"
                                >
                                    {loading && <Loader2 size={14} className="animate-spin" />}
                                    Submit
                                </button>
                                <button type="button" className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-5 py-2 rounded text-[12px] font-bold transition-all hover:border-slate-300">Save Draft</button>
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-5 py-2 rounded text-[12px] font-bold transition-all hover:border-slate-300"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Onboarding;
