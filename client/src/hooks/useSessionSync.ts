import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { syncSession } from '../services/sessionSync';
import { toast } from '../components/ui';

// Simultaneous syncs (React dev double-mount, focus + visibilitychange firing together) share one
// request and so all see the same "changed" result; only the first of them may tell the person.
let lastNoticeAt = 0;
const NOTICE_GAP_MS = 5000;

/**
 * Keeps the signed-in person's role, dashboard and permissions current without signing out:
 * once when the app opens, and again whenever the tab comes back into view (at most once a minute).
 */
export function useSessionSync(): void {
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

    useEffect(() => {
        if (!isAuthenticated) return;
        const run = (force = false) => {
            syncSession({ force }).then((changed) => {
                if (changed && Date.now() - lastNoticeAt > NOTICE_GAP_MS) {
                    lastNoticeAt = Date.now();
                    toast.info('Your access was updated by an administrator.');
                }
            }).catch(() => { /* never disturbs the page */ });
        };
        run(true);
        const onVisible = () => { if (document.visibilityState === 'visible') run(); };
        window.addEventListener('focus', onVisible);
        document.addEventListener('visibilitychange', onVisible);
        return () => {
            window.removeEventListener('focus', onVisible);
            document.removeEventListener('visibilitychange', onVisible);
        };
    }, [isAuthenticated]);
}
