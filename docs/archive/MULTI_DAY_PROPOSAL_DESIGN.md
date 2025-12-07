# Multi-Day & Complex Proposal Design

**Date:** November 1, 2025  
**Status:** ✅ Complete

## Overview
Enhanced the proposal display system to beautifully showcase multi-day itineraries and corporate events with a sophisticated, timeline-based design that maintains the clean aesthetic.

## Design Philosophy

### Key Principles
1. **Visual Hierarchy** - Clear progression through days
2. **Timeline Aesthetic** - Vertical timeline with day badges
3. **Icon-Driven** - Icons for quick visual recognition
4. **Card-Based** - Each day is a distinct card
5. **Hover Effects** - Subtle interactions for engagement
6. **Color Coding** - Different modules have distinct colors

## Multi-Day Itinerary Design

### Visual Structure
```
┌─────────────────────────────────────────────────────┐
│ [Burgundy Header]                                   │
│ 📅 3-Day Itinerary                                  │
│ Your complete day-by-day experience                 │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ●━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  ┃                                                  │
│  ┃  [1]  Day 1: Wine Country Arrival               │
│  ┃       June 15, 2025                             │
│  ┃       ✓ Airport pickup                          │
│  ┃       ✓ Hotel check-in                          │
│  ┃       ✓ Welcome dinner                          │
│  ┃       🏠 Marcus Whitman Hotel                   │
│  ┃       🍽️ Dinner                                 │
│  ┃                                                  │
│  ┃  [2]  Day 2: Full Wine Tour                     │
│  ┃       June 16, 2025                             │
│  ┃       ✓ Visit 3 premier wineries                │
│  ┃       ✓ Gourmet lunch                           │
│  ┃       ✓ Sunset tasting                          │
│  ┃       🏠 Marcus Whitman Hotel                   │
│  ┃       🍽️ Breakfast, Lunch                      │
│  ┃                                                  │
│  ┃  [3]  Day 3: Departure                          │
│  ┃       June 17, 2025                             │
│  ┃       ✓ Morning winery visit                    │
│  ┃       ✓ Airport transfer                        │
│  ┃       🍽️ Breakfast                              │
│  ●                                                  │
└─────────────────────────────────────────────────────┘
```

### Components

#### 1. Header Section
- **Background:** Gradient from burgundy to dark burgundy
- **Icon:** Calendar SVG icon
- **Title:** Dynamic "{X}-Day Itinerary"
- **Subtitle:** "Your complete day-by-day experience"
- **Color:** White text on burgundy

#### 2. Timeline
- **Vertical Line:** Gradient from burgundy → gold → burgundy
- **Width:** 2px
- **Position:** Left side, connects all day badges

#### 3. Day Badge
- **Shape:** Circle (48px diameter)
- **Background:** Gradient burgundy
- **Border:** 4px white border for depth
- **Number:** Large, bold, white
- **Shadow:** Subtle shadow for elevation

#### 4. Day Card
- **Background:** Gradient from gray-50 to white
- **Border:** 1px gray-200
- **Padding:** 20px
- **Shadow:** Medium shadow, increases on hover
- **Rounded:** Large border radius (12px)

#### 5. Activity List
- **Icons:** Checkmark in circular badge
- **Badge:** Burgundy/10 background
- **Hover:** Darkens to burgundy/20
- **Spacing:** Consistent vertical spacing

#### 6. Accommodation & Meals
- **Layout:** 2-column grid (responsive)
- **Icons:** House (blue), Shopping cart (amber)
- **Background:** Colored icon boxes (blue-50, amber-50)
- **Labels:** Uppercase, small, gray-500
- **Values:** Medium weight, gray-900

## Corporate Event Design

### Visual Structure
```
┌─────────────────────────────────────────────────────┐
│ [Slate Header]                                      │
│ 🏢 Corporate Event                                  │
│ Tailored for your team's success                   │
├─────────────────────────────────────────────────────┤
│                                                     │
│  [🏢] COMPANY                                       │
│       Acme Corporation                              │
│                                                     │
│  [👤] CONTACT PERSON                               │
│       John Smith                                    │
│                                                     │
│  [💳] PO NUMBER                                    │
│       PO-2025-12345                                 │
│                                                     │
│  [📍] BILLING ADDRESS                              │
│       123 Business St, Seattle, WA                  │
└─────────────────────────────────────────────────────┘
```

### Components

#### 1. Header
- **Background:** Gradient from slate-700 to slate-900
- **Icon:** Building SVG
- **Title:** "Corporate Event"
- **Subtitle:** "Tailored for your team's success"

#### 2. Info Cards
- **Layout:** 2-column grid
- **Icon Boxes:** Colored backgrounds (blue, green, purple, amber)
- **Icons:** Relevant SVG icons
- **Labels:** Uppercase, tracking-wide
- **Values:** Large, bold for company name

## Color Palette

