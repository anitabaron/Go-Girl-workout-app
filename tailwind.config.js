/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{vue,js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Poppins", "sans-serif"],
      },
      gridTemplateColumns: {
        "70/30": "70% 28%",
      },
      colors: {
        goPink: "#ffbdc8",
        goLightPink: "#ffe3e7",
        goDarkPink: "#f97a7d",
        goMidRed: "#f9444f",
        goRed: "#f00b0d",
      },
    },
  },
  variants: {
    extend: {},
  },
  plugins: [],
};
