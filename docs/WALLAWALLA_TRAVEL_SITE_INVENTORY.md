# wallawalla.travel Website Inventory

**Documented:** January 7, 2026
**URL:** https://wallawalla.travel
**Platform:** Webflow (detected via class naming conventions)
**Status:** Marketing site - limited pages live

---

## Executive Summary

The wallawalla.travel website is a Webflow-based marketing site with a modern, minimalist design. Currently only the homepage and about page are live - most navigation links go to "#" placeholders. The design emphasizes:
- Large hero imagery (vineyard landscapes)
- Card-based content organization
- Clean typography with generous whitespace
- Trust-building testimonials
- Clear call-to-action hierarchy

---

## Site Structure

### Live Pages
| Page | URL | Status |
|------|-----|--------|
| Homepage | wallawalla.travel | ✅ Live |
| About | wallawalla.travel/about | ✅ Live |
| All other pages | Various | ❌ 404 - Not built yet |

### Planned Pages (from navigation)
- Experiences (dropdown)
  - Wine tours
  - Outdoor escapes
  - Culinary escapes
- Plan your trip
  - Itineraries
  - Travel tools
  - Local insights
- Business services
- Community partners
- Sponsorships
- Stories (blog)
- Contact
- FAQs
- Privacy Policy
- Terms of Service

---

## Design System

### Typography

| Element | Font Family | Weight | Notes |
|---------|------------|--------|-------|
| Primary | Instrument Sans | Regular | Headings, body |
| Secondary | Plus Jakarta Sans | Regular | Accents, UI elements |

**Hierarchy:**
- H1: Hero headlines ("Your gateway to the valley")
- H2: Section headers ("Experience Authentically", "Discover Walla Walla Valley")
- H3: Card titles ("Outdoor escapes", "Wine & food tours")
- H4: Subsections, feature labels
- Body: Content paragraphs, descriptions

### Color Palette

*Note: Exact hex values not available from scrape, inferred from description*

| Use | Inferred Colors |
|-----|-----------------|
| Background | White/off-white |
| Text Primary | Dark gray/charcoal |
| Text Secondary | Medium gray |
| Accent/CTA | Likely purple or wine-red (brand appropriate) |
| Cards | White with subtle shadows |

### Spacing & Layout

- **Container:** Centered, max-width ~1200px
- **Section Padding:** Generous vertical spacing between sections
- **Grid System:** 4-column grid for experience cards
- **Card Gaps:** Consistent spacing between cards

---

## Page-by-Page Inventory

### Homepage

#### Header/Navigation
```
┌─────────────────────────────────────────────────────────────┐
│  [Logo: Walla Walla Travel]                                 │
│                                                             │
│  Experiences ▼  |  About  |  Stories  |  Help ▼  |  [Plan] │
└─────────────────────────────────────────────────────────────┘
```

**Navigation Details:**
- Sticky/fixed header
- Logo on left
- Main nav items center
- "Plan" button as primary CTA (right)
- Dropdown menus for "Experiences" and "Help"

**Experiences Dropdown:**
```
Curated journeys:
├── Wine tours
├── Outdoor escapes
└── Culinary escapes

Plan your trip:
├── Itineraries
├── Travel tools
└── Local insights

Connect & partner:
├── Business services
├── Community partners
└── Sponsorships
```

#### Hero Section
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  [Full-width vineyard landscape image]                      │
│                                                             │
│           "Your gateway to the valley"                      │
│                                                             │
│  Discover curated experiences, trusted partners, and        │
│  authentic local insights—crafted for travelers who         │
│  value connection and care.                                 │
│                                                             │
│  ✓ Handpicked local experiences                             │
│  ✓ Ethical, guest-first approach                            │
│  ✓ Expert guidance, every step                              │
│                                                             │
│  [Start exploring]  [Meet our team]                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Experience Authentically Section
```
┌─────────────────────────────────────────────────────────────┐
│  "Experience Authentically"                                 │
│                                                             │
│  ┌─────────────────────┐  ┌─────────────────────┐          │
│  │ [Fundraising Event] │  │ [Partners Image]    │          │
│  │                     │  │                     │          │
│  │ Handpicked valley   │  │ Partners who care   │          │
│  │ adventures          │  │ deeply              │          │
│  │                     │  │                     │          │
│  │ [Discover →]        │  │ [Connect →]         │          │
│  └─────────────────────┘  └─────────────────────┘          │
└─────────────────────────────────────────────────────────────┘
```

