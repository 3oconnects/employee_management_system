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
        allowedHosts: [
            'velda-nonraiseable-joshingly.ngrok-free.dev',
            'henlike-heterogeneously-rex.ngrok-free.dev'
        ],
        hmr: {
            host: 'henlike-heterogeneously-rex.ngrok-free.dev',
            protocol: 'wss'
        }
    }
})
