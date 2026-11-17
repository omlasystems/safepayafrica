import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        navy: "#101D35",
        mint: "#00B980",
        paper: "#F5F7FA",
      },
    },
  },
  plugins: [],
};

export default config;
