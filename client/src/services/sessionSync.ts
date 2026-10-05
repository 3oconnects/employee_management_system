import api from './api';
import { useAuthStore } from '../store/authStore';

// The browser keeps a copy of who you are (role, dashboard, permissions) from the moment you signed in, and the
// access token carries the same claims. When an administrator changes your role, both go stale until you sign in
// again. This asks the server what is true NOW and, if your access changed, takes a new token first (so the server
// agrees with the screen) and only then updates the screen.

const sameSet = (a?: string[], b?: string[]): boolean => {
    const x = new Set(a ?? []); const y = new Set(b ?? []);
    return x.size === y.size && [...x].every((p) => y.has(p));
};

let inflight: Promise<boolean> | null = null;
let lastRun = 0;

export interface SyncOptions {
    /** Skip the minimum interval (used at start-up). */
    force?: boolean;
    minIntervalMs?: number;
}

/** Resolves true when the person's ACCESS (role, dashboard or permissions) changed and the screen was updated. */
export function syncSession({ force = false, minIntervalMs = 60_000 }: SyncOptions = {}): Promise<boolean> {
    if (inflight) return inflight;
    if (!force && Date.now() - lastRun < minIntervalMs) return Promise.resolve(false);
    lastRun = Date.now();

    inflight = (async () => {
        const { user, refreshToken, updateUser, setAccessToken, setRefreshToken } = useAuthStore.getState();
        if (!user) return false;

        let fresh: any;
        try {
            const { data } = await api.get('/auth/me');
            fresh = data?.user;
        } catch { return false; }
        if (!fresh) return false;

        const accessChanged =
            (fresh.role ?? user.role) !== user.role ||
            (fresh.dashboard_type ?? user.dashboard_type) !== user.dashboard_type ||
            (Array.isArray(fresh.permissions) && !sameSet(fresh.permissions, user.permissions));

        // things that never need a new token
        const harmless: Record<string, unknown> = {};
        if (fresh.availability_status) harmless.availability_status = fresh.availability_status;
        if (fresh.name) harmless.name = fresh.name;
        if (fresh.avatar_url !== undefined && fresh.avatar_url !== null) harmless.avatar_url = fresh.avatar_url;

        if (!accessChanged) {
            if (Object.keys(harmless).length) updateUser(harmless as any);
            return false;
        }

        // The server decides from the token's claims, so the token must be renewed BEFORE the screen changes.
        if (!refreshToken) { updateUser(harmless as any); return false; }
        try {
            const { data } = await api.post('/auth/refresh', { refreshToken });
            if (!data?.accessToken) throw new Error('no token');
            setAccessToken(data.accessToken);
            if (data.refreshToken) setRefreshToken(data.refreshToken);
        } catch {
            updateUser(harmless as any);
            lastRun = 0;          // try again at the next opportunity
            return false;
        }

        updateUser({
            ...(harmless as any),
            role: fresh.role ?? user.role,
            dashboard_type: fresh.dashboard_type ?? user.dashboard_type,
            permissions: Array.isArray(fresh.permissions) ? fresh.permissions : user.permissions,
        });
        return true;
    })().finally(() => { inflight = null; });

    return inflight;
}

/** Test helper: forget the throttle and any in-flight call. */
export function resetSessionSync(): void {
    inflight = null;
    lastRun = 0;
}
