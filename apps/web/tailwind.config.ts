// @version 0.5.0 - Echo: Organic Serif design system (Direction D)
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class", '[data-theme="dark"]'],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "bg-page": "#F7F2EA",
        "bg-surface": "#F0EAE0",
        "bg-card": "#FDF9F2",
        navy: "#2D1B69",
        "navy-h": "#3D2882",
        mustard: "#C97B1A",
        "mustard-h": "#E8962A",
        "mustard-soft": "#FDF0DC",
        teal: "#1D9E75",
        "teal-soft": "#E6F5EF",
        coral: "#E05535",
        "coral-soft": "#FCEEE9",
        ink: "#1A1429",
        "ink-mid": "#4A4468",
        "ink-light": "#9490B0",
        border: "#E5DDD0",
        "border-strong": "#CEC5B4",
      },
      fontFamily: {
        display: ['"Fraunces"', "Georgia", "serif"],
        sans: ['"DM Sans"', "system-ui", "sans-serif"],
      },
      borderRadius: {
        xs: "4px",
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "24px",
      },
      boxShadow: {
        card: "0 1px 3px rgba(26,20,41,0.06)",
        elevated: "0 4px 20px rgba(26,20,41,0.10)",
      },
    },
  },
  plugins: [],
};

export default config;
