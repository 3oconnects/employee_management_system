import React, { useState, useEffect, useCallback } from 'react';
import {
    Users, Search, UserPlus, Mail, ChevronLeft, ChevronRight,
    Loader2, Briefcase, Building2, Pencil, Eye,
    Download, Calendar, LayoutGrid, List, GitBranch, ChevronDown, Hash
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../../services/api';
import { useAuthStore } from '../../../store/authStore';
import debounce from 'lodash/debounce';
import { AddEmployeeModal, EditEmployeeModal } from './modals/EmployeeModals';
import BulkUploadModal from './modals/BulkUploadModal';

interface Employee {
    id: string; user_id?: number | null; name: string; email: string; position: string;
    department: string; department_name?: string;
    status: 'active' | 'onboarding' | 'terminated';
    join_date: string; manager_id?: string | null;
    reporting_manager_id?: string | null;
    manager_name?: string | null;
    availability_status?: 'available' | 'busy' | 'away' | 'offline' | 'dnd' | 'break';
    is_checked_in?: boolean;
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
        <div className={depth>0?'ml-5 border-l border-slate-100 pl-3':''}>
            <button onClick={()=>setOpen(!open)}
                className="w-full flex items-center gap-3 py-2 px-2 rounded-xl hover:bg-slate-50 transition-all text-left group">
                <div className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-white"
                    style={{backgroundColor:color}}>{ini(node.name)}</div>
                <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-bold text-slate-800 truncate">{node.name}</p>
                    <p className="text-[10px] text-slate-400 truncate">{node.position||'Employee'} · {node.department||node.department_name||''}</p>
                </div>
                {node.children.length>0&&(
                    <span className="flex items-center gap-1 flex-shrink-0">
                        <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{node.children.length}</span>
                        <ChevronDown size={11} className={`text-slate-300 transition-transform ${open?'rotate-180':''}`}/>
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

    const fetchEmp = async (search:string,p:number,v?:string) => {
        setLoading(true);
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
    useEffect(() => {
        // Construct the full SSE URL
        const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1';
        const sseUrl = `${baseUrl}/realtime/stream`;
        
        // Get token from store (Zustand)
        const token = useAuthStore.getState().accessToken;
        if (!token) return;

        const source = new EventSource(`${sseUrl}?token=${token}`);

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
            } catch (err) {
                console.error('SSE Error parsing data:', err);
            }
        };

        source.onerror = (err) => {
            console.error('SSE Connection Error:', err);
            source.close();
        };

        return () => {
            source.close();
        };
    }, []);

    /* Modals */
    const [showAdd,setShowAdd]   = useState(false);
    const [showBulk,setShowBulk] = useState(false);
    const [addForm,setAddForm]=useState({name:'',email:'',phone:'',dateOfBirth:'',gender:'',personalEmail:'',department:'',position:'',joinDate:'',employmentType:'full_time',status:'onboarding',addressLine1:'',city:'',state:'',pincode:'',reportingManagerId:'',reportingManagerName:'',annualCTC:'',bankAccountNumber:'',taxRegime:'New',highestDegree:'',fieldOfStudy:'',institution:'',graduationYear:'',internshipStartDate:'',internshipEndDate:'',internshipStipend:'',internshipSupervisor:'',internshipCollege:''});
    const [addLoading,setAddLoading]=useState(false);
    const [addError,setAddError]=useState('');
    const [showEdit,setShowEdit]=useState(false);
    const [editId,setEditId]=useState<string|null>(null);
    const [editForm,setEditForm]=useState({name:'',email:'',department:'',position:'',status:'',joinDate:'',reportingManagerId:''});
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
            setAddForm({name:'',email:'',phone:'',dateOfBirth:'',gender:'',personalEmail:'',department:'',position:'',joinDate:'',employmentType:'full_time',status:'onboarding',addressLine1:'',city:'',state:'',pincode:'',reportingManagerId:'',reportingManagerName:'',annualCTC:'',bankAccountNumber:'',taxRegime:'New',highestDegree:'',fieldOfStudy:'',institution:'',graduationYear:'',internshipStartDate:'',internshipEndDate:'',internshipStipend:'',internshipSupervisor:'',internshipCollege:''});
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
            position:emp.position,
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
                position:editForm.position,
                status:editForm.status,
                join_date:editForm.joinDate,
                reporting_manager_id: editForm.reportingManagerId
            });
            setShowEdit(false);fetchEmp(searchTerm,page);}
        catch(err:any){setEditError(err.response?.data?.message||'Failed');}
        finally{setEditLoading(false);}
    };

    const filtered=employees.filter(e=>{
        if(statusFilter&&e.status!==statusFilter)return false;
        if(deptFilter&&(e.department||e.department_name)!==deptFilter)return false;
        return true;
    });
    const depts=[...new Set(employees.map(e=>e.department||e.department_name||''))].filter(Boolean).sort();
    const activeCount=employees.filter(e=>e.status==='active'||!e.status).length;
    const onboardCount=employees.filter(e=>e.status==='onboarding').length;

    const buildTree=():TreeNode[]=>{
        const map=new Map<string,TreeNode>();
        const userIdMap=new Map<number,TreeNode>();
        
        employees.forEach(e=>{
            const node={...e,children:[]};
            map.set(e.id,node);
            if(e.user_id) userIdMap.set(Number(e.user_id),node);
        });

        const roots:TreeNode[]=[];
        const virtualManagers = new Map<number, TreeNode>();

        map.forEach(node=>{
            const mgrId = node.reporting_manager_id;
            const mgrName = node.manager_name || 'System Admin';

            if(mgrId){
                if (userIdMap.has(Number(mgrId))) {
                    userIdMap.get(Number(mgrId))!.children.push(node);
                } else {
                    // Create virtual manager node
                    if (!virtualManagers.has(Number(mgrId))) {
                        virtualManagers.set(Number(mgrId), {
                            id: `v-${mgrId}`,
                            name: mgrName,
                            position: 'Administrative Head',
                            department: 'Corporate',
                            status: 'active',
                            children: [node]
                        } as any);
                    } else {
                        virtualManagers.get(Number(mgrId))!.children.push(node);
                    }
                }
            } else {
                roots.push(node);
            }
        });
        return [...roots, ...Array.from(virtualManagers.values())];
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
                        <button className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-[12px] font-semibold text-slate-600 hover:bg-slate-50 transition-all">
                            <Download size={13}/> Export
                        </button>
                        <button onClick={()=>setShowBulk(true)}
                            className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-violet-200 text-violet-700 rounded-xl text-[12px] font-semibold hover:bg-violet-50 transition-all">
                            <Download size={13} className="rotate-180"/> Bulk Upload
                        </button>
                        <button onClick={()=>setShowAdd(true)}
                            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-[12px] font-bold shadow-sm shadow-indigo-600/20 hover:bg-indigo-500 transition-all">
                            <UserPlus size={13}/> Add Employee
                        </button>
                    </div>
                </div>

                {/* Stats strip */}
                <div className="flex items-center gap-3">
                    {[{label:'Total',val:totalItems,color:'text-slate-800'},{label:'Active',val:activeCount,color:'text-emerald-600'},{label:'Onboarding',val:onboardCount,color:'text-amber-600'}].map(s=>(
                        <div key={s.label} className="bg-white rounded-xl border border-slate-100 px-4 py-2.5 flex items-center gap-2.5 shadow-sm">
                            <span className="text-[11px] font-semibold text-slate-400">{s.label}</span>
                            <span className={`text-[15px] font-black ${s.color}`}>{s.val}</span>
                        </div>
                    ))}
                </div>

                {/* Toolbar */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-3 flex flex-col sm:flex-row gap-3 items-center">
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={13}/>
                        <input type="text" placeholder="Search by name, email or department…"
                            className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-9 pr-4 py-2 text-[12px] font-medium text-slate-700 outline-none focus:border-indigo-300 focus:bg-white transition-all placeholder:text-slate-300"
                            value={searchTerm} onChange={e=>{setSearchTerm(e.target.value);dSearch(e.target.value);}}/>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}
                            className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-[11px] font-semibold text-slate-600 outline-none cursor-pointer">
                            <option value="">All Status</option>
                            <option value="active">Active</option>
                            <option value="onboarding">Onboarding</option>
                            <option value="terminated">Terminated</option>
                        </select>
                        {depts.length>0&&(
                            <select value={deptFilter} onChange={e=>setDeptFilter(e.target.value)}
                                className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-[11px] font-semibold text-slate-600 outline-none cursor-pointer max-w-[130px]">
                                <option value="">All Depts</option>
                                {depts.map(d=><option key={d} value={d}>{d}</option>)}
                            </select>
                        )}
                        <div className="flex items-center bg-slate-50 border border-slate-100 rounded-xl p-0.5 gap-0.5">
                            {([{id:'card',Icon:LayoutGrid},{id:'table',Icon:List},{id:'tree',Icon:GitBranch}] as const).map(v=>(
                                <button key={v.id} onClick={()=>setView(v.id)} title={v.id}
                                    className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${view===v.id?'bg-white text-indigo-600 shadow-sm':'text-slate-400 hover:text-slate-600'}`}>
                                    <v.Icon size={14}/>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Content */}
                {loading?(
                    <div className="bg-white rounded-2xl border border-slate-100 py-20 flex flex-col items-center gap-3">
                        <Loader2 size={22} className="animate-spin text-indigo-400"/>
                        <p className="text-[12px] text-slate-400">Loading employees…</p>
                    </div>
                ):filtered.length===0?(
                    <div className="bg-white rounded-2xl border border-slate-100 py-20 flex flex-col items-center gap-4 text-center">
                        <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center"><Users size={26} className="text-slate-200"/></div>
                        <div><p className="text-[14px] font-bold text-slate-700">No employees found</p><p className="text-[12px] text-slate-400 mt-1">Try adjusting your search or filters</p></div>
                        <button onClick={()=>setShowAdd(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-[12px] font-bold"><UserPlus size={13}/> Add Employee</button>
                    </div>
                ):view==='tree'?(
                    /* Org Tree */
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
                            <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center"><GitBranch size={14} className="text-indigo-500"/></div>
                            <div>
                                <h3 className="text-[13px] font-bold text-slate-800">Reporting Hierarchy</h3>
                                <p className="text-[10px] text-slate-400">{employees.length} people · Click to expand</p>
                            </div>
                        </div>
                        <div className="max-h-[520px] overflow-y-auto">
                            {buildTree().map(root=><TreeNode key={root.id} node={root} depth={0}/>)}
                        </div>
                    </div>
                ):view==='card'?(
                    /* ═══ CARD GRID — Premium ═══ */
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                        {filtered.map(emp=>{
                            const color=clr(emp.name);
                            const st=ST[emp.status]||ST.active;
                            return(
                                <div key={emp.id}
                                    className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-200 group border border-slate-100 hover:border-transparent">

                                    {/* ── Hero banner ── */}
                                    <div className="relative h-28 flex items-end px-4 pb-0"
                                        style={{background:`linear-gradient(135deg, ${color}ee 0%, ${color}99 60%, ${color}55 100%)`}}>

                                        {/* Decorative circles */}
                                        <div className="absolute top-[-18px] right-[-18px] w-28 h-28 rounded-full opacity-20" style={{backgroundColor:'#fff'}}/>
                                        <div className="absolute top-4 right-8 w-12 h-12 rounded-full opacity-10" style={{backgroundColor:'#fff'}}/>
 
                                        {/* Attendance Status (Checked In / Online) */}
                                        {emp.is_checked_in ? (
                                            <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-500/20 backdrop-blur-sm text-emerald-100 border border-emerald-400/30 animate-in fade-in zoom-in duration-500">
                                                <div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                                                Checked In
                                            </div>
                                        ) : emp.availability_status && emp.availability_status !== 'offline' ? (
                                            <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-indigo-500/20 backdrop-blur-sm text-indigo-100 border border-indigo-400/30">
                                                <div className="w-1 h-1 rounded-full bg-indigo-400 animate-pulse" />
                                                Online
                                            </div>
                                        ) : (
                                            <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-slate-500/20 backdrop-blur-sm text-slate-100 border border-slate-400/30 opacity-60">
                                                Not Checked In
                                            </div>
                                        )}

                                        {/* Status badge top-right */}

                                        {/* Availability Indicator — High Visibility Pill */}
                                        <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1 bg-black/20 backdrop-blur-md rounded-lg border border-white/10">
                                            <div className={`w-1.5 h-1.5 rounded-full ring-2 ring-white/20 ${
                                                emp.availability_status === 'busy' || emp.availability_status === 'dnd' ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]' :
                                                emp.availability_status === 'away' || emp.availability_status === 'break' ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]' :
                                                emp.availability_status === 'offline' ? 'bg-slate-400' :
                                                'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]'
                                            }`} />
                                            <span className="text-[9px] font-black text-white uppercase tracking-[0.1em]">
                                                {emp.availability_status || 'available'}
                                            </span>
                                        </div>

                                        {/* Avatar — half overlapping hero */}
                                        <Link to={`/profile/${emp.id}`}
                                            className="relative z-10 w-16 h-16 rounded-2xl flex items-center justify-center text-[20px] font-black text-white shadow-xl ring-4 ring-white/30 mb-[-28px] transition-transform group-hover:scale-105 select-none"
                                            style={{background:`linear-gradient(145deg,${color},${color}bb)`}}>
                                            {ini(emp.name)}
                                        </Link>
                                    </div>

                                    {/* ── Body ── */}
                                    <div className="pt-9 px-4 pb-4">
                                        {/* Name + ID */}
                                        <div className="mb-3">
                                            <Link to={`/profile/${emp.id}`}
                                                className="text-[14px] font-black text-slate-800 hover:text-indigo-600 transition-colors leading-tight block truncate">
                                                {emp.name}
                                            </Link>
                                            <div className="flex items-center gap-1 mt-0.5">
                                                <Hash size={9} className="text-slate-300"/>
                                                <span className="text-[9px] font-mono font-bold text-slate-400 tracking-wide">{fmtId(emp.id)}</span>
                                            </div>
                                        </div>

                                        {/* Role & Dept pills */}
                                        <div className="flex flex-wrap gap-1.5 mb-3">
                                            {emp.position&&(
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold text-slate-600 bg-slate-100">
                                                    <Briefcase size={9}/>{emp.position}
                                                </span>
                                            )}
                                            {(emp.department||emp.department_name)&&(
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold text-white"
                                                    style={{backgroundColor:`${color}22`,color}}>
                                                    <Building2 size={9}/>{emp.department||emp.department_name}
                                                </span>
                                            )}
                                        </div>

                                        {/* Email */}
                                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-3">
                                            <Mail size={10} className="text-slate-300 flex-shrink-0"/>
                                            <span className="truncate">{emp.email}</span>
                                        </div>

                                        {/* Footer */}
                                        <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                                            <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                                <Calendar size={9}/>
                                                {emp.join_date?new Date(emp.join_date).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}):'—'}
                                            </span>
                                            <div className="flex items-center gap-1">
                                                <Link to={`/profile/${emp.id}`}
                                                    className="w-7 h-7 flex items-center justify-center rounded-lg transition-all text-white text-[10px] font-bold"
                                                    style={{backgroundColor:color}}
                                                    title="View profile">
                                                    <Eye size={12}/>
                                                </Link>
                                                <button onClick={()=>openEdit(emp)}
                                                    className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600 transition-all"
                                                    title="Edit">
                                                    <Pencil size={11}/>
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
                    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
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
                                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0" style={{backgroundColor:color}}>{ini(emp.name)}</div>
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
                                            <td className="px-5 py-3 text-[12px] text-slate-600">{emp.position||'—'}</td>
                                            <td className="px-5 py-3">
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase ${st.bg} ${st.text}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`}/>{emp.status||'active'}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3 text-[11px] text-slate-500">{emp.join_date?new Date(emp.join_date).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}):'—'}</td>
                                            <td className="px-5 py-3 text-right">
                                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Link to={`/profile/${emp.id}`} className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"><Eye size={13}/></Link>
                                                    <button onClick={()=>openEdit(emp)} className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"><Pencil size={12}/></button>
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
                                    className={`w-8 h-8 flex items-center justify-center rounded-lg text-[12px] font-bold transition-all ${page===i+1?'bg-indigo-600 text-white shadow-sm':'text-slate-500 hover:bg-slate-100'}`}>{i+1}</button>
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
        </div>
    );
};

export default EmployeeTable;
