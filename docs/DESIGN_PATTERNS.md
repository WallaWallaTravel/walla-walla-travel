# Design Patterns & Style Guide

**Date:** November 2, 2025  
**Status:** ✅ Established

## Overview
This document captures the approved design patterns and aesthetic principles for the Walla Walla Travel application. These patterns should be used consistently across all pages and features.

## Core Design Philosophy

### Principles
1. **Clean & Professional** - No flashy colors or gradients
2. **Subtle Structure** - Use gentle visual breaks, not bold separators
3. **High Contrast** - Dark text on light backgrounds for readability
4. **Organic Flow** - Natural visual hierarchy without being overwhelming
5. **Consistent Spacing** - Predictable padding and margins

## Color Palette

### Primary Colors
- **Brand Burgundy:** `#8B1538` - Used sparingly for accents
- **Brand Gold:** `#D4AF37` - Minimal use, accents only

### Neutral Colors (Primary Use)
- **White:** `#FFFFFF` - Main background
- **Gray-50:** `#F9FAFB` - Subtle box backgrounds
- **Gray-200:** `#E5E7EB` - Borders and dividers
- **Gray-300:** `#D1D5DB` - Stronger borders
- **Gray-400:** `#9CA3AF` - Bullet points, subtle text
- **Gray-500:** `#6B7280` - Labels, secondary text
- **Gray-600:** `#4B5563` - Subheadings
- **Gray-700:** `#374151` - Body text
- **Gray-900:** `#111827` - Headings, primary text

### Usage Guidelines
- **Avoid:** Colored backgrounds (blue-50, purple-50, etc.)
- **Avoid:** Gradient backgrounds
- **Avoid:** Multiple accent colors in one section
- **Use:** Gray scale for 95% of the design
- **Use:** Brand colors only for CTAs and key highlights

## Typography

### Hierarchy
```
Page Title:     text-4xl font-extrabold text-gray-900
Section Title:  text-2xl font-bold text-gray-900
Subsection:     text-xl font-bold text-gray-900
Label:          text-xs font-semibold text-gray-500 uppercase tracking-wide
Body:           text-base text-gray-700
Small:          text-sm text-gray-600
Tiny:           text-xs text-gray-500
```

### Font Weights
- **Extrabold (800):** Page titles only
- **Bold (700):** Section headings, emphasis
- **Semibold (600):** Labels, subheadings
- **Medium (500):** Values, important data
- **Regular (400):** Body text

## Component Patterns

### 1. Section Container
**Standard white card with shadow:**
```tsx
<div className="bg-white rounded-xl shadow-lg p-6 mb-6">
  {/* Content */}
</div>
```

**Usage:** Main sections, primary content blocks

### 2. Section Header
**Title with optional subtitle:**
```tsx
<h3 className="text-2xl font-bold text-gray-900 mb-2">Section Title</h3>
<p className="text-gray-600 mb-6">Optional descriptive subtitle</p>
```

**Usage:** Top of every major section

### 3. Subsection Box (Key Pattern!)
**Gray box with border for secondary info:**
```tsx
<div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
  <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
    Subsection Label
  </h5>
  {/* Content */}
</div>
```

**Usage:** 
- Logistics (accommodation, meals)
- Billing information
- Lunch cost estimates
- Any secondary/supporting information

**Why it works:**
- Subtle gray background separates from main content
- Thin border adds definition without being harsh
- Uppercase label clearly identifies the section
- Consistent with overall clean aesthetic

### 4. Subsection Label
**Small uppercase header:**
```tsx
<h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
  Label Text
</h5>
```

**Usage:** Headers within sections (Activities, Logistics, Primary Contact, etc.)

### 5. Day Separator (Multi-Day)
**Horizontal line with centered label:**
```tsx
{index > 0 && (
  <div className="absolute -top-4 left-0 right-0 flex items-center">
    <div className="flex-grow border-t border-gray-200"></div>
    <span className="px-4 text-xs text-gray-400 uppercase tracking-wider">
      Day {day.day}
    </span>
    <div className="flex-grow border-t border-gray-200"></div>
  </div>
)}
```

**Usage:** Organic breaks between repeated items (days, events, etc.)

### 6. Left Border Accent
**Subtle left border for sections:**
```tsx
<div className="border-l-4 border-gray-300 pl-6">
  {/* Content */}
</div>
```

**Usage:** 
- Multi-day itinerary days
- Quoted sections
- Nested content

### 7. Field Display
**Label above value:**
```tsx
<div>
  <p className="text-xs text-gray-500 mb-1">Field Label</p>
  <p className="text-sm text-gray-900 font-medium">Field Value</p>
</div>
```

**Usage:** Displaying data fields (accommodation, contact info, etc.)

### 8. Bullet List
**Simple gray bullets:**
```tsx
<ul className="space-y-2">
  {items.map((item, index) => (
    <li key={index} className="flex items-start">
      <span className="text-gray-400 mr-3 mt-1">•</span>
      <span className="text-gray-700">{item}</span>
    </li>
  ))}
</ul>
```

**Usage:** Activity lists, feature lists, any bulleted content

## Layout Patterns

### Grid Layouts
**Two-column responsive grid:**
```tsx
<div className="grid md:grid-cols-2 gap-4">
  {/* Items */}
</div>
```

**Usage:** Contact info, accommodation/meals, billing details

### Spacing
- **Between sections:** `mb-6` (24px)
- **Between subsections:** `mb-4` (16px)
- **Between items:** `space-y-2` (8px)
- **Inside boxes:** `p-4` (16px) or `p-6` (24px)

