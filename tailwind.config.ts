import type { Config } from 'tailwindcss'

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#080b10',
          900: '#0c1118',
          850: '#101722',
          800: '#141d2a',
          700: '#1d2939',
          600: '#2b3a4e',
          500: '#3d4c5f',
          400: '#5d6f84',
          300: '#8191a3',
          200: '#aab6c3',
          100: '#d3dbe3',
        },
        volt: {
          50: '#f4ffdf',
          100: '#e7ffb7',
          200: '#d3ff80',
          300: '#bdfa45',
          400: '#aeef1c',
          500: '#94d40d',
          600: '#74aa06',
          700: '#58810c',
          800: '#48660f',
          900: '#3b5511',
        },
        ember: {
          400: '#ffb547',
          500: '#f59e0b',
          600: '#d97706',
        },
        cloud: {
          50: '#f7f9fb',
          100: '#eef2f6',
          200: '#dde5ec',
          300: '#c3d0dc',
          400: '#8fa2b5',
        },
      },
      fontFamily: {
        sans: ['Manrope Variable', 'Manrope', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono Variable', 'Consolas', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(174, 239, 28, .22), 0 18px 50px -18px rgba(174, 239, 28, .28)',
        panel: '0 22px 70px -30px rgba(4, 9, 16, .55)',
        lift: '0 20px 45px -24px rgba(11, 20, 31, .35)',
      },
      backgroundImage: {
        'grid-dark':
          'linear-gradient(rgba(148,212,13,.055) 1px, transparent 1px), linear-gradient(90deg, rgba(148,212,13,.055) 1px, transparent 1px)',
        'grid-light':
          'linear-gradient(rgba(12,17,24,.055) 1px, transparent 1px), linear-gradient(90deg, rgba(12,17,24,.055) 1px, transparent 1px)',
      },
      animation: {
        'pulse-soft': 'pulseSoft 2.8s ease-in-out infinite',
        float: 'float 7s ease-in-out infinite',
        'wire-dash': 'wireDash 1.1s linear infinite',
      },
      keyframes: {
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '.5' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        wireDash: {
          to: { strokeDashoffset: '-16' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config
