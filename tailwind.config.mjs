/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
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
  plugins: [],
};

export default config;
