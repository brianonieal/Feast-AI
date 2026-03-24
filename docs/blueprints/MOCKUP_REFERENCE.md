# MOCKUP_REFERENCE.md
# Feast-AI: UI/UX Visual Reference
# Date: 2026-03-23
# Location: D:\Feast-AI\docs\feast_ai_mockup.jpg

---

## HOW TO USE THIS MOCKUP

The file `docs/feast_ai_mockup.jpg` is the visual source of truth for all frontend
work. It shows all 8 screens of the finished product at full fidelity.

Before building any component or page, open the mockup and locate the relevant screen.
Build to match it exactly. If what you are building is not visible in the mockup,
stop and ask Brian for clarification before proceeding.

---

## SCREEN MAP

The mockup is a 4×2 grid. Read left to right, top to bottom:

| Position | Screen | Route | File to build |
|----------|--------|-------|---------------|
| Row 1, Col 1 | Home · The Table | /home | app/(app)/home/page.tsx |
| Row 1, Col 2 | Events · The Arc | /events | app/(app)/events/page.tsx |
| Row 1, Col 3 | Circle · Reflection & Aid | /circle | app/(app)/circle/page.tsx |
| Row 1, Col 4 | Library · The Pantry | /library | app/(app)/library/page.tsx |
| Row 2, Col 1 | Application Form | /apply | app/(app)/apply/page.tsx |
| Row 2, Col 2 | Profile & Settings | /profile | app/(app)/profile/page.tsx |
| Row 2, Col 3 | Kitchen · Project Pods | /kitchen | app/(app)/kitchen/page.tsx |
| Row 2, Col 4 | Content Review Editor | (modal/sheet) | components/ai/ContentReviewEditor.tsx |

---

## VISUAL RULES — EXTRACT FROM MOCKUP

These are the non-negotiable design rules visible in every screen.
Do not deviate from them.

### Typography
- ALL headings: CrimsonPro Italic (substitute: Fraunces italic via Google Fonts)
  - Large heading: ~28-36px, font-weight 300, color #2D1B69 (navy)
  - Small heading inside cards: ~16px, font-weight 300, color #2D1B69
- ALL body text, labels, buttons, metadata: InstrumentSans or DM Sans
  - Regular body: 14px, color #1A1429 (ink)
  - Secondary/meta: 11-12px, color #9490B0 (ink-light)
  - Section labels: 10px, ALL CAPS, letter-spacing 0.09em, color #C97B1A (mustard)

### Colors — use these exact hex values
- Page background:  #F7F2EA  (warm linen)
- Surface/nav:      #F0EAE0
- Card background:  #FDF9F2
- Navy (brand):     #2D1B69
- Mustard (CTA):    #C97B1A
- Mustard soft:     #FDF0DC
- Teal (success):   #1D9E75
- Teal soft:        #E6F5EF
- Coral (danger):   #E05535
- Coral soft:       #FCEEE9
- Border:           #E5DDD0
- Ink (text):       #1A1429
- Ink mid:          #4A4468
- Ink light:        #9490B0

