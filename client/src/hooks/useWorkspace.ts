import { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';

// The signed-in user's organisation ("workspace") identity: name and logo from
// Settings → General, via GET /workspace. Product branding (Ozofi Nexus) never
// comes from here; see config/brand.ts.

export interface Workspace {
    name: string | null;
    logoUrl: string | null;
}

const EMPTY: Workspace = { name: null, logoUrl: null };

// One request per session per tenant; every consumer shares it.
let cache: { tenantId: string; promise: Promise<Workspace> } | null = null;

function loadWorkspace(tenantId: string): Promise<Workspace> {
    if (!cache || cache.tenantId !== tenantId) {
        const promise = api
            .get('/workspace')
            .then((res) => (res.data?.data as Workspace) ?? EMPTY)
            .catch(() => {
                cache = null; // allow a retry on the next mount
                return EMPTY;
            });
        cache = { tenantId, promise };
    }
    return cache.promise;
}

export function useWorkspace(): Workspace {
    const { isAuthenticated, user } = useAuthStore();
    const tenantId = user?.tenant_id ?? '';
    const [workspace, setWorkspace] = useState<Workspace>(EMPTY);

    useEffect(() => {
        if (!isAuthenticated || !tenantId) {
            setWorkspace(EMPTY);
            return;
        }
        let active = true;
        loadWorkspace(tenantId).then((w) => active && setWorkspace(w));
        return () => {
            active = false;
        };
    }, [isAuthenticated, tenantId]);

    return workspace;
}
