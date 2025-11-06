# Proposal Pricing Display Refinement

**Date:** November 1, 2025  
**Status:** ✅ Complete

## Problem
The original pricing information section had several issues:
- ❌ Large blue info box dominated the page
- ❌ Showed wine tour info for ALL service types (confusing for transfers, etc.)
- ❌ Tasting fee info shown even for non-wine tours
- ❌ 5-hour minimum shown for all services
- ❌ Generic description ("4 wineries" instead of actual 3)
- ❌ No lunch cost estimation
- ❌ Guest count placement was awkward

## Solution
Refined the pricing display to be:
- ✅ Contextual (wine tour info only for wine tours)
- ✅ Compact and subtle
- ✅ Informative without dominating
- ✅ Accurate (3 wineries as default)
- ✅ Includes lunch estimation
- ✅ Better visual hierarchy

## Changes Made

### 1. Pricing Display in "Your Experience" Section

#### Right Side (Price Area)
```
$630                          ← Large, bold price
Billed Hourly @ $105/hr      ← NEW: Hourly rate (wine tours only)
4 guests                      ← Guest count moved below
```

**Before:**
```
$630
4 guests
```

**After (Wine Tour):**
```
$630
Billed Hourly @ $105/hr
4 guests
```

**After (Transfer):**
```
$850
4 guests
```

### 2. Wine Tour Specific Information

#### Itinerary
- **Default:** "Visit 3 premier wineries" (changed from 4)
- **Modifiable:** Can be customized in backend when creating proposal

#### Tasting Fees
- Shown inline: "Wine tasting fees paid directly to wineries ($20-$40/person typical)"
- Subtle, italic text
- Only appears for wine tours

### 3. Lunch Cost Estimation

New section for wine tours only:

```
┌─────────────────────────────────────────────────┐
│ Optional Lunch Coordination                     │
│ We can arrange lunch at a local restaurant      │
│ (paid directly)                                 │
│                                                 │
│ Estimated lunch cost: $70.00                    │
│ (4 guests × ~$15-20/person + tax)              │
└─────────────────────────────────────────────────┘
```

**Features:**
- Light gray background box
- Clear "Optional" label
- Formula shown: guests × $15-20/person + tax
- Uses $17.50 average in calculation
- Only shows for wine tours

### 4. Simplified Pricing Note

**Before:** Large blue box with 4 bullet points

**After:** Compact amber note (only for wine tours)
```
┌─────────────────────────────────────────────────┐
│ Please Note: Wine tours are billed at an hourly│
│ rate with a 5-hour minimum. The estimate above │
│ is based on typical tour duration. Your final  │
│ invoice will reflect actual tour time and will │
│ be sent 48 hours after your experience         │
│ concludes.                                      │
└─────────────────────────────────────────────────┘
```

**Key Improvements:**
- Amber color (softer than blue)
- Single paragraph (not bullet points)
- Only shows if proposal contains wine tours
- Much less visually dominant

## Layout Structure

### Wine Tour Display
```
Wine Tour                                    $630
June 15, 2025                    Billed Hourly @ $105/hr
                                            4 guests

Full-day wine tour visiting premier wineries

Duration: 6 hours (estimated)

Itinerary: Visit 3 premier wineries
Wine tasting fees paid directly to wineries ($20-$40/person typical)

┌─────────────────────────────────────────────────┐
│ Optional Lunch Coordination                     │
│ We can arrange lunch at a local restaurant      │
│ (paid directly)                                 │
│                                                 │
│ Estimated lunch cost: $70.00                    │
│ (4 guests × ~$15-20/person + tax)              │
└─────────────────────────────────────────────────┘
```

### Transfer Display (No Hourly Rate)
```
Airport Transfer                             $850
June 15, 2025                              4 guests

Seattle-Tacoma Airport to Walla Walla

Duration: 4 hours
```

## Technical Implementation

### Conditional Rendering
```typescript
const isWineTour = item.service_type === 'wine_tour';
const hourlyRate = isWineTour && item.date 
  ? getHourlyRate(item.party_size, new Date(item.date)) 
  : null;
```

