// tailwind.config.js
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        // Ganti 'poppins' menjadi 'sans'
        sans: ["Poppins", "sans-serif"], 
      },
      colors: {
        primary: '#4f46e5',
      },
    },
  },
  plugins: [],
};