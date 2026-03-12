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
        allowedHosts: ['velda-nonraiseable-joshingly.ngrok-free.dev'],
        proxy: {
            // Fallback proxy: used only when VITE_API_URL is not set in .env.
            // When VITE_API_URL=http://localhost:4000/api is set, axios calls
            // that URL directly and this proxy is bypassed entirely.
            // To change the backend port, update VITE_API_URL in client/.env.
            '/api': {
                target: 'http://localhost:4000',
                changeOrigin: true,
            }
        }
    }
})

