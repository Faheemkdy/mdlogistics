// tailwind.config.js
const defaultTheme = require('tailwindcss/defaultTheme')

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      borderRadius: {
        'none': 'var(--radius-none, 0px)',
        'sm': 'var(--radius-sm, 0.125rem)',
        DEFAULT: 'var(--radius, 0.25rem)',
        'md': 'var(--radius-md, 0.375rem)',
        'lg': 'var(--radius-lg, 0.5rem)',
        'xl': 'var(--radius-xl, 0.75rem)',
        '2xl': 'var(--radius-2xl, 1rem)',
        '3xl': 'var(--radius-3xl, 1.5rem)',
      },
      boxShadow: {
        'sm': 'var(--shadow-sm, 0 1px 2px 0 rgb(0 0 0 / 0.05))',
        DEFAULT: 'var(--shadow, 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1))',
        'md': 'var(--shadow-md, 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1))',
        'lg': 'var(--shadow-lg, 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1))',
        'xl': 'var(--shadow-xl, 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1))',
        '2xl': 'var(--shadow-2xl, 0 25px 50px -12px rgb(0 0 0 / 0.25))',
        'inner': 'var(--shadow-inner, inset 0 2px 4px 0 rgb(0 0 0 / 0.05))',
      },
      fontFamily: {
        sans: ['var(--font-sans, "Inter")', ...defaultTheme.fontFamily.sans],
        mono: ['var(--font-mono, "ui-monospace")', ...defaultTheme.fontFamily.mono],
      },
      colors: {
        primary: {
          50: 'var(--color-primary-50)',
          100: 'var(--color-primary-100)',
          200: 'var(--color-primary-200)',
          300: 'var(--color-primary-300)',
          400: 'var(--color-primary-400)',
          500: 'var(--color-primary-500)',
          600: 'var(--color-primary-600)',
          700: 'var(--color-primary-700)',
          800: 'var(--color-primary-800)',
          900: 'var(--color-primary-900)',
        },
        surface: {
          50: 'var(--color-surface-50)',
          100: 'var(--color-surface-100)',
          200: 'var(--color-surface-200)',
          300: 'var(--color-surface-300)',
          400: 'var(--color-surface-400)',
          500: 'var(--color-surface-500)',
          600: 'var(--color-surface-600)',
          700: 'var(--color-surface-700)',
          800: 'var(--color-surface-800)',
          900: 'var(--color-surface-900)',
          950: 'var(--color-surface-950)',
        }
      }
    }
  },
  plugins: [],
};