#### Discover Walla Walla Valley Section
```
┌─────────────────────────────────────────────────────────────┐
│  "Discover Walla Walla Valley"                              │
│                                                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ Explore  │ │  Taste   │ │  Stay    │ │ Connect  │       │
│  │          │ │          │ │          │ │          │       │
│  │ Scenic   │ │ Award-   │ │ Boutique │ │ Meet     │       │
│  │ trails,  │ │ winning  │ │ hotels,  │ │ locals,  │       │
│  │ outdoor  │ │ wineries │ │ cozy     │ │ build    │       │
│  │ activities│ │ & dining │ │ B&Bs     │ │ memories │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
└─────────────────────────────────────────────────────────────┘
```

#### Featured Experiences Grid
```
┌─────────────────────────────────────────────────────────────┐
│  "Featured Experiences"                                     │
│                                                             │
│  ┌─────────────────────┐  ┌─────────────────────┐          │
│  │ [Scenic Landscapes] │  │ [Beer & Food]       │          │
│  │                     │  │                     │          │
│  │ Outdoor escapes     │  │ Wine & food tours   │          │
│  │ Hiking, biking,     │  │ Tastings, events,   │          │
│  │ nature exploration  │  │ culinary journeys   │          │
│  │                     │  │                     │          │
│  │ [View]              │  │ [Book]              │          │
│  └─────────────────────┘  └─────────────────────┘          │
│                                                             │
│  ┌─────────────────────┐  ┌─────────────────────┐          │
│  │ [Personalized]      │  │ [Office Reception]  │          │
│  │                     │  │                     │          │
│  │ Lodging options     │  │ Local connections   │          │
│  │ Hotels, B&Bs,       │  │ Community events,   │          │
│  │ vacation rentals    │  │ local meetups       │          │
│  │                     │  │                     │          │
│  │ [See]               │  │ [Join]              │          │
│  └─────────────────────┘  └─────────────────────┘          │
└─────────────────────────────────────────────────────────────┘
```

#### Testimonials Section
```
┌─────────────────────────────────────────────────────────────┐
│  "What guests are saying"                                   │
│                                                             │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │ [Headshot]  │ │ [Headshot]  │ │ [Headshot]  │           │
│  │             │ │             │ │             │           │
│  │ "Quote..."  │ │ "Quote..."  │ │ "Quote..."  │           │
│  │             │ │             │ │             │           │
│  │ Alex Rivera │ │ Casey Lin   │ │ Riley Chen  │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

#### CTA Section
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│         "Your Walla Walla adventure awaits"                 │
│                                                             │
│                    [Get started]                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### FAQ Section
```
┌─────────────────────────────────────────────────────────────┐
│  "Frequently Asked Questions"                               │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ▶ When is the best time to visit?                   │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ▶ How can I explore the valley?                     │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ▶ What makes Walla Walla wineries unique?           │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ▶ Are there family-friendly activities?             │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ▶ Can you help plan custom itineraries?             │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ▶ What dining options are available?                │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

#### Contact Form Section
```
┌─────────────────────────────────────────────────────────────┐
│  "Get in Touch"                                             │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Name: [________________________]                     │   │
│  │                                                      │   │
│  │ Email: [________________________]                    │   │
│  │                                                      │   │
│  │ How can we assist you? [Dropdown ▼]                  │   │
│  │                                                      │   │
│  │                    [Send message]                    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Success: "Thank you! We'll reach out soon"                 │
│  Error: "Please check your info and try again"              │
└─────────────────────────────────────────────────────────────┘
```

