import { useState, useEffect } from 'react';
import api from '../../../services/api';
import { toast } from '../../../components/ui';

// ─── GLOBAL CACHE SINGLETON ───────────────────────────────────────────────
// This persists data across component unmounts to eliminate "buffering" UX.
let organizationCache: {
    departments: any[];
    teams: any[];
    users: any[];
    timestamp: number;
} | null = null;

const CACHE_TTL = 30000; // 30 seconds

export const useOrganizationData = () => {
    const [departments, setDepartments] = useState<any[]>(organizationCache?.departments || []);
    const [teams, setTeams] = useState<any[]>(organizationCache?.teams || []);
    const [users, setUsers] = useState<any[]>(organizationCache?.users || []);
    
    // Only show the primary loader if we have NO cached data.
    const [loading, setLoading] = useState(!organizationCache);
    
    const [viewMembers, setViewMembers] = useState<any[]>([]);
    const [loadingMembers, setLoadingMembers] = useState(false);
    const [resolvedOwnership, setResolvedOwnership] = useState<any>(null);

    const fetchData = async (force = false) => {
        const now = Date.now();
        
        // Skip fetch if cache is fresh and not forced
        if (!force && organizationCache && (now - organizationCache.timestamp < CACHE_TTL)) {
            setLoading(false);
            return;
        }

        if (!organizationCache) setLoading(true);

        try {
            const [deptRes, teamRes, userRes] = await Promise.all([
                api.get('/organization/departments'),
                api.get('/organization/teams'),
                api.get('/users')
            ]);

            const newDepts = deptRes.data.data;
            const newTeams = teamRes.data.data;
            const newUsers = userRes.data.items || [];

            setDepartments(newDepts);
            setTeams(newTeams);
            setUsers(newUsers);

            // Update Global Cache
            organizationCache = {
                departments: newDepts,
                teams: newTeams,
                users: newUsers,
                timestamp: now
            };

        } catch (err) {
            toast.error('Failed to synchronize organizational data');
        } finally {
            setLoading(false);
        }
    };

    const fetchMembers = async (type: 'dept' | 'team' | 'node', id: number, viewingItem?: any) => {
        setLoadingMembers(true);
        try {
            let endpoint = '';
            if (type === 'dept') endpoint = `/employees?department_id=${id}`;
            else if (type === 'team') endpoint = `/employees?team_id=${id}`;
            else {
                const node = viewingItem?.item;
                if (node?.entity_type === 'department') endpoint = `/employees?department_id=${node.entity_id}`;
                else endpoint = `/employees?team_id=${node.entity_id}`;
            }
            const res = await api.get(endpoint);
            setViewMembers(res.data.items || []);
        } catch (err) {
            toast.error('Failed to load members');
        } finally {
            setLoadingMembers(false);
        }
    };

    const fetchGovernance = async (nodeId: number) => {
        try {
            const res = await api.get(`/governance/resolve/${nodeId}`);
            setResolvedOwnership(res.data);
        } catch {
            setResolvedOwnership(null);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    return {
        departments,
        teams,
        users,
        loading,
        viewMembers,
        loadingMembers,
        resolvedOwnership,
        fetchData: () => fetchData(true), // Allow forcing refresh
        fetchMembers,
        fetchGovernance,
        setResolvedOwnership
    };
};
