/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        rosa: '#e91e63',
        vinho: '#120a74',
        champagne: '#f5e6d3',
      },
      fontFamily: {
        titulo: ['"Playfair Display"', 'serif'],
        corpo: ['system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}