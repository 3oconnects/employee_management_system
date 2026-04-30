import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    server: {
        // Allow ngrok tunnels to serve this dev server
        allowedHosts: [
            'velda-nonraiseable-joshingly.ngrok-free.dev',
            'henlike-heterogeneously-rex.ngrok-free.dev',
        ],
        // HMR (Hot Module Replacement) WebSocket cannot work through ngrok
        // because ngrok does not proxy the Vite WebSocket path and returns 404,
        // causing an infinite polling loop. Disable it so the page stays stable.
        // HMR still works normally on direct localhost access.
        hmr: false,
    }
})
