# Claude Skill Setup Guide

**How to add the Walla Walla Travel skill to Cursor**

---

## What is a Claude Skill?

A Claude Skill (Custom Instructions) gives me persistent knowledge about your project so I automatically:
- Follow your business rules
- Use your actual pricing structure
- Match your code patterns
- Understand your terminology
- Ask the right questions

---

## How to Add the Skill

### Option 1: Cursor Settings (Recommended)

1. **Open Cursor Settings**
   - Mac: `Cmd + ,`
   - Windows/Linux: `Ctrl + ,`

2. **Navigate to AI Settings**
   - Click "Features" in the left sidebar
   - Click "AI"

3. **Find Custom Instructions**
   - Look for "Custom Instructions" or "Project Instructions"
   - Or "Rules for AI" section

4. **Paste the Skill**
   - Copy the entire skill from `CLAUDE_SKILL_CONTENT.md` (see below)
   - Paste into the text area
   - Click "Save"

### Option 2: `.cursorrules` File

1. **Create file in project root:**
   ```bash
   touch .cursorrules
   ```

2. **Paste the skill content** (see below)

3. **Cursor will automatically load it**

---

## The Skill Content

Copy everything below this line and paste into Cursor:

```
# Walla Walla Travel - Project Context

You are working on a comprehensive travel management system for Walla Walla Travel, a luxury wine tour company in Walla Walla, Washington.

## Business Overview

**Company:** Walla Walla Travel (also operates NW Touring & Concierge, Herding Cats Wine Tours)
**Owner:** Ryan Madsen
**Services:** 
- Private wine tours (primary)
- Shared group tours (new program)
- Airport transfers (SeaTac, Pasco, Pendleton, LaGrande)
- Multi-day tours
- Corporate events
- Willamette Valley tours

**Service Areas:**
- Primary: Walla Walla Valley
- Secondary: Tri-Cities, Pendleton, LaGrande, Willamette Valley
- Licensed for anywhere in region

---

## Pricing Structure

### Private Tours (Hourly-Based)

**Sunday-Wednesday Rates (per hour):**
- 1-2 guests: $85/hour (often quoted as flat tour price)
- 3-4 guests: $95/hour
- 5-6 guests: $105/hour
- 7-8 guests: $115/hour
- 9-11 guests: $130/hour
- 12-14 guests: $140/hour

**Thursday-Saturday Rates (per hour):**
- 1-2 guests: $95/hour (often quoted as flat tour price)
- 3-4 guests: $105/hour
- 5-6 guests: $115/hour
- 7-8 guests: $125/hour
- 9-11 guests: $140/hour
- 12-14 guests: $150/hour

**Key Points:**
- Party size determines rate tier
- Day of week determines base rate
- NO per-person charges beyond hourly rate
- NO large group discounts
- NO holiday surcharges
- Minimum 5 hours
- Tax: 8.9%

### Shared Group Tours (New Program)

- Base: $95/person
- With lunch: $115/person (encouraged)
- Days: Sunday-Wednesday only
- Max: 14 guests

### Financial Terms

- **Deposit:** 50% default (can override to fixed amount)
- **Final Payment:** 48 hours after tour (can send immediately)
- **Tax:** 8.9%
- **Cancellation:** 40+ days = 100%, 20-39 days = 50%, 10-19 days = 25%, <10 days = 0%

---

## Technical Standards

### Architecture
- **Service Layer:** ALL business logic in service files, NOT in API routes
- **Database:** Use centralized `db` client, never create new Pool
- **Errors:** Use custom error classes (ApiError, NotFoundError, ValidationError)
- **Theme:** Use theme config, never hardcode colors (#8B1538 burgundy)

### Code Patterns
```typescript
// ✅ GOOD: Service layer
import { PricingService } from '@/lib/services/pricing.service';
const price = await PricingService.calculate(data);

// ❌ BAD: Logic in API route
const price = data.hours * 150;
```

### Component Standards
- Number inputs: Auto-select on focus
- Always show loading/error states
- Mobile-first responsive
- Use Tailwind CSS

---

## Key Features

- **Booking System:** Real-time availability, dynamic pricing
- **Invoicing:** Auto-generated 48hrs post-tour, syncs driver hours
- **Time Clock:** GPS, digital signatures, HOS tracking
- **Lunch Ordering:** Interactive menus, per-item mods
- **Driver Acceptance:** Confirm tours, auto-assignment
- **Client Portal:** View bookings, itineraries, payments
- **Proposals:** Multiple services, flexible pricing, media
- **Media Library:** SEO/GEO optimized, usage tracking

---

## AI Agent System

### Specialized Agents
1. **Media Specialist:** SEO/GEO optimization, image analysis
2. **Proposal Builder:** Parse notes, build itineraries, pricing
3. **Customer Service:** Website chat, uses local LLM
4. **Architecture Agent:** Monitoring, optimization, docs

### Local LLM Strategy
- Primary: Local LLM (85% of queries, $0 cost)
- Fallback: Cloud AI (15%, complex tasks)
- Savings: ~$16K/month vs all-cloud

---

## Important Rules

- NO large group discounts (pricing already favorable)
- NO holiday surcharges
- Lunch integrated into winery visit (no separate stop)
- Travel time = buffer time
- Driver hours update invoice automatically
- Final payment after tour (allows adjustments)
- Can serve anywhere (not limited to Walla Walla)
- 1-2 guest tours often quoted as flat price

---

## When Writing Code

1. Follow service layer pattern
2. Use existing database utilities
3. Apply theme colors from config
4. Include loading/error states
5. Add auto-select to number inputs
6. Write tests for business logic
7. Consider mobile users
8. Use actual pricing tiers (party size + day of week)
9. Optimize for cost (local LLM when possible)
```

---

## Testing the Skill

After adding the skill, test it:

```
You: "Create a pricing calculator for a wine tour"

Me: "I'll create this using your actual pricing structure:
     - Party size determines rate tier (1-2, 3-4, 5-6, 7-8, 9-11, 12-14)
     - Day of week determines base rate (Sun-Wed vs Thu-Sat)
     - 5 hour minimum
     - 8.9% tax
     Here's the code..."
```

I should automatically use your real rates without you telling me!

---

## Updating the Skill

When business rules change:

1. Update the skill content in Cursor settings
2. Update `/lib/rate-config.ts`
3. Update `/docs/ACTUAL_PRICING_STRUCTURE.md`

All three should stay in sync.

---

## Benefits

✅ I automatically follow your patterns
✅ I use your actual pricing
✅ I understand your business rules
✅ I ask relevant questions
✅ I write consistent code
✅ No need to repeat yourself

---

## Current Status

✅ **Pricing Structure:** Complete (actual rates loaded)
✅ **Business Rules:** Documented
✅ **Code Standards:** Defined
✅ **AI Agents:** Designed
⏳ **Missing Info:** Some transfer rates, catered meal pricing

---

**Once this skill is loaded, I'll be YOUR specialized development assistant for Walla Walla Travel!** 🚀

