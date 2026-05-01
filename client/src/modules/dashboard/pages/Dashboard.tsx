import React, { useState, useEffect, useRef } from 'react';
import {
    Sun, Moon, Sunset, Shield, Loader2, LogIn,
    LogOut as LogOutIcon, CheckCircle2, AlertCircle,
    RefreshCw, Zap, Clock, BadgeCheck, ChevronDown, Coffee,
    Utensils, Briefcase, BellOff, WifiOff, Wifi, Building2
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../../services/api';
import { useAuthStore } from '../../../store/authStore';
import { AdminDashboard }    from '../components/AdminDashboard';
import { ManagerDashboard }  from '../components/ManagerDashboard';
import { EmployeeDashboard } from '../components/EmployeeDashboard';
import MySpaceProfile        from '../components/MySpaceProfile';
import { OrgSubNav }         from '../components/OrgSubNav';
import type { OrgSection }   from '../components/OrgSubNav';

/* ── Org section widgets ── */
import AnnouncementsWidget   from '../components/widgets/AnnouncementsWidget';
import PoliciesWidget        from '../components/widgets/PoliciesWidget';
import EmployeeTreeWidget    from '../components/widgets/EmployeeTreeWidget';
import DeptTreeWidget        from '../components/widgets/DeptTreeWidget';
import DeptDirectoryWidget   from '../components/widgets/DeptDirectoryWidget';
import BirthdayWidget        from '../components/widgets/BirthdayWidget';
import NewHiresWidget        from '../components/widgets/NewHiresWidget';
import OrgCalendarWidget     from '../components/widgets/OrgCalendarWidget';
import TeamStatusWidget      from '../components/widgets/TeamStatusWidget';

/* ── helpers ── */
const COLORS: Record<string,string> = {A:'#6366f1',B:'#8b5cf6',C:'#ec4899',D:'#f59e0b',E:'#10b981',F:'#3b82f6',G:'#ef4444',H:'#14b8a6',I:'#f97316',J:'#84cc16',K:'#06b6d4',L:'#a855f7',M:'#e11d48',N:'#0ea5e9',O:'#22c55e',P:'#d946ef',Q:'#fb923c',R:'#64748b',S:'#6366f1',T:'#8b5cf6',U:'#ec4899',V:'#10b981',W:'#3b82f6',X:'#f59e0b',Y:'#14b8a6',Z:'#ef4444'};
const clr = (name?:string) => COLORS[(name?.[0]??'U').toUpperCase()]??'#6366f1';
const ROLE_LABEL:Record<string,string> = {admin:'Administrator',super_admin:'Super Admin',hr:'HR Manager',manager:'Team Manager',employee:'Employee'};
const STATUSES = [
    {key:'available', label:'Available',      color:'#10b981', dot:'bg-emerald-500', pulse:true },
    {key:'busy',      label:'Busy',           color:'#ef4444', dot:'bg-red-500',     pulse:false},
    {key:'lunch',     label:'At Lunch',       color:'#f59e0b', dot:'bg-amber-400',   pulse:false},
    {key:'break',     label:'On Break',       color:'#f97316', dot:'bg-orange-400',  pulse:false},
    {key:'dnd',       label:'Do Not Disturb', color:'#8b5cf6', dot:'bg-violet-500',  pulse:false},
    {key:'offline',   label:'Offline',        color:'#64748b', dot:'bg-slate-400',   pulse:false},
] as const;
type SK = typeof STATUSES[number]['key'];

function fmt(ms:number){const s=Math.floor(ms/1000),h=Math.floor(s/3600),m=Math.floor((s%3600)/60),sc=s%60;return`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sc).padStart(2,'0')}`;}
function greeting(){const h=new Date().getHours();if(h<12)return{text:'Good Morning',Icon:Sun,cls:'text-amber-500'};if(h<17)return{text:'Good Afternoon',Icon:Sunset,cls:'text-orange-500'};return{text:'Good Evening',Icon:Moon,cls:'text-indigo-400'};}
function LiveClock(){const[t,setT]=useState(new Date());useEffect(()=>{const id=setInterval(()=>setT(new Date()),1000);return()=>clearInterval(id);},[]);return<>{t.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:true})}</>;}

