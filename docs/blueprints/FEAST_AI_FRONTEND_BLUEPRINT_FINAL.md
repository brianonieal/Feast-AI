# FEAST-AI FRONTEND BLUEPRINT — FINAL
# Version: 2.0.0
# Architect: Claude Sonnet 4.6 (chat)
# Executor: Claude Opus 4.6 (Claude Code)
# Date: March 2026

---

## OPUS BOOT INSTRUCTIONS

Read this entire file before writing a single line of code.
Then execute sections in order: 1 → 2 → 3 → 4 → 5 → 6 → 7.
After completing each section, stop and report:
  - What was built
  - What tests pass
  - What is next

Hard rules:
- Every color value comes from packages/shared/src/theme.ts — never hardcode hex in components
- Every tier/role check uses useUserStore().can() — never inline string comparisons in JSX
- All external API calls (HuggingFace, Anthropic) go through apps/api service layer — never called from frontend directly
- Do not touch apps/api routes or prisma/schema.prisma in this sprint
- Follow BRIAN_ONIEAL_GLOBAL_RULES.md Section 2 (Sacred Architecture Rules) at all times

---

## SECTION 1: DESIGN SYSTEM — SOURCE OF TRUTH

### 1.1 Design Direction

Direction D — Organic Serif.
- Fraunces italic for ALL headings throughout both apps
- DM Sans 400/500 for all body text, labels, buttons, metadata
- Warm linen backgrounds — never cold white
- Left-border accent cards as the primary card pattern
- Mustard (#C97B1A) as the primary action/CTA color
- Navy (#2D1B69) as the brand/heading color
- Teal (#1D9E75) as the success/nature accent
- Coral (#E05535) for destructive actions only
- Adaptive theme — follows system preference (light/dark)

### 1.2 Token File

EXTEND packages/shared/src/theme.ts with exactly these values:

```typescript
// packages/shared/src/theme.ts

export const FEAST_COLORS = {
  // ── Backgrounds (light) ──────────────────────────
  bgPage:        '#F7F2EA',   // warm linen — page background
  bgSurface:     '#F0EAE0',   // slightly darker linen — surface/sidebar
  bgCard:        '#FDF9F2',   // near-white card background
  bgElevated:    '#FFFFFF',   // white — elevated modals

  // ── Backgrounds (dark) ───────────────────────────
  bgPageDark:    '#1C1814',   // warm dark — not cold black
  bgSurfaceDark: '#241F19',   // dark surface
  bgCardDark:    '#2E2820',   // dark card
  bgElevatedDark:'#3A332A',   // dark elevated

  // ── Brand ────────────────────────────────────────
  navy:          '#2D1B69',   // primary brand — headings, nav active
  navyHover:     '#3D2882',   // navy hover state
  navyDark:      '#EDE8FF',   // navy on dark backgrounds

  // ── Accents ──────────────────────────────────────
  mustard:       '#C97B1A',   // primary CTA — buttons, active states
  mustardLight:  '#E8962A',   // mustard hover
  mustardSoft:   '#FDF0DC',   // mustard tint background
  teal:          '#1D9E75',   // success, nature, positive
  tealLight:     '#25B589',   // teal hover
  tealSoft:      '#E6F5EF',   // teal tint background
  coral:         '#E05535',   // destructive actions only
  coralSoft:     '#FCEEE9',   // coral tint background

  // ── Text ─────────────────────────────────────────
  inkDark:       '#1A1429',   // primary text (light mode)
  inkMid:        '#4A4468',   // secondary text
  inkLight:      '#9490B0',   // hints, placeholders
  inkInverse:    '#F7F2EA',   // text on dark/navy backgrounds

  // ── Text (dark mode) ─────────────────────────────
  inkDarkMode:   '#EDE8FF',   // primary text (dark mode)
  inkMidDark:    '#A09ABE',   // secondary text (dark mode)
  inkLightDark:  '#6B6490',   // hints (dark mode)

  // ── Borders ──────────────────────────────────────
  border:        '#E5DDD0',   // default border (light)
  borderStrong:  '#CEC5B4',   // emphasis border (light)
  borderDark:    '#3A3228',   // default border (dark)
  borderStrongDark: '#504840',// emphasis border (dark)

  // ── Left-border accent colors (card pattern) ─────
  accentNavy:    '#2D1B69',
  accentMustard: '#C97B1A',
  accentTeal:    '#1D9E75',
  accentCoral:   '#E05535',
} as const;

export const FEAST_TYPOGRAPHY = {
  fontDisplay: '"Fraunces", Georgia, serif',  // ALL headings — italic variant
  fontBody:    '"DM Sans", system-ui, sans-serif',  // all body/UI text
} as const;

export const FEAST_RADIUS = {
  xs:   '4px',
  sm:   '8px',
  md:   '12px',
  lg:   '16px',
  xl:   '24px',
  full: '9999px',
} as const;

export const FEAST_SHADOW = {
  card: '0 1px 3px rgba(26, 20, 41, 0.06)',
  elevated: '0 4px 20px rgba(26, 20, 41, 0.10)',
} as const;
```

### 1.3 Tailwind Config

Replace tailwind.config.ts in apps/web AND apps/mobile:

```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class', '[data-theme="dark"]'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'bg-page':      '#F7F2EA',
        'bg-surface':   '#F0EAE0',
        'bg-card':      '#FDF9F2',
        navy:           '#2D1B69',
        'navy-h':       '#3D2882',
        mustard:        '#C97B1A',
        'mustard-h':    '#E8962A',
        'mustard-soft': '#FDF0DC',
        teal:           '#1D9E75',
        'teal-soft':    '#E6F5EF',
        coral:          '#E05535',
        'coral-soft':   '#FCEEE9',
        ink:            '#1A1429',
        'ink-mid':      '#4A4468',
        'ink-light':    '#9490B0',
        border:         '#E5DDD0',
        'border-strong':'#CEC5B4',
      },
      fontFamily: {
        display: ['"Fraunces"', 'Georgia', 'serif'],
        sans:    ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xs: '4px', sm: '8px', md: '12px', lg: '16px', xl: '24px',
      },
      boxShadow: {
        card:     '0 1px 3px rgba(26,20,41,0.06)',
        elevated: '0 4px 20px rgba(26,20,41,0.10)',
      },
    },
  },
  plugins: [],
};

export default config;
```

### 1.4 globals.css

Replace apps/web/src/app/globals.css:

```css
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@1,9..144,300;1,9..144,400&family=DM+Sans:wght@400;500;600&display=swap');

:root {
  --bg-page:       #F7F2EA;
  --bg-surface:    #F0EAE0;
  --bg-card:       #FDF9F2;
  --bg-elevated:   #FFFFFF;
  --text:          #1A1429;
  --text-mid:      #4A4468;
  --text-hint:     #9490B0;
  --navy:          #2D1B69;
  --mustard:       #C97B1A;
  --teal:          #1D9E75;
  --coral:         #E05535;
  --border:        #E5DDD0;
  --border-strong: #CEC5B4;
  --radius:        12px;
  --font-display:  'Fraunces', Georgia, serif;
  --font-body:     'DM Sans', system-ui, sans-serif;
}

[data-theme="dark"] {
  --bg-page:       #1C1814;
  --bg-surface:    #241F19;
  --bg-card:       #2E2820;
  --bg-elevated:   #3A332A;
  --text:          #EDE8FF;
  --text-mid:      #A09ABE;
  --text-hint:     #6B6490;
  --border:        #3A3228;
  --border-strong: #504840;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  background: var(--bg-page);
  color: var(--text);
  font-family: var(--font-body);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-display);
  font-style: italic;
  font-weight: 300;
  color: var(--navy);
}

/* Dark mode heading color override */
[data-theme="dark"] h1,
[data-theme="dark"] h2,
[data-theme="dark"] h3,
[data-theme="dark"] h4 {
  color: #EDE8FF;
}
```

### 1.5 Component Patterns — Opus must follow these exactly

#### Left-border accent card (PRIMARY card pattern)
```tsx
// Usage: event cards, feed cards, resource cards
<div className="bg-bg-card border-l-[3px] border-l-mustard rounded-r-md rounded-l-none p-4 shadow-card">
  {/* border-l color swaps: mustard (events), teal (circle/aid), navy (library) */}
</div>
```

#### Section label (above headings)
```tsx
<p className="font-sans text-[10px] font-medium tracking-[0.09em] uppercase text-mustard mb-1">
  Today's Nourishment
</p>
```

#### Page heading (Fraunces italic)
```tsx
<h1 className="font-display italic font-light text-2xl text-navy leading-tight">
  What are you hungry for?
</h1>
```

#### Action button (primary)
```tsx
<button className="bg-mustard hover:bg-mustard-h text-[#FDF9F2] font-sans font-medium text-sm px-5 py-2.5 rounded-full transition-colors">
  RSVP
</button>
```

#### Ghost button (secondary)
```tsx
<button className="border border-border text-ink-mid font-sans font-medium text-sm px-5 py-2.5 rounded-full hover:bg-bg-surface transition-colors">
  Learn more
</button>
```

#### Tier badge
```tsx
// commons = mustard-soft/mustard, kitchen = teal-soft/teal, founding_table = navy/ink-inverse
<span className="font-sans text-[10px] font-medium tracking-[0.07em] uppercase px-2.5 py-1 rounded-full bg-mustard-soft text-mustard">
  The Commons
</span>
```

---

## SECTION 2: SHARED TYPES

### packages/shared/src/types/user.ts

```typescript
export type UserTier = 'commons' | 'kitchen' | 'founding_table';
export type UserRole = 'attendee' | 'host' | 'facilitator';

export interface FeastUser {
  id: string;
  clerkId: string;
  name: string;
  email: string;
  avatarUrl?: string;
  tier: UserTier;
  role: UserRole;
  city?: string;
  hubRegion?: string;
  dinnerCount: number;
  createdAt: Date;
}

// Stored in Clerk publicMetadata
export interface ClerkUserMetadata {
  tier: UserTier;
  role: UserRole;
  feastDbId: string;
}

export interface TierPermissions {
  canAccessKitchen:       boolean;
  canAccessFoundingTable: boolean;
  canHostEvents:          boolean;
  canFacilitateCircles:   boolean;
  canManageProjectPods:   boolean;
  canTriggerAICouncil:    boolean;
  canPublishContent:      boolean;
  canViewHostDashboard:   boolean;
}

export function getPermissions(user: FeastUser): TierPermissions {
  const isKitchenPlus = ['kitchen', 'founding_table'].includes(user.tier);
  const isHost        = ['host', 'facilitator'].includes(user.role);

  return {
    canAccessKitchen:       isKitchenPlus,
    canAccessFoundingTable: user.tier === 'founding_table',
    canHostEvents:          isHost,
    canFacilitateCircles:   user.role === 'facilitator',
    canManageProjectPods:   isKitchenPlus,
    canTriggerAICouncil:    isHost,
    canPublishContent:      isHost,
    canViewHostDashboard:   isHost || isKitchenPlus,
  };
}
```

### packages/shared/src/types/events.ts

```typescript
export type EventVisibility = 'public' | 'commons' | 'kitchen' | 'founding_table';
export type EventStatus     = 'draft' | 'open' | 'confirmed' | 'full' | 'completed';

export interface FeastEvent {
  id: string;
  title: string;
  description?: string;
  hostId: string;
  hostName: string;
  date: Date;
  location: string;
  city: string;
  maxSeats: number;
  confirmedSeats: number;
  visibility: EventVisibility;
  status: EventStatus;
  imageUrl?: string;
  createdAt: Date;
}

export interface RSVP {
  id: string;
  eventId: string;
  userId: string;
  status: 'confirmed' | 'waitlisted' | 'cancelled';
  createdAt: Date;
}
```

### packages/shared/src/types/ai.ts

```typescript
// Output types map directly to the 4 WYSIWYG tabs
export type CouncilOutputType = 'article' | 'social' | 'recap' | 'instagram';

export type CouncilJobType =
  | 'event_image_gen'     // HuggingFace: event cover image
  | 'event_copy_gen'      // Claude: marketing copy for event
  | 'post_event_content'; // Claude: article + social + recap + instagram from host submission

export type CouncilJobStatus =
  | 'queued'
  | 'running'
  | 'awaiting_review'   // AI done — host must review in WYSIWYG editor
  | 'approved'
  | 'rejected'
  | 'published';

export interface CouncilJobOutput {
  article?:   string;   // markdown
  social?:    string;   // plain text
  recap?:     string;   // plain text
  instagram?: string;   // plain text
  imageUrl?:  string;   // URL from HuggingFace
}

export interface CouncilJob {
  id: string;
  type: CouncilJobType;
  status: CouncilJobStatus;
  triggeredBy: string;
  eventId?: string;
  inputPayload: {
    photos?: string[];        // uploaded URLs
    quotes?: string[];        // attendee quotes
    reflection?: string;      // host recorded reflection transcript
    eventTitle?: string;
    eventDate?: string;
    city?: string;
  };
  output?: CouncilJobOutput;
  activeOutputTab?: CouncilOutputType;
  reviewedBy?: string;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Distribution targets from workflow PDF
export type DistributionTarget =
  | 'instagram'
  | 'mailing_list'
  | 'circle_public'
  | 'circle_tier'
  | 'crm_regional';
```

---

## SECTION 3: ZUSTAND STORES

### apps/web/src/stores/useUserStore.ts
### apps/mobile/stores/useUserStore.ts
(identical file — copy to both locations)

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { FeastUser, TierPermissions } from '@feast-ai/shared/types/user';
import { getPermissions } from '@feast-ai/shared/types/user';

interface UserState {
  user: FeastUser | null;
  permissions: TierPermissions | null;
  isLoading: boolean;
  setUser: (user: FeastUser) => void;
  clearUser: () => void;
  setLoading: (v: boolean) => void;
  can: (permission: keyof TierPermissions) => boolean;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      user: null,
      permissions: null,
      isLoading: true,
      setUser: (user) =>
        set({ user, permissions: getPermissions(user), isLoading: false }),
      clearUser: () =>
        set({ user: null, permissions: null, isLoading: false }),
      setLoading: (isLoading) => set({ isLoading }),
      can: (permission) => get().permissions?.[permission] ?? false,
    }),
    {
      name: 'feast-user',
      partialize: (s) => ({ user: s.user }),
    }
  )
);
```

### apps/web/src/stores/useThemeStore.ts

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  toggle: () => void;
  set: (t: Theme) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'light',
      toggle: () => set({ theme: get().theme === 'light' ? 'dark' : 'light' }),
      set: (theme) => set({ theme }),
    }),
    { name: 'feast-theme' }
  )
);
```

### apps/web/src/stores/useAIStore.ts

```typescript
import { create } from 'zustand';
import type {
  CouncilJob,
  CouncilJobType,
  CouncilOutputType,
} from '@feast-ai/shared/types/ai';

interface AIState {
  jobs: Record<string, CouncilJob>;
  activeJobId: string | null;
  startJob: (type: CouncilJobType, eventId?: string, triggeredBy?: string) => string;
  updateJob: (id: string, patch: Partial<CouncilJob>) => void;
  setActiveOutputTab: (jobId: string, tab: CouncilOutputType) => void;
  clearJob: (id: string) => void;
  getActiveJob: () => CouncilJob | null;
}

export const useAIStore = create<AIState>()((set, get) => ({
  jobs: {},
  activeJobId: null,

  startJob: (type, eventId, triggeredBy = '') => {
    const id = `${type}-${Date.now()}`;
    const job: CouncilJob = {
      id, type, status: 'queued',
      triggeredBy, eventId,
      inputPayload: {},
      activeOutputTab: 'article',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    set((s) => ({ jobs: { ...s.jobs, [id]: job }, activeJobId: id }));
    return id;
  },

  updateJob: (id, patch) =>
    set((s) => ({
      jobs: {
        ...s.jobs,
        [id]: { ...s.jobs[id], ...patch, updatedAt: new Date() },
      },
    })),

  setActiveOutputTab: (jobId, tab) =>
    set((s) => ({
      jobs: {
        ...s.jobs,
        [jobId]: { ...s.jobs[jobId], activeOutputTab: tab },
      },
    })),

  clearJob: (id) =>
    set((s) => {
      const { [id]: _, ...rest } = s.jobs;
      return {
        jobs: rest,
        activeJobId: s.activeJobId === id ? null : s.activeJobId,
      };
    }),

  getActiveJob: () => {
    const { jobs, activeJobId } = get();
    return activeJobId ? (jobs[activeJobId] ?? null) : null;
  },
}));
```

---

## SECTION 4: FOLDER STRUCTURE

Build this exactly. Do not deviate.

```
feast-ai/
├── turbo.json
├── package.json                            pnpm workspace root
├── .env.example
│
├── apps/
│   │
│   ├── web/                                NEW — Next.js 15 App Router
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── layout.tsx              Root: fonts + ThemeProvider + ClerkProvider
│   │   │   │   ├── globals.css
│   │   │   │   ├── page.tsx                → redirect to /home or /sign-in
│   │   │   │   │
│   │   │   │   ├── (auth)/
│   │   │   │   │   ├── sign-in/page.tsx
│   │   │   │   │   └── sign-up/page.tsx
│   │   │   │   │
│   │   │   │   └── (app)/                  Protected shell
│   │   │   │       ├── layout.tsx          AppShell: TopBar + BottomNav + {children}
│   │   │   │       ├── home/page.tsx       The Table
│   │   │   │       ├── circle/page.tsx     Reflection Circles + Mutual Aid
│   │   │   │       ├── events/page.tsx     The Arc
│   │   │   │       ├── library/page.tsx    The Pantry
│   │   │   │       ├── kitchen/page.tsx    Tier 2+ only
│   │   │   │       ├── apply/page.tsx      Host/Facilitator application
│   │   │   │       └── profile/page.tsx    Full-screen profile + settings
│   │   │   │
│   │   │   ├── components/
│   │   │   │   ├── layout/
│   │   │   │   │   ├── AppShell.tsx
│   │   │   │   │   ├── TopBar.tsx
│   │   │   │   │   └── BottomNav.tsx
│   │   │   │   │
│   │   │   │   ├── home/
│   │   │   │   │   ├── DailyNourishment.tsx
│   │   │   │   │   └── FeedCard.tsx
│   │   │   │   │
│   │   │   │   ├── events/
│   │   │   │   │   ├── EventCard.tsx
│   │   │   │   │   └── RSVPButton.tsx
│   │   │   │   │
│   │   │   │   ├── circle/
│   │   │   │   │   ├── ReflectionCircleCard.tsx
│   │   │   │   │   └── MutualAidCard.tsx
│   │   │   │   │
│   │   │   │   ├── library/
│   │   │   │   │   └── ResourceCard.tsx
│   │   │   │   │
│   │   │   │   ├── kitchen/
│   │   │   │   │   └── ProjectPodCard.tsx
│   │   │   │   │
│   │   │   │   ├── apply/
│   │   │   │   │   └── ApplicationForm.tsx
│   │   │   │   │
│   │   │   │   └── ai/
│   │   │   │       ├── CouncilTriggerButton.tsx
│   │   │   │       └── ContentReviewEditor.tsx   ← the WYSIWYG component
│   │   │   │
│   │   │   ├── stores/
│   │   │   │   ├── useUserStore.ts
│   │   │   │   ├── useThemeStore.ts
│   │   │   │   └── useAIStore.ts
│   │   │   │
│   │   │   ├── hooks/
│   │   │   │   ├── useRoleGuard.ts
│   │   │   │   └── useUserSync.ts
│   │   │   │
│   │   │   ├── lib/
│   │   │   │   └── clerk.ts
│   │   │   │
│   │   │   └── middleware.ts
│   │   │
│   │   ├── tailwind.config.ts
│   │   ├── next.config.ts
│   │   └── package.json
│   │
│   ├── mobile/                             EXISTING — extend only
│   │   ├── app/
│   │   │   ├── (tabs)/
│   │   │   │   ├── _layout.tsx            Update: 4 tabs + tier-aware visibility
│   │   │   │   ├── home.tsx
│   │   │   │   ├── circle.tsx
│   │   │   │   ├── events.tsx
│   │   │   │   └── library.tsx
│   │   │   └── (auth)/
│   │   ├── stores/                         ADD — mirror web stores
│   │   │   ├── useUserStore.ts
│   │   │   └── useThemeStore.ts
│   │   └── components/                     ADD — mirror web components
│   │
│   └── api/                                DO NOT TOUCH THIS SPRINT
│
└── packages/
    └── shared/
        └── src/
            ├── types/
            │   ├── user.ts                 FROM SECTION 2
            │   ├── events.ts               FROM SECTION 2
            │   └── ai.ts                   FROM SECTION 2
            ├── theme.ts                    FROM SECTION 1.2
            └── constants.ts               ADD route + tab constants below
```

### packages/shared/src/constants.ts

```typescript
export const ROUTES = {
  HOME:     '/home',
  CIRCLE:   '/circle',
  EVENTS:   '/events',
  LIBRARY:  '/library',
  KITCHEN:  '/kitchen',
  APPLY:    '/apply',
  PROFILE:  '/profile',
  SIGN_IN:  '/sign-in',
  SIGN_UP:  '/sign-up',
} as const;

export const TABS = [
  { key: 'home',    label: 'Home',    route: ROUTES.HOME,    icon: 'UtensilsCrossed' },
  { key: 'circle',  label: 'Circle',  route: ROUTES.CIRCLE,  icon: 'Users' },
  { key: 'events',  label: 'Events',  route: ROUTES.EVENTS,  icon: 'CalendarDays' },
  { key: 'library', label: 'Library', route: ROUTES.LIBRARY, icon: 'BookOpen' },
] as const;

export const PANTRY_DOMAINS = [
  'Personal growth',
  'Land & agriculture',
  'Community finance',
  'Creative economy',
  'Governance',
  'Water',
  'Decentralized technology',
] as const;

export const TIER_LABELS = {
  commons:         'The Commons',
  kitchen:         'The Kitchen',
  founding_table:  'The Founding Table',
} as const;

export const ROLE_LABELS = {
  attendee:    'Attendee',
  host:        'Host',
  facilitator: 'Facilitator',
} as const;
```

---

## SECTION 5: MIDDLEWARE + ROUTE PROTECTION

### apps/web/src/middleware.ts

```typescript
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import type { UserTier } from '@feast-ai/shared/types/user';

const isProtectedRoute = createRouteMatcher([
  '/home(.*)', '/circle(.*)', '/events(.*)',
  '/library(.*)', '/kitchen(.*)', '/apply(.*)', '/profile(.*)',
]);

const isKitchenRoute = createRouteMatcher(['/kitchen(.*)']);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) await auth.protect();

  if (isKitchenRoute(req)) {
    const { sessionClaims } = await auth();
    const tier = (sessionClaims?.publicMetadata as { tier?: UserTier })?.tier;
    if (!tier || tier === 'commons') {
      return NextResponse.redirect(new URL('/home', req.url));
    }
  }
});

export const config = {
  matcher: ['/((?!_next|.*\\..*|favicon.ico).*)'],
};
```

### apps/web/src/hooks/useRoleGuard.ts

```typescript
import { useUserStore } from '@/stores/useUserStore';
import type { TierPermissions } from '@feast-ai/shared/types/user';

// Use this in any component that conditionally renders based on role
// Example: {can('canHostEvents') && <HostOnlyButton />}
export function useRoleGuard() {
  const can = useUserStore((s) => s.can);
  const user = useUserStore((s) => s.user);
  const isLoading = useUserStore((s) => s.isLoading);
  return { can, user, isLoading };
}
```

---

## SECTION 6: COMPONENT SPECS

Opus must implement each component exactly as specified below.
Use the design patterns from Section 1.5.

---

### 6.1 AppShell (apps/web/src/components/layout/AppShell.tsx)

```
Layout:     flex flex-col min-h-screen bg-[var(--bg-page)]
TopBar:     fixed top-0 left-0 right-0 h-14 z-50
Content:    flex-1 pt-14 pb-20 overflow-y-auto px-4
BottomNav:  fixed bottom-0 left-0 right-0 h-20 z-50
```

TopBar contents:
- Left: "The Feast" wordmark — font-display italic font-light text-xl text-navy
- Right: Clerk UserButton (avatar) — tapping opens /profile

BottomNav contents:
- 4 tabs from TABS constant in shared/constants.ts
- Lucide React icons (UtensilsCrossed, Users, CalendarDays, BookOpen)
- Active tab: icon + label visible, text-mustard
- Inactive tab: icon only, text-ink-light
- Background: bg-[var(--bg-surface)] border-t border-border

---

### 6.2 Home / The Table (apps/web/src/app/(app)/home/page.tsx)

Feed layout — top to bottom:

1. DailyNourishment card (feed element, NOT hero)
2. Community pulse strip (active members, dinners this month)
3. FeedCard list (community posts/prompts)

DailyNourishment component:
```
Left-border accent card, border-l-mustard
Top label: "Today's Nourishment" — section label pattern
Heading: Fraunces italic, text-navy, text-xl
Subtext: DM Sans, text-ink-mid, text-sm
Bottom: small teal dot + "Reflect" ghost button
```

FeedCard component:
```
Left-border accent card, border-l-navy
Avatar (initials circle, bg-mustard-soft text-mustard) + name + timestamp
Body text: DM Sans text-sm text-ink leading-relaxed
Reaction strip: heart count, comment count — text-ink-light text-xs
```

---

### 6.3 Events / The Arc (apps/web/src/app/(app)/events/page.tsx)

Page heading: Fraunces italic "Upcoming Gatherings"
Section label above: "The Arc"
Filter strip: city pills (rounded-full, mustard active state)

EventCard component — strict visual hierarchy, no extra copy:
```
Left-border accent card, border-l-mustard
Row layout:
  [DATE BLOCK]    [EVENT DETAILS]         [ACTION]
  bg-mustard-soft  Title: Fraunces italic   RSVP button
  text-mustard     Location: DM Sans sm     or status badge
  font-medium      Seat count: text-hint

Date block: abbreviated month + day number stacked, text-center, w-12
Status badges:
  OPEN:      bg-teal-soft text-teal
  CONFIRMED: bg-mustard-soft text-mustard
  FULL:      bg-[var(--bg-surface)] text-ink-light
```

RSVPButton:
- If open: mustard filled rounded-full "RSVP"
- If confirmed: teal ghost "Confirmed ✓"
- If full: disabled ghost "Full"
- Role guard: canHostEvents → show "Manage" button instead

---

### 6.4 Circle (apps/web/src/app/(app)/circle/page.tsx)

Two sections separated by a divider:

**Reflection Circles section:**
- Section label: "Reflection Circles"
- Heading: Fraunces italic "Your Circle"
- ReflectionCircleCard: left-border-teal, shows member avatars (stacked initials), next session date, theme name, member count badge
- Commons users: "Join a Circle" CTA
- Facilitators: "Facilitate" CTA (role-guarded with can('canFacilitateCircles'))

**Mutual Aid section:**
- Section label: "Mutual Aid"
- Heading: Fraunces italic "Give & Receive"
- MutualAidCard: left-border-navy, offer/request badge, member name, need/offer description, "Connect" ghost button

---

### 6.5 Library / The Pantry (apps/web/src/app/(app)/library/page.tsx)

- Section label: "The Pantry"
- Heading: Fraunces italic "Curated Resources"
- Domain filter pills — 7 domains from PANTRY_DOMAINS constant
- ResourceCard: left-border-navy, domain badge (teal-soft/teal), title Fraunces italic sm, description DM Sans xs text-ink-mid, external link arrow

---

### 6.6 Kitchen (apps/web/src/app/(app)/kitchen/page.tsx)

Role guard: redirect to /home if !can('canAccessKitchen')

- Section label: "The Kitchen"
- Heading: Fraunces italic "Project Pods"
- ProjectPodCard: left-border-teal, pod name, domain tag, member count, last activity timestamp, "Enter" mustard button

---

### 6.7 Application Form (apps/web/src/app/(app)/apply/page.tsx)

Single-page form. No multi-step wizard.

Heading: Fraunces italic "Join Our Family of Hosts"
Subheading: DM Sans text-ink-mid — copy from workflow PDF

Two role options displayed as large radio cards:
- "Official Host" card
- "Official Facilitator" card
- Each: left-border card, role title Fraunces italic, description DM Sans sm, radio selection

Form fields (shadcn/ui Input + Textarea):
- Name
- City
- "Are you a community organizer?" (textarea)
- "What draws you to hosting?" (textarea)

Submit button: mustard filled full-width "Submit Application"
On submit: automated welcome email triggered via apps/api webhook (do not implement email logic in frontend — just POST to /api/applications)

---

### 6.8 Profile (apps/web/src/app/(app)/profile/page.tsx)

Full-screen overlay — opened from TopBar avatar tap.

Sections:
1. Avatar + name + tier badge + role badge
2. Stats row: dinner count, circle count, hub region
3. Settings list: Theme toggle (light/dark), Notifications, Privacy, Channel preference
4. "My Analytics" — visible only if can('canViewHostDashboard')
5. Sign out button — coral ghost button bottom

Theme toggle: calls useThemeStore().toggle() and sets data-theme on document.documentElement

---

### 6.9 ContentReviewEditor (apps/web/src/components/ai/ContentReviewEditor.tsx)

This is the WYSIWYG review component for AI-generated post-event content.
Rendered inside a modal/sheet triggered after CouncilJob status === 'awaiting_review'.

Structure (top to bottom):
1. Header: section label + event name in Fraunces italic
2. Tab row: 4 tabs (Article / Social / Recap / Instagram) — mustard active, bg-surface inactive
3. Formatting toolbar (directly above editor):
   Bold | Italic | Underline | divider | Bullet list | Numbered list | divider | Align left | Heading | divider | Undo
   - Toolbar buttons: 28×28px, rounded-sm, hover:bg-bg-surface
   - Active state: bg-navy text-ink-inverse
4. Editable content area: contentEditable div, DM Sans text-sm, min-h-[140px], p-4, bg-bg-card border border-border rounded-b-md
5. Footer row:
   - Left: status dot + "AI-generated · awaiting review" text-ink-light text-xs
   - Right: Reject (coral ghost) + Publish (mustard filled)

Implementation notes:
- Use document.execCommand for formatting (bold, italic, underline, lists, heading, undo)
- Tab switching saves current tab content to useAIStore before switching
- Publish button calls POST /api/council/jobs/[id]/publish with activeOutputTab
- Reject button calls POST /api/council/jobs/[id]/reject
- Do NOT implement the API routes — just the fetch calls with correct endpoint paths

---

### 6.10 CouncilTriggerButton (apps/web/src/components/ai/CouncilTriggerButton.tsx)

Contextual button rendered inside event management forms.
Only renders if can('canTriggerAICouncil').

Props:
```typescript
interface Props {
  type: CouncilJobType;
  eventId: string;
  label: string;        // e.g. "Generate event image", "Create post-event content"
  onJobStarted?: (jobId: string) => void;
}
```

Appearance: mustard-soft background, mustard border, mustard text, small Council icon (Sparkles from Lucide), text-sm
On click: calls useAIStore().startJob() then POST /api/council/jobs with payload
Loading state: spinner + "The Council is working..."
On awaiting_review: opens ContentReviewEditor modal

---

## SECTION 7: AGENTIC WORKFLOW SPECS

These are the two AI workflows from the workflow PDF.
Frontend triggers them — API implements them. Spec both sides.

### 7.1 Event Creation Workflow

Trigger: Host fills event form → clicks "Generate event image" CouncilTriggerButton
Frontend sends: POST /api/council/jobs
```json
{
  "type": "event_image_gen",
  "eventId": "...",
  "inputPayload": {
    "eventTitle": "Brooklyn Harvest Dinner",
    "city": "Brooklyn, NY",
    "date": "2026-06-18"
  }
}
```
API responsibility (do not implement in this sprint — document only):
- Call HuggingFace Inference API with prompt derived from event details
- Return imageUrl in CouncilJob output
- Update job status to awaiting_review

Frontend response:
- Poll job status every 3s via GET /api/council/jobs/[id]
- When status === awaiting_review: show image preview with Approve/Reject buttons
- On approve: image attached to event, job status → approved

### 7.2 Post-Event Content Workflow

Trigger: Host submits post-event form with photos + quotes + reflection
Frontend sends: POST /api/council/jobs
```json
{
  "type": "post_event_content",
  "eventId": "...",
  "inputPayload": {
    "photos": ["url1", "url2"],
    "quotes": ["quote1", "quote2"],
    "reflection": "transcribed text from voice recording",
    "eventTitle": "Brooklyn Harvest Dinner",
    "eventDate": "2026-06-18",
    "city": "Brooklyn, NY"
  }
}
```
API responsibility (document only):
- Send to Claude API (claude-sonnet-4-6) with structured prompt
- Generate all 4 outputs: article (markdown), social (plain), recap (plain), instagram (plain)
- Return all 4 in CouncilJob output field
- Update status to awaiting_review

Frontend response:
- Open ContentReviewEditor modal (Section 6.9)
- Host reviews/edits each tab independently
- On Publish: POST /api/council/jobs/[id]/publish with:
  - activeOutputTab (which output to publish)
  - editedContent (current editor innerHTML)
  - distributionTargets (derived from event visibility setting)

Distribution logic (frontend determines targets, API executes):
- If event.visibility === 'public': ['instagram', 'mailing_list', 'circle_public']
- If event.visibility !== 'public': ['circle_tier', 'crm_regional']

---

## SECTION 8: EXECUTION ORDER FOR OPUS

Execute in this exact sequence. Do not skip steps. Report after each.

```
STEP 1: packages/shared
  - Create types/user.ts, types/events.ts, types/ai.ts
  - Extend theme.ts with FEAST_COLORS, FEAST_TYPOGRAPHY, FEAST_RADIUS
  - Create constants.ts
  - Run typecheck. Fix all errors before continuing.

STEP 2: apps/web scaffold
  - Initialize Next.js 15 App Router in apps/web
  - Install dependencies: zustand, @clerk/nextjs, lucide-react, shadcn/ui
  - Set up tailwind.config.ts and globals.css from Section 1
  - Set up middleware.ts from Section 5
  - Run typecheck. Fix all errors before continuing.

STEP 3: Stores
  - Create useUserStore.ts, useThemeStore.ts, useAIStore.ts in apps/web/src/stores
  - Copy useUserStore.ts and useThemeStore.ts to apps/mobile/stores
  - Run typecheck. Fix all errors before continuing.

STEP 4: Layout shell
  - Build AppShell.tsx, TopBar.tsx, BottomNav.tsx
  - Build (app)/layout.tsx wrapping AppShell
  - Build (auth)/sign-in and sign-up pages with Clerk components
  - Verify shell renders with correct fonts and colors

STEP 5: Core pages (in this order)
  5a: home/page.tsx + DailyNourishment.tsx + FeedCard.tsx
  5b: events/page.tsx + EventCard.tsx + RSVPButton.tsx
  5c: circle/page.tsx + ReflectionCircleCard.tsx + MutualAidCard.tsx
  5d: library/page.tsx + ResourceCard.tsx
  5e: kitchen/page.tsx + ProjectPodCard.tsx (with role guard)
  5f: apply/page.tsx + ApplicationForm.tsx
  5g: profile/page.tsx

STEP 6: AI components
  - Build CouncilTriggerButton.tsx
  - Build ContentReviewEditor.tsx (the WYSIWYG editor)
  - Integrate ContentReviewEditor into events page for hosts

STEP 7: Mobile (apps/mobile)
  - Update (tabs)/_layout.tsx to 4-tab structure
  - Port home.tsx, circle.tsx, events.tsx, library.tsx
  - Apply same design system (NativeWind or StyleSheet matching tokens)
  - Confirm useUserStore and useThemeStore wired correctly
```

---

## SECTION 9: FONTS — GOOGLE FONTS IMPORT

Add to apps/web/src/app/layout.tsx:

```typescript
import { DM_Sans, Fraunces } from 'next/font/google';

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-body',
  display: 'swap',
});

const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['300', '400'],
  style: ['italic'],
  variable: '--font-display',
  display: 'swap',
});

// Apply to <html> tag: className={`${dmSans.variable} ${fraunces.variable}`}
```

---

## SECTION 10: QUALITY CHECKLIST

Before declaring any version complete, verify:

- [ ] All headings use Fraunces italic — zero DM Sans headings
- [ ] No hardcoded hex values in any component file
- [ ] Every role-gated element uses can() from useUserStore
- [ ] Left-border card pattern used consistently (not box-shadow cards)
- [ ] Mustard used ONLY for CTAs and active states — not decorative
- [ ] Coral used ONLY for destructive actions (Reject, Sign out)
- [ ] Teal used ONLY for success states and Circle section
- [ ] Dark mode tested — all text readable, no hardcoded light colors
- [ ] TypeScript: zero `any` types
- [ ] Mobile tab bar shows exactly 4 tabs
- [ ] Profile accessible ONLY via TopBar avatar — not a tab
- [ ] Kitchen page redirects commons-tier users to /home
- [ ] ContentReviewEditor tabs save content before switching

---

END OF BLUEPRINT v2.0.0
