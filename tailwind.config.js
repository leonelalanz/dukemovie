/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#020B1A',
          900: '#061528',
          800: '#0a1f3a',
          700: '#0e2a4d',
          600: '#123a63',
        },
        electric: {
          500: '#00BFFF',
          400: '#33CCFF',
          300: '#66D9FF',
        },
        gold: {
          500: '#D9A928',
          400: '#E8BE4A',
          300: '#F0D075',
        },
      },
    },
  },
  plugins: [],
};
