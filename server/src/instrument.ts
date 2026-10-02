// ============================================================================
// EMS BACKEND — ERROR MONITORING (Release 0 — B0-04)
// ============================================================================
// Must be the first import in index.ts: Sentry has to initialise before other
// modules load. Disabled entirely when SENTRY_DSN is unset (local, tests).
//
// Privacy: EMS handles salaries, bank details and personal data. Sentry 11
// collects request/response bodies, headers, query params, DB query params and
// stack-frame variables by default, so every category is restricted here and
// beforeSend/beforeBreadcrumb scrub again as a second layer.
// ============================================================================

// Load server/.env before reading SENTRY_DSN (dotenv never overrides set vars,
// and config/db.ts calls it again later, so this changes nothing else).
import 'dotenv/config';
import * as Sentry from '@sentry/node';

const SENSITIVE_KEYS = /pass(word)?|token|secret|authorization|cookie|email|phone|salary|ctc|bank|account|pan|aadhaar|otp/i;

/** Removes query strings (tokens can travel in ?token=, see baseline H3). */
const stripQuery = (url?: string) => (url ? url.split('?')[0] : url);

function scrubObject(value: unknown): unknown {
    if (!value || typeof value !== 'object') return value;
    if (Array.isArray(value)) return value.map(scrubObject);
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        out[k] = SENSITIVE_KEYS.test(k) ? '[Filtered]' : scrubObject(v);
    }
    return out;
}

export const sentryEnabled = Boolean(process.env.SENTRY_DSN);

if (sentryEnabled) {
    Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
        release: process.env.SENTRY_RELEASE || undefined,
        // Errors only by default. Transactions carry URLs (tokens may appear in
        // query strings until W-6), so tracing is opt-in.
        tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0),
        dataCollection: {
            userInfo: false,
            cookies: false,
            httpHeaders: { request: { allow: ['content-type', 'user-agent', 'x-request-id'] }, response: false },
            httpBodies: [],
            urlQueryParams: false,
            databaseQueryData: false,
            queues: false,
            stackFrameVariables: false,
            graphQL: { document: false, variables: false },
            genAI: { inputs: false, outputs: false },
        },
        beforeSend(event) {
            if (event.request) {
                delete event.request.cookies;
                delete event.request.data;
                delete event.request.query_string;
                event.request.url = stripQuery(event.request.url);
                if (event.request.headers) event.request.headers = scrubObject(event.request.headers) as Record<string, string>;
            }
            if (event.user) event.user = event.user.id !== undefined ? { id: event.user.id } : {};
            if (event.extra) event.extra = scrubObject(event.extra) as Record<string, unknown>;
            return event;
        },
        beforeSendTransaction(event) {
            if (event.request) {
                delete event.request.data;
                delete event.request.query_string;
                event.request.url = stripQuery(event.request.url);
            }
            return event;
        },
        beforeBreadcrumb(breadcrumb) {
            if (breadcrumb.data) {
                if (typeof breadcrumb.data.url === 'string') breadcrumb.data.url = stripQuery(breadcrumb.data.url);
                breadcrumb.data = scrubObject(breadcrumb.data) as Record<string, unknown>;
            }
            return breadcrumb;
        },
    });
}
