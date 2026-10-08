/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                nx: {
                    'primary': 'rgb(var(--nx-primary) / <alpha-value>)',
                    'primary-hover': 'rgb(var(--nx-primary-hover) / <alpha-value>)',
                    'primary-subtle': 'rgb(var(--nx-primary-subtle) / <alpha-value>)',
                    'canvas': 'rgb(var(--nx-canvas) / <alpha-value>)',
                    'surface': 'rgb(var(--nx-surface) / <alpha-value>)',
                    'surface-muted': 'rgb(var(--nx-surface-muted) / <alpha-value>)',
                    'border': 'rgb(var(--nx-border) / <alpha-value>)',
                    'border-strong': 'rgb(var(--nx-border-strong) / <alpha-value>)',
                    'fg': 'rgb(var(--nx-fg) / <alpha-value>)',
                    'fg-muted': 'rgb(var(--nx-fg-muted) / <alpha-value>)',
                    'fg-subtle': 'rgb(var(--nx-fg-subtle) / <alpha-value>)',
                    'success': 'rgb(var(--nx-success) / <alpha-value>)',
                    'success-subtle': 'rgb(var(--nx-success-subtle) / <alpha-value>)',
                    'warning': 'rgb(var(--nx-warning) / <alpha-value>)',
                    'warning-subtle': 'rgb(var(--nx-warning-subtle) / <alpha-value>)',
                    'danger': 'rgb(var(--nx-danger) / <alpha-value>)',
                    'danger-subtle': 'rgb(var(--nx-danger-subtle) / <alpha-value>)',
                    'info': 'rgb(var(--nx-info) / <alpha-value>)',
                    'info-subtle': 'rgb(var(--nx-info-subtle) / <alpha-value>)',
                },
                primary: {
                    DEFAULT: '#2A2673',
                    soft: '#4F4AA8',
                    light: '#CFD2E6',
                },
                sidebar: {
                    bg: '#14123D',
                    active: '#2A2673',
                },
                surface: '#FFFFFF',
                bg: '#F7F8FC',
                text: {
                    primary: '#14123D',
                    secondary: '#4F4AA8',
                    muted: '#9CA3AF',
                }
            },
            borderRadius: {
                xl: '12px',
                '2xl': '16px',
                '3xl': '24px',
            },
            // Ozofi Nexus design system (docs/nexus/DESIGN_SYSTEM.md)
            fontFamily: {
                nx: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
            },
            boxShadow: {
                premium: '0 20px 25px -5px rgba(20, 18, 61, 0.1), 0 10px 10px -5px rgba(20, 18, 61, 0.04)',
                'nx-sm': '0 1px 2px rgba(15, 23, 42, 0.05)',
                'nx-md': '0 1px 3px rgba(15, 23, 42, 0.06), 0 4px 12px rgba(15, 23, 42, 0.05)',
            }
        },
    },
    plugins: [],
}
