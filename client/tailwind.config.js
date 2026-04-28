/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
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
            boxShadow: {
                premium: '0 20px 25px -5px rgba(20, 18, 61, 0.1), 0 10px 10px -5px rgba(20, 18, 61, 0.04)',
            }
        },
    },
    plugins: [],
}
