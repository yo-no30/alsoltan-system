/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      screens: {
        xs: '420px',
      },
      colors: {
        brand: {
          50: '#fdf2f4',
          100: '#fbe5e8',
          200: '#f5c8d0',
          300: '#e895a4',
          400: '#d05c74',
          500: '#800020',
          600: '#6e001b',
          700: '#5e0017',
          800: '#4d0013',
          900: '#3d000f',
        },
      },
      boxShadow: {
        sm: '0 1px 2px 0 rgb(15 23 42 / 0.05)',
        md: '0 4px 6px -1px rgb(15 23 42 / 0.08), 0 2px 4px -2px rgb(15 23 42 / 0.06)',
      },
      borderColor: {
        soft: 'rgb(226 232 240 / 0.7)',
      },
    },
  },
  plugins: [],
}
