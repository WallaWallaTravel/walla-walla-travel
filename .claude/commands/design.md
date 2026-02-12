# /design — Reference-Driven Design Brief

**Run this BEFORE writing any UI code.** This command creates a concrete design brief with exact values — no coding until the brief is approved.

---

## Step 1: Classify the Page Type

Determine which page type best matches the request:

| Type | Description | Examples |
|------|-------------|----------|
| **landing** | Hero section, value props, CTA | Homepage, product launch pages |
| **partner-brand** | Showcasing a partner/brand with their identity | WWCC page, winery partner pages |
| **directory** | Card grid browsing multiple items | Winery directory, tour listings |
| **form** | Data collection, multi-step intake | Booking form, contact form |
| **content** | Long-form text, guides, articles | Travel guides, FAQ, policies |
| **dashboard** | Data display, tables, metrics | Admin panel, booking management |

State the classification clearly:
> **Page type: [type]**

---

## Step 2: Select Reference Sites

Based on the page type, select 2-3 reference sites from this curated library. Use WebFetch to study each one.

### Landing Pages
- `https://stripe.com` — Clean hero, typography hierarchy, restrained color
- `https://linear.app` — Minimal, dark accents on white, clear CTA hierarchy
- `https://vercel.com` — Bold hero, system font, strong whitespace
- `https://notion.so` — Friendly, illustration-driven, warm neutrals

### Partner / Brand Pages
- `https://stripe.com/partners` — Partner branding within host design system
- `https://shopify.com/plus/partners` — Partner identity showcase with consistent layout
- `https://www.salesforce.com/partners` — Professional partner presentation

### Directory / Card Grid
- `https://dribbble.com` — Clean card grid, hover states, consistent spacing
- `https://www.airbnb.com` — Image-forward cards, subtle shadows, clear hierarchy
- `https://unsplash.com` — Minimal card layout, excellent image handling

### Form / Intake
- `https://typeform.com` — Clean one-question-at-a-time flow
- `https://stripe.com/payments` — Professional form styling, clear validation
- `https://linear.app` — Minimal form with excellent focus states

### Content / Guide
- `https://stripe.com/docs` — Clean prose, clear hierarchy, readable line lengths
- `https://tailwindcss.com/docs` — Excellent content layout with navigation
- `https://developer.mozilla.org` — Structured content with good type hierarchy

### Dashboard
- `https://linear.app` — Clean data display, excellent use of whitespace
- `https://vercel.com/dashboard` — Minimal dashboard, clear metrics
- `https://stripe.com/dashboard` — Professional data tables, clear status indicators

For each reference site, use WebFetch and extract:
```
Reference: [URL]
- Primary color: [hex]
- Background color: [hex]
- Text color (headings): [hex]
- Text color (body): [hex]
- Font family: [name]
- Hero/header font size: [px]
- Body font size: [px]
- Card border-radius: [px]
- Card shadow: [CSS value]
- Primary button style: [colors, radius, padding]
- Whitespace between sections: [px]
- Notable pattern: [what stands out]
```

---

## Step 3: Extract Concrete Values

From the 2-3 references studied, synthesize a set of exact values. No adjectives — only numbers and hex codes.

Create a values table:

| Element | Value | Source |
|---------|-------|--------|
| Primary color | #[hex] | [which reference] |
| Primary hover | #[hex] | derived |
| Primary light (backgrounds) | #[hex] | derived |
| Heading color | #[hex] | [which reference] |
| Body text color | #[hex] | [which reference] |
| Secondary text color | #[hex] | [which reference] |
| Page background | #[hex] | [which reference] |
| Card background | #[hex] | [which reference] |
| Border color | #[hex] | [which reference] |
| Heading font size | [px] | [which reference] |
| Body font size | [px] | [which reference] |
| Section spacing | [px] | [which reference] |
| Card border-radius | [px] | [which reference] |
| Card shadow | [CSS] | [which reference] |
| Button border-radius | [px] | [which reference] |
| Button padding | [CSS] | [which reference] |
| Max content width | [px] | [which reference] |

---

## Step 4: Map to Tailwind / Project Design System

Read the project's `tailwind.config.ts` (or `.js`) and `~/claude-docs/DESIGN_SYSTEM.md`.

Map every extracted value to Tailwind classes. If the project has custom theme extensions, use those. If not, use the closest standard Tailwind class.

