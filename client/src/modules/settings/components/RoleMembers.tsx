import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Search, UserPlus, Loader2, Users, X, ChevronDown } from 'lucide-react';
import api from '../../../services/api';
import type { Role } from './PermissionMatrix';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';

// Who holds a role, with search, adding people to it, and moving people to another role.
// Every change goes through the same server endpoint (and the same authorization rules) as Settings -> Users.

interface Person {
    id: number;
    name: string;
    email: string;
    is_active: boolean;
    employee_id?: string | null;
    department?: string | null;
    position?: string | null;
    current_role_name?: string | null;
}

interface Props {
    role: Role;
    roles: Role[];
    /** Called after anyone was added or moved, so counts elsewhere refresh. */
    onChanged: () => void;
    onNotify: (msg: string, ok?: boolean) => void;
}

const PAGE = 25;

function useDebounced<T>(value: T, ms = 300): T {
    const [v, setV] = useState(value);
    useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
    return v;
}

const Avatar: React.FC<{ name: string }> = ({ name }) => (
    <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-[12px] font-black flex-shrink-0">
        {(name || '?').trim().split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase()}
    </div>
);

const RoleMembers: React.FC<Props> = ({ role, roles, onChanged, onNotify }) => {
    const [members, setMembers] = useState<Person[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [search, setSearch] = useState('');
    const dSearch = useDebounced(search);

    const [adding, setAdding] = useState(false);
    const [cSearch, setCSearch] = useState('');
    const dCSearch = useDebounced(cSearch);
    const [candidates, setCandidates] = useState<Person[]>([]);
    const [cLoading, setCLoading] = useState(false);
    const [busyId, setBusyId] = useState<number | null>(null);
    const [pendingMove, setPendingMove] = useState<{ person: Person; target: Role } | null>(null);

    // an answer that arrives after a newer request was made is ignored
    const memberReq = useRef(0);
    const candReq = useRef(0);

    const loadMembers = useCallback(async (offset = 0) => {
        const req = ++memberReq.current;
        offset === 0 ? setLoading(true) : setLoadingMore(true);
        try {
            const { data } = await api.get(`/settings/roles/${role.id}/members`, { params: { search: dSearch || undefined, limit: PAGE, offset } });
            if (req !== memberReq.current) return;
            setMembers((prev) => (offset === 0 ? data.items : [...prev, ...data.items]));
            setTotal(data.total);
        } catch (e: any) {
            if (req === memberReq.current) { onNotify(e?.message || 'Could not load the members.', false); if (offset === 0) { setMembers([]); setTotal(0); } }
        } finally {
            if (req === memberReq.current) { setLoading(false); setLoadingMore(false); }
        }
    }, [role.id, dSearch, onNotify]);

    const loadCandidates = useCallback(async () => {
        const req = ++candReq.current;
        setCLoading(true);
        try {
            const { data } = await api.get(`/settings/roles/${role.id}/candidates`, { params: { search: dCSearch || undefined, limit: 20 } });
            if (req === candReq.current) setCandidates(data.items);
        } catch (e: any) {
            if (req === candReq.current) { setCandidates([]); onNotify(e?.message || 'Could not search people.', false); }
        } finally {
            if (req === candReq.current) setCLoading(false);
        }
    }, [role.id, dCSearch, onNotify]);

    // a different role: start clean
    useEffect(() => { setSearch(''); setCSearch(''); setAdding(false); setCandidates([]); }, [role.id]);
    useEffect(() => { loadMembers(0); }, [loadMembers]);
    useEffect(() => { if (adding) loadCandidates(); }, [adding, loadCandidates]);

    const assign = async (person: Person, target: Role, verb: string) => {
        setBusyId(person.id);
        try {
            await api.put(`/settings/users/${person.id}/role`, { role_id: target.id });
            onNotify(`${person.name} ${verb}.`);
            onChanged();
            await Promise.all([loadMembers(0), adding ? loadCandidates() : Promise.resolve()]);
        } catch (e: any) {
            onNotify(e?.message || 'The role could not be changed.', false);
        } finally {
            setBusyId(null);
        }
    };

    // choosing a role in the list only OPENS the confirmation; nothing is changed until it is confirmed
    const askMove = (person: Person, roleId: number) => {
        const target = roles.find((r) => r.id === roleId);
        if (target) setPendingMove({ person, target });
    };

    const confirmMove = async () => {
        if (!pendingMove) return;
        await assign(pendingMove.person, pendingMove.target, `moved to ${pendingMove.target.name}`);
        setPendingMove(null);
    };

    const others = roles.filter((r) => r.id !== role.id);

    return (
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm">
            {/* header */}
            <div className="px-6 pt-5 pb-4 flex items-start justify-between gap-4 border-b border-slate-100">
                <div>
                    <p className="text-[15px] font-black text-slate-800 flex items-center gap-2">
                        <Users size={16} className="text-indigo-500" /> People in {role.name}
                    </p>
                    <p className="text-[12px] text-slate-400 mt-0.5" data-testid="member-total">
                        {total} {total === 1 ? 'person' : 'people'}{dSearch ? ` match "${dSearch}"` : ''}
                    </p>
                </div>
                <button
                    onClick={() => setAdding((v) => !v)}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 text-white rounded-xl text-[12px] font-bold hover:bg-indigo-500 transition-all"
                >
                    {adding ? <X size={13} /> : <UserPlus size={13} />} {adding ? 'Close' : 'Add people'}
                </button>
            </div>

            {/* add people */}
            {adding && (
                <div className="px-6 py-4 bg-indigo-50/40 border-b border-indigo-100 space-y-3">
                    <p className="text-[11px] font-black text-indigo-600 uppercase tracking-widest">Add to {role.name}</p>
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            value={cSearch} onChange={(e) => setCSearch(e.target.value)}
                            placeholder="Search everyone by name, e-mail or department"
                            aria-label="Search people to add"
                            className="w-full pl-9 pr-3 py-2.5 text-[13px] bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-400"
                        />
                    </div>
                    <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-100 bg-white divide-y divide-slate-50">
                        {cLoading && <p className="p-4 text-[12px] text-slate-400 flex items-center gap-2"><Loader2 size={13} className="animate-spin" /> Searching...</p>}
                        {!cLoading && candidates.length === 0 && <p className="p-4 text-[12px] text-slate-400">No one to add{dCSearch ? ' for this search' : ''}.</p>}
                        {!cLoading && candidates.map((p) => (
                            <div key={p.id} className="flex items-center gap-3 px-4 py-2.5">
                                <Avatar name={p.name} />
                                <div className="min-w-0 flex-1">
                                    <p className="text-[13px] font-bold text-slate-800 truncate">{p.name}</p>
                                    <p className="text-[11px] text-slate-400 truncate">
                                        {p.email}{p.department ? ` · ${p.department}` : ''} · now <span className="font-semibold text-slate-500">{p.current_role_name || 'no role'}</span>
                                    </p>
                                </div>
                                <button
                                    onClick={() => assign(p, role, `added to ${role.name}`)} disabled={busyId === p.id}
                                    aria-label={`Add ${p.name}`}
                                    className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-[11px] font-bold hover:bg-indigo-500 disabled:opacity-50"
                                >
                                    {busyId === p.id ? <Loader2 size={12} className="animate-spin" /> : 'Add'}
                                </button>
                            </div>
                        ))}
                    </div>
                    <p className="text-[11px] text-slate-400">Adding someone changes the role they hold now. You can only give roles whose permissions you hold yourself.</p>
                </div>
            )}

            {/* members */}
            <div className="px-6 py-4">
                <div className="relative mb-3">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        value={search} onChange={(e) => setSearch(e.target.value)}
                        placeholder={`Search ${role.name} by name, e-mail, department or employee id`}
                        aria-label="Search members"
                        className="w-full pl-9 pr-3 py-2.5 text-[13px] bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-400 focus:bg-white"
                    />
                </div>

                {loading ? (
                    <p className="py-10 text-center text-[12px] text-slate-400 flex items-center justify-center gap-2"><Loader2 size={14} className="animate-spin" /> Loading...</p>
                ) : members.length === 0 ? (
                    <p className="py-10 text-center text-[12px] text-slate-400">
                        {dSearch ? 'Nobody matches this search.' : `No one holds ${role.name} yet. Use “Add people”.`}
                    </p>
                ) : (
                    <ul className="divide-y divide-slate-50">
                        {members.map((p) => (
                            <li key={p.id} className="flex items-center gap-3 py-3">
                                <Avatar name={p.name} />
                                <div className="min-w-0 flex-1">
                                    <p className="text-[13px] font-bold text-slate-800 truncate">
                                        {p.name}
                                        {!p.is_active && <span className="ml-2 px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[9px] font-black uppercase">Inactive</span>}
                                    </p>
                                    <p className="text-[11px] text-slate-400 truncate">
                                        {p.email}{p.department ? ` · ${p.department}` : ''}{p.position ? ` · ${p.position}` : ''}{p.employee_id ? ` · ${p.employee_id}` : ''}
                                    </p>
                                </div>
                                <div className="relative flex-shrink-0">
                                    <select
                                        value="" disabled={busyId === p.id}
                                        onChange={(e) => e.target.value && askMove(p, Number(e.target.value))}
                                        aria-label={`Move ${p.name} to another role`}
                                        className="appearance-none pl-3 pr-7 py-1.5 text-[11px] font-bold text-slate-500 bg-white border border-slate-200 rounded-lg hover:border-slate-300 outline-none cursor-pointer"
                                    >
                                        <option value="">Move to…</option>
                                        {others.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                                    </select>
                                    <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                </div>
                            </li>
                        ))}
                    </ul>
                )}

                {!loading && members.length < total && (
                    <div className="pt-3 text-center">
                        <button
                            onClick={() => loadMembers(members.length)} disabled={loadingMore}
                            className="px-4 py-2 text-[12px] font-bold text-indigo-600 hover:bg-indigo-50 rounded-xl disabled:opacity-50"
                        >
                            {loadingMore ? 'Loading...' : `Show more (${total - members.length} more)`}
                        </button>
                    </div>
                )}
            </div>

            <ConfirmDialog
                open={!!pendingMove}
                title={pendingMove ? `Move ${pendingMove.person.name} to ${pendingMove.target.name}?` : ''}
                confirmLabel={pendingMove ? `Move to ${pendingMove.target.name}` : 'Move'}
                busy={!!pendingMove && busyId === pendingMove.person.id}
                onConfirm={confirmMove}
                onCancel={() => setPendingMove(null)}
            >
                {pendingMove && (
                    <>
                        <p>
                            <span className="font-bold text-slate-700">{pendingMove.person.name}</span> is in{' '}
                            <span className="font-bold text-slate-700">{role.name}</span>. They will hold{' '}
                            <span className="font-bold text-slate-700">{pendingMove.target.name}</span> instead.
                        </p>
                        <p className="text-[12px]">
                            {role.name}: {role.permissions.length} permission{role.permissions.length === 1 ? '' : 's'} &rarr;{' '}
                            {pendingMove.target.name}: {pendingMove.target.permissions.length} permission{pendingMove.target.permissions.length === 1 ? '' : 's'}.
                            Their access changes the next time they sign in or their session refreshes.
                        </p>
                        {pendingMove.target.dashboard_type === 'admin' && (
                            <p className="text-[12px] font-bold text-amber-600">
                                {pendingMove.target.name} uses Admin View, which gives full access to everything.
                            </p>
                        )}
                    </>
                )}
            </ConfirmDialog>
        </div>
    );
};

export default RoleMembers;
