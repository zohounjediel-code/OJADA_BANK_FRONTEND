/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: '#0A1628', 2: '#112040', 3: '#1A3060' },
        gold: { DEFAULT: '#C9A84C', light: '#F0D080', dark: '#8B6914' },
        cream: { DEFAULT: '#FAF8F3', 2: '#F3EFE4' },
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