/* ═══════════════════════════════════════════════════════ */
const Dashboard:React.FC = () => {
    const {user,hasAnyRole} = useAuthStore();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const isAdminOrHR = hasAnyRole('admin','super_admin','hr');
    const isManager   = hasAnyRole('manager');
    const isEmployee  = hasAnyRole('employee');

    // Read view from URL — Topbar pill controls this
    const tab = (searchParams.get('view') ?? 'myspace') as 'myspace' | 'org';
    const [loading,   setLoading]   = useState(true);
    const [adminData, setAdminData] = useState<any>(null);
    const [mgrData,   setMgrData]   = useState<any>(null);
    const [empData,   setEmpData]   = useState<any>(null);
    const [att,       setAtt]       = useState<{status:string;checkIn:string|null;sessions_today?:number;total_hours_today?:string}>({status:'OUT',checkIn:null});
    const [elapsed,   setElapsed]   = useState(0);
    const [busy,      setBusy]      = useState(false);
    const [err,       setErr]       = useState<string|null>(null);
    const [status,    setStatus_]   = useState<SK>(()=>(user?.availability_status as SK)?? (localStorage.getItem('usr_status') as SK)?? 'available');
    const [statusOpen,setSO]        = useState(false);
    const [orgSection,setOrgSection] = useState<OrgSection>('overview');
    const sRef = useRef<HTMLDivElement>(null);

    const c   = clr(user?.name);
    const ini = user?.name?.split(' ').map(p=>p[0]).join('').toUpperCase().slice(0,2)?? 'U';
    const g   = greeting();
    const cur = STATUSES.find(s=>s.key===status)??STATUSES[0];
    const today = new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'});

    useEffect(()=>{
        const h=(e:MouseEvent)=>{if(sRef.current&&!sRef.current.contains(e.target as Node))setSO(false);};
        document.addEventListener('mousedown',h);return()=>document.removeEventListener('mousedown',h);
    },[]);

    const setStatus=async (k:SK)=>{
        setStatus_(k);
        localStorage.setItem('usr_status',k);
        setSO(false);
        try {
            await api.put('/auth/status', { status: k });
            updateUser({ availability_status: k });
        } catch (e) {
            console.error('Failed to sync status', e);
        }
    };

    const fetchAtt = async()=>{
        if(!user?.id)return;
        try{const{data}=await api.get('/attendance/today',{params:{userId:user.id}});
            setAtt({status:data.status??'OUT',checkIn:data.checkIn??null,sessions_today:data.sessions_today,total_hours_today:data.total_hours_today});}
        catch(e:any){console.warn('Att:',e?.response?.data||e?.message);}
    };

    const loadData = async()=>{
        if(!user?.id)return;
        setLoading(true);setErr(null);
        try{
            let dp:Promise<any>;
            if(isAdminOrHR)     dp=api.get('/reports/dashboard').then(r=>setAdminData(r.data));
            else if(isManager)  dp=api.get('/reports/dashboard/manager',{params:{userId:user.id}}).then(r=>setMgrData(r.data));
            else                dp=api.get('/reports/dashboard/employee',{params:{userId:user.id}}).then(r=>setEmpData(r.data));
            await Promise.all([fetchAtt(),dp]);
        }catch(e:any){setErr(e?.response?.data?.message||e?.message||'Failed');}
        finally{setLoading(false);}
    };

    useEffect(()=>{loadData();},[user?.id]);

    useEffect(()=>{
        if(att.status!=='IN'||!att.checkIn){setElapsed(0);return;}
        const base=new Date(att.checkIn).getTime();
        const tick=()=>setElapsed(Date.now()-base);tick();
        const id=setInterval(tick,1000);return()=>clearInterval(id);
    },[att]);

    const doCheckIn=async()=>{
        if(!user?.id||busy)return;setBusy(true);
        try{const{data}=await api.post('/attendance/check-in',{userId:user.id});
            setAtt({status:'IN',checkIn:data.checkIn??data.check_in??new Date().toISOString()});
            setStatus('available');}
        catch(e:any){alert(e?.response?.data?.error||'Check-in failed');}
        finally{setBusy(false);}
    };

    const doCheckOut=async()=>{
        if(!user?.id||busy)return;setBusy(true);
        try{await api.post('/attendance/check-out',{userId:user.id});
            setAtt(p=>({...p,status:'OUT',checkIn:null}));setElapsed(0);setStatus('offline');}
        catch(e:any){alert(e?.response?.data?.error||'Check-out failed');}
        finally{setBusy(false);}
    };

    // ── Non-blocking Shell ──────────────────────────────────
    const isIn = att.status==='IN';
    const hasData = isAdminOrHR ? !!adminData : (isManager ? !!mgrData : !!empData);
    const dashLoading = loading && !hasData;

    return(
        <div className="min-h-screen bg-[#F4F5F8]">

            {/* ══ CONTENT ══════════════════════════════════════ */}
            <div className="max-w-7xl mx-auto px-4 py-4 space-y-4">

                {/* ── MY SPACE ──────────────────────────────── */}
                {tab==='myspace' && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-5 items-start">

                            {/* ── Left Column: Profile & Team ── */}
                            <div className="space-y-4">
                                {/* Profile Card */}
                                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                                    <div className="h-16 w-full" style={{background:`linear-gradient(135deg,${c}cc,${c}44)`}}/>
                                    <div className="px-4 pb-4 -mt-7 space-y-3">
                                        {/* Avatar + status picker */}
                                        <div className="flex items-end justify-between">
                                            <div className="relative">
                                                <div className="w-14 h-14 rounded-xl flex items-center justify-center text-[18px] font-black text-white shadow-lg ring-4 ring-white"
                                                    style={{backgroundColor:c}}>{ini}</div>
                                                <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${cur.dot} ${cur.pulse?'animate-pulse':''}`}/>
                                            </div>
                                            <div className="relative mb-1" ref={sRef}>
                                                <button onClick={()=>setSO(!statusOpen)}
                                                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold transition-all hover:shadow-sm"
                                                    style={{color:cur.color,backgroundColor:`${cur.color}14`,borderColor:`${cur.color}30`}}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${cur.dot}`}/>
                                                    {cur.label}
                                                    <ChevronDown size={10} className={`transition-transform ${statusOpen?'rotate-180':''}`}/>
                                                </button>
                                                {statusOpen&&(
                                                    <div className="absolute right-0 top-8 z-50 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 w-44">
                                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest px-3 py-1.5">Set availability</p>
                                                        {STATUSES.map(s=>(
                                                            <button key={s.key} onClick={()=>setStatus(s.key)}
                                                                className={`w-full flex items-center gap-2.5 px-3 py-2 text-[12px] font-medium hover:bg-slate-50 text-left ${status===s.key?'bg-slate-50':''}`}>
                                                                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${s.dot}`}/>
                                                                <span style={{color:status===s.key?s.color:'#475569'}}>{s.label}</span>
                                                                {status===s.key&&<CheckCircle2 size={11} className="ml-auto" style={{color:s.color}}/>}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Identity Section */}
                                        {loading ? (
                                            <div className="space-y-2.5 animate-pulse">
                                                <div className="h-4 bg-slate-100 rounded-full w-2/3" />
                                                <div className="h-3 bg-slate-50 rounded-full w-1/3" />
                                            </div>
                                        ) : (
                                            <div>
                                                <div className="flex items-center gap-1.5 mb-0.5">
                                                    <h2 className="text-[15px] font-black text-slate-900">{user?.name}</h2>
                                                    <BadgeCheck size={14} style={{color:c}}/>
                                                </div>
                                                <p className="text-[11px] text-slate-400 font-mono">
                                                    {user?.employee_id?`EMP-${user.employee_id}`:`ID-${user?.id}`}
                                                </p>
                                                <span className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border"
                                                    style={{color:c,backgroundColor:`${c}12`,borderColor:`${c}28`}}>
                                                    <Shield size={8}/>{ROLE_LABEL[user?.role??'']??user?.role}
                                                </span>
                                            </div>
                                        )}

                                        {/* Attendance widget */}
                                        <div className="pt-3 border-t border-slate-100">
                                            <div className="flex items-center justify-between mb-2.5">
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Today's Attendance</p>
                                                {(att.sessions_today??0)>0&&(
                                                    <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                                                        {att.sessions_today} session{(att.sessions_today??0)>1?'s':''} · {att.total_hours_today}h
                                                    </span>
                                                )}
                                            </div>
                                            <div className={`rounded-xl px-4 py-3 mb-3 flex items-center gap-3 ${isIn?'bg-emerald-50 border border-emerald-200':'bg-slate-50 border border-slate-200'}`}>
                                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${isIn?'bg-emerald-100':'bg-white border border-slate-200'}`}>
                                                    {isIn?<CheckCircle2 size={16} className="text-emerald-600"/>:<Clock size={16} className="text-slate-400"/>}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    {isIn?(
                                                        <>
                                                            <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-wide">Clocked In</p>
                                                            <p className="text-[20px] font-black text-emerald-700 tabular-nums font-mono leading-tight">{fmt(elapsed)}</p>
                                                            <p className="text-[9px] text-emerald-500 mt-0.5">Since {att.checkIn?new Date(att.checkIn).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:true}):'—'}</p>
                                                        </>
                                                    ):(
                                                        <>
                                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Not Checked In</p>
                                                            <p className="text-[15px] font-bold text-slate-700 tabular-nums mt-0.5"><LiveClock/></p>
                                                            {(att.sessions_today??0)>0&&<p className="text-[9px] text-slate-400 mt-0.5">Ready to clock back in</p>}
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                            <button onClick={isIn?doCheckOut:doCheckIn} disabled={busy}
                                                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-bold transition-all ${busy?'opacity-50 cursor-not-allowed':''} ${isIn?'bg-rose-600 text-white hover:bg-rose-500 shadow-md shadow-rose-500/20':'text-white shadow-md'}`}
                                                style={!isIn?{backgroundColor:c,boxShadow:`0 4px 16px ${c}35`}:undefined}>
                                                {busy?<Loader2 size={14} className="animate-spin"/>:isIn?<LogOutIcon size={14}/>:<LogIn size={14}/>}
                                                {busy?'Processing…':isIn?'Check Out':'Check In'}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Team Status Widget (Only added feature) */}
                                <TeamStatusWidget />
                            </div>

                            {/* ── Right Column: Content ── */}
                            <div className="flex flex-col gap-4 min-w-0">
                                {/* Greeting card */}
                                <div className="min-h-[160px] bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden relative flex flex-col">
                                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                                        <div className="absolute -top-10 -right-10 w-72 h-72 rounded-full opacity-[0.07]" style={{background:c,animation:'orb1 8s ease-in-out infinite'}}/>
                                        <div className="absolute top-16 right-48 w-36 h-36 rounded-full opacity-[0.05]" style={{background:c,animation:'orb2 11s ease-in-out infinite'}}/>
                                        <div className="absolute -bottom-8 left-8 w-52 h-52 rounded-full opacity-[0.04]" style={{background:c,animation:'orb3 14s ease-in-out infinite'}}/>
                                    </div>
                                    <div className="relative z-10 px-7 py-5 flex flex-col flex-1">
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <g.Icon size={13} className={g.cls}/>
                                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">{today}</p>
                                        </div>
                                        <h1 className="text-[24px] font-black text-slate-800 leading-tight">
                                            {g.text}, <span style={{color:c}}>{user?.name?.split(' ')[0]}</span>!
                                        </h1>
                                        <p className="text-[12px] text-slate-500 mt-1 leading-relaxed line-clamp-2">
                                            {isAdminOrHR?'Here\'s your workforce overview. Switch to Organization for team metrics.':isManager?'Here\'s your team\'s status. Switch to Organization for workforce data.':'Welcome back! Your personal workspace is here.'}
                                        </p>
                                        {/* Quick stat strip */}
                                        <div className="mt-auto pt-3 border-t border-slate-100 flex items-center flex-wrap gap-3">
                                            <div className="flex items-center gap-1.5">
                                                <span className={`w-1.5 h-1.5 rounded-full ${cur.dot} ${cur.pulse?'animate-pulse':''}`}/>
                                                <span className="text-[11px] font-semibold text-slate-600">{cur.label}</span>
                                            </div>
                                            <div className="w-px h-3 bg-slate-200"/>
                                            {isIn?(
                                                <span className="text-[11px] font-semibold text-emerald-600">● {fmt(elapsed)}</span>
                                            ):(
                                                <span className="text-[11px] text-slate-400">Not checked in</span>
                                            )}
                                            <div className="w-px h-3 bg-slate-200"/>
                                            <span className="text-[11px] text-slate-400">
                                                {new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:true})}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Dashboard Content (Admin/Mgr/Emp) */}
                                {dashLoading ? (
                                    <div className="space-y-6 animate-pulse">
                                        <div className="h-[400px] bg-slate-100/30 rounded-2xl border border-slate-100 w-full" />
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {/* Optional Personal KPI summary if needed, but primary focus is Profile */}
                                        {empData && (
                                            <EmployeeDashboard data={empData} navigate={navigate} elapsed={elapsed} checkingIn={busy} onCheckIn={doCheckIn} onCheckOut={doCheckOut}/>
                                        )}
                                        <MySpaceProfile />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* ── ORGANIZATION ──────────────────────────── */}
                {tab==='org' && (
                    <>
                        {/* Org sub-navigation — unique floating pill bar */}
                        <div className="flex items-center gap-3">
                            <OrgSubNav active={orgSection} onChange={setOrgSection}/>
                            <button onClick={loadData}
                                className="ml-auto flex items-center gap-2 px-4 py-2.5 rounded-xl text-[12px] font-bold border border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600 transition-all bg-white flex-shrink-0">
                                <RefreshCw size={12}/> Refresh
                            </button>
                        </div>

                        {err&&(
                            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 flex items-start gap-4">
                                <AlertCircle size={18} className="text-rose-600 flex-shrink-0 mt-0.5"/>
                                <div>
                                    <p className="text-[13px] font-bold text-rose-900">Failed to load</p>
                                    <p className="text-[12px] text-rose-600 mt-0.5">{err}</p>
                                    <button onClick={loadData} className="mt-3 flex items-center gap-2 px-4 py-2 bg-rose-600 text-white text-[12px] font-bold rounded-xl hover:bg-rose-500">
                                        <RefreshCw size={12}/> Retry
                                    </button>
                                </div>
                            </div>
                        )}

                        {!err&&(
                            <>
                                {/* Overview = existing admin/manager dashboards */}
                                {orgSection === 'overview' && (
                                    <>
                                        {isAdminOrHR&&adminData&&<AdminDashboard data={adminData} navigate={navigate} section={orgSection}/>}
                                        {isManager&&!isAdminOrHR&&mgrData&&<ManagerDashboard data={mgrData} navigate={navigate} section={orgSection}/>}
                                        {isEmployee&&!isManager&&!isAdminOrHR&&(
                                            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center">
                                                <Building2 size={32} className="mx-auto text-slate-300 mb-3"/>
                                                <p className="text-[14px] font-bold text-slate-600">Organization data is available to managers and admins.</p>
                                                <p className="text-[12px] text-slate-400 mt-1">Contact your administrator if you need access.</p>
                                            </div>
                                        )}
                                        {!loading&&!err&&(
                                            (isAdminOrHR&&!adminData)||(isManager&&!isAdminOrHR&&!mgrData)
                                        )&&(
                                            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-4">
                                                <Zap size={18} className="text-amber-600 flex-shrink-0 mt-0.5"/>
                                                <div>
                                                    <p className="text-[13px] font-bold text-amber-900">No data returned</p>
                                                    <p className="text-[12px] text-amber-700 mt-0.5">The database may still be initializing.</p>
                                                    <button onClick={loadData} className="mt-3 flex items-center gap-2 px-4 py-2 bg-amber-600 text-white text-[12px] font-bold rounded-xl">
                                                        <RefreshCw size={12}/> Retry
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}

                                {/* Section-specific widgets */}
                                {orgSection !== 'overview' && (
                                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                                        {orgSection === 'announcements'  && <AnnouncementsWidget/>}
                                        {orgSection === 'policies'       && <PoliciesWidget/>}
                                        {orgSection === 'employee-tree'  && <EmployeeTreeWidget/>}
                                        {orgSection === 'dept-tree'      && <DeptTreeWidget/>}
                                        {orgSection === 'dept-directory' && <DeptDirectoryWidget/>}
                                        {orgSection === 'birthdays'      && <BirthdayWidget/>}
                                        {orgSection === 'new-hires'      && <NewHiresWidget/>}
                                        {orgSection === 'calendar'       && <OrgCalendarWidget/>}
                                    </div>
                                )}
                            </>
                        )}
                    </>
                )}
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes orb1{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(-20px,15px) scale(1.05)}66%{transform:translate(10px,-10px) scale(.97)}}
                @keyframes orb2{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(15px,20px) scale(1.08)}}
                @keyframes orb3{0%,100%{transform:translate(0,0)}40%{transform:translate(-15px,-20px) scale(1.04)}80%{transform:translate(10px,10px) scale(.96)}}
            ` }} />
        </div>
    );
};

export default Dashboard;