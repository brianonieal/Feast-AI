# BRAND_ALIGNMENT.md
## Feast-AI: Visual Alignment with feastongood.com

> Reference: https://www.feastongood.com/
> This document overrides DESIGN_SYSTEM.md color and typography tokens where they conflict.

---

## Brand Identity

**Name**: THE FEAST (all caps in logo, mixed case elsewhere)
**Logo**: Text-based wordmark "The Feast" in a refined serif/editorial font. No icon, no symbol. The wordmark IS the logo.
**Tagline**: "Feast on your Life" (italicized)

Download the logo directly from the website and place in `apps/mobile/assets/images/feast-logo.png`. If a vector version is available, use it. The logo appears in the nav header on a dark background in white text.

---

## Color Palette Update

The website uses a warm, earthy, editorial palette. NOT the tech-startup amber/gold we had in DESIGN_SYSTEM.md. Update theme.ts to match:

```typescript
export const colors = {
  // Primary - warm cream/off-white (the website's dominant background)
  primary: {
    50:  "#FFFDF7",
    100: "#FFF9E8",
    200: "#FFF3D1",
    300: "#FFEBB3",
    400: "#F5DFA0",
    500: "#E8D48A",  // warm gold accent (subtle, not tech-gold)
    600: "#D4B96A",
    700: "#BF9F4F",
    800: "#A68535",
    900: "#8C6B1F",
  },

  // Secondary - deep charcoal/black (the website's text and dark sections)
  secondary: {
    50:  "#F5F5F5",
    100: "#E8E8E8",
    200: "#D1D1D1",
    300: "#B3B3B3",
    400: "#969696",
    500: "#787878",
    600: "#5A5A5A",
    700: "#3D3D3D",
    800: "#1F1F1F",
    900: "#0A0A0A",
  },

  // Accent - warm terracotta/earth tones (from dinner photography)
  accent: {
    warm:    "#C4956A",   // terracotta
    olive:   "#8B9A6B",   // natural green
    wine:    "#8B4049",   // deep wine red
    cream:   "#F5F0E8",   // warm cream
    sand:    "#D4C5A9",   // sandy neutral
  },

  // Dark mode surfaces (app is still dark-mode primary)
  dark: {
    background:    "#0A0A0A",
    surface:       "#151515",
    elevated:      "#1F1F1F",
    border:        "#2A2A2A",
    textPrimary:   "#F5F0E8",   // warm white, not pure white
    textSecondary: "#B3A89A",   // warm gray
    textMuted:     "#6B6560",   // muted warm
  },

  // Semantic (keep these)
  success: "#8B9A6B",   // olive green (natural, not tech-green)
  warning: "#C4956A",   // terracotta
  error:   "#8B4049",   // wine
  info:    "#6B8A9A",   // muted blue-gray
} as const;
```

### Key Differences from Original DESIGN_SYSTEM.md
- **No bright amber #FFC107.** The Feast brand is warm and muted, not tech-bright.
- **Cream and earth tones** replace the stark gold/black contrast.
- **Text is warm white (#F5F0E8)** not pure white (#FAFAFA). This is subtle but matters.
- **Semantic colors are natural** (olive, terracotta, wine) not standard (green, orange, red).

---

## Typography Update

The website uses an editorial serif for headings and a clean sans for body. The vibe is literary/magazine, not tech/startup.

```typescript
export const typography = {
  fonts: {
    // Display/heading: Use a refined serif. The website uses what appears
    // to be a transitional serif (similar to EB Garamond, Cormorant, or Playfair).
    // For React Native, use:
    heading: "PlayfairDisplay",   // or "Cormorant" or "EBGaramond"
    
    // Body: Clean humanist sans-serif
    body: "Inter",                // Inter is fine here, it's neutral enough
    
    // Mono: For data/metrics only
    mono: "JetBrainsMono",
    
    // Accent: Italic serif for quotes, taglines, emphasis
    // The website heavily uses italics for emotional phrases
    accent: "PlayfairDisplay-Italic",
  },
} as const;
```

### Font Files Needed
Download and place in `apps/mobile/assets/fonts/`:
- PlayfairDisplay-Regular.ttf
- PlayfairDisplay-Bold.ttf
- PlayfairDisplay-Italic.ttf
- PlayfairDisplay-BoldItalic.ttf
- Inter-Regular.ttf
- Inter-Medium.ttf
- Inter-Bold.ttf
- JetBrainsMono-Regular.ttf

---

## Design Patterns from feastongood.com

### Editorial Layout
- Large hero text with italic emphasis on key words: "Come sit *at our table* and *Feast on your Life*"
- Generous whitespace (or dark-space in our dark theme)
- Photography-forward: real dinner photos, not illustrations or icons
- Sections separated by breathing room, not dividers

### Card Style (Updated)
- Dark surface (#151515) with subtle warm border (#2A2A2A)
- 16px border radius (softer than the 12px in original spec)
- No harsh borders. The vibe is soft, inviting, warm.
- Subtle warm glow on interactive cards: `0 0 20px rgba(196, 149, 106, 0.08)`

### Button Style (Updated)
- **Primary**: Warm gold (#E8D48A) background, dark text (#0A0A0A), serif font for label
- **Secondary**: Transparent, warm border, warm text
- **Ghost**: No border, muted warm text
- Border radius: 24px (pill shape, matching website CTA buttons)

### Italic Emphasis Pattern
The Feast brand uses italics extensively for emotional resonance:
- "Nourishing the *world, mind, body*, and *soul*"
- "We envision a world where *fullness* is the *foundation*"
- In the app, use italic accent font for: section subtitles, reflection quotes, emotional CTAs

### Photography
- Warm, candlelit dinner photography dominates the website
- In the app, use warm-toned placeholder images
- Apply a subtle warm overlay to photos: rgba(196, 149, 106, 0.1)

---

## Tab Bar Update
- Keep 5 tabs: Home, Circle, Events, Impact, Profile
- Active tab: warm gold (#E8D48A) icon + label
- Inactive tab: muted warm (#6B6560) icon + label
- Background: #0A0A0A (same)

---

## Logo Usage in App
- Header: "The Feast" wordmark in PlayfairDisplay, warm white (#F5F0E8), left-aligned
- Splash screen: Centered wordmark, larger, with tagline "Feast on your Life" in italic below
- No app icon logo exists. For the app store icon, use "F" in PlayfairDisplay on a dark background

---

*This document takes precedence over DESIGN_SYSTEM.md for all visual decisions.
Save the website logo and key photography assets to apps/mobile/assets/images/.*