### Multi-Day Itinerary
- **Primary:** Burgundy (#8B1538)
- **Secondary:** Gold (#D4AF37)
- **Timeline:** Gradient burgundy → gold → burgundy
- **Cards:** Gray-50 to white gradient
- **Accent:** Burgundy/10 for badges

### Corporate Module
- **Primary:** Slate-700 to Slate-900
- **Icons:** Blue-600, Green-600, Purple-600, Amber-600
- **Backgrounds:** Respective 50-shades
- **Text:** Gray-900 for values

### Special Event Module
- **Primary:** Pink-500
- **Background:** Pink-50 to Purple-50 gradient
- **Border:** Pink-500 left border

## Typography

### Headers
- **Module Title:** 2xl, bold, white (on colored background)
- **Subtitle:** sm, white/90
- **Day Title:** xl, bold, gray-900
- **Section Labels:** xs, semibold, uppercase, gray-500

### Content
- **Activities:** base, gray-700
- **Values:** lg, medium/bold, gray-900
- **Dates:** sm, gray-600

## Responsive Design

### Desktop (md+)
- 2-column grids for info cards
- Full-width timeline
- Side-by-side accommodation/meals

### Mobile
- Single column stacks
- Timeline maintains left position
- Full-width cards
- Stacked accommodation/meals

## Data Structure

### Multi-Day Itinerary
```typescript
multi_day_itinerary: [
  {
    day: 1,
    title: "Wine Country Arrival",
    date: "2025-06-15",
    activities: [
      "Airport pickup from Seattle-Tacoma",
      "Hotel check-in at Marcus Whitman",
      "Welcome dinner at Saffron Mediterranean Kitchen"
    ],
    accommodation: "Marcus Whitman Hotel & Conference Center",
    meals: ["Dinner"]
  },
  {
    day: 2,
    title: "Full-Day Wine Tour",
    date: "2025-06-16",
    activities: [
      "Visit Leonetti Cellar",
      "Lunch at Walla Faces",
      "Visit L'Ecole No 41",
      "Visit Woodward Canyon",
      "Sunset tasting at Abeja"
    ],
    accommodation: "Marcus Whitman Hotel & Conference Center",
    meals: ["Breakfast", "Lunch"]
  },
  {
    day: 3,
    title: "Departure Day",
    date: "2025-06-17",
    activities: [
      "Morning visit to Pepper Bridge",
      "Airport transfer to Seattle-Tacoma"
    ],
    meals: ["Breakfast"]
  }
]
```

### Corporate Details
```typescript
corporate_details: {
  company_name: "Acme Corporation",
  contact_person: "John Smith",
  po_number: "PO-2025-12345",
  billing_address: "123 Business Street, Seattle, WA 98101"
}
```

## Interactive Features

### Hover Effects
- **Day Cards:** Shadow increases from md to lg
- **Activity Badges:** Background darkens
- **Timeline:** Maintains gradient (no hover)

### Transitions
- **All:** `transition-shadow` or `transition-colors`
- **Duration:** Default (150ms)
- **Easing:** Default ease

## Implementation Details

### Conditional Rendering
```typescript
{proposal.modules?.multi_day && 
 proposal.multi_day_itinerary && 
 proposal.multi_day_itinerary.length > 0 && (
  // Render multi-day module
)}
```

### Timeline Positioning
```typescript
// Absolute positioning for timeline
<div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-[#8B1538] via-[#D4AF37] to-[#8B1538]"></div>

// Relative positioning for day cards
<div className="relative pl-16">
  {/* Day badge at left-0 */}
  {/* Card content with left padding */}
</div>
```

### Icon Usage
- **Heroicons:** All icons from Heroicons library
- **Inline SVG:** For performance and styling control
- **Size:** Consistent (w-5 h-5 for small, w-6 h-6 for medium, w-7 h-7 for large)
- **Color:** Controlled via `fill="currentColor"`

## Example Use Cases

### 1. Weekend Wine Tour
- 2-3 days
- Hotel accommodation
- Multiple wineries per day
- Meals included

### 2. Corporate Retreat
- 3-5 days
- Team building activities
- Conference facilities
- Group dining
- PO number for billing

### 3. Special Event
- Anniversary celebration
- Wedding party
- VIP treatment
- Custom itinerary

### 4. Extended Tour
- 5-7 days
- Multiple regions
- Various accommodations
- Comprehensive activities

## Benefits

### Visual Impact
- ✅ Professional, polished appearance
- ✅ Easy to scan and understand
- ✅ Engaging timeline design
- ✅ Clear day-by-day progression

### User Experience
- ✅ All information at a glance
- ✅ No overwhelming text blocks
- ✅ Visual hierarchy guides the eye
- ✅ Interactive elements provide feedback

### Flexibility
- ✅ Works for 2-10+ day itineraries
- ✅ Handles varying amounts of activities
- ✅ Optional accommodation/meals
- ✅ Responsive on all devices

### Maintenance
- ✅ Clean, modular code
- ✅ Easy to update styles
- ✅ Reusable components
- ✅ Well-documented structure

## Testing Scenarios

### Scenario 1: 2-Day Weekend Tour
- Minimal activities
- One accommodation
- Some meals

### Scenario 2: 5-Day Corporate Retreat
- Many activities per day
- Multiple accommodations
- All meals included
- Corporate details present

### Scenario 3: 3-Day Special Event
- Mix of activities
- Special requests
- VIP services
- Event details present

### Scenario 4: Single Day (Edge Case)
- Still shows timeline
- Single day badge
- All features work

## Related Files

### Updated
- `/app/proposals/[proposal_id]/page.tsx` - Enhanced multi-day and corporate displays

### Database
- `/migrations/add-proposal-modules.sql` - Module structure

### Documentation
- `/docs/MULTI_DAY_PROPOSAL_DESIGN.md` - This document
- `/docs/PROPOSAL_ENHANCEMENTS_SPEC.md` - Overall proposal system

---

**Summary:** Created a sophisticated, timeline-based design for multi-day itineraries with numbered day badges, gradient timeline, activity checklists, and icon-driven information cards. Corporate events get a professional slate-colored header with organized info cards. The design maintains the clean aesthetic while handling complex, multi-day proposals beautifully.

