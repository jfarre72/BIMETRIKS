import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: "#0B1E3F",
          50: "#EAF0F9",
          100: "#C9D6EC",
          800: "#0D2A57",
          900: "#0A1A3F",
          950: "#071227",
        },
        brand: {
          DEFAULT: "#1E5EFF",
          50: "#EBF1FF",
          100: "#D6E3FF",
          500: "#1E5EFF",
          600: "#1547D6",
          700: "#0F37A8",
        },
        sky: {
          DEFAULT: "#4FB2F0",
          100: "#E4F3FD",
        },
        lime: {
          DEFAULT: "#8FD14F",
          100: "#EEF8E1",
        },
        surface: "#FFFFFF",
        canvas: "#F7F9FC",
        line: "#E6EBF2",
        ink: "#0F172A",
        muted: "#64748B",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.125rem",
      },
      boxShadow: {
        card: "0 1px 3px rgba(10, 27, 61, 0.06), 0 1px 2px rgba(10, 27, 61, 0.04)",
        float: "0 12px 40px rgba(10, 27, 61, 0.12)",
      },
    },
  },
  plugins: [],
};

export default config;
