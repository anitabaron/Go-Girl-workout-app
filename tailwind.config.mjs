/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  // W Tailwind 4 kolory są definiowane w @theme w CSS, nie tutaj
  // Zachowujemy config dla kompatybilności, ale kolory są w globals.css
};

export default config;