### Hourly Rate Display
```typescript
{hourlyRate && (
  <p className="text-xs text-gray-600 mb-2">
    Billed Hourly @ {formatCurrency(hourlyRate)}/hr
  </p>
)}
```

### Lunch Estimation Formula
```typescript
// Average lunch cost: $17.50 per person (includes $15-20 + tax)
const estimatedLunchCost = item.party_size * 17.50;
```

### Contextual Pricing Note
```typescript
{proposal.service_items.some(item => item.service_type === 'wine_tour') && (
  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
    {/* Note content */}
  </div>
)}
```

## Benefits

### User Experience
- ✅ Less overwhelming
- ✅ Clearer pricing structure
- ✅ Contextual information (only relevant details shown)
- ✅ Better visual flow
- ✅ Lunch costs are transparent

### Accuracy
- ✅ Correct default (3 wineries, not 4)
- ✅ Hourly rate shown for wine tours
- ✅ Fixed pricing shown for transfers
- ✅ Realistic lunch estimates

### Flexibility
- ✅ Works for mixed proposals (wine tour + transfer)
- ✅ Adapts to service type
- ✅ Winery count can be customized in backend

## Visual Design

### Color Scheme
- **Amber note:** `bg-amber-50 border-amber-200` (warm, subtle)
- **Lunch box:** `bg-gray-50 border-gray-200` (neutral, informative)
- **Price:** `text-[#8B1538]` (burgundy brand color)
- **Hourly rate:** `text-gray-600` (subtle, secondary)

### Typography
- **Price:** 2xl, bold
- **Hourly rate:** xs, regular (de-emphasized)
- **Guest count:** sm, medium
- **Descriptions:** sm, regular
- **Lunch estimate:** sm, bold for amount

### Spacing
- Consistent padding in boxes
- Clear visual separation between sections
- Not cramped, not too spacious

## Default Values

### Wine Tour Defaults
- **Wineries:** 3 (modifiable in backend)
- **Duration:** 6 hours
- **Tasting fees:** $20-$40/person (shown as range)
- **Lunch estimate:** $17.50/person average

### Calculation Details
```
Lunch Estimate = Party Size × $17.50
Example: 4 guests × $17.50 = $70.00

Breakdown shown to client:
"4 guests × ~$15-20/person + tax"
```

## Backend Customization

When creating proposals, admins can customize:
- Number of wineries (default: 3)
- Duration estimate (default: 6 hours)
- Service description
- Notes

## Testing Scenarios

### Scenario 1: Wine Tour Only
- ✅ Shows hourly rate
- ✅ Shows 3 wineries
- ✅ Shows tasting fee note
- ✅ Shows lunch estimate
- ✅ Shows amber pricing note

### Scenario 2: Transfer Only
- ✅ No hourly rate
- ✅ No winery info
- ✅ No tasting fee note
- ✅ No lunch estimate
- ✅ No amber pricing note

### Scenario 3: Mixed (Wine Tour + Transfer)
- ✅ Wine tour shows all wine-specific info
- ✅ Transfer shows only transfer info
- ✅ Amber pricing note appears (because wine tour present)

## Future Enhancements

### Potential Additions
- [ ] Dynamic winery count from database
- [ ] Lunch menu preview/selection
- [ ] Tasting fee breakdown by winery
- [ ] Add-on services (photography, etc.)
- [ ] Custom itinerary builder integration

### Admin Features
- [ ] Template descriptions for common tours
- [ ] Quick-edit winery count
- [ ] Lunch cost calculator
- [ ] Service package presets

## Related Files

### Updated
- `/app/proposals/[proposal_id]/page.tsx` - Refined pricing display

### Related
- `/lib/rate-config.ts` - Hourly rate calculation
- `/docs/PRICING_TRANSPARENCY_UPDATE.md` - Previous pricing update
- `/docs/ACTUAL_PRICING_STRUCTURE.md` - Business pricing rules

---

**Summary:** Refined the proposal pricing display to be contextual, accurate, and less overwhelming. Wine tour information (hourly rates, tasting fees, lunch estimates) now only appears for wine tours. The default is now 3 wineries (not 4), and lunch costs are estimated at $17.50/person. The large blue info box was replaced with a subtle amber note that only appears when relevant.