#### Footer
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  [Facebook] [Instagram] [X] [LinkedIn] [YouTube]            │
│                                                             │
│  Explore        Discover       Connect                      │
│  ├── About      ├── Experiences ├── Contact                │
│  ├── Team       ├── Events      ├── Support                │
│  ├── Careers    ├── Guides      ├── FAQ                    │
│  ├── Partners   ├── Stories     ├── Policy                 │
│  └── Press      └── Gallery     └── Legal                  │
│                                                             │
│  © 2025 Walla Walla Travel. All rights reserved             │
│                                                             │
│  Privacy  |  Terms  |  Cookies                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### About Page

```
┌─────────────────────────────────────────────────────────────┐
│  [Same header as homepage]                                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  "About Walla Walla Travel"                                 │
│  Your wine country guide                                    │
│                                                             │
│  [Placeholder image]                                        │
│                                                             │
│  Walla Walla Travel is your gateway to authentic            │
│  experiences in one of America's most celebrated            │
│  wine regions.                                              │
│                                                             │
│  We're a destination management company connecting          │
│  visitors with curated local partners - wineries,           │
│  restaurants, accommodations, and outdoor activities.       │
│                                                             │
│  Whether planning a romantic getaway, group wine tour,      │
│  or corporate retreat, we handle the details so you         │
│  can focus on the experience.                               │
│                                                             │
│                    [Get Started]                            │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  [Same footer as homepage]                                  │
└─────────────────────────────────────────────────────────────┘
```

---

## Component Library

### Buttons

| Type | Text Examples | Style |
|------|--------------|-------|
| Primary CTA | "Start exploring", "Get started", "Book" | Filled, prominent |
| Secondary CTA | "Meet our team", "View", "See" | Outlined or subtle |
| Nav Link | Navigation items | Text only |

### Cards

**Experience Card:**
```
┌───────────────────────┐
│ [Image]               │
│                       │
│ Title                 │
│ Description text      │
│                       │
│ [CTA Button]          │
└───────────────────────┘
```

**Testimonial Card:**
```
┌───────────────────────┐
│    [Circular Photo]   │
│                       │
│  "Quote text here..." │
│                       │
│      — Name           │
└───────────────────────┘
```

**Pillar Card (Discover section):**
```
┌───────────────────────┐
│  [Icon/Image]         │
│                       │
│  Category Name        │
│  Brief description    │
│  of offerings         │
└───────────────────────┘
```

### Forms

**Contact Form Fields:**
- Name (text input)
- Email (email input)
- Assistance type (dropdown select)
- Submit button

**States:**
- Default
- Focus
- Success: "Thank you! We'll reach out soon"
- Error: "Please check your info and try again"

### Navigation

**Desktop:**
- Horizontal nav bar
- Dropdown menus on hover/click
- Logo left, nav center, CTA right

**Mobile (inferred):**
- Hamburger menu
- Full-screen overlay nav
- Touch-optimized dropdowns

---

## Brand Voice & Messaging

### Key Phrases
- "Your gateway to the valley"
- "Experience authentically"
- "Curated experiences"
- "Trusted partners"
- "Authentic local insights"
- "Guest-first approach"
- "Expert guidance, every step"

### Value Propositions
1. **Handpicked experiences** - Not everything, just the best
2. **Ethical approach** - Guest-first, partner relationships
3. **Expert guidance** - Local knowledge, concierge support

### Tone
- Warm and welcoming
- Knowledgeable but not pretentious
- Professional yet approachable
- Emphasis on authenticity and connection

---

## Technical Notes

### Platform: Webflow
- Class naming conventions indicate Webflow
- Responsive design built-in
- Touch detection for mobile optimization

