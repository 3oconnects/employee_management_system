/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                ozofi: {
                    navy: '#17213D',
                    blue: '#2563EB',
                    indigo: '#3730A3',
                    purple: '#8B3DFF',
                    teal: '#0F9F8F',
                    green: '#65B814',
                    amber: '#FFAA0A',
                    orange: '#FF641F',
                    red: '#EF3434',
                    canvas: '#FFFFFF',
                    surface: '#F5F7FB',
                    'surface-raised': '#FFFFFF',
                    border: '#E2E8F0',
                    text: '#17213D',
                    'text-secondary': '#64748B',
                    'text-muted': '#94A3B8',
                },
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
                    DEFAULT: '#1064EA',
                    soft: '#2563EB',
                    light: '#DBEAFE',
                },
                indigo: {
                    50: '#EEF4FE',
                    100: '#DCE7FD',
                    200: '#BFD4FB',
                    300: '#94BCF8',
                    400: '#609DF4',
                    500: '#387DEF',
                    600: '#1064EA', /* Zoho Primary Enterprise Blue */
                    700: '#0C54C8', /* Zoho Blue Hover */
                    800: '#0E449F',
                    900: '#113B7E',
                    950: '#0C1427', /* Zoho Deep Navy */
                },
                zoho: {
                    blue: '#1064EA',
                    'blue-hover': '#0C54C8',
                    'blue-subtle': '#EEF4FE',
                    red: '#ED1C24',
                    'red-subtle': '#FEECEB',
                    green: '#00A859',
                    'green-subtle': '#E6F6EE',
                    yellow: '#FBB03B',
                    'yellow-subtle': '#FEF7EC',
                    navy: '#0C1427',
                    'navy-light': '#162038',
                    canvas: '#F4F5F8',
                    surface: '#FFFFFF',
                    border: '#E2E8F0',
                    'border-strong': '#CBD5E1',
                },
                sidebar: {
                    bg: '#0C1427',
                    active: '#1064EA',
                },
                surface: '#FFFFFF',
                bg: '#F4F5F8',
                text: {
                    primary: '#0F172A',
                    secondary: '#334155',
                    muted: '#64748B',
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
