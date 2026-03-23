# DESIGN_SYSTEM.md
## Feast-AI: PANTHEON Design System

---

## Philosophy

The PANTHEON design system reflects The Feast's values: warmth, abundance, authenticity.
The UI should feel like an invitation to the table, not a productivity app.

Dark mode is primary. Light mode is secondary. The app lives in evening hours (dinner time).

---

## Color Tokens

```typescript
// packages/shared/src/theme.ts

export const colors = {
  // Primary palette - warm amber/gold tones
  primary: {
    50:  "#FFF8E1",
    100: "#FFECB3",
    200: "#FFE082",
    300: "#FFD54F",
    400: "#FFCA28",
    500: "#FFC107",  // primary action color
    600: "#FFB300",
    700: "#FFA000",
    800: "#FF8F00",
    900: "#FF6F00",
  },

  // Secondary palette - deep rich tones
  secondary: {
    50:  "#EDE7F6",
    100: "#D1C4E9",
    200: "#B39DDB",
    300: "#9575CD",
    400: "#7E57C2",
    500: "#673AB7",  // secondary action, facilitator color
    600: "#5E35B1",
    700: "#512DA8",
    800: "#4527A0",
    900: "#311B92",
  },

  // Neutral palette
  neutral: {
    0:   "#FFFFFF",
    50:  "#FAFAFA",
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

  // Semantic colors
  success: "#4CAF50",
  warning: "#FF9800",
  error:   "#F44336",
  info:    "#2196F3",

  // Dark mode surfaces (primary palette)
  dark: {
    background: "#0A0A0A",
    surface:    "#1A1A1A",
    elevated:   "#2A2A2A",
    border:     "#333333",
    textPrimary:   "#FAFAFA",
    textSecondary: "#BDBDBD",
    textMuted:     "#757575",
  },

  // Light mode surfaces
  light: {
    background: "#FAFAFA",
    surface:    "#FFFFFF",
    elevated:   "#FFFFFF",
    border:     "#E0E0E0",
    textPrimary:   "#212121",
    textSecondary: "#616161",
    textMuted:     "#9E9E9E",
  },
} as const;
```

---

## Typography

```typescript
export const typography = {
  fonts: {
    heading: "SpaceGrotesk",      // Bold, modern headings
    body:    "Inter",              // Clean, readable body text
    mono:    "JetBrainsMono",     // Code, data, metrics
  },

  sizes: {
    xs:   12,
    sm:   14,
    base: 16,
    lg:   18,
    xl:   20,
    "2xl": 24,
    "3xl": 30,
    "4xl": 36,
    "5xl": 48,
  },

  weights: {
    regular: "400",
    medium:  "500",
    semibold: "600",
    bold:    "700",
  },

  lineHeights: {
    tight:  1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
} as const;
```

**Font files required** (apps/mobile/assets/fonts/):
- SpaceGrotesk-Regular.ttf
- SpaceGrotesk-Bold.ttf
- Inter-Regular.ttf
- Inter-Medium.ttf
- Inter-Bold.ttf
- JetBrainsMono-Regular.ttf

---

## Spacing

```typescript
export const spacing = {
  0:   0,
  1:   4,
  2:   8,
  3:   12,
  4:   16,
  5:   20,
  6:   24,
  8:   32,
  10:  40,
  12:  48,
  16:  64,
  20:  80,
} as const;
```

---

## Border Radius

```typescript
export const radius = {
  none: 0,
  sm:   4,
  md:   8,
  lg:   12,
  xl:   16,
  "2xl": 24,
  full: 9999,
} as const;
```

---

## Shadows (Dark Mode)

```typescript
export const shadows = {
  sm:  "0 1px 2px rgba(0,0,0,0.3)",
  md:  "0 4px 6px rgba(0,0,0,0.4)",
  lg:  "0 10px 15px rgba(0,0,0,0.5)",
  xl:  "0 20px 25px rgba(0,0,0,0.6)",
  glow: "0 0 20px rgba(255,193,7,0.15)",  // primary color glow
} as const;
```

---

## Component Patterns

### Cards
- Dark surface (#1A1A1A) with 1px border (#333333)
- 12px border radius
- 16px padding
- Subtle primary glow on hover/press for interactive cards

### Buttons
- **Primary**: primary.500 background, neutral.900 text, bold
- **Secondary**: transparent background, primary.500 border, primary.500 text
- **Ghost**: transparent, neutral.400 text, no border
- All buttons: 8px border radius, 48px minimum height (touch target)

### Bottom Tab Navigator
- 5 tabs: Home, Circle, Events, Impact, Profile
- Dark background (#0A0A0A)
- Active tab: primary.500 icon + label
- Inactive tab: neutral.500 icon + label
- Icon size: 24px, label size: 12px
- Height: 80px (including safe area)

### Status Badges
- Draft: neutral.600 bg, neutral.300 text
- Scheduled: info bg, white text
- Live: success bg, white text
- Completed: primary.700 bg, white text
- Cancelled: error bg, white text

### Input Fields
- Dark elevated surface (#2A2A2A)
- 1px border (#333333), focus: primary.500 border
- 12px border radius
- 16px horizontal padding, 48px height
- Placeholder: neutral.500

---

## Animation Guidelines

- Transitions: 200ms ease-in-out (standard), 300ms for page transitions
- Skeleton loaders for async content (animated shimmer)
- Subtle scale (0.97) on press for interactive elements
- No heavy animations on initial load (performance)

---

## Accessibility

- Minimum touch target: 44x44px
- Color contrast: WCAG AA minimum (4.5:1 for text)
- All interactive elements must have accessible labels
- Support for system font scaling
- Dark mode is default but respect system preference

---

*Last updated: 2026-03-22. Design tokens are the source of truth for all UI work.*
