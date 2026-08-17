/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./*.html", "./js/**/*.js"],
  theme: {
    extend: {
      colors: {
        vinho: "#1a1a2e",
        dourado: "#c9a96e",
        champagne: "#fafaf8",
      },
      fontFamily: {
        titulo: ['"Cormorant Garamond"', 'serif'],
        corpo: ['"Montserrat"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
