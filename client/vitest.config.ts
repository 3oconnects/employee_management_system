import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Component tests (Ozofi Nexus design system and auth screens).
export default defineConfig({
    plugins: [react()],
    test: {
        environment: 'jsdom',
        include: ['src/**/*.test.tsx'],
        setupFiles: ['src/test/setup.ts'],
    },
})
