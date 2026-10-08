// The emailed password-reset link carries its one-time token in the URL fragment
// (`/login#reset_token=...`). A fragment is never sent to the server, proxies or
// Referer headers. The token is only ever read here, then removed from the address bar.

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{20,128}$/;

/** Pure: returns the reset token in the current URL fragment, or null. */
export function readResetTokenFromHash(hash: string = window.location.hash): string | null {
    const token = new URLSearchParams(hash.replace(/^#/, '')).get('reset_token');
    return token && TOKEN_PATTERN.test(token) ? token : null;
}

/** Removes the fragment (and so the token) from the address bar and history entry. */
export function clearResetTokenFromUrl(): void {
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
}
