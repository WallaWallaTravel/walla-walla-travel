# Design Brief: WWCC Partner Page

**Page type:** Partner / Brand Page
**Date:** 2026-02-11
**References studied:** Pebble Beach Resorts, Rosewood Hotels, Auberge Collection, Calistoga Inn
**Status:** Awaiting approval

---

## Design Direction

Shift from "modern tech sage green" to "established wine country club."
The page should feel like you've walked into the club lounge — warm wood tones, cream linen, gold accents, confident serif headings.

**Key shift:** The dominant accent changes from sage green (#547340) to warm gold/tan (#847b4a and darker variants). Dark charcoal (#2d2a1e) becomes the primary button color. Cream replaces stark white for section backgrounds.

---

## Color Palette (6 colors)

| Role | Hex | Tailwind | Usage | Contrast on white |
|------|-----|----------|-------|--------------------|
| Dark (primary) | #2d2a1e | `bg-wwcc-dark` | Dark sections, primary buttons, footer | 13.5:1 |
| Dark hover | #3d3a2a | `hover:bg-wwcc-dark-hover` | Button hover states | — |
| Gold accent | #847b4a | `text-wwcc-gold` / `border-wwcc-gold` | Decorative borders, card header bg, large display labels | 3.9:1 (large text only) |
| Gold dark (text-safe) | #6B5D35 | `text-wwcc-gold-dark` | Small text labels, accent text on light bg | 5.7:1 |
| Cream | #FAF8F0 | `bg-wwcc-cream` | Warm section backgrounds (replaces white and stone-50) | — |
| Warm white | #FFFDF7 | `bg-wwcc-warm` | Card backgrounds sitting on cream sections | — |

**What this replaces:**
- Sage (#547340) is removed from all UI accent uses (buttons, labels, card headers)
- Sage MAY remain for the decorative bullet dots only (tiny, non-critical)
- Stark white backgrounds → cream (#FAF8F0) for most sections
- Gray text scale → stone/warm gray text scale

**Text colors (from Tailwind stone scale — warmer than gray):**

| Element | Hex | Tailwind | Contrast on white | Contrast on cream |
|---------|-----|----------|--------------------|--------------------|
| Headings | #1C1917 | `text-stone-900` | 18.4:1 | 17.1:1 |
| Body text | #44403C | `text-stone-700` | 8.2:1 | 7.7:1 |
| Secondary text | #78716C | `text-stone-500` | 4.8:1 | 4.5:1 |
| White text on dark bg | #FFFFFF | `text-white` | — | — |
| White/muted on dark | #FFFFFF/70 | `text-white/70` | — | 7.5:1 effective |

---

## Typography

The serif heading font (Cormorant Garamond) is a strong choice — keep it. But sizes need to increase for luxury impact.

| Element | Current | Proposed | Tailwind |
|---------|---------|----------|----------|
| Page title (H1) | text-4xl md:text-6xl | **text-5xl md:text-7xl** | `text-5xl md:text-7xl font-medium tracking-tight` |
| Section heading (H2) | text-3xl md:text-4xl | **text-3xl md:text-5xl** | `text-3xl md:text-5xl font-medium` |
| Card title (H3) | text-xl | **text-xl md:text-2xl** | `text-xl md:text-2xl font-semibold` |
| Hero body | text-lg | **text-lg md:text-xl** | `text-lg md:text-xl leading-relaxed` |
| Section description | text-gray-600 | **text-lg text-stone-600** | `text-lg text-stone-600` |
| Card body text | text-sm (14px!) | **text-base (16px)** | `text-base text-stone-700` |
| Card subtitle | text-sm | **text-sm md:text-base** | `text-sm md:text-base` |
| Accent labels | text-xs | **text-xs md:text-sm** | `text-xs md:text-sm font-semibold tracking-wider uppercase` |

**Font weights:** Keep to 2 — `font-medium` for serif headings, `font-semibold` for labels/card titles.

---

## Layout

| Property | Current | Proposed | Tailwind |
|----------|---------|----------|----------|
| Section spacing | py-16 md:py-20 | **py-20 md:py-28** | `py-20 md:py-28` |
| Hero padding | py-20 md:py-28 | **py-24 md:py-36** | `py-24 md:py-36` |
| Card grid gap | gap-6 lg:gap-8 | **gap-8 lg:gap-10** | `gap-8 lg:gap-10` |
| Card padding | p-6 | **p-6 md:p-8** | `p-6 md:p-8` |
| Card border-radius | rounded-lg | **rounded-xl** | `rounded-xl` |
| Card shadow | shadow-lg | **shadow-sm** | `shadow-sm` |
| Page max width | max-w-6xl | max-w-6xl (keep) | `max-w-6xl mx-auto` |
| Heading bottom margin | mb-12 | **mb-14 md:mb-16** | `mb-14 md:mb-16` |

---

## Component Specifications

### Hero Section
- Background: `bg-wwcc-dark`
- H1: `text-5xl md:text-7xl font-medium text-white tracking-tight` (serif)
- Subtitle labels: `text-wwcc-gold text-xs md:text-sm font-semibold tracking-wider uppercase` (gold #847b4a passes at this decorative size on dark bg)
- Body: `text-lg md:text-xl text-white/80 leading-relaxed`
- Primary CTA: `bg-white text-wwcc-dark px-8 py-4 rounded-lg font-medium` (inverted — white button on dark bg)
- Secondary CTA: `border border-white/40 text-white px-8 py-4 rounded-lg font-medium`

### Cards
- Container: `rounded-xl bg-wwcc-warm border border-stone-200 shadow-sm overflow-hidden`
- Card header: `bg-wwcc-dark px-6 py-5` (all cards use dark header, not sage)
- Featured card: `ring-2 ring-wwcc-gold` (gold ring instead of sage)
- Card header title: `text-xl md:text-2xl text-white font-semibold` (serif)
- Card header subtitle: `text-white/70 text-sm md:text-base mt-1`
- Card body: `p-6 md:p-8`
- Bullet points: `w-1.5 h-1.5 rounded-full bg-wwcc-gold` (gold dots)
- List item text: `text-base text-stone-700` (NOT text-sm)

### Buttons
- Primary (on light bg): `bg-wwcc-dark text-white px-7 py-3.5 rounded-lg font-medium hover:bg-wwcc-dark-hover shadow-sm`
- Primary (on dark bg): `bg-white text-wwcc-dark px-7 py-3.5 rounded-lg font-medium hover:bg-stone-100`
- Outline (on dark bg): `border border-white/40 text-white px-7 py-3.5 rounded-lg font-medium hover:bg-white/10`
- All buttons: add `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 transition-colors`

### Section Labels (category headers like "Wine Tours", "Geology Tours")
- On light bg: `text-wwcc-gold-dark text-xs md:text-sm font-semibold tracking-wider uppercase mb-3`
- On dark bg: `text-wwcc-gold text-xs md:text-sm font-semibold tracking-wider uppercase mb-3`

### Trust Bar
- Background: `bg-wwcc-dark` (instead of sage — more refined)
- Text: `text-white font-semibold text-sm md:text-base`
- Subtitle: `text-white/60 text-xs md:text-sm`

### Callout Boxes
- Border accent: `border-l-4 border-wwcc-gold` (gold instead of sage)
- Background: `bg-wwcc-cream` (warm instead of white)

### Footer
- Same dark bg as now
- Labels: `text-white/60 text-xs tracking-wider uppercase`
- Body text: `text-white/70 text-sm`
- Copyright: `text-white/50 text-sm`

---

## Section Backgrounds (top to bottom)

| Section | Current Background | Proposed Background |
|---------|--------------------|---------------------|
| Header | bg-wwcc-dark | bg-wwcc-dark (keep) |
| Hero | bg-wwcc-dark | bg-wwcc-dark (keep) |
| Trust bar | bg-wwcc-sage | **bg-wwcc-dark** (darker, more refined) |
| Family callout | bg-stone-50 | **bg-wwcc-cream** (#FAF8F0) |
| Wine tours | bg-white | **bg-wwcc-cream** (#FAF8F0) |
| Geology tours | bg-wwcc-dark | bg-wwcc-dark (keep) |
| Golf excursions | bg-stone-50 | **bg-wwcc-cream** (#FAF8F0) |
| Dining | bg-wwcc-dark | bg-wwcc-dark (keep) |
| How it works | bg-white | **bg-white** (keep as contrast break) |
| Final CTA | bg-wwcc-dark | bg-wwcc-dark (keep) |
| Footer | bg-wwcc-dark | bg-wwcc-dark (keep) |

Pattern: dark sections alternate with warm cream sections, with one white section (How It Works) as a brightness break.

---

## Contrast Verification

| Combination | Ratio | Pass? |
|-------------|-------|-------|
| stone-700 on white | 8.2:1 | Yes (AA, AAA) |
| stone-700 on cream (#FAF8F0) | 7.7:1 | Yes (AA, AAA) |
| stone-900 on white | 18.4:1 | Yes (AAA) |
| stone-900 on cream | 17.1:1 | Yes (AAA) |
| stone-500 on white | 4.8:1 | Yes (AA) |
| stone-500 on cream | 4.5:1 | Yes (AA, borderline) |
| gold-dark (#6B5D35) on white | 5.7:1 | Yes (AA) |
| gold-dark on cream | 5.3:1 | Yes (AA) |
| gold (#847b4a) on dark bg (#2d2a1e) | ~3.5:1 | Yes for large text |
| White on dark (#2d2a1e) | 13.5:1 | Yes (AAA) |
| White/70 on dark | ~7.5:1 | Yes (AA) |
| White/60 on dark | ~6.3:1 | Yes (AA) |
| wwcc-dark text on white button | 13.5:1 | Yes (AAA) |

---

## What Changes vs. Stays

### Changes
- Sage green removed from all accent uses (buttons, labels, card headers, trust bar)
- Gold/tan becomes the accent color
- Cream replaces white/stone-50 for warm section backgrounds
- Gray text → stone (warm gray) text
- Font sizes increase one step across the board
- Card shadows reduced from shadow-lg to shadow-sm
- Section spacing increases for more breathing room
- All card headers use dark bg (not sage)
- Trust bar moves to dark bg

### Stays
- Cormorant Garamond for headings (excellent serif choice)
- Dark (#2d2a1e) for dark sections and footer
- Overall page structure and section order
- Card layout and grid patterns
- Responsive breakpoints
- Focus-visible styles on interactive elements