| Element | Extracted Value | Tailwind Class |
|---------|----------------|----------------|
| Primary color | #[hex] | bg-[class] / text-[class] |
| Primary hover | #[hex] | hover:bg-[class] |
| Primary light | #[hex] | bg-[class] |
| Heading color | #[hex] | text-[class] |
| Body text | #[hex] | text-[class] |
| Secondary text | #[hex] | text-[class] |
| Page bg | #[hex] | bg-[class] |
| Card bg | #[hex] | bg-[class] |
| Border | #[hex] | border-[class] |
| Heading size | [px] | text-[size] |
| Body size | [px] | text-[size] |
| Section gap | [px] | space-y-[n] or py-[n] |
| Card radius | [px] | rounded-[size] |
| Card shadow | [CSS] | shadow-[size] |
| Button radius | [px] | rounded-[size] |
| Button padding | [CSS] | px-[n] py-[n] |
| Max width | [px] | max-w-[size] |

**Contrast check every text/background combination against WCAG 2.1 AA (4.5:1 minimum).**

---

## Step 5: Generate Design Brief

Save the brief to `claudedocs/design-briefs/[page-name].md` with this structure:

```markdown
# Design Brief: [Page Name]

**Page type:** [classification]
**Date:** [today]
**References studied:** [URLs]
**Status:** Awaiting approval

---

## Color Palette (max 6 colors)

| Role | Hex | Tailwind | Usage |
|------|-----|----------|-------|
| Primary | #xxx | bg-xxx | Buttons, links, accents |
| Primary hover | #xxx | hover:bg-xxx | Button hover states |
| Primary light | #xxx | bg-xxx | Highlighted sections, badges |
| Heading text | #xxx | text-xxx | H1, H2, H3 |
| Body text | #xxx | text-xxx | Paragraphs, descriptions |
| Secondary text | #xxx | text-xxx | Captions, metadata |
| Background | #xxx | bg-xxx | Page background |
| Card background | #xxx | bg-xxx | Cards, elevated surfaces |
| Border | #xxx | border-xxx | Card borders, dividers |

## Typography

| Element | Size | Weight | Color | Tailwind |
|---------|------|--------|-------|----------|
| Page title | [px] | [weight] | [hex] | [classes] |
| Section heading | [px] | [weight] | [hex] | [classes] |
| Subheading | [px] | [weight] | [hex] | [classes] |
| Body | [px] | [weight] | [hex] | [classes] |
| Caption/meta | [px] | [weight] | [hex] | [classes] |

## Layout

| Property | Value | Tailwind |
|----------|-------|----------|
| Max content width | [px] | [class] |
| Section spacing | [px] | [class] |
| Card grid columns | [n] | [class] |
| Card gap | [px] | [class] |
| Card padding | [px] | [class] |
| Card border-radius | [px] | [class] |
| Card shadow | [CSS] | [class] |

## Component Specifications

### Hero / Header
[Exact classes for the hero section]

### Cards (if applicable)
[Exact classes for card components]

### Buttons
[Exact classes for primary and secondary buttons]

### Section Structure
[Exact classes for section containers and spacing]

## Page Sections (top to bottom)
1. [Section name] — [what it contains] — [layout approach]
2. [Section name] — [what it contains] — [layout approach]
3. ...

## Contrast Verification
| Combination | Ratio | Pass? |
|-------------|-------|-------|
| Body text on page bg | [ratio] | [yes/no] |
| Heading on page bg | [ratio] | [yes/no] |
| Secondary text on page bg | [ratio] | [yes/no] |
| Button text on primary | [ratio] | [yes/no] |
| Primary text on primary-light bg | [ratio] | [yes/no] |
```

---

## Step 6: Present for Approval

Show the user a summary:

1. **Page type** and references used
2. **Color palette** (the 4-6 colors as a table)
3. **Layout approach** (1-2 sentences)
4. **Key design decisions** (what makes this page look good)

Ask: **"Does this design direction look right? I'll build exactly to these specs once approved."**

### Rules
- **Do NOT write any component code until the brief is approved**
- **Do NOT use adjectives** like "modern", "premium", "clean" — use hex codes and pixel values
- **Do NOT invent colors** — derive them from references or the existing design system
- **Max 6 distinct colors** on any single page (including semantic colors)
- **Save the brief** even if the user approves verbally — it's the implementation contract

---

## If the User Provides Feedback

Update the design brief with their changes, save it, and re-present the summary. The brief is a living document until coding begins.

Once coding starts, the brief becomes the specification — deviations require updating the brief first.
