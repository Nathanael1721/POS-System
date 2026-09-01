import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#0d9488',
          fg: '#ffffff',
          muted: '#ccfbf1',
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
          950: '#042f2e',
        },
      },
      fontFamily: {
        sans: [
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI Variable Text',
          'Segoe UI',
          'Roboto',
          'Inter',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      boxShadow: {
        card: '0 1px 2px 0 rgb(0 0 0 / 0.04), 0 1px 3px 0 rgb(0 0 0 / 0.06)',
        'card-hover': '0 6px 16px -4px rgb(15 118 110 / 0.14), 0 2px 6px -2px rgb(0 0 0 / 0.06)',
        pop: '0 12px 32px -8px rgb(0 0 0 / 0.18), 0 4px 12px -4px rgb(0 0 0 / 0.10)',
      },
    },
  },
  plugins: [],
};

export default config;
