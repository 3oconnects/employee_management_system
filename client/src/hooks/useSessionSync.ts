import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { syncSession } from '../services/sessionSync';
import { toast } from '../components/ui';

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
                if (changed) toast.info('Your access was updated by an administrator.');
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
