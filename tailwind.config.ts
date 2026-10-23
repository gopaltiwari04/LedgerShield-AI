import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#bae0fd',
          300: '#7cc7fb',
          400: '#36abf6',
          500: '#0c8ee7',
          600: '#0270c5',
          700: '#03599f',
          800: '#074c83',
          900: '#0c3f6d',
          950: '#082847',
        },
      },
    },
  },
  plugins: [],
};
export default config;
