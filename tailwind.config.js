/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        flatzy: {
          navy: '#0B132B',
          navyLight: '#1C2541',
          navyCard: '#131D38',
          yellow: '#FFC800',
          yellowLight: '#FFE580',
          coral: '#FF5722',
          coralLight: '#FF8A65',
          bgLight: '#F4F5F9',
          cardLight: '#FFFFFF',
          textMuted: '#64748B',
          borderSubtle: '#E2E8F0',
          greenSuccess: '#10B981',
          greenLight: '#DCFCE7'
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 8px 30px rgba(0, 0, 0, 0.05)',
        'float': '0 12px 36px rgba(11, 19, 43, 0.12)',
        'yellow-glow': '0 6px 20px rgba(255, 200, 0, 0.35)',
      }
    },
  },
  plugins: [],
}
