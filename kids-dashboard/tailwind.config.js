/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Pretendard",
          "-apple-system",
          "BlinkMacSystemFont",
          "system-ui",
          "Roboto",
          "Segoe UI",
          "sans-serif",
        ],
      },
      // 테마 accent 색 — src/lib/theme.ts 가 CSS 변수(--ac-*)를 갈아끼움
      colors: {
        accent: {
          50: "rgb(var(--ac-50) / <alpha-value>)",
          100: "rgb(var(--ac-100) / <alpha-value>)",
          200: "rgb(var(--ac-200) / <alpha-value>)",
          400: "rgb(var(--ac-400) / <alpha-value>)",
          500: "rgb(var(--ac-500) / <alpha-value>)",
          600: "rgb(var(--ac-600) / <alpha-value>)",
          700: "rgb(var(--ac-700) / <alpha-value>)",
        },
      },
    },
  },
  plugins: [],
};
