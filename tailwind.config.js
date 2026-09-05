/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx}", "./components/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // 跟 longzaiying-web / App 同一套品牌色，管理後台維持一致的視覺識別
        brand: {
          DEFAULT: "#FC961C",
          light: "#FDB45A",
          dark: "#CC6F0A",
        },
        orange: {
          50: "#FFF6EC",
          100: "#FEEAD0",
          200: "#FDD49E",
          300: "#FCBE6C",
          400: "#FCA844",
          500: "#FC961C",
          600: "#E07F0C",
          700: "#CC6F0A",
          800: "#A1570A",
          900: "#7C4408",
        },
      },
    },
  },
  plugins: [],
};
