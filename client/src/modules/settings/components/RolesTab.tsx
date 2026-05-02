import React, { useState } from 'react';
import { Plus, Trash2, ChevronRight, Check, Loader2, Pencil } from 'lucide-react';
import type { Role, PermissionsMap } from './PermissionMatrix';
import PermissionMatrix from './PermissionMatrix';
import api from '../../../services/api';

interface Props {
    roles: Role[];
    permissions: PermissionsMap;
    onRefresh: () => void;
    onNotify: (msg: string, ok?: boolean) => void;
}

const RolesTab: React.FC<Props> = ({ roles, permissions, onRefresh, onNotify }) => {
    const [selectedRole, setSelectedRole] = useState<Role | null>(null);
    const [editingPerms, setEditingPerms] = useState<Set<string>>(new Set());
    const [showNewRole, setShowNewRole] = useState(false);
    const [newName, setNewName] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [saving, setSaving] = useState(false);
    const [editingRole, setEditingRole] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [editDesc, setEditDesc] = useState('');
    const [dashboardType, setDashboardType] = useState('employee');

    // Expose setter for PermissionMatrix (simulating a callback for now)
    (window as any)._setDashboardType = setDashboardType;

    const selectRole = (role: Role) => {
        setSelectedRole(role);
        setEditingPerms(new Set(role.permissions));
        setDashboardType(role.dashboard_type || 'employee');
    };

    const togglePerm = (key: string) => {
        setEditingPerms(prev => {
            const next = new Set(prev);
            next.has(key) ? next.delete(key) : next.add(key);
            return next;
        });
    };

    const toggleModule = (_module: string, keys: string[], allOn: boolean) => {
        setEditingPerms(prev => {
            const next = new Set(prev);
            allOn ? keys.forEach(k => next.delete(k)) : keys.forEach(k => next.add(k));
            return next;
        });
    };

    const savePermissions = async () => {
        if (!selectedRole) return;
        setSaving(true);
        try {
            await api.put(`/settings/roles/${selectedRole.id}/permissions`, {
                permissions: Array.from(editingPerms),
            });
            // Also update the dashboard_type on the role itself
            await api.put(`/settings/roles/${selectedRole.id}`, { 
                dashboard_type: dashboardType 
            });
            onNotify('Role configuration saved!');
            onRefresh();
        } catch { onNotify('Failed to save permissions', false); }
        finally { setSaving(false); }
    };

    const saveRoleDetail = async (id: string) => {
        if (!editName.trim()) return;
        setSaving(true);
        try {
            await api.put(`/settings/roles/${id}`, { name: editName, description: editDesc });
            onNotify('Role updated!');
            setEditingRole(null);
            onRefresh();
        } catch (e: any) { onNotify(e?.message || 'Failed to update role', false); }
        finally { setSaving(false); }
    };

    const startEdit = (e: React.MouseEvent, role: Role) => {
        e.stopPropagation();
        setEditingRole(role.id);
        setEditName(role.name);
        setEditDesc(role.description || '');
    };

    const createRole = async () => {
        if (!newName.trim()) return;
        setSaving(true);
        try {
            await api.post('/settings/roles', { name: newName, description: newDesc, permissions: [] });
            onNotify('Role created!');
            setNewName(''); setNewDesc(''); setShowNewRole(false);
            onRefresh();
        } catch (e: any) { onNotify(e?.message || 'Failed to create role', false); }
        finally { setSaving(false); }
    };

    const deleteRole = async (role: Role) => {
        if (role.is_system) return onNotify('System roles cannot be deleted.', false);
        if (role.user_count > 0) return onNotify(`${role.user_count} user(s) still assigned to this role.`, false);
        if (!confirm(`Delete role "${role.name}"?`)) return;
        try {
            await api.delete(`/settings/roles/${role.id}`);
            onNotify('Role deleted.');
            if (selectedRole?.id === role.id) setSelectedRole(null);
            onRefresh();
        } catch { onNotify('Failed to delete role', false); }
    };

    return (
        <div className="grid grid-cols-12 gap-5">
            {/* ── Left: Role list ─────────────────────────────────── */}
            <div className="col-span-12 lg:col-span-4 space-y-3">
                <div className="flex items-center justify-between">
                    <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{roles.length} Roles</p>
                    <button
                        onClick={() => setShowNewRole(v => !v)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-[11px] font-bold hover:bg-indigo-500 transition-all"
                    >
                        <Plus size={12} /> New Role
                    </button>
                </div>

                {/* Inline create form */}
                {showNewRole && (
                    <div className="bg-white border border-indigo-200 rounded-2xl p-4 space-y-3 shadow-md">
                        <p className="text-[12px] font-bold text-slate-700">Create New Role</p>
                        <input
                            value={newName} onChange={e => setNewName(e.target.value)}
                            placeholder="Role name (e.g. Recruiter)"
                            className="w-full px-3 py-2 text-[12px] border border-slate-200 rounded-xl outline-none focus:border-indigo-400"
                        />
                        <input
                            value={newDesc} onChange={e => setNewDesc(e.target.value)}
                            placeholder="Description (optional)"
                            className="w-full px-3 py-2 text-[12px] border border-slate-200 rounded-xl outline-none focus:border-indigo-400"
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={createRole} disabled={saving}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-indigo-600 text-white rounded-xl text-[11px] font-bold hover:bg-indigo-500 disabled:opacity-50"
                            >
                                {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Create
                            </button>
                            <button
                                onClick={() => setShowNewRole(false)}
                                className="px-4 py-2 border border-slate-200 rounded-xl text-[11px] font-bold text-slate-500 hover:bg-slate-50"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                {/* Role cards */}
                <div className="space-y-2">
                    {roles.map(role => (
                        <div
                            key={role.id}
                            onClick={() => selectRole(role)}
                            className={`bg-white border rounded-2xl p-4 cursor-pointer transition-all
                                ${selectedRole?.id === role.id
                                    ? 'border-indigo-400 shadow-md shadow-indigo-50 ring-1 ring-indigo-200'
                                    : 'border-slate-100 hover:border-slate-200 hover:shadow-sm'
                                }`}
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                    {editingRole === role.id ? (
                                        <div className="space-y-2 animate-in fade-in slide-in-from-top-1" onClick={e => e.stopPropagation()}>
                                            <input
                                                value={editName} onChange={e => setEditName(e.target.value)}
                                                className="w-full px-2 py-1 text-[13px] font-bold border border-indigo-300 rounded-lg outline-none bg-indigo-50"
                                                autoFocus
                                            />
                                            <input
                                                value={editDesc} onChange={e => setEditDesc(e.target.value)}
                                                className="w-full px-2 py-1 text-[11px] border border-slate-200 rounded-lg outline-none"
                                                placeholder="Description..."
                                            />
                                            <div className="flex gap-2">
                                                <button onClick={() => saveRoleDetail(role.id)} disabled={saving}
                                                    className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-[10px] font-bold">
                                                    {saving ? '...' : 'Save'}
                                                </button>
                                                <button onClick={() => setEditingRole(null)}
                                                    className="px-3 py-1 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-500">
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex items-center gap-2">
                                                <p className="text-[13px] font-bold text-slate-800 truncate">{role.name}</p>
                                                {role.is_system && (
                                                    <span className="flex-shrink-0 px-1.5 py-0.5 bg-slate-100 text-slate-500 text-[9px] font-black uppercase rounded-md">
                                                        System
                                                    </span>
                                                )}
                                            </div>
                                            {role.description && (
                                                <p className="text-[11px] text-slate-400 mt-0.5 truncate">{role.description}</p>
                                            )}
                                        </>
                                    )}
                                    <div className="flex items-center gap-3 mt-1.5">
                                        <span className="text-[11px] text-indigo-500 font-semibold">
                                            {role.user_count} user{role.user_count !== 1 ? 's' : ''}
                                        </span>
                                        <span className="text-[10px] text-slate-300">·</span>
                                        <span className="text-[11px] text-slate-400">
                                            {role.permissions.length} permission{role.permissions.length !== 1 ? 's' : ''}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                                    {selectedRole?.id === role.id && !editingRole && (
                                        <ChevronRight size={14} className="text-indigo-500" />
                                    )}
                                    {!role.is_system && !editingRole && (
                                        <>
                                            <button
                                                onClick={e => startEdit(e, role)}
                                                className="p-1.5 rounded-lg text-slate-300 hover:text-indigo-500 hover:bg-indigo-50 transition-all"
                                            >
                                                <Pencil size={13} />
                                            </button>
                                            <button
                                                onClick={e => { e.stopPropagation(); deleteRole(role); }}
                                                className="p-1.5 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all"
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Right: Permission matrix ─────────────────────────── */}
            <div className="col-span-12 lg:col-span-8">
                <PermissionMatrix
                    role={selectedRole ? { ...selectedRole, dashboard_type: dashboardType } : null}
                    permissions={permissions}
                    editingPerms={editingPerms}
                    onToggle={togglePerm}
                    onToggleModule={toggleModule}
                    onSave={savePermissions}
                    saving={saving}
                />
            </div>
        </div>
    );
};

export default RolesTab;