### Card pattern — LEFT BORDER ACCENT (used on every card in the app)
Every card has:
- Background: #FDF9F2
- Border: 0.5px solid #E5DDD0
- Border-radius: 10px (right side only — left side is flush for the accent)
- Left border: 3-4px solid [accent color] — flush left edge, inset 8px top and bottom
- Accent colors by context:
  - Mustard (#C97B1A): events, daily nourishment, CTAs
  - Teal (#1D9E75):    circle, reflection, success states
  - Navy (#2D1B69):    library resources, feed posts
  - Coral (#E05535):   mutual aid seeking, destructive

### Buttons
- Primary (filled):  bg #C97B1A, text white, border-radius 22px (pill), font-weight 500
- Ghost (outline):   border 1px solid #E5DDD0, text #4A4468, same radius
- Danger (ghost):    border 1px solid #E05535, text #E05535, same radius
- Disabled/full:     bg #F0EAE0, text #9490B0

### Badges / pills / tags
- All tags: 10px ALL CAPS, letter-spacing 0.07em, padding 3px 9px, border-radius 9px
- Domain tags (library): bg #E6F5EF, text #1D9E75
- Tier badges: bg #FDF0DC, text #C97B1A (commons) / bg #E6F5EF, text #1D9E75 (kitchen)
- Event status:
  - OPEN:      bg #E6F5EF, text #1D9E75
  - CONFIRMED: bg #FDF0DC, text #C97B1A
  - FULL:      bg #F0EAE0, text #9490B0

### Top bar (all protected screens)
- Height: 52px
- Background: #F0EAE0 (surface)
- Left: "The Feast" in CrimsonPro italic, 20px, #2D1B69
- Right: avatar circle (initials), 36px diameter, bg #FDF0DC, text #C97B1A

### Bottom nav (4 tabs — all protected screens except Profile)
- Height: 68px
- Background: #F0EAE0
- Top border: 1px solid #E5DDD0
- Active tab: icon + label visible, color #C97B1A (mustard)
- Inactive tab: icon only, color #9490B0 (ink-light)
- Tabs: Home (UtensilsCrossed), Circle (Users), Events (CalendarDays), Library (BookOpen)
- Use Lucide React for all icons

### Event cards (Events screen)
Structure left to right:
1. Date block: 36×44px, bg #FDF0DC, month label 10px mustard, day number 14px bold mustard
2. Event details: title in serif italic 16px navy, location + seats in 12px ink-light
3. Status badge: right-aligned, see badge colors above
Left accent border: mustard for confirmed, teal for open, none/gray for full

### Profile screen
- Top band: full-width navy (#2D1B69) background, height ~160px
- Avatar: centered, 72px diameter circle, bg #FDF0DC, initials in serif italic mustard
- Name: white, 14px bold, centered below avatar
- Tier + role badges: centered below name
- Stats row: 3 equal cards below the band
- Settings list: left-border-free cards, label left + value right in ink-light
- Sign out: coral ghost pill button, bottom

### Content Review Editor (modal)
- Section label + event name header
- Tab row: Article / Social / Recap / Instagram
  - Active: bg mustard, text white, border-radius 12px
  - Inactive: bg surface, text ink-mid, border 0.5px
- Formatting toolbar: directly above editor area
  - Buttons: 22×24px, rounded 5px, hover bg surface
  - Active (Bold is pre-selected): bg navy, text white
  - Dividers: 1px vertical line, color border
  - Tools: B, I, U | bullet list, numbered list | align left, H | undo
- Editor area: white bg, border 0.5px border, min-height 140px, padding 14px 16px
- Footer: status dot (teal) + "AI-generated · awaiting review" left | Reject (coral ghost) + Publish (mustard filled) right

---

## WHAT IS NOT IN THE MOCKUP

These exist in the blueprint but are not shown as full screens.
Build them per the blueprint spec, matching the design language above:

- Sign-in / Sign-up pages (Clerk components — wrap in linen bg with centered card)
- Kitchen interior (project pod detail view — not shown, build per blueprint)
- 404 / error states — use linen bg, serif italic heading, ghost button home CTA

---

## OPUS VERIFICATION CHECKLIST

After building each screen, visually compare against the mockup:

- [ ] Heading is CrimsonPro/Fraunces italic — not DM Sans
- [ ] Background is #F7F2EA linen — not white
- [ ] Cards use left-border accent pattern — not box shadow
- [ ] Section labels are 10px ALL CAPS mustard
- [ ] Active nav tab is mustard — not navy or teal
- [ ] No hardcoded hex values in component files
- [ ] Buttons are pill-shaped (border-radius 22px) not rectangular

---

*This file + docs/feast_ai_mockup.jpg are the visual contract for this sprint.
If the code does not match the mockup, it is not done.*
