/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: {
          DEFAULT: "#FFFFFF",
          muted: "#F6F8FB",
          subtle: "#EEF1F7",
          border: "#E3E8F0",
          strong: "#CBD3E1",
        },
        ink: {
          900: "#0B1424",
          700: "#1F2A44",
          500: "#475569",
          400: "#64748B",
          300: "#94A3B8",
          200: "#CBD5E1",
        },
        brand: {
          50: "#EEF2FF",
          100: "#E0E7FF",
          200: "#C7D2FE",
          400: "#818CF8",
          500: "#6366F1",
          600: "#4F46E5",
          700: "#4338CA",
          800: "#3730A3",
          900: "#312E81",
        },
        ok: {
          50: "#ECFDF5",
          100: "#D1FAE5",
          500: "#10B981",
          600: "#059669",
          700: "#047857",
        },
        warn: {
          50: "#FFFBEB",
          100: "#FEF3C7",
          500: "#F59E0B",
          600: "#D97706",
          700: "#B45309",
        },
        crit: {
          50: "#FEF2F2",
          100: "#FEE2E2",
          500: "#EF4444",
          600: "#DC2626",
          700: "#B91C1C",
        },
        solar: { 500: "#F59E0B", 600: "#D97706" },
        grid: { 500: "#3B82F6", 600: "#2563EB" },
        batt: { 500: "#10B981", 600: "#059669" },
        soc: { 500: "#312E81", 600: "#1E1B4B" },
        tariff: { 500: "#F97316", 600: "#EA580C" },
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Consolas",
          "monospace",
        ],
      },
      borderRadius: {
        sm: "6px",
        DEFAULT: "10px",
        md: "12px",
        lg: "14px",
        xl: "18px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(15, 23, 42, 0.04), 0 1px 3px rgba(15, 23, 42, 0.06)",
        cardHover:
          "0 1px 2px rgba(15, 23, 42, 0.06), 0 8px 24px rgba(15, 23, 42, 0.08)",
        pop: "0 8px 32px rgba(15, 23, 42, 0.10), 0 2px 8px rgba(15, 23, 42, 0.06)",
      },
      transitionDuration: { 180: "180ms" },
      keyframes: {
        spin: { to: { transform: "rotate(360deg)" } },
        pulse: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.55" },
        },
      },
      animation: {
        spin: "spin 0.9s linear infinite",
        pulse: "pulse 1.6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
