/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        accent: {
          pink: '#ec4899',
          purple: '#8b5cf6',
          orange: '#f97316',
          green: '#22c55e'
        }
      },
      backgroundColor: {
        dark: '#121212',
        'dark-lighter': '#1e1e1e',
        'dark-card': '#252525',
        'dark-input': '#1a1a1a'
      },
      textColor: {
        dark: '#a3a3a3',
        'dark-light': '#d4d4d4',
        'dark-muted': '#737373',
        'dark-primary': '#3b82f6'
      },
      borderColor: {
        dark: '#2e2e2e',
        'dark-light': '#363636'
      }
    },
  },
  plugins: [],
}