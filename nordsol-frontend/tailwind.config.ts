// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}", // Nota: Ajustei para a tua estrutura sem src
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#0a1f3e', // Azul marinho escuro exato
          content: '#f3f4f6', // Cinza muito claro do fundo
        },
      },
    },
  },
  plugins: [],
};
export default config;