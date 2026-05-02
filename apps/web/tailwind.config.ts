import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#050506",
        smoke: "#f7f7f2",
        gold: "#d9dde2",
        ember: "#9ca3af",
        slate: "#111216",
        silver: "#d9dde2",
        graphite: "#090a0c",
      },
      fontFamily: {
        sans: ["Montserrat", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["Cormorant Garamond", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
