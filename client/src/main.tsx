import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import * as Sentry from '@sentry/react'
import App from './App'
import './index.css'

// ─── ERROR MONITORING (Release 0 — B0-04) ───────────────────────────────────
// Off unless VITE_SENTRY_DSN is set; with it unset the app renders exactly as
// before. Collection is restricted and URLs lose their query strings because
// tokens can travel in ?token= (SSE).
const sentryDsn = import.meta.env.VITE_SENTRY_DSN as string | undefined
const stripQuery = (url?: string) => (url ? url.split('?')[0] : url)

if (sentryDsn) {
    Sentry.init({
        dsn: sentryDsn,
        environment: (import.meta.env.VITE_SENTRY_ENVIRONMENT as string | undefined) || import.meta.env.MODE,
        tracesSampleRate: 0,
        dataCollection: {
            userInfo: false,
            cookies: false,
            httpHeaders: false,
            httpBodies: [],
            urlQueryParams: false,
            stackFrameVariables: false,
        },
        beforeSend(event) {
            if (event.request) {
                delete event.request.cookies
                delete event.request.data
                delete event.request.query_string
                delete event.request.headers
                event.request.url = stripQuery(event.request.url)
            }
            delete event.user
            return event
        },
        beforeBreadcrumb(breadcrumb) {
            if (breadcrumb.data && typeof breadcrumb.data.url === 'string') {
                breadcrumb.data.url = stripQuery(breadcrumb.data.url)
            }
            // UI click/input breadcrumbs can contain typed values; keep the category only.
            if (breadcrumb.category?.startsWith('ui.')) delete breadcrumb.message
            return breadcrumb
        },
    })
}

const app = (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <App />
    </BrowserRouter>
)

const ErrorFallback = () => (
    <div style={{ padding: 32, fontFamily: 'sans-serif' }}>
        <h1>Something went wrong.</h1>
        <p>Please reload the page. The error has been reported.</p>
    </div>
)

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        {sentryDsn ? <Sentry.ErrorBoundary fallback={<ErrorFallback />}>{app}</Sentry.ErrorBoundary> : app}
    </React.StrictMode>,
)
