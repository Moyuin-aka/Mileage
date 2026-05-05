import type { Config } from 'tailwindcss'

export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: 'rgb(var(--color-surface) / <alpha-value>)',
          2: 'rgb(var(--color-surface-2) / <alpha-value>)',
          3: 'rgb(var(--color-surface-3) / <alpha-value>)',
          hover: 'rgb(var(--color-surface-hover) / <alpha-value>)',
        },
        primary: 'rgb(var(--color-primary) / <alpha-value>)',
        secondary: 'rgb(var(--color-secondary) / <alpha-value>)',
        muted: 'rgb(var(--color-muted) / <alpha-value>)',
        overlay: 'rgb(var(--color-overlay) / <alpha-value>)',
        'app-border': 'rgb(var(--color-border) / <alpha-value>)',
        'border-strong': 'rgb(var(--color-border-strong) / <alpha-value>)',
        accent: {
          DEFAULT: 'rgb(var(--color-accent) / <alpha-value>)',
          dim: 'rgb(var(--color-accent-dim) / <alpha-value>)',
          bg: 'rgb(var(--color-accent-bg) / <alpha-value>)',
          'bg-hover': 'rgb(var(--color-accent-bg-hover) / <alpha-value>)',
          muted: 'rgb(var(--color-accent-muted) / <alpha-value>)',
        },
        warn: {
          DEFAULT: 'rgb(var(--color-warn) / <alpha-value>)',
          bg: 'rgb(var(--color-warn-bg) / <alpha-value>)',
          'bg-hover': 'rgb(var(--color-warn-bg-hover) / <alpha-value>)',
          border: 'rgb(var(--color-warn-border) / <alpha-value>)',
          muted: 'rgb(var(--color-warn-muted) / <alpha-value>)',
        },
        danger: {
          DEFAULT: 'rgb(var(--color-danger) / <alpha-value>)',
          bg: 'rgb(var(--color-danger-bg) / <alpha-value>)',
          'bg-hover': 'rgb(var(--color-danger-bg-hover) / <alpha-value>)',
          border: 'rgb(var(--color-danger-border) / <alpha-value>)',
        },
        success: {
          DEFAULT: 'rgb(var(--color-success) / <alpha-value>)',
          bg: 'rgb(var(--color-success-bg) / <alpha-value>)',
          border: 'rgb(var(--color-success-border) / <alpha-value>)',
        },
        info: {
          DEFAULT: 'rgb(var(--color-info) / <alpha-value>)',
          bg: 'rgb(var(--color-info-bg) / <alpha-value>)',
          border: 'rgb(var(--color-info-border) / <alpha-value>)',
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
