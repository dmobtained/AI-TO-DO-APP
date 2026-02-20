import type { Config } from "tailwindcss"

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./context/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#F4F6F8",
        card: "#FFFFFF",
        border: "#E6E9EE",
        primary: "#3B82F6",
        primarySoft: "#E8F1FF",
        textPrimary: "#111827",
        textSecondary: "#6B7280",
        success: "#10B981",
        danger: "#EF4444",
        hover: "#F2F5F9",
        datadenkt: {
          navy: "#1e2b44",
          "navy-dark": "#162136",
          "navy-card": "#243557",
          orange: "#f7931e",
          teal: "#2ec4b6",
          white: "#f4f6f8",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        progress: {
          "0%": { width: "0%" },
          "100%": { width: "var(--progress-width, 0%)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.2s ease-out",
        progress: "progress 0.6s ease-out forwards",
      },
    },
  },
  plugins: [],
}
export default config
