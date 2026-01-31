/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    letterSpacing: {
      tighter: "-0.5px",
      tight: "-0.2px",
      normal: "0",
      wide: "0.2px",
      wider: "0.5px",
      widest: "1px",
    },
    extend: {
      colors: {
        surface: {
          DEFAULT: "#FFFFFF",
          dark: "#080808",
          subtle: "#F5F5F7",
          "subtle-dark": "#121212",
        },
        positive: {
          DEFAULT: "#10B981",
          muted: "#ECFDF5",
          dark: "#059669",
        },
        negative: {
          DEFAULT: "#EF4444",
          muted: "#FEF2F2",
          dark: "#DC2626",
        },
        accent: {
          DEFAULT: "#000000",
          dark: "#FFFFFF",
          blue: "#2563EB",
        },
        muted: {
          DEFAULT: "#71717A",
          dark: "#A1A1AA",
        },
        border: {
          DEFAULT: "#E4E4E7",
          dark: "#27272A",
        },
      },
      fontFamily: {
        display: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      fontSize: {
        hero: ["4.5rem", { lineHeight: "1", fontWeight: "800" }],
        "size-balance": ["3.5rem", { lineHeight: "1.1", fontWeight: "700" }],
        title: ["1.75rem", { lineHeight: "1.2", fontWeight: "700" }],
        subtitle: ["1.125rem", { lineHeight: "1.5", fontWeight: "500" }],
      },
      borderRadius: {
        "3xl": "24px",
        "4xl": "32px",
      },
    },
  },
  plugins: [],
};
