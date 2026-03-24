// @version 0.1.0 - Foundation scaffold
// PANTHEON Design System tokens

export const colors = {
  primary: {
    50: "#FFF8E1",
    100: "#FFECB3",
    200: "#FFE082",
    300: "#FFD54F",
    400: "#FFCA28",
    500: "#FFC107",
    600: "#FFB300",
    700: "#FFA000",
    800: "#FF8F00",
    900: "#FF6F00",
  },
  secondary: {
    50: "#EDE7F6",
    100: "#D1C4E9",
    200: "#B39DDB",
    300: "#9575CD",
    400: "#7E57C2",
    500: "#673AB7",
    600: "#5E35B1",
    700: "#512DA8",
    800: "#4527A0",
    900: "#311B92",
  },
  neutral: {
    0: "#FFFFFF",
    50: "#FAFAFA",
    100: "#F5F5F5",
    200: "#EEEEEE",
    300: "#E0E0E0",
    400: "#BDBDBD",
    500: "#9E9E9E",
    600: "#757575",
    700: "#616161",
    800: "#424242",
    900: "#212121",
    950: "#121212",
  },
  success: "#4CAF50",
  warning: "#FF9800",
  error: "#F44336",
  info: "#2196F3",
  dark: {
    background: "#0A0A0A",
    surface: "#1A1A1A",
    elevated: "#2A2A2A",
    border: "#333333",
    textPrimary: "#FAFAFA",
    textSecondary: "#BDBDBD",
    textMuted: "#757575",
  },
  light: {
    background: "#FAFAFA",
    surface: "#FFFFFF",
    elevated: "#FFFFFF",
    border: "#E0E0E0",
    textPrimary: "#212121",
    textSecondary: "#616161",
    textMuted: "#9E9E9E",
  },
} as const;

export const typography = {
  fonts: {
    heading: "SpaceGrotesk",
    body: "Inter",
    mono: "JetBrainsMono",
  },
  sizes: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    "2xl": 24,
    "3xl": 30,
    "4xl": 36,
    "5xl": 48,
  },
  weights: {
    regular: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
  },
  lineHeights: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
} as const;

export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
} as const;

export const radius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  "2xl": 24,
  full: 9999,
} as const;

export const shadows = {
  sm: "0 1px 2px rgba(0,0,0,0.3)",
  md: "0 4px 6px rgba(0,0,0,0.4)",
  lg: "0 10px 15px rgba(0,0,0,0.5)",
  xl: "0 20px 25px rgba(0,0,0,0.6)",
  glow: "0 0 20px rgba(255,193,7,0.15)",
} as const;

export const theme = {
  colors,
  typography,
  spacing,
  radius,
  shadows,
} as const;

// @version 0.5.0 - Echo: Organic Serif design system (Direction D)
// These are the canonical design tokens for the PANTHEON frontend.
// Every color value in components MUST reference these — never hardcode hex.

export const FEAST_COLORS = {
  // ── Backgrounds (light) ──────────────────────────
  bgPage: "#F7F2EA",       // warm linen — page background
  bgSurface: "#F0EAE0",    // slightly darker linen — surface/sidebar
  bgCard: "#FDF9F2",       // near-white card background
  bgElevated: "#FFFFFF",   // white — elevated modals

  // ── Backgrounds (dark) ───────────────────────────
  bgPageDark: "#1C1814",   // warm dark — not cold black
  bgSurfaceDark: "#241F19",// dark surface
  bgCardDark: "#2E2820",   // dark card
  bgElevatedDark: "#3A332A",// dark elevated

  // ── Brand ────────────────────────────────────────
  navy: "#2D1B69",         // primary brand — headings, nav active
  navyHover: "#3D2882",    // navy hover state
  navyDark: "#EDE8FF",     // navy on dark backgrounds

  // ── Accents ──────────────────────────────────────
  mustard: "#C97B1A",      // primary CTA — buttons, active states
  mustardLight: "#E8962A", // mustard hover
  mustardSoft: "#FDF0DC",  // mustard tint background
  teal: "#1D9E75",         // success, nature, positive
  tealLight: "#25B589",    // teal hover
  tealSoft: "#E6F5EF",     // teal tint background
  coral: "#E05535",        // destructive actions only
  coralSoft: "#FCEEE9",   // coral tint background

  // ── Text ─────────────────────────────────────────
  inkDark: "#1A1429",      // primary text (light mode)
  inkMid: "#4A4468",       // secondary text
  inkLight: "#9490B0",     // hints, placeholders
  inkInverse: "#F7F2EA",   // text on dark/navy backgrounds

  // ── Text (dark mode) ─────────────────────────────
  inkDarkMode: "#EDE8FF",  // primary text (dark mode)
  inkMidDark: "#A09ABE",   // secondary text (dark mode)
  inkLightDark: "#6B6490", // hints (dark mode)

  // ── Borders ──────────────────────────────────────
  border: "#E5DDD0",       // default border (light)
  borderStrong: "#CEC5B4", // emphasis border (light)
  borderDark: "#3A3228",   // default border (dark)
  borderStrongDark: "#504840", // emphasis border (dark)

  // ── Left-border accent colors (card pattern) ─────
  accentNavy: "#2D1B69",
  accentMustard: "#C97B1A",
  accentTeal: "#1D9E75",
  accentCoral: "#E05535",
} as const;

export const FEAST_TYPOGRAPHY = {
  fontDisplay: '"Fraunces", Georgia, serif',      // ALL headings — italic variant
  fontBody: '"DM Sans", system-ui, sans-serif',   // all body/UI text
} as const;

export const FEAST_RADIUS = {
  xs: "4px",
  sm: "8px",
  md: "12px",
  lg: "16px",
  xl: "24px",
  full: "9999px",
} as const;

export const FEAST_SHADOW = {
  card: "0 1px 3px rgba(26, 20, 41, 0.06)",
  elevated: "0 4px 20px rgba(26, 20, 41, 0.10)",
} as const;
