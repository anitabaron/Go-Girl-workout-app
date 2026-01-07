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
      colors: {
        goPink: "var(--go-pink)",
        goLightPink: "var(--go-light-pink)",
        goDarkPink: "var(--go-dark-pink)",
        goMidRed: "var(--go-mid-red)",
        goRed: "var(--go-red)",
      },
    },
  },
  plugins: [],
};

export default config;
