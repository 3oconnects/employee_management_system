import { useEffect } from 'react';
import { pageTitle } from '../config/brand';

/** Sets the browser tab title to "<page> · Ozofi Nexus" while the page is mounted. */
export function usePageTitle(page?: string): void {
    useEffect(() => {
        const previous = document.title;
        document.title = pageTitle(page);
        return () => {
            document.title = previous;
        };
    }, [page]);
}
