import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: "#1a1a1a",
        "surface-2": "#242424",
        "surface-3": "#2e2e2e",
        border: "#333333",
      },
    },
  },
  plugins: [],
};

export default config;
