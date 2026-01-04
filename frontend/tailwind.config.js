/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Peach & Cream palette
        peach_from: '#FF9A8B', // gradient start
        peach_to: '#FF6A88',   // gradient end
        cream: '#FFF4E6',      // soft background
        accent: '#FF7E5F',     // call-to-action
        primary: {
          50: '#FFF1EC',
          100: '#FFE3D9',
          200: '#FFCABB',
          300: '#FFB19D',
          400: '#FF987F',
          500: '#FF7E5F', // accent
          600: '#FF6A4B',
          700: '#E85A3E',
          800: '#CC4E37',
          900: '#A83F2C',
        }
      }
    },
  },
  plugins: [
    require('@tailwindcss/line-clamp'),
  ],
}
