/// <reference types="vite/client" />

interface ImportMetaEnv {
    /** Backend API base URL — set in client/.env
     *  Example: VITE_API_URL=http://localhost:4000/api
     *  Change the port here if the backend starts on a different port.
     */
    readonly VITE_API_URL: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