## Multi-Day Itinerary Pattern

### Structure
```tsx
<div className="bg-white rounded-xl shadow-lg p-6 mb-6">
  {/* Header */}
  <h3 className="text-2xl font-bold text-gray-900 mb-2">3-Day Itinerary</h3>
  <p className="text-gray-600 mb-6">Your complete day-by-day experience</p>
  
  <div className="space-y-8">
    {days.map((day, index) => (
      <div key={index} className="relative">
        {/* Day separator (after first day) */}
        {index > 0 && <DaySeparator day={day.day} />}
        
        {/* Day content */}
        <div className="border-l-4 border-gray-300 pl-6">
          {/* Day header */}
          <div className="mb-4">
            <div className="flex items-baseline gap-3 mb-1">
              <span className="text-3xl font-bold text-gray-900">Day {day.day}</span>
              <h4 className="text-xl font-bold text-gray-900">{day.title}</h4>
            </div>
            <p className="text-sm text-gray-600">{formatDate(day.date)}</p>
          </div>

          {/* Activities */}
          <div className="mb-4">
            <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Activities
            </h5>
            <ul className="space-y-2">
              {/* Bullet list */}
            </ul>
          </div>

          {/* Logistics box */}
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 mt-4">
            <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Logistics
            </h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Fields */}
            </div>
          </div>
        </div>
      </div>
    ))}
  </div>
</div>
```

## Corporate Module Pattern

### Structure
```tsx
<div className="bg-white rounded-xl shadow-lg p-6 mb-6">
  {/* Header */}
  <h3 className="text-2xl font-bold text-gray-900 mb-2">Corporate Event Details</h3>
  <p className="text-gray-600 mb-6">Billing and contact information</p>
  
  <div className="space-y-6">
    {/* Primary Contact */}
    <div>
      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
        Primary Contact
      </h4>
      <div className="grid md:grid-cols-2 gap-4">
        {/* Fields */}
      </div>
    </div>
    
    {/* Billing Info Box */}
    <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
        Billing Information
      </h4>
      <div className="grid md:grid-cols-2 gap-4">
        {/* Fields */}
      </div>
    </div>
  </div>
</div>
```

## What NOT to Do

### ❌ Avoid These Patterns

1. **Colored Gradient Headers**
```tsx
// DON'T DO THIS
<div className="bg-gradient-to-r from-[#8B1538] to-[#6B1028]">
  <h3 className="text-white">Title</h3>
</div>
```

2. **Colored Icon Boxes**
```tsx
// DON'T DO THIS
<div className="bg-blue-50 rounded-lg">
  <svg className="text-blue-600">...</svg>
</div>
```

3. **Multiple Accent Colors**
```tsx
// DON'T DO THIS
<div className="bg-purple-50 border-pink-500">
  {/* Content */}
</div>
```

4. **Circular Badges with Gradients**
```tsx
// DON'T DO THIS
<div className="rounded-full bg-gradient-to-br from-[#8B1538] to-[#6B1028]">
  <span className="text-white">1</span>
</div>
```

5. **Complex Timeline Graphics**
```tsx
// DON'T DO THIS
<div className="absolute left-6 w-0.5 bg-gradient-to-b from-[#8B1538] via-[#D4AF37] to-[#8B1538]">
</div>
```

## Responsive Design

### Breakpoints
- **Mobile:** Default (< 768px)
- **Tablet:** `md:` (≥ 768px)
- **Desktop:** `lg:` (≥ 1024px)

### Grid Behavior
```tsx
// Single column on mobile, two on tablet+
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
```

### Text Sizing
```tsx
// Smaller on mobile, larger on desktop
<h1 className="text-3xl md:text-4xl font-bold">
```

## Accessibility

### Contrast
- All text must meet WCAG AA standards
- Gray-700 on white: ✅ Passes
- Gray-600 on white: ✅ Passes
- Gray-500 on white: ✅ Passes (for labels only)
- Gray-400 on white: ⚠️ Use sparingly (bullets, decorative)

### Semantic HTML
- Use proper heading hierarchy (h1 → h2 → h3)
- Use `<ul>` for lists
- Use `<p>` for paragraphs
- Use semantic tags when appropriate

## Examples from Production

### Lunch Cost Box (Reference)
```tsx
<div className="bg-gray-50 rounded-lg border border-gray-200 p-3">
  <p className="text-sm text-gray-700">
    <strong>Estimated lunch cost:</strong> {formatCurrency(amount)}
    <span className="text-gray-600"> ({guests} guests × ~$15-20/person + tax)</span>
  </p>
</div>
```

### Pricing Note (Reference)
```tsx
<div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
  <p className="text-sm text-gray-700">
    <strong className="text-gray-900">Please Note:</strong> Wine tours are billed...
  </p>
</div>
```

## Quick Reference

### The "Subsection Box" Pattern
**This is the key pattern to remember:**
```
bg-gray-50 rounded-lg border border-gray-200 p-4
```

**Use for:**
- Secondary information
- Supporting details
- Grouped data
- Anything that needs subtle separation

**Don't use for:**
- Primary content (use white cards)
- Alerts/warnings (use amber-50)
- Main sections (use white with shadow)

## Future Patterns

When creating new features, follow these guidelines:
1. Start with white cards (`bg-white rounded-xl shadow-lg p-6`)
2. Use subsection boxes for secondary info
3. Add subtle separators between repeated items
4. Use uppercase labels for subsections
5. Stick to gray scale
6. Add borders to gray boxes
7. Keep it clean and professional

---

**Remember:** Less is more. Clean and professional beats flashy and colorful every time.

