import type { Config } from "tailwindcss";

// Warm ivory / saffron / maroon / teal — see docs/PLAN.md §4 and
// src/content/design-tokens.md for the reasoning behind this palette.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        ivory: {
          DEFAULT: "#FBF7EE",
          soft: "#F5EEDD",
          dark: "#171310",
        },
        saffron: {
          50: "#FFF6E9",
          100: "#FEEAC7",
          300: "#F8C874",
          500: "#E8963A",
          600: "#D97B1F",
          700: "#B15F14",
        },
        maroon: {
          500: "#7A2231",
          600: "#5F1A26",
          700: "#471420",
        },
        teal: {
          400: "#3F8E8A",
          500: "#2E7370",
          600: "#245B58",
        },
        feedback: {
          green: "#3E8E5A",
          amber: "#D9931F",
          red: "#C24B4B",
          grey: "#9A958D",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        devanagari: ["var(--font-devanagari)", "serif"],
      },
      borderRadius: {
        xl: "1.25rem",
        "2xl": "1.75rem",
      },
      keyframes: {
        "gentle-pulse": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
        "playhead-glow": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(232,150,58,0.4)" },
          "50%": { boxShadow: "0 0 0 6px rgba(232,150,58,0)" },
        },
      },
      animation: {
        "gentle-pulse": "gentle-pulse 2.2s ease-in-out infinite",
        "playhead-glow": "playhead-glow 1.6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
