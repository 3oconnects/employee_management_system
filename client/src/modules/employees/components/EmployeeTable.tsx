import React, { useState, useEffect, useCallback } from 'react';
import {
    Users, Search, UserPlus, Mail, ChevronLeft, ChevronRight,
    Loader2, Briefcase, Building2, Pencil, Eye, Trash2, AlertTriangle, X,
    Download, Calendar, LayoutGrid, List, GitBranch, ChevronDown, Hash,
    Phone, MessageSquare, Sparkles, Check, BellRing, ExternalLink, ShieldCheck
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../../services/api';
import { useAuthStore } from '../../../store/authStore';
import debounce from 'lodash/debounce';
import { toast } from '../../../components/ui';
import { AddEmployeeModal, EditEmployeeModal } from './modals/EmployeeModals';
import { AddEmployeeForm, EditEmployeeForm } from './modals/shared';
import BulkUploadModal from './modals/BulkUploadModal';

interface Employee {
    id: string; user_id?: number | null; name: string; email: string; position: string;
    role?: string; role_id?: number | null;
    department: string; department_name?: string;
    department_id?: string | number | null;
    team_id?: string | number | null;
    status: 'active' | 'onboarding' | 'terminated';
    join_date: string; manager_id?: string | null;
    reporting_manager_id?: string | null;
    manager_name?: string | null;
    availability_status?: 'available' | 'busy' | 'away' | 'offline' | 'dnd' | 'break';
    is_checked_in?: boolean;
    avatar_url?: string;
}
interface TreeNode extends Employee { children: TreeNode[]; }

const COLORS: Record<string,string> = {A:'#6366f1',B:'#8b5cf6',C:'#ec4899',D:'#f59e0b',E:'#10b981',F:'#3b82f6',G:'#ef4444',H:'#14b8a6',I:'#f97316',J:'#84cc16',K:'#06b6d4',L:'#a855f7',M:'#e11d48',N:'#0ea5e9',O:'#22c55e',P:'#d946ef',Q:'#fb923c',R:'#64748b',S:'#6366f1',T:'#8b5cf6',U:'#ec4899',V:'#10b981',W:'#3b82f6',X:'#f59e0b',Y:'#14b8a6',Z:'#ef4444'};
const clr = (n: string) => COLORS[(n?.[0]??'U').toUpperCase()]??'#6366f1';
const ini = (n: string) => n?.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2)||'??';
const fmtId = (id: string) => {
    if (!id) return 'N/A';
    if (id.startsWith('EMP-')) return id;
    if (id.startsWith('EMP')) return `EMP-${id.slice(3)}`;
    return `EMP-${id.slice(0, 6).toUpperCase()}`;
};

const ST: Record<string,{dot:string;bg:string;text:string}> = {
    active:     {dot:'bg-emerald-500',bg:'bg-emerald-50',text:'text-emerald-700'},
    onboarding: {dot:'bg-amber-500',  bg:'bg-amber-50',  text:'text-amber-700'},
    terminated: {dot:'bg-rose-500',   bg:'bg-rose-50',   text:'text-rose-600'},
};

/* Org tree node */
const TreeNode: React.FC<{node:TreeNode;depth:number}> = ({node,depth}) => {
    const [open,setOpen] = useState(depth<2);
    const color = clr(node.name);
    return (
        <div className={depth>0?'ml-5 border-l border-slate-200/80 pl-3':''}>
            <button onClick={()=>setOpen(!open)}
                className="w-full flex items-center gap-3 py-2 px-2.5 rounded-lg hover:bg-slate-50 transition-all text-left group">
                {node.avatar_url ? (
                    <img src={node.avatar_url} alt={node.name} className="w-8 h-8 rounded-lg object-cover flex-shrink-0 ring-1 ring-slate-200" />
                ) : (
                    <div className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-white shadow-2xs"
                        style={{backgroundColor:color}}>{ini(node.name)}</div>
                )}
                <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-bold text-slate-800 truncate">{node.name}</p>
                    <p className="text-[10px] text-slate-400 truncate">{node.position||'Employee'} · {node.department||node.department_name||''}</p>
                </div>
                {node.children.length>0&&(
                    <span className="flex items-center gap-1 flex-shrink-0">
                        <span className="text-[9px] font-bold text-slate-500 bg-slate-100 border border-slate-200/60 px-1.5 py-0.2 rounded-md">{node.children.length}</span>
                        <ChevronDown size={11} className={`text-slate-400 transition-transform ${open?'rotate-180':''}`}/>
                    </span>
                )}
            </button>
            {open&&node.children.map(c=><TreeNode key={c.id} node={c} depth={depth+1}/>)}
        </div>
    );
};

