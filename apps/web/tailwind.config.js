/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#F0F4FA',
          100: '#DCE5F5',
          200: '#B9CCEB',
          300: '#8DAADE',
          400: '#5A81CE',
          500: '#2E58AE',
          600: '#1D3E8A',
          700: '#142E68',
          800: '#11264F', // Exact Logo Navy Blue
          900: '#0C1C3D',
          950: '#071024',
        },
        cyan: {
          50: '#EBFBFC',
          100: '#D2F7F9',
          200: '#AAF0F4',
          300: '#72E4EC',
          400: '#2FD1DC',
          500: '#00BAC6', // Exact Logo Cyan/Teal
          600: '#009AA5',
          700: '#037B85',
          800: '#07626A',
          900: '#0B5158',
        },
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(17, 38, 79, 0.05), 0 1px 2px -1px rgba(17, 38, 79, 0.03)',
        'card-hover': '0 10px 25px -5px rgba(17, 38, 79, 0.08), 0 8px 10px -6px rgba(17, 38, 79, 0.04)',
      }
    },
  },
  plugins: [],
};
