/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        vscode: {
          bg: '#1e1e1e',
          sidebar: '#252526',
          activitybar: '#333333',
          titlebar: '#3c3c3c',
          statusbar: '#007acc',
          tab: '#2d2d2d',
          tabActive: '#1e1e1e',
          border: '#454545',
          text: '#cccccc',
          textMuted: '#858585',
          accent: '#007acc',
          hover: '#2a2d2e',
          selected: '#094771',
          input: '#3c3c3c',
          panel: '#1e1e1e',
          badge: '#007acc',
        },
        ai: {
          primary: '#7c3aed',
          secondary: '#4f46e5',
          glow: '#8b5cf6',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Cascadia Code', 'monospace'],
        ui: ['Segoe UI', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'xxs': '10px',
        'xs': '11px',
        'sm': '12px',
        'base': '13px',
        'lg': '14px',
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'slide-in': 'slide-in 0.2s ease-out',
        'fade-in': 'fade-in 0.15s ease-out',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 5px rgba(124, 58, 237, 0.5)' },
          '50%': { boxShadow: '0 0 20px rgba(124, 58, 237, 0.8)' },
        },
        'slide-in': {
          from: { transform: 'translateX(-100%)' },
          to: { transform: 'translateX(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        }
      }
    },
  },
  plugins: [],
}
