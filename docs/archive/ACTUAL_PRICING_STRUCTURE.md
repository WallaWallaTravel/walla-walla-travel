# Walla Walla Travel - Actual Pricing Structure

**Last Updated:** November 1, 2025

---

## Private Wine Tours (Hourly-Based)

### Pricing by Party Size & Day

| Party Size | Sun-Wed Rate | Thu-Sat Rate |
|------------|--------------|--------------|
| 1-2 guests | $85/hour*    | $95/hour*    |
| 3-4 guests | $95/hour     | $105/hour    |
| 5-6 guests | $105/hour    | $115/hour    |
| 7-8 guests | $115/hour    | $125/hour    |
| 9-11 guests | $130/hour   | $140/hour    |
| 12-14 guests | $140/hour  | $150/hour    |

*_1-2 guest tours often quoted as flat tour price rather than hourly_

### Key Rules

- **Minimum Duration:** 5 hours
- **Maximum Duration:** No limit
- **No per-person charges** beyond hourly rate
- **No large group discounts** (pricing already favorable)
- **No holiday surcharges**
- **Tax:** 8.9%

### Example Calculations

**Example 1: Small group, weekday**
- 4 guests, 6 hours, Tuesday
- Rate: $95/hour (3-4 guests, Sun-Wed)
- Subtotal: 6 × $95 = $570
- Tax (8.9%): $50.73
- **Total: $620.73**

**Example 2: Medium group, weekend**
- 8 guests, 7 hours, Saturday
- Rate: $125/hour (7-8 guests, Thu-Sat)
- Subtotal: 7 × $125 = $875
- Tax (8.9%): $77.88
- **Total: $952.88**

**Example 3: Large group, weekday**
- 12 guests, 8 hours, Wednesday
- Rate: $140/hour (12-14 guests, Sun-Wed)
- Subtotal: 8 × $140 = $1,120
- Tax (8.9%): $99.68
- **Total: $1,219.68**

---

## Shared Group Tours (New Program)

### Pricing

- **Base Rate:** $95 per person
- **With Lunch:** $115 per person (strongly encouraged)
- **Days:** Sunday-Wednesday only
- **Maximum:** 14 guests per tour
- **Format:** Pre-planned itinerary, meet other guests

### Example Calculation

**6 guests with lunch, Sunday:**
- Rate: $115 per person
- Subtotal: 6 × $115 = $690
- Tax (8.9%): $61.41
- **Total: $751.41**

---

## Airport Transfers

| Route | Price |
|-------|-------|
| SeaTac ↔ Walla Walla | $850 each way |
| Pasco ↔ Walla Walla | TBD |
| Pendleton ↔ Walla Walla | TBD |
| LaGrande ↔ Walla Walla | TBD |

---

## Additional Services

| Service | Price |
|---------|-------|
| Lunch Coordination | Integrated (no charge) |
| Catered Lunch | TBD per person |
| Catered Dinner | TBD per person |
| Wait Time | $75/hour (1 hour minimum) |
| Photography Package | TBD |
| Custom Itinerary Planning | TBD |

---

## Financial Terms

### Deposit
- **Default:** 50% of total
- **Can be overridden** to fixed amount per booking
- **Flexible:** Admin can adjust as needed

### Final Payment
- **Due:** 48 hours after tour completion (default)
- **Can be sent immediately** if client requests
- **Allows time for:**
  - Updating actual service hours from driver
  - Adding lunch costs from ordering system
  - Any necessary adjustments

### Cancellation Policy

| Notice Period | Refund |
|---------------|--------|
| 40+ days before | 100% refund |
| 20-39 days before | 50% refund |
| 10-19 days before | 25% refund |
| Less than 10 days | No refund |

_Weather/emergency policies TBD_

---

## Vehicles

### Fleet
- **1× 11-passenger Sprinter van**
- **2× 14-passenger vans**

### Assignment Logic
- **1-6 guests:** Prefer 11-passenger Sprinter (extra space)
- **7-11 guests:** 11-passenger Sprinter
- **12-14 guests:** 14-passenger van
- **Subject to availability**

---

## Tour Logistics

### Timing
- **Minimum Tour:** 5 hours
- **Standard Pickup:** 10:00 AM - 10:25 AM
- **Winery Visits:** 70-100 minutes each
- **Travel Between:** 10-20 minutes
- **Lunch:** Integrated into winery visit (+15-20 min)

### Example 6-Hour Tour Schedule

```
10:00 AM - Pickup at hotel
10:20 AM - Arrive Winery 1
11:50 AM - Depart Winery 1 (90 min visit)
12:05 PM - Arrive Winery 2
 2:00 PM - Depart Winery 2 (100 min + lunch)
 2:15 PM - Arrive Winery 3
 3:30 PM - Depart Winery 3 (75 min visit)
 3:45 PM - Return to hotel
Total: 5 hours 45 minutes
```

---

## Implementation Notes

### Pricing Engine
- Party size determines rate tier
- Day of week determines base rate (Sun-Wed vs Thu-Sat)
- No complex surcharges or discounts
- Simple, transparent pricing

### System Features
- Automatic rate selection based on party size
- Day-of-week detection for pricing
- 5-hour minimum enforcement
- Tax calculation (8.9%)
- Flexible deposit (percentage or fixed)
- Invoice generation 48 hours post-tour

---

## Questions to Resolve

1. ✅ Private tour hourly rates - **COMPLETE**
2. ✅ Day-based pricing structure - **COMPLETE**
3. ✅ Shared tour pricing - **COMPLETE**
4. ⏳ Pasco transfer rates
5. ⏳ Pendleton transfer rates
6. ⏳ LaGrande transfer rates
7. ⏳ Catered lunch pricing
8. ⏳ Catered dinner pricing
9. ⏳ Photography package pricing
10. ⏳ Weather/emergency cancellation policy
11. ⏳ Rescheduling policy

---

## Usage in Code

```typescript
import { 
  calculateWineTourPrice, 
  getHourlyRate,
  calculateSharedTourPrice 
} from '@/lib/rate-config';

// Private tour pricing
const pricing = calculateWineTourPrice(
  6,                    // 6 hours
  8,                    // 8 guests
  new Date('2025-06-15') // Saturday
);
// Returns: { hourly_rate: 125, hours: 6, subtotal: 750, tax: 66.75, total: 816.75, ... }

// Get just the hourly rate
const rate = getHourlyRate(8, new Date('2025-06-15'));
// Returns: 125

// Shared tour pricing
const sharedPricing = calculateSharedTourPrice(6, true);
// Returns: { per_person_rate: 115, guests: 6, subtotal: 690, tax: 61.41, total: 751.41 }
```

---

**This is the source of truth for all pricing in the system.**