/* Main */
const EmployeeTable: React.FC = () => {
    const [employees,setEmployees] = useState<Employee[]>([]);
    const [loading,setLoading] = useState(true);
    const [searchTerm,setSearchTerm] = useState('');
    const [page,setPage] = useState(1);
    const [totalPages,setTotalPages] = useState(1);
    const [totalItems,setTotalItems] = useState(0);
    const [statusFilter,setStatusFilter] = useState('');
    const [deptFilter,setDeptFilter] = useState('');
    const [view,setView] = useState<'card'|'table'|'tree'>('card');
    const [refreshKey, setRefreshKey] = useState(0);
    const refresh = () => { setPage(1); setRefreshKey(k => k + 1); };

    const fetchEmp = async (search:string,p:number,v?:string,silent=false) => {
        if(!silent)setLoading(true);
        try {
            const currentView = v || view;
            const limit = currentView === 'tree' ? 1000 : 16;
            const {data} = await api.get('/employees',{params:{search,page:p,limit}});
            setEmployees(data.items||[]);
            setTotalPages(data.totalPages||1);
            setTotalItems(data.totalItems||0);
        } catch{}finally{setLoading(false);}
    };
    const dSearch = useCallback(debounce((v:string)=>{setPage(1);fetchEmp(v,1);},400),[]);
    useEffect(()=>{fetchEmp(searchTerm,page);},[page, refreshKey]);

    // Re-fetch when switching to tree view to get all nodes
    useEffect(() => {
        if (view === 'tree') {
            fetchEmp(searchTerm, 1, 'tree');
        } else {
            fetchEmp(searchTerm, page, view);
        }
    }, [view]);
    
    // ─── REAL-TIME UPDATES (SSE) ──────────────────────────────────────────
    const currentToken = useAuthStore(s => s.accessToken);
    useEffect(() => {
        if (!currentToken) return;

        // Construct the full SSE URL
        const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1';
        const sseUrl = `${baseUrl}/realtime/stream`;

        let source: EventSource | null = null;
        try {
            source = new EventSource(`${sseUrl}?token=${currentToken}`);

            source.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'STATUS_UPDATE') {
                        const { email, status } = data.data;
                        setEmployees(prev => prev.map(emp => 
                            emp.email === email 
                                ? { ...emp, availability_status: status } 
                                : emp
                        ));
                    }
                } catch {
                    // Ignore transient parse error
                }
            };

            source.onerror = () => {
                source?.close();
            };
        } catch {
            // Ignore connection setup error
        }

        return () => {
            source?.close();
        };
    }, [currentToken]);

    /* Modals */
    const [showAdd,setShowAdd]   = useState(false);
    const [showBulk,setShowBulk] = useState(false);
    const [addForm,setAddForm]=useState<AddEmployeeForm>({name:'',email:'',phone:'',dateOfBirth:'',gender:'',personalEmail:'',department:'',position:'',role:'employee',joinDate:'',employmentType:'full_time',status:'onboarding',addressLine1:'',city:'',state:'',pincode:'',reportingManagerId:'',reportingManagerName:'',annualCTC:'',bankAccountNumber:'',taxRegime:'New',highestDegree:'',fieldOfStudy:'',institution:'',graduationYear:'',internshipStartDate:'',internshipEndDate:'',internshipStipend:'',internshipSupervisor:'',internshipCollege:''});
    const [addLoading,setAddLoading]=useState(false);
    const [addError,setAddError]=useState('');
    const [showEdit,setShowEdit]=useState(false);
    const [editId,setEditId]=useState<string|null>(null);
    const [editForm,setEditForm]=useState<EditEmployeeForm>({name:'',email:'',department:'',position:'',role:'employee',status:'',joinDate:'',reportingManagerId:'',reportingManagerName:''});
    const [editLoading,setEditLoading]=useState(false);
    const [editError,setEditError]=useState('');

    const handleAdd=async(e:React.FormEvent)=>{
        e.preventDefault();setAddLoading(true);setAddError('');
        try{
            await api.post('/employees',{
                name:addForm.name, email:addForm.email, phone:addForm.phone,
                dateOfBirth:addForm.dateOfBirth||undefined, gender:addForm.gender||undefined,
                personalEmail:addForm.personalEmail||undefined,
                department:addForm.department, position:addForm.position||undefined,
                role:addForm.role||'employee',
                joinDate:addForm.joinDate, employmentType:addForm.employmentType,
                status:addForm.status,
                addressLine1:addForm.addressLine1||undefined, city:addForm.city||undefined,
                state:addForm.state||undefined, pincode:addForm.pincode||undefined,
                reportingManagerId:addForm.reportingManagerId||undefined,
                annualCTC:Number(addForm.annualCTC),
                bankAccountNumber:addForm.bankAccountNumber||undefined,
                taxRegime:addForm.taxRegime,
                highestDegree:addForm.highestDegree||undefined, fieldOfStudy:addForm.fieldOfStudy||undefined,
                institution:addForm.institution||undefined, graduationYear:addForm.graduationYear||undefined,
                internshipStartDate:addForm.internshipStartDate||undefined,
                internshipEndDate:addForm.internshipEndDate||undefined,
                internshipStipend:addForm.internshipStipend?Number(addForm.internshipStipend):undefined,
                internshipSupervisor:addForm.internshipSupervisor||undefined,
                internshipCollege:addForm.internshipCollege||undefined,
            });
            setShowAdd(false);
            setAddForm({name:'',email:'',phone:'',dateOfBirth:'',gender:'',personalEmail:'',department:'',position:'',role:'employee',joinDate:'',employmentType:'full_time',status:'onboarding',addressLine1:'',city:'',state:'',pincode:'',reportingManagerId:'',reportingManagerName:'',annualCTC:'',bankAccountNumber:'',taxRegime:'New',highestDegree:'',fieldOfStudy:'',institution:'',graduationYear:'',internshipStartDate:'',internshipEndDate:'',internshipStipend:'',internshipSupervisor:'',internshipCollege:''});
            refresh();}
        catch(err:any){setAddError(err.response?.data?.message||'Failed');}
        finally{setAddLoading(false);}
    };
    const openEdit=(emp:Employee)=>{
        setEditId(emp.id);
        setEditForm({
            name:emp.name,
            email:emp.email,
            department:emp.department||emp.department_name||'',
            department_id: emp.department_id ? String(emp.department_id) : '',
            team_id: emp.team_id ? String(emp.team_id) : '',
            position:emp.position,
            role:emp.role||'employee',
            status:emp.status||'active',
            joinDate:emp.join_date?new Date(emp.join_date).toISOString().slice(0,10):'',
            reportingManagerId: emp.reporting_manager_id || '',
            reportingManagerName: emp.manager_name || ''
        });
        setShowEdit(true);
    };
    const handleUpdate=async(e:React.FormEvent)=>{
        e.preventDefault();if(!editId)return;setEditLoading(true);setEditError('');
        try{await api.put(`/employees/${editId}`,{
                name:editForm.name,
                email:editForm.email,
                department:editForm.department,
                department_id: editForm.department_id ? Number(editForm.department_id) : undefined,
                team_id: editForm.team_id ? Number(editForm.team_id) : undefined,
                position:editForm.position,
                role:editForm.role||'employee',
                status:editForm.status,
                join_date:editForm.joinDate,
                reporting_manager_id: editForm.reportingManagerId
            });
            setShowEdit(false);fetchEmp(searchTerm,page);}
        catch(err:any){setEditError(err.response?.data?.message||'Failed');}
        finally{setEditLoading(false);}
    };

    const [showDelete, setShowDelete] = useState<Employee | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [deleteError, setDeleteError] = useState('');
    const [terminateLoading, setTerminateLoading] = useState(false);

    const handleTerminateConfirm = async () => {
        if (!showDelete) return;
        setTerminateLoading(true);
        setDeleteError('');
        try {
            await api.put(`/employees/${showDelete.id}`, { status: 'terminated' });
            const targetId = showDelete.id;
            const targetName = showDelete.name;
            setShowDelete(null);
            toast.success(`Employee ${targetName} marked as Terminated. Historical records preserved in Terminated list.`);
            setEmployees(prev => prev.map(e => e.id === targetId ? { ...e, status: 'terminated' } : e));
            fetchEmp(searchTerm, page, undefined, true);
        } catch (err: any) {
            setDeleteError(err.response?.data?.message || 'Failed to terminate employee.');
        } finally {
            setTerminateLoading(false);
        }
    };


    // Reachout Coming Soon State
    const [reachoutModal, setReachoutModal] = useState<{ channel: 'call' | 'text' | 'mail'; emp: Employee } | null>(null);
    const [notifiedChannels, setNotifiedChannels] = useState<Record<string, boolean>>({});

    const handleReachout = (channel: 'call' | 'text' | 'mail', employee: Employee) => {
        setReachoutModal({ channel, emp: employee });
        const channelLabel = channel === 'call' ? 'Direct Voice Call' : channel === 'text' ? 'Instant Messaging' : 'In-App Mail';
        toast.info(`${channelLabel} is coming soon!`);
    };

    const handleDeleteConfirm = async () => {
        if (!showDelete) return;
        setDeleteLoading(true);
        setDeleteError('');
        try {
            await api.delete(`/employees/${showDelete.id}`);
            const deletedId = showDelete.id;
            setShowDelete(null);
            // Drop the card in place and resync quietly — no full-list spinner
            setEmployees(prev => prev.filter(e => e.id !== deletedId));
            setTotalItems(n => Math.max(0, n - 1));
            if (employees.length <= 1 && page > 1) setPage(page - 1);
            else fetchEmp(searchTerm, page, undefined, true);
        } catch (err: any) {
            setDeleteError(err.response?.data?.message || 'Failed to delete employee.');
        } finally {
            setDeleteLoading(false);
        }
    };

    const filtered=employees.filter(e=>{
        if(statusFilter&&e.status!==statusFilter)return false;
        if(deptFilter&&(e.department||e.department_name)!==deptFilter)return false;
        return true;
    });
    const depts=[...new Set(employees.map(e=>e.department||e.department_name||''))].filter(Boolean).sort();
    const activeCount=employees.filter(e=>e.status==='active'||!e.status).length;
    const onboardCount=employees.filter(e=>e.status==='onboarding').length;
    const terminatedCount=employees.filter(e=>e.status==='terminated').length;

    const buildTree=():TreeNode[]=>{
        const map=new Map<string,TreeNode>();
        const userIdMap=new Map<number,TreeNode>();

        employees.forEach(e=>{
            const node={...e,children:[]} as TreeNode;
            map.set(e.id,node);
            if(e.user_id) userIdMap.set(Number(e.user_id),node);
        });

        // The head of the company: the explicit CEO, else the top-most "head/chief/founder"
        const titleOf=(n:TreeNode)=>String(n.position||'').toLowerCase();
        const ceo=[...map.values()].find(n=>/(ceo|chief executive)/.test(titleOf(n)))
            ||[...map.values()].find(n=>/(founder|managing director|president)/.test(titleOf(n)));

        const roots:TreeNode[]=[];
        map.forEach(node=>{
            if(node===ceo) return;
            const byUser=node.reporting_manager_id?userIdMap.get(Number(node.reporting_manager_id)):undefined;
            const byEmp=(node as any).manager_id?map.get(String((node as any).manager_id)):undefined;
            const parent=[byUser,byEmp].find(p=>p&&p!==node);
            // A manager who no longer exists must not leave a ghost box: fall back to the CEO
            if(parent) parent.children.push(node);
            else if(ceo) ceo.children.push(node);
            else roots.push(node);
        });
        return ceo?[ceo,...roots]:roots;
    };

    return (
        /* Same outer wrapper as Dashboard page */
        <div className="min-h-screen bg-[#F4F5F8]">
            <div className="max-w-[1440px] mx-auto px-6 py-6 space-y-5">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-[18px] font-black text-slate-900 tracking-tight">Employees</h2>
                        <p className="text-[11px] text-slate-400 mt-0.5">{totalItems} people in your organization</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200/90 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-2xs transition-all">
                            <Download size={13}/> Export
                        </button>
                        <button onClick={()=>setShowBulk(true)}
                            className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-violet-200/90 text-violet-700 rounded-lg text-xs font-semibold hover:bg-violet-50 hover:border-violet-300 shadow-2xs transition-all">
                            <Download size={13} className="rotate-180"/> Bulk Upload
                        </button>
                        <button onClick={()=>setShowAdd(true)}
                            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold shadow-xs hover:bg-indigo-500 transition-all">
                            <UserPlus size={13}/> Add Employee
                        </button>
                    </div>
                </div>

                {/* Stats filter strip */}
                <div className="flex flex-wrap items-center gap-2">
                    <div className="inline-flex items-center p-1 bg-white border border-slate-200/90 rounded-lg shadow-2xs gap-1">
                        {[
                            { label: 'All Employees', val: totalItems, f: '', badgeCls: 'bg-slate-100 text-slate-700' },
                            { label: 'Active', val: activeCount, f: 'active', badgeCls: 'bg-emerald-50 text-emerald-700 border border-emerald-200/50' },
                            { label: 'Onboarding', val: onboardCount, f: 'onboarding', badgeCls: 'bg-amber-50 text-amber-700 border border-amber-200/50' },
                            { label: 'Terminated', val: terminatedCount, f: 'terminated', badgeCls: 'bg-rose-50 text-rose-700 border border-rose-200/50' },
                        ].map(s => {
                            const isSelected = statusFilter === s.f;
                            return (
                                <button
                                    key={s.label}
                                    type="button"
                                    onClick={() => setStatusFilter(s.f)}
                                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                                        isSelected
                                            ? 'bg-slate-900 text-white shadow-2xs'
                                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                                    }`}
                                >
                                    <span>{s.label}</span>
                                    <span className={`text-[11px] font-bold px-1.5 py-0.2 rounded-md ${
                                        isSelected ? 'bg-white/20 text-white' : s.badgeCls
                                    }`}>
                                        {s.val}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Toolbar */}
                <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs px-3.5 py-2.5 flex flex-col sm:flex-row gap-3 items-center">
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14}/>
                        <input type="text" placeholder="Search by name, email or department…"
                            className="w-full bg-slate-50 border border-slate-200/80 rounded-lg pl-9 pr-3.5 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-indigo-400 focus:bg-white focus:ring-1 focus:ring-indigo-100 transition-all placeholder:text-slate-400"
                            value={searchTerm} onChange={e=>{setSearchTerm(e.target.value);dSearch(e.target.value);}}/>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}
                            className="bg-slate-50 border border-slate-200/80 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none cursor-pointer hover:bg-white focus:border-indigo-400 transition-all">
                            <option value="">All Status</option>
                            <option value="active">Active</option>
                            <option value="onboarding">Onboarding</option>
                            <option value="terminated">Terminated</option>
                        </select>
                        {depts.length>0&&(
                            <select value={deptFilter} onChange={e=>setDeptFilter(e.target.value)}
                                className="bg-slate-50 border border-slate-200/80 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none cursor-pointer max-w-[130px] hover:bg-white focus:border-indigo-400 transition-all">
                                <option value="">All Depts</option>
                                {depts.map(d=><option key={d} value={d}>{d}</option>)}
                            </select>
                        )}
                        <div className="flex items-center bg-slate-100/80 border border-slate-200/80 rounded-lg p-0.5 gap-0.5">
                            {([{id:'card',Icon:LayoutGrid},{id:'table',Icon:List},{id:'tree',Icon:GitBranch}] as const).map(v=>(
                                <button key={v.id} onClick={()=>setView(v.id)} title={v.id}
                                    className={`w-7 h-7 flex items-center justify-center rounded-md transition-all ${view===v.id?'bg-white text-slate-900 shadow-2xs font-bold':'text-slate-400 hover:text-slate-700'}`}>
                                    <v.Icon size={14}/>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Content */}
                {loading?(
                    <div className="bg-white rounded-xl border border-slate-200/90 py-20 flex flex-col items-center gap-3 shadow-2xs">
                        <Loader2 size={22} className="animate-spin text-indigo-500"/>
                        <p className="text-xs text-slate-400">Loading employees…</p>
                    </div>
                ):filtered.length===0?(
                    <div className="bg-white rounded-xl border border-slate-200/90 py-20 flex flex-col items-center gap-4 text-center shadow-2xs">
                        <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-200/60"><Users size={24} className="text-slate-400"/></div>
                        <div><p className="text-sm font-bold text-slate-800">No employees found</p><p className="text-xs text-slate-400 mt-1">Try adjusting your search or filters</p></div>
                        <button onClick={()=>setShowAdd(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold shadow-xs hover:bg-indigo-500 transition-all"><UserPlus size={13}/> Add Employee</button>
                    </div>
                ):view==='tree'?(
                    /* Org Tree */
                    <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5">
                        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
                            <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center"><GitBranch size={14} className="text-indigo-600"/></div>
                            <div>
                                <h3 className="text-xs font-bold text-slate-900">Reporting Hierarchy</h3>
                                <p className="text-[10px] text-slate-400">{employees.length} people · Click to expand</p>
                            </div>
                        </div>
                        <div className="max-h-[520px] overflow-y-auto">
                            {buildTree().map(root=><TreeNode key={root.id} node={root} depth={0}/>)}
                        </div>
                    </div>
                ):view==='card'?(
                    /* ═══ CARD GRID — Crisp Enterprise ═══ */
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filtered.map(emp=>{
                            const color=clr(emp.name);
                            const st=ST[emp.status]||ST.active;
                            return(
                                <div key={emp.id}
                                    className="bg-white rounded-xl overflow-hidden shadow-2xs hover:shadow-md hover:border-slate-300/80 transition-all duration-200 group border border-slate-200/90 flex flex-col">

                                    {/* ── Header Banner ── */}
                                    <div className="relative h-20 flex items-end px-4 pb-0"
                                        style={{background:`linear-gradient(135deg, ${color}dd 0%, ${color} 100%)`}}>

                                        {/* Availability Indicator (Top Left) */}
                                        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 px-2 py-0.5 bg-black/30 backdrop-blur-md rounded-md border border-white/15">
                                            <div className={`w-1.5 h-1.5 rounded-full ${
                                                emp.availability_status === 'busy' || emp.availability_status === 'dnd' ? 'bg-rose-400' :
                                                emp.availability_status === 'away' || emp.availability_status === 'break' ? 'bg-amber-400' :
                                                emp.availability_status === 'offline' ? 'bg-slate-400' :
                                                'bg-emerald-400'
                                            }`} />
                                            <span className="text-[9px] font-bold text-white uppercase tracking-wider">
                                                {emp.availability_status || 'available'}
                                            </span>
                                        </div>

                                        {/* Attendance Status (Top Right) */}
                                        <div className="absolute top-2.5 right-2.5">
                                            {emp.is_checked_in ? (
                                                <div className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase bg-emerald-950/40 backdrop-blur-md text-emerald-200 border border-emerald-400/30">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                                    Checked In
                                                </div>
                                            ) : emp.availability_status && emp.availability_status !== 'offline' ? (
                                                <div className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase bg-indigo-950/40 backdrop-blur-md text-indigo-200 border border-indigo-400/30">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                                                    Online
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase bg-black/25 backdrop-blur-md text-slate-200 border border-white/10 opacity-70">
                                                    Not Checked In
                                                </div>
                                            )}
                                        </div>

                                        {/* Avatar overlapping banner */}
                                        <Link to={`/profile/${emp.id}`}
                                            className="relative z-10 w-14 h-14 rounded-xl flex items-center justify-center text-lg font-bold text-white shadow-md ring-3 ring-white mb-[-22px] transition-transform group-hover:scale-105 select-none overflow-hidden"
                                            style={{background:`linear-gradient(145deg,${color},${color}dd)`}}>
                                            {emp.avatar_url ? (
                                                <img src={emp.avatar_url} alt={emp.name} className="w-full h-full object-cover" />
                                            ) : (
                                                ini(emp.name)
                                            )}
                                        </Link>
                                    </div>

                                    {/* ── Body ── */}
                                    <div className="pt-7 px-4 pb-3.5 flex-1 flex flex-col justify-between">
                                        <div>
                                            {/* Name + ID */}
                                            <div className="flex items-start justify-between gap-2 mb-2">
                                                <Link to={`/profile/${emp.id}`}
                                                    className="text-[13px] font-bold text-slate-900 hover:text-indigo-600 transition-colors leading-tight truncate block">
                                                    {emp.name}
                                                </Link>
                                                <span className="text-[10px] font-mono font-medium text-slate-500 bg-slate-50 border border-slate-200/70 px-1.5 py-0.2 rounded-md shrink-0">
                                                    {fmtId(emp.id)}
                                                </span>
                                            </div>

                                            {/* Role & Dept pills */}
                                            <div className="flex flex-wrap gap-1.5 mb-2.5">
                                                {emp.position&&(
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium text-slate-700 bg-slate-100 border border-slate-200/60">
                                                        <Briefcase size={9}/>{emp.position}
                                                    </span>
                                                )}
                                                {(emp.department||emp.department_name)&&(
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border"
                                                        style={{backgroundColor:`${color}12`, borderColor:`${color}30`, color}}>
                                                        <Building2 size={9}/>{emp.department||emp.department_name}
                                                    </span>
                                                )}
                                                {emp.role&&(
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold text-violet-700 bg-violet-50 border border-violet-200/70 capitalize" title={`System Role: ${emp.role}`}>
                                                        <ShieldCheck size={9}/>{emp.role.replace(/_/g, ' ')}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Email */}
                                            <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-3">
                                                <Mail size={11} className="text-slate-400 flex-shrink-0"/>
                                                <span className="truncate">{emp.email}</span>
                                            </div>

                                            {/* ── Quick Reachout Action Strip ── */}
                                            <div className="grid grid-cols-3 gap-1.5 mb-3">
                                                <button 
                                                    type="button" 
                                                    onClick={(e) => { e.stopPropagation(); handleReachout('call', emp); }}
                                                    className="py-1 px-1.5 rounded-md bg-slate-50 hover:bg-blue-50 border border-slate-200/80 hover:border-blue-200 text-slate-600 hover:text-blue-600 text-[10px] font-semibold flex items-center justify-center gap-1 transition-all group/btn shadow-2xs"
                                                    title={`Call ${emp.name}`}
                                                >
                                                    <Phone size={10} className="text-blue-500 group-hover/btn:scale-110 transition-transform" strokeWidth={2.4} />
                                                    <span>Call</span>
                                                </button>
                                                <button 
                                                    type="button" 
                                                    onClick={(e) => { e.stopPropagation(); handleReachout('text', emp); }}
                                                    className="py-1 px-1.5 rounded-md bg-slate-50 hover:bg-indigo-50 border border-slate-200/80 hover:border-indigo-200 text-slate-600 hover:text-indigo-600 text-[10px] font-semibold flex items-center justify-center gap-1 transition-all group/btn shadow-2xs"
                                                    title={`Message ${emp.name}`}
                                                >
                                                    <MessageSquare size={10} className="text-indigo-500 group-hover/btn:scale-110 transition-transform" strokeWidth={2.4} />
                                                    <span>Text</span>
                                                </button>
                                                <button 
                                                    type="button" 
                                                    onClick={(e) => { e.stopPropagation(); handleReachout('mail', emp); }}
                                                    className="py-1 px-1.5 rounded-md bg-slate-50 hover:bg-violet-50 border border-slate-200/80 hover:border-violet-200 text-slate-600 hover:text-violet-600 text-[10px] font-semibold flex items-center justify-center gap-1 transition-all group/btn shadow-2xs"
                                                    title={`Email ${emp.name}`}
                                                >
                                                    <Mail size={10} className="text-violet-500 group-hover/btn:scale-110 transition-transform" strokeWidth={2.4} />
                                                    <span>Mail</span>
                                                </button>
                                            </div>
                                        </div>

                                        {/* Footer */}
                                        <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 mt-1">
                                            <span className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
                                                <Calendar size={10}/>
                                                {emp.join_date?new Date(emp.join_date).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}):'—'}
                                            </span>
                                            <div className="flex items-center gap-1">
                                                <Link to={`/profile/${emp.id}`}
                                                    className="w-7 h-7 flex items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50/50 transition-all"
                                                    title="View profile">
                                                    <Eye size={12}/>
                                                </Link>
                                                <button onClick={()=>openEdit(emp)}
                                                    className="w-7 h-7 flex items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50/50 transition-all"
                                                    title="Edit">
                                                    <Pencil size={11}/>
                                                </button>
                                                <button onClick={()=>setShowDelete(emp)}
                                                    className="w-7 h-7 flex items-center justify-center rounded-md border border-slate-200 text-slate-400 hover:border-rose-200 hover:text-rose-600 hover:bg-rose-50 transition-all"
                                                    title="Delete employee">
                                                    <Trash2 size={11}/>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ):(
                    /* Table */
                    <div className="bg-white rounded-xl border border-slate-200/90 overflow-hidden shadow-2xs">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-50/70 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                                    <th className="px-5 py-3">Employee</th>
                                    <th className="px-5 py-3">ID</th>
                                    <th className="px-5 py-3">Department</th>
                                    <th className="px-5 py-3">Role</th>
                                    <th className="px-5 py-3">Status</th>
                                    <th className="px-5 py-3">Joined</th>
                                    <th className="px-5 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filtered.map(emp=>{
                                    const color=clr(emp.name);
                                    const st=ST[emp.status]||ST.active;
                                    return(
                                        <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-5 py-3">
                                                <div className="flex items-center gap-2.5">
                                                    {emp.avatar_url ? (
                                                        <img src={emp.avatar_url} alt={emp.name} className="w-8 h-8 rounded-lg object-cover flex-shrink-0 ring-1 ring-slate-200" />
                                                    ) : (
                                                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0" style={{backgroundColor:color}}>{ini(emp.name)}</div>
                                                    )}
                                                    <div className="min-w-0">
                                                        <Link to={`/profile/${emp.id}`} className="text-[12px] font-bold text-slate-800 hover:text-indigo-600 truncate block">{emp.name}</Link>
                                                        <div className="flex items-center gap-1.5 mt-0.5">
                                                            <span className="text-[10px] text-slate-400 truncate">{emp.email}</span>
                                                            <span className="w-1 h-1 rounded-full bg-slate-300"/>
                                                            
                                                            {/* Attendance Tag */}
                                                            <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                                                                emp.is_checked_in ? 'bg-emerald-50 text-emerald-600' : 
                                                                emp.availability_status && emp.availability_status !== 'offline' ? 'bg-indigo-50 text-indigo-600' :
                                                                'bg-slate-50 text-slate-400'
                                                            }`}>
                                                                {emp.is_checked_in ? 'Checked In' : emp.availability_status && emp.availability_status !== 'offline' ? 'Online' : 'Not Checked In'}
                                                            </span>

                                                            <span className="w-1 h-1 rounded-full bg-slate-300"/>
                                                            <div className="flex items-center gap-1">
                                                                <div className={`w-1.5 h-1.5 rounded-full ${
                                                                    emp.availability_status === 'busy' || emp.availability_status === 'dnd' ? 'bg-rose-500' :
                                                                    emp.availability_status === 'away' || emp.availability_status === 'break' ? 'bg-amber-500' :
                                                                    emp.availability_status === 'offline' ? 'bg-slate-400' :
                                                                    'bg-emerald-500'
                                                                }`} />
                                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">
                                                                    {emp.availability_status || 'available'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3"><span className="text-[9px] font-mono font-semibold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">{fmtId(emp.id)}</span></td>
                                            <td className="px-5 py-3 text-[12px] font-medium text-slate-600">{emp.department||emp.department_name||'—'}</td>
                                            <td className="px-5 py-3 text-[12px] text-slate-600">
                                                <div className="font-semibold text-slate-700">{emp.position||'—'}</div>
                                                {emp.role && (
                                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 mt-0.5 rounded text-[9px] font-bold text-violet-700 bg-violet-50 border border-violet-100 capitalize">
                                                        <ShieldCheck size={8}/>{emp.role.replace(/_/g, ' ')}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-5 py-3">
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase ${st.bg} ${st.text}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`}/>{emp.status||'active'}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3 text-[11px] text-slate-500">{emp.join_date?new Date(emp.join_date).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}):'—'}</td>
                                            <td className="px-5 py-3 text-right">
                                                <div className="flex items-center justify-end gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={()=>handleReachout('call', emp)} className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md border border-transparent hover:border-blue-100 transition-all" title="Call Employee"><Phone size={11} strokeWidth={2.2}/></button>
                                                    <button onClick={()=>handleReachout('text', emp)} className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md border border-transparent hover:border-indigo-100 transition-all" title="Message Employee"><MessageSquare size={11} strokeWidth={2.2}/></button>
                                                    <button onClick={()=>handleReachout('mail', emp)} className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-md border border-transparent hover:border-violet-100 transition-all" title="Email Employee"><Mail size={11} strokeWidth={2.2}/></button>
                                                    <div className="w-px h-4 bg-slate-200 mx-0.5" />
                                                    <Link to={`/profile/${emp.id}`} className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md border border-slate-200/80 transition-all" title="View Profile"><Eye size={13}/></Link>
                                                    <button onClick={()=>openEdit(emp)} className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md border border-slate-200/80 transition-all" title="Edit Employee"><Pencil size={12}/></button>
                                                    <button onClick={()=>setShowDelete(emp)} className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md border border-slate-200/80 hover:border-rose-200 transition-all" title="Delete Employee"><Trash2 size={12}/></button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {!loading&&filtered.length>0&&view!=='tree'&&(
                    <div className="flex items-center justify-between">
                        <p className="text-[11px] text-slate-400">
                            Showing <span className="font-bold text-slate-600">{(page-1)*16+1}–{Math.min(page*16,totalItems)}</span> of <span className="font-bold text-slate-600">{totalItems}</span>
                        </p>
                        <div className="flex items-center gap-1">
                            <button disabled={page===1} onClick={()=>setPage(p=>p-1)}
                                className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-indigo-600 hover:border-indigo-300 transition-all disabled:opacity-30"><ChevronLeft size={14}/></button>
                            {Array.from({length:Math.min(totalPages,5)},(_,i)=>(
                                <button key={i+1} onClick={()=>setPage(i+1)}
                                    className={`w-8 h-8 flex items-center justify-center rounded-lg text-[12px] font-bold transition-all ${page===i+1?'bg-indigo-600 text-white shadow-xs':'text-slate-500 hover:bg-slate-100'}`}>{i+1}</button>
                            ))}
                            <button disabled={page===totalPages} onClick={()=>setPage(p=>p+1)}
                                className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-indigo-600 hover:border-indigo-300 transition-all disabled:opacity-30"><ChevronRight size={14}/></button>
                        </div>
                    </div>
                )}
            </div>

            <AddEmployeeModal show={showAdd} onClose={()=>setShowAdd(false)} onSubmit={handleAdd} form={addForm} setForm={setAddForm} loading={addLoading} error={addError}/>
            <EditEmployeeModal show={showEdit} onClose={()=>setShowEdit(false)} onSubmit={handleUpdate} form={editForm} setForm={setEditForm} loading={editLoading} error={editError} employeeId={editId}/>
            <BulkUploadModal show={showBulk} onClose={()=>setShowBulk(false)} onSuccess={()=>{setShowBulk(false); refresh();}}/>

            {/* Delete Confirmation Modal */}
            {showDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
                    <div className="bg-white rounded-xl max-w-md w-full shadow-2xl border border-slate-200/90 overflow-hidden animate-in zoom-in-95 duration-150">
                        {/* Header */}
                        <div className="p-5 pb-3">
                            <div className="flex items-center justify-between mb-3">
                                <div className="w-10 h-10 bg-rose-50 border border-rose-200/80 rounded-lg flex items-center justify-center text-rose-600">
                                    <Trash2 size={18} />
                                </div>
                                <button 
                                    onClick={() => { setShowDelete(null); setDeleteError(''); }}
                                    className="text-slate-400 hover:text-slate-600 p-1.5 rounded-md hover:bg-slate-100 transition-colors"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                            <h3 className="text-base font-bold text-slate-900 tracking-tight">Manage Employee Separation</h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Choose how you want to handle this employee's departure.
                            </p>
                        </div>

                        {/* Employee Target Card */}
                        <div className="mx-5 p-3 bg-slate-50 border border-slate-200/80 rounded-lg flex items-center gap-3">
                            {showDelete.avatar_url ? (
                                <img src={showDelete.avatar_url} alt={showDelete.name} className="w-10 h-10 rounded-lg object-cover shadow-2xs flex-shrink-0" />
                            ) : (
                                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold text-white shadow-2xs flex-shrink-0"
                                    style={{backgroundColor: clr(showDelete.name)}}>
                                    {ini(showDelete.name)}
                                </div>
                            )}
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                    <p className="text-sm font-bold text-slate-800 truncate">{showDelete.name}</p>
                                    <span className="text-[10px] font-mono font-bold text-slate-500 bg-white border border-slate-200 px-1.5 py-0.2 rounded-md">
                                        {fmtId(showDelete.id)}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500 truncate mt-0.5">
                                    {showDelete.position || 'Staff'} · {showDelete.department || showDelete.department_name || 'Organization'}
                                </p>
                            </div>
                        </div>

                        {/* Choice Options */}
                        <div className="mx-5 mt-3 space-y-2.5">
                            {/* Option 1: Terminate */}
                            <div className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-lg">
                                <div className="flex items-start gap-2">
                                    <AlertTriangle size={15} className="text-amber-600 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-xs font-bold text-amber-900">Option 1: Terminate Employment</p>
                                        <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                                            Preserves all historical documents, attendance, and payroll. The employee's record is moved to the <strong>Terminated</strong> filter tab and user login is revoked.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Option 2: Delete Permanently */}
                            <div className="p-3 bg-rose-50/60 border border-rose-200/80 rounded-lg">
                                <div className="flex items-start gap-2">
                                    <Trash2 size={15} className="text-rose-600 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-xs font-bold text-rose-900">Option 2: Delete Profile Permanently</p>
                                        <p className="text-[11px] text-rose-800 mt-0.5 leading-relaxed">
                                            Purges the employee profile, unlinks references, and <strong>instantly frees their email address</strong> so it can be used for new onboarding.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {deleteError && (
                            <div className="mx-5 mt-2.5 p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs font-semibold text-rose-700">
                                {deleteError}
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="p-5 pt-4 bg-slate-50/70 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-end gap-2 mt-4">
                            <button
                                type="button"
                                onClick={() => { setShowDelete(null); setDeleteError(''); }}
                                disabled={deleteLoading || terminateLoading}
                                className="w-full sm:w-auto px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-lg transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleTerminateConfirm}
                                disabled={deleteLoading || terminateLoading || showDelete.status === 'terminated'}
                                className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-xs transition-all disabled:opacity-50"
                            >
                                {terminateLoading ? (
                                    <>
                                        <Loader2 size={13} className="animate-spin" />
                                        <span>Terminating...</span>
                                    </>
                                ) : (
                                    <span>Terminate (Keep History)</span>
                                )}
                            </button>
                            <button
                                type="button"
                                onClick={handleDeleteConfirm}
                                disabled={deleteLoading || terminateLoading}
                                className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-xs transition-all disabled:opacity-50"
                            >
                                {deleteLoading ? (
                                    <>
                                        <Loader2 size={13} className="animate-spin" />
                                        <span>Deleting...</span>
                                    </>
                                ) : (
                                    <>
                                        <Trash2 size={13} />
                                        <span>Delete Permanently</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Reachout Coming Soon Modal ── */}
            {reachoutModal && (
                <div 
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-200"
                    onClick={() => setReachoutModal(null)}
                >
                    <div 
                        className="bg-white rounded-xl p-5 sm:p-6 max-w-md w-full shadow-2xl border border-slate-200/90 relative animate-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Close button */}
                        <button
                            onClick={() => setReachoutModal(null)}
                            className="absolute top-4 right-4 w-7 h-7 rounded-md bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors"
                        >
                            <X size={15} />
                        </button>

                        {/* Header Badges */}
                        <div className="flex items-center gap-2 mb-3">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-600 border border-indigo-200/80 flex items-center gap-1">
                                <Sparkles size={11} /> Enterprise Reachout
                            </span>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200/80">
                                Coming Soon
                            </span>
                        </div>

                        {/* Channel Icon with Glow */}
                        <div className="flex items-center gap-3.5 mb-3.5">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-md shrink-0 ${
                                reachoutModal.channel === 'call' 
                                    ? 'bg-blue-600 text-white shadow-blue-500/25'
                                    : reachoutModal.channel === 'text'
                                        ? 'bg-indigo-600 text-white shadow-indigo-500/25'
                                        : 'bg-violet-600 text-white shadow-violet-500/25'
                            }`}>
                                {reachoutModal.channel === 'call' && <Phone size={22} strokeWidth={2.2} />}
                                {reachoutModal.channel === 'text' && <MessageSquare size={22} strokeWidth={2.2} />}
                                {reachoutModal.channel === 'mail' && <Mail size={22} strokeWidth={2.2} />}
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-slate-900 tracking-tight leading-snug">
                                    {reachoutModal.channel === 'call' && 'Direct Voice Call'}
                                    {reachoutModal.channel === 'text' && 'Instant Messaging'}
                                    {reachoutModal.channel === 'mail' && 'Integrated Enterprise Mail'}
                                </h3>
                                <p className="text-xs font-semibold text-slate-500">
                                    Reaching out to <span className="text-slate-800 font-bold">{reachoutModal.emp.name}</span>
                                </p>
                            </div>
                        </div>

                        {/* Description */}
                        <p className="text-xs text-slate-600 leading-relaxed mb-3.5">
                            {reachoutModal.channel === 'call' && (
                                <>In-app encrypted VoIP calling directly to <strong>{reachoutModal.emp.name}</strong> is in final testing. Enjoy instant one-click voice calls with squad members directly from your workspace.</>
                            )}
                            {reachoutModal.channel === 'text' && (
                                <>Real-time squad chat and direct messaging with <strong>{reachoutModal.emp.name}</strong> will launch in our next release, integrated with desktop alerts, file sharing, and active presence tracking.</>
                            )}
                            {reachoutModal.channel === 'mail' && (
                                <>An integrated in-app mailbox with thread histories, attachments, and automated smart replies for <strong>{reachoutModal.emp.name}</strong> is currently in active development.</>
                            )}
                        </p>

                        {/* Upcoming Highlights */}
                        <div className="bg-slate-50 rounded-lg p-3 mb-4 border border-slate-200/80 space-y-1.5">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Included in Sprint Release v2.4</p>
                            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                                <Check size={13} className="text-emerald-500 shrink-0" />
                                <span>End-to-End Enterprise Encryption</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                                <Check size={13} className="text-emerald-500 shrink-0" />
                                <span>Synchronized with Squad Presence & Notifications</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                                <Check size={13} className="text-emerald-500 shrink-0" />
                                <span>Zero-latency desktop & mobile push alerts</span>
                            </div>
                        </div>

                        {/* Buttons */}
                        <div className="flex flex-col gap-2">
                            {reachoutModal.channel === 'mail' && reachoutModal.emp.email && (
                                <a
                                    href={`mailto:${reachoutModal.emp.email}`}
                                    className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2"
                                >
                                    <ExternalLink size={13} /> Open in Email Client ({reachoutModal.emp.email})
                                </a>
                            )}

                            <button
                                type="button"
                                onClick={() => {
                                    const key = `${reachoutModal.channel}_${reachoutModal.emp.id}`;
                                    setNotifiedChannels(prev => ({ ...prev, [key]: true }));
                                    toast.success(`You're on the early access notification list for ${reachoutModal.channel.toUpperCase()}!`);
                                }}
                                disabled={notifiedChannels[`${reachoutModal.channel}_${reachoutModal.emp.id}`]}
                                className={`w-full py-2 px-4 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                                    notifiedChannels[`${reachoutModal.channel}_${reachoutModal.emp.id}`]
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                        : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
                                }`}
                            >
                                {notifiedChannels[`${reachoutModal.channel}_${reachoutModal.emp.id}`] ? (
                                    <>
                                        <Check size={14} /> You're on the early access list!
                                    </>
                                ) : (
                                    <>
                                        <BellRing size={14} /> Notify Me on Launch
                                    </>
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={() => setReachoutModal(null)}
                                className="w-full py-1.5 text-slate-400 hover:text-slate-600 text-xs font-semibold text-center transition-colors"
                            >
                                Dismiss
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmployeeTable;
