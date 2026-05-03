import type { Config } from 'tailwindcss'

export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Custom surface colors for dark-first design
        surface: {
          DEFAULT: '#141414',
          2: '#1c1c1c',
          3: '#222222',
        },
        'app-border': '#2a2a2a',
        // Green accent system
        accent: {
          DEFAULT: '#4ade80',
          dim: '#22c55e',
          bg: '#052e16',
          'bg-hover': '#073d1f',
          muted: '#166534',
        },
        // Warning state (overdue items)
        warn: {
          DEFAULT: '#fbbf24',
          bg: '#451a03',
        },
      },
      fontFamily: {
        serif: ['Georgia', 'Cambria', '"Times New Roman"', 'serif'],
        mono: [
          '"SF Mono"', '"Monaco"', '"Inconsolata"',
          '"Roboto Mono"', 'monospace',
        ],
      },
      fontSize: {
        '2xs': ['0.65rem', { lineHeight: '1rem' }],
      },
      borderRadius: {
        DEFAULT: '0.5rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.15s ease-out',
        'slide-up': 'slideUp 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config