### Fonts (Google Fonts)
```css
@import url('fonts.googleapis.com/css2?family=Instrument+Sans&display=swap');
@import url('fonts.googleapis.com/css2?family=Plus+Jakarta+Sans&display=swap');
```

### Responsive Breakpoints (Standard Webflow)
- Desktop: 992px+
- Tablet: 768px - 991px
- Mobile Landscape: 480px - 767px
- Mobile Portrait: < 480px

---

## Recommendations for Replication

### Option A: Direct Webflow Recreation
- Use Webflow to rebuild with same structure
- Maintain font choices and spacing
- Keep card-based layouts
- Preserve hero image prominence

### Option B: Next.js Implementation (Current Stack)
- Use Tailwind CSS to match styling
- Create reusable card components
- Implement responsive navigation
- Add FAQ accordion component
- Build contact form with validation

### Option C: Hybrid Approach
- Keep Webflow for marketing pages
- Link to Next.js app for booking/functionality
- Shared header/footer styling

---

## Files to Request from Webflow

If exporting or migrating:
1. Full CSS export
2. Image assets (hero, cards, testimonials)
3. Font files (if self-hosted)
4. Form configuration
5. Animation settings

---

## Current Site Limitations

The wallawalla.travel site is currently a **marketing placeholder**:
- Most navigation links go to "#" (not built)
- Only homepage and about page are live
- No booking functionality
- No winery directory
- No user accounts

This suggests it's either:
1. A new site under construction
2. A landing page while the main app is built separately
3. A marketing-only site that will link to booking app

---

---

## Current Next.js App Design (For Comparison)

The current Next.js app at `/Users/temp/walla-walla-final` uses a different design:

### App Landing Page (page.tsx)

**Color Scheme:**
- Primary: `#E07A5F` (terracotta/coral)
- Secondary: `emerald-600` (green)
- Neutral: `slate-*` scale
- Background: `slate-50`

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  [W] Walla Walla Travel App           Visit Website →       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│              Welcome to the App                             │
│              Select where you need to go                    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ [📅] Book a Tour                                  → │   │
│  │      Reserve your wine country experience           │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ [📋] View My Booking                              → │   │
│  │      Check details or make changes                  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ [🏢] Corporate Events                             → │   │
│  │      Request a custom group experience              │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────── Staff Access ───────────                      │
│  Admin Portal    Driver Portal                              │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│         Part of the Walla Walla Travel platform             │
└─────────────────────────────────────────────────────────────┘
```

### Chat Page (app/chat/page.tsx)

**Color Scheme:**
- Primary: `purple-600` / `purple-900`
- Background: Purple gradient (`purple-50` to `white`)
- Cards: White with `purple-100` borders
- User messages: `purple-600` background
- AI messages: `gray-100` background

### AI Chat UI Features:
- Date/Group/Occasion/Pace chips
- Conversation starters
- Message bubbles with loading animation
- Sticky bottom panel with extracted tags
- CTA buttons: "Book a Wine Tour", "Full Trip Assistance"

---

## Design Options Summary

### Option 1: Webflow Marketing Style
**Best for:** Public marketing pages, landing pages
- Modern, editorial feel
- Hero imagery prominence
- Card-based content
- Fonts: Instrument Sans, Plus Jakarta Sans

### Option 2: Current App Style
**Best for:** Functional app pages, admin interfaces
- Clean, utilitarian
- Card-based navigation
- Terracotta/coral accent color
- Fonts: System/Tailwind defaults

### Option 3: Chat/Concierge Style
**Best for:** Interactive experiences, chatbots
- Purple/wine theme
- Conversation-focused
- Floating chips and tags
- Gradient backgrounds

### Recommendation
Consider a **hybrid approach**:
1. Use Webflow-style design for marketing/public pages
2. Use current app style for admin/internal pages
3. Use chat style for AI concierge features
4. Shared header/footer across all

---

*Document created for reference in building new design options.*
