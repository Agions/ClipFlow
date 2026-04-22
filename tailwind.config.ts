import type { Config } from 'tailwindcss'
import tailwindcss from '@tailwindcss/vite'

export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'bg-primary': '#0d0d0f',
        'bg-secondary': '#141418',
        'bg-tertiary': '#1a1a1f',
        'bg-hover': '#222228',
        'border-subtle': '#2a2a30',
        'border-default': '#3a3a42',
        'text-primary': '#f0f0f2',
        'text-secondary': '#8a8a96',
        'text-disabled': '#4a4a52',
        'accent-primary': '#f97316',
        'accent-primary-hover': '#fb923c',
        'accent-secondary': '#3b82f6',
        'accent-success': '#22c55e',
        'accent-warning': '#eab308',
        'accent-danger': '#ef4444',
        'timeline-video': '#8b5cf6',
        'timeline-audio': '#06b6d4',
        'timeline-subtitle': '#f59e0b',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
} satisfies Config
